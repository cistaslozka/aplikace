// Povinnosti zaměstnavatele vůči úřadům (krok 11a – „úřední pomocník“, bez napojení na datovou schránku).
// Aplikace z HR dokumentů pozná nástup a skončení zaměstnance a spočítá, co a do kdy je potřeba udělat.
//
// Zdroje (stav k 10/2026):
// - Jednotné měsíční hlášení zaměstnavatele (JMHZ, zákon č. 323/2025 Sb.): od 1. 7. 2026 se zaměstnanec
//   přihlašuje nejpozději před nástupem; nový zaměstnavatel se registruje 15 dní až 2 pracovní dny před
//   nástupem prvního zaměstnance; hlášení za měsíc od 1. do 20. dne následujícího měsíce (ČSSZ, jmhz.mpsv.cz).
// - Zdravotní pojišťovny nejsou v JMHZ: nástup a skončení se hlásí do 8 dnů (zákon č. 48/1997 Sb., § 10).
// - Registrace k dani ze závislé činnosti do 15 dnů (daňový řád, § 129).
// ⚠️ Lhůty a postupy se mění. Před spuštěním ověřit s mzdovou účetní a doplňovat při změnách.

import type { DruhSmlouvy } from "./smlouvy";

export type Urad = "cssz" | "zp" | "fu" | "firma";
export const URADY: Record<Urad, { nazev: string; odkaz?: string }> = {
  cssz: { nazev: "ČSSZ (JMHZ)", odkaz: "https://eportal.cssz.cz" },
  zp: { nazev: "Zdravotní pojišťovna zaměstnance", odkaz: "https://www.vzp.cz/platci/zamestnavatele" },
  fu: { nazev: "Finanční úřad", odkaz: "https://www.financnisprava.cz" },
  firma: { nazev: "Ve firmě" },
};

export type Povinnost = {
  klic: string; // jednoznačný klíč pro odškrtnutí (uloží se v databázi)
  urad: Urad;
  nadpis: string;
  popis: string;
  termin: string | null; // YYYY-MM-DD
  zamestnanec?: string;
  dokument?: { id: string; cislo: string };
};

/** Doklad zaměstnance, ze kterého se povinnosti počítají. */
export type HrDokument = {
  id: string;
  kind: DruhSmlouvy;
  number: string;
  status: "koncept" | "uzavrena" | "ukoncena";
  customer: { name: string };
  fields: Record<string, unknown>;
};

const NASTUP: Partial<Record<DruhSmlouvy, string>> = { hpp: "nastup", dpp: "od", dpc: "od" };
const DRUH_PRACE: Partial<Record<DruhSmlouvy, string>> = { hpp: "pracovní poměr", dpp: "DPP", dpc: "DPČ" };

// ——— Kalendář: státní svátky ČR a pracovní dny ———

function velikonoce(rok: number): Date {
  // anonymní gregoriánský algoritmus (Meeus/Jones/Butcher)
  const a = rok % 19,
    b = Math.floor(rok / 100),
    c = rok % 100,
    d = Math.floor(b / 4),
    e = b % 4;
  const f = Math.floor((b + 8) / 25),
    g = Math.floor((b - f + 1) / 3),
    h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4),
    k = c % 4,
    l = (32 + 2 * e + 2 * i - h - k) % 7,
    m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mesic = Math.floor((h + l - 7 * m + 114) / 31),
    den = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(rok, mesic - 1, den));
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const posun = (s: string, dni: number) => iso(new Date(Date.parse(`${s}T00:00:00Z`) + dni * 86_400_000));

export function jeSvatek(s: string): boolean {
  const rok = Number(s.slice(0, 4));
  const pevne = ["01-01", "05-01", "05-08", "07-05", "07-06", "09-28", "10-28", "11-17", "12-24", "12-25", "12-26"];
  if (pevne.includes(s.slice(5))) return true;
  const nedele = iso(velikonoce(rok));
  return s === posun(nedele, -2) || s === posun(nedele, 1);
}

export function jePracovniDen(s: string): boolean {
  const den = new Date(`${s}T00:00:00Z`).getUTCDay();
  return den !== 0 && den !== 6 && !jeSvatek(s);
}

/** Datum o `n` pracovních dnů dříve (n > 0) nebo později (n < 0). */
export function pracovnichDnuPred(s: string, n: number): string {
  let d = s;
  let zbyva = Math.abs(n);
  while (zbyva > 0) {
    d = posun(d, n > 0 ? -1 : 1);
    if (jePracovniDen(d)) zbyva--;
  }
  return d;
}

const den = (pole: Record<string, unknown>, k: string) => {
  const v = pole[k];
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
};

/** Povinnosti ze všech HR dokumentů firmy. */
export function povinnosti(dokumenty: HrDokument[]): Povinnost[] {
  // i koncepty: smlouvu často podepíšou na papíře a v aplikaci zůstane jako koncept
  const platne = dokumenty;
  const nastupy = platne
    .filter((d) => NASTUP[d.kind])
    .map((d) => ({ d, nastup: den(d.fields, NASTUP[d.kind]!) }))
    .sort((a, b) => (a.nastup ?? "9999").localeCompare(b.nastup ?? "9999"));
  const p: Povinnost[] = [];

  // Zaměstnavatel s prvním zaměstnancem
  const prvni = nastupy.find((x) => x.nastup)?.nastup ?? null;
  if (nastupy.length) {
    p.push({
      klic: "firma:cssz",
      urad: "cssz",
      nadpis: "Registrovat se na ČSSZ jako zaměstnavatel",
      popis:
        "Jen jednou, před prvním zaměstnancem. Nejdříve 15 dní a nejpozději 2 pracovní dny před jeho nástupem. Přes ePortál ČSSZ nebo datovou schránku; uvedete i, kdo vám vede mzdy.",
      termin: prvni ? pracovnichDnuPred(prvni, 2) : null,
    });
    p.push({
      klic: "firma:fu",
      urad: "fu",
      nadpis: "Registrovat se k dani ze závislé činnosti",
      popis: "Jen jednou: přihláška k registraci plátce daně z příjmů ze závislé činnosti na finančním úřadě (EPO nebo datová schránka).",
      termin: prvni ? posun(prvni, 15) : null,
    });
    p.push({
      klic: "firma:zp",
      urad: "zp",
      nadpis: "Registrovat se jako zaměstnavatel u zdravotních pojišťoven",
      popis: "U každé pojišťovny, u které je pojištěný některý váš zaměstnanec – do 8 dnů od nástupu prvního takového zaměstnance.",
      termin: prvni ? posun(prvni, 8) : null,
    });
  }

  for (const { d, nastup } of nastupy) {
    const jmeno = d.customer.name;
    const doc = { id: d.id, cislo: d.number };
    const druh = DRUH_PRACE[d.kind];
    p.push({
      klic: `${d.id}:cssz-prihlaseni`,
      urad: "cssz",
      nadpis: `Přihlásit zaměstnance na ČSSZ (${druh})`,
      popis:
        "Přihláška do evidence zaměstnanců JMHZ nejpozději před nástupem do práce. Českého občana lze přihlásit zkráceně a zbytek údajů doplnit do 8 dnů po nástupu.",
      termin: nastup ? posun(nastup, -1) : null,
      zamestnanec: jmeno,
      dokument: doc,
    });
    p.push({
      klic: `${d.id}:zp-prihlaseni`,
      urad: "zp",
      nadpis: "Oznámit nástup zdravotní pojišťovně",
      popis:
        d.kind === "dpp"
          ? "U DPP jen tehdy, když odměna v měsíci dosáhne rozhodného příjmu pro účast na pojištění. Oznámení o nástupu do 8 dnů."
          : "Oznámení zaměstnavatele o nástupu zaměstnance do 8 dnů od nástupu, přes portál nebo datovou schránku pojišťovny zaměstnance.",
      termin: nastup ? posun(nastup, 8) : null,
      zamestnanec: jmeno,
      dokument: doc,
    });
    p.push({
      klic: `${d.id}:nastup`,
      urad: "firma",
      nadpis: "Připravit nástup",
      popis:
        "Vstupní lékařská prohlídka (před nástupem), školení BOZP a požární ochrany v první den, podepsané prohlášení poplatníka daně (pokud ho zaměstnanec chce uplatnit) a číslo účtu pro výplatu.",
      termin: nastup,
      zamestnanec: jmeno,
      dokument: doc,
    });
  }

  // Skončení pracovního poměru
  for (const d of platne.filter((x) => x.kind === "dohoda_skonceni" || x.kind === "vypoved")) {
    const konec = d.kind === "dohoda_skonceni" ? den(d.fields, "skonceni") : null;
    const jmeno = d.customer.name;
    const doc = { id: d.id, cislo: d.number };
    p.push({
      klic: `${d.id}:odhlaseni`,
      urad: "cssz",
      nadpis: "Odhlásit zaměstnance z ČSSZ",
      popis: konec
        ? "Odhlášení v evidenci JMHZ do 8 dnů od skončení zaměstnání."
        : "Po skončení výpovědní doby odhlásit v evidenci JMHZ do 8 dnů. Den skončení závisí na doručení výpovědi.",
      termin: konec ? posun(konec, 8) : null,
      zamestnanec: jmeno,
      dokument: doc,
    });
    p.push({
      klic: `${d.id}:zp-odhlaseni`,
      urad: "zp",
      nadpis: "Odhlásit zaměstnance u zdravotní pojišťovny",
      popis: "Oznámení o ukončení zaměstnání do 8 dnů od skončení.",
      termin: konec ? posun(konec, 8) : null,
      zamestnanec: jmeno,
      dokument: doc,
    });
    p.push({
      klic: `${d.id}:zapoctovy`,
      urad: "firma",
      nadpis: "Vydat potvrzení o zaměstnání (zápočtový list)",
      popis: "V den skončení pracovního poměru, spolu s poslední výplatou a náhradou za nevyčerpanou dovolenou.",
      termin: konec,
      zamestnanec: jmeno,
      dokument: doc,
    });
  }
  return p;
}

/** Měsíční povinnosti pro aktuální měsíc (opakují se, proto se neodškrtávají napořád). */
export function mesicniPovinnosti(dnes: string): Povinnost[] {
  const termin = `${dnes.slice(0, 7)}-20`;
  const mesic = new Date(Date.parse(`${dnes.slice(0, 7)}-01T00:00:00Z`) - 86_400_000);
  const zaMesic = `${mesic.getUTCMonth() + 1}/${mesic.getUTCFullYear()}`;
  return [
    {
      klic: `mesic:${dnes.slice(0, 7)}:jmhz`,
      urad: "cssz",
      nadpis: `Podat jednotné měsíční hlášení za ${zaMesic}`,
      popis: "JMHZ za předchozí měsíc od 1. do 20. dne. Obvykle ho posílá mzdový program nebo účetní.",
      termin,
    },
    {
      klic: `mesic:${dnes.slice(0, 7)}:odvody`,
      urad: "firma",
      nadpis: `Zaplatit odvody a zálohu na daň za ${zaMesic}`,
      popis:
        "Sociální a zdravotní pojištění a záloha na daň ze závislé činnosti do 20. dne následujícího měsíce, spolu s přehledem pro zdravotní pojišťovny.",
      termin,
    },
  ];
}
