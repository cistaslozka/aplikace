import "server-only";
import { normalizujPsc } from "./validace";

// ARES – veřejný registr ekonomických subjektů Ministerstva financí.
// https://ares.gov.cz/stranky/vyvojar-info
const ARES_URL = "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/";

export type PravniForma = "osvc" | "sro" | "jina";

export type FirmaZAres = {
  ico: string;
  name: string;
  dic: string | null;
  vat_payer: boolean;
  legal_form: PravniForma;
  street: string;
  city: string;
  zip: string;
  registry_note: string;
};

type AresSidlo = {
  nazevObce?: string;
  nazevCastiObce?: string;
  nazevMestskehoObvodu?: string;
  nazevUlice?: string;
  cisloDomovni?: number;
  cisloOrientacni?: number;
  cisloOrientacniPismeno?: string;
  psc?: number;
  textovaAdresa?: string;
};

type AresOdpoved = {
  ico?: string;
  obchodniJmeno?: string;
  dic?: string;
  pravniForma?: string;
  sidlo?: AresSidlo;
  seznamRegistraci?: Record<string, string>;
};

// Kódy právních forem podle číselníku ČSÚ: 1xx jsou fyzické osoby, 112 je s.r.o.
function pravniForma(kod: string | undefined): PravniForma {
  if (!kod) return "jina";
  if (kod === "112") return "sro";
  if (/^10\d$/.test(kod)) return "osvc";
  return "jina";
}

function ulice(s: AresSidlo): string {
  // V obcích bez ulic se adresa píše názvem části obce a číslem popisným.
  const nazev = s.nazevUlice ?? s.nazevCastiObce ?? s.nazevObce ?? "";
  const co = s.cisloOrientacni ? `/${s.cisloOrientacni}${s.cisloOrientacniPismeno ?? ""}` : "";
  const cislo = s.cisloDomovni ? `${s.cisloDomovni}${co}` : "";
  return [nazev, cislo].filter(Boolean).join(" ");
}

function mesto(s: AresSidlo): string {
  // Praha 7, Brno-střed… jinak název obce
  const obvod = s.nazevMestskehoObvodu;
  if (obvod && s.nazevObce && obvod.startsWith(s.nazevObce)) return obvod;
  return s.nazevObce ?? "";
}

export function prevedAres(d: AresOdpoved): FirmaZAres | null {
  if (!d.ico || !d.obchodniJmeno) return null;
  const forma = pravniForma(d.pravniForma);
  const s = d.sidlo ?? {};
  return {
    ico: d.ico.padStart(8, "0"),
    name: d.obchodniJmeno,
    dic: d.dic ?? null,
    vat_payer: d.seznamRegistraci?.stavZdrojeDph === "AKTIVNI",
    legal_form: forma,
    street: ulice(s),
    city: mesto(s),
    zip: s.psc ? (normalizujPsc(String(s.psc)) ?? "") : "",
    registry_note:
      forma === "osvc"
        ? "Fyzická osoba zapsaná v živnostenském rejstříku."
        : "", // spisovou značku z obchodního rejstříku doplní uživatel
  };
}

export type VysledekAres = { ok: true; firma: FirmaZAres } | { ok: false; chyba: string };

export async function nactiZAres(ico: string): Promise<VysledekAres> {
  try {
    const odpoved = await fetch(ARES_URL + ico, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 * 60 * 24 },
      signal: AbortSignal.timeout(8000),
    });
    if (odpoved.status === 404) return { ok: false, chyba: "Firmu s tímto IČO jsme v ARES nenašli." };
    if (!odpoved.ok) throw new Error(`ARES ${odpoved.status}`);
    const firma = prevedAres((await odpoved.json()) as AresOdpoved);
    if (!firma) return { ok: false, chyba: "ARES vrátil neúplné údaje. Vyplňte je prosím ručně." };
    return { ok: true, firma };
  } catch (e) {
    console.error("ARES nedostupný:", e);
    return { ok: false, chyba: "ARES teď neodpovídá. Zkuste to za chvíli, nebo údaje vyplňte ručně." };
  }
}
