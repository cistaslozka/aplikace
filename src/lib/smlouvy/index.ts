import { castka, datumCz, type Strana, type Vzhled } from "../faktura";

/*
  Společné typy smluv. Každý vzor (smlouva o dílo, o službách…) má vlastní soubor, který z vyplněných
  údajů (`fields`) sestaví články. Náhled na obrazovce i PDF vykreslují stejné články, takže se nerozejdou.
  Texty vzorů musí před spuštěním zkontrolovat právník (viz CLAUDE.md, bod 7).
*/

export type DruhSmlouvy =
  | "dilo"
  | "sluzby"
  | "licence"
  | "nda"
  | "predavaci"
  | "kupni"
  | "ramcova"
  | "najem"
  | "plna_moc"
  | "hpp"
  | "dpp"
  | "dpc"
  | "mzdovy_vymer"
  | "dohoda_skonceni"
  | "vypoved"
  | "vytka"
  | "svereni"
  | "cestovni";

export const DRUHY_SMLUV: Record<DruhSmlouvy, { nazev: string; my: string; oni: string; pro?: boolean; hr?: boolean }> = {
  dilo: { nazev: "Smlouva o dílo", my: "Zhotovitel", oni: "Objednatel" },
  sluzby: { nazev: "Smlouva o poskytování služeb", my: "Poskytovatel", oni: "Objednatel" },
  licence: { nazev: "Licenční smlouva", my: "Poskytovatel", oni: "Nabyvatel" },
  nda: { nazev: "Dohoda o mlčenlivosti", my: "Strana A", oni: "Strana B" },
  predavaci: { nazev: "Předávací protokol", my: "Předávající", oni: "Přebírající" },
  kupni: { nazev: "Kupní smlouva", my: "Prodávající", oni: "Kupující", pro: true },
  ramcova: { nazev: "Rámcová smlouva o spolupráci", my: "Dodavatel", oni: "Odběratel", pro: true },
  najem: { nazev: "Nájemní smlouva", my: "Pronajímatel", oni: "Nájemce", pro: true },
  plna_moc: { nazev: "Plná moc", my: "Zmocnitel", oni: "Zmocněnec", pro: true },
  hpp: { nazev: "Pracovní smlouva", my: "Zaměstnavatel", oni: "Zaměstnanec", pro: true, hr: true },
  dpp: { nazev: "Dohoda o provedení práce", my: "Zaměstnavatel", oni: "Zaměstnanec", pro: true, hr: true },
  dpc: { nazev: "Dohoda o pracovní činnosti", my: "Zaměstnavatel", oni: "Zaměstnanec", pro: true, hr: true },
  mzdovy_vymer: { nazev: "Mzdový výměr", my: "Zaměstnavatel", oni: "Zaměstnanec", pro: true, hr: true },
  dohoda_skonceni: { nazev: "Dohoda o rozvázání pracovního poměru", my: "Zaměstnavatel", oni: "Zaměstnanec", pro: true, hr: true },
  vypoved: { nazev: "Výpověď z pracovního poměru", my: "Zaměstnavatel", oni: "Zaměstnanec", pro: true, hr: true },
  vytka: { nazev: "Upozornění na porušení povinností", my: "Zaměstnavatel", oni: "Zaměstnanec", pro: true, hr: true },
  svereni: { nazev: "Potvrzení o svěření předmětů", my: "Zaměstnavatel", oni: "Zaměstnanec", pro: true, hr: true },
  cestovni: { nazev: "Cestovní příkaz", my: "Zaměstnavatel", oni: "Zaměstnanec" },
};

export const STAVY_SMLUV = { koncept: "Koncept", uzavrena: "Uzavřená", ukoncena: "Ukončená" } as const;
export type StavSmlouvy = keyof typeof STAVY_SMLUV;

/** Článek smlouvy: nadpis a číslované odstavce. */
export type Clanek = { nadpis: string; odstavce: string[] };

export type Podpis = { obrazek: string; jmeno: string; kdy: string };
export type Podpisy = { my?: Podpis; oni?: Podpis };

export type DataSmlouvy = {
  druh: DruhSmlouvy;
  cislo: string;
  nazev: string;
  /** naše firma dodává (zhotovitel / poskytovatel) */
  myDodavame: boolean;
  my: Strana & { vat_payer?: boolean };
  oni: Strana | null;
  pole: Record<string, unknown>;
  misto: string;
  datum: string | null;
  vzhled: Vzhled;
  stav?: StavSmlouvy;
  podpisy?: Podpisy;
};

/** Role stran ve smlouvě: kdo je zhotovitel a kdo objednatel. */
export function role(d: Pick<DataSmlouvy, "druh" | "myDodavame">) {
  const r = DRUHY_SMLUV[d.druh];
  return d.myDodavame ? { my: r.my, oni: r.oni } : { my: r.oni, oni: r.my };
}

// Pomocníci pro čtení vyplněných polí
export const text = (pole: Record<string, unknown>, k: string) => (typeof pole[k] === "string" ? (pole[k] as string).trim() : "");
export const cislo = (pole: Record<string, unknown>, k: string) => {
  const v = pole[k];
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(/\s/g, "").replace(",", ".")) : NaN;
  return Number.isFinite(n) ? n : null;
};
export const datum = (pole: Record<string, unknown>, k: string) => {
  const v = text(pole, k);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? datumCz(v) : "";
};
export const kc = (x: number) => castka(x).replace(",00 Kč", " Kč");

/** „Zhotovitel“ → „zhotovitel“, „Strana A“ → „strana A“ (jen první písmeno). */
export const malym = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

/** Text jako věta: bez zdvojené tečky na konci, s tečkou, pokud chybí. */
export const veta = (t: string) => t.replace(/[.\s]+$/, "") + ".";

/** Odstraní prázdné články a odstavce (nepovinné části smlouvy). */
export function vycistit(clanky: (Clanek | null)[]): Clanek[] {
  return clanky
    .filter((c): c is Clanek => !!c)
    .map((c) => ({ ...c, odstavce: c.odstavce.filter((o) => o && o.trim()) }))
    .filter((c) => c.odstavce.length > 0);
}

/** Zaměstnanec v HR dokumentu se bere z vyplněných polí (jméno, datum narození, bydliště). */
export function zamestnanec(pole: Record<string, unknown>): Strana | null {
  const jmeno = text(pole, "zam_jmeno");
  return jmeno ? { name: jmeno, street: text(pole, "bydliste") || null } : null;
}

/** Popis strany do záhlaví smlouvy: název, sídlo, IČO, DIČ, zápis v rejstříku. U fyzické osoby (zaměstnance) jméno, narození, bydliště. */
export function popisStrany(s: Strana, osoba?: { narozeni?: string }): string[] {
  if (osoba) return [s.name, osoba.narozeni ? `nar. ${osoba.narozeni}` : "", s.street ? `bytem ${s.street}` : ""].filter(Boolean);
  const obec = [s.zip, s.city].filter(Boolean).join(" ");
  return [
    s.name,
    [s.street, obec].filter(Boolean).length ? `se sídlem ${[s.street, obec].filter(Boolean).join(", ")}` : "",
    [s.ico && `IČO: ${s.ico}`, s.dic && `DIČ: ${s.dic}`].filter(Boolean).join(", "),
    s.registry_note ?? "",
  ].filter(Boolean);
}

/** Popis pole ve formuláři smlouvy. Formulář se vykreslí podle tohoto popisu u všech vzorů stejně. */
export type PoleFormulare = {
  k: string;
  label: string;
  typ: "text" | "textarea" | "date" | "cislo" | "kc" | "select";
  moznosti?: [string, string][];
  napoveda?: string;
  placeholder?: string;
  sirka?: "cela" | "pul" | "tretina";
};
export type SekceFormulare = { nadpis: string; pole: PoleFormulare[] };
