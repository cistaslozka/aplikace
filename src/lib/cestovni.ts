// Cestovní příkaz a vyúčtování tuzemské pracovní cesty. Čisté funkce – stejný výpočet v prohlížeči i na serveru.
//
// Sazby podle zákoníku práce (§ 157, § 163, § 176) a vyhlášky č. 573/2025 Sb. ve znění vyhlášek
// č. 78/2026 Sb. (nafta od 1. 6. 2026) a č. 175/2026 Sb. (benzín 95 od 1. 10. 2026).
// ⚠️ Každý rok (a při změně cen PHM) je potřeba doplnit nový řádek do SAZBY.

export type Palivo = "benzin95" | "benzin98" | "nafta" | "elektrina";
export const PALIVA: Record<Palivo, { nazev: string; jednotka: string }> = {
  benzin95: { nazev: "Benzín 95", jednotka: "l" },
  benzin98: { nazev: "Benzín 98", jednotka: "l" },
  nafta: { nazev: "Nafta", jednotka: "l" },
  elektrina: { nazev: "Elektřina", jednotka: "kWh" },
};

type Sazby = {
  od: string; // platí od data (včetně)
  predpis: string;
  kmOsobni: number; // základní náhrada za 1 km, osobní auto
  kmJednostopa: number; // motocykl, tříkolka
  stravne: [number, number, number]; // 5–12 h, 12–18 h, nad 18 h (dolní hranice § 176 = minimum § 163)
  palivo: Record<Palivo, number>;
};

export const SAZBY: Sazby[] = [
  {
    od: "2026-01-01",
    predpis: "vyhláška č. 573/2025 Sb.",
    kmOsobni: 5.9,
    kmJednostopa: 1.6,
    stravne: [155, 236, 370],
    palivo: { benzin95: 34.7, benzin98: 39, nafta: 34.1, elektrina: 7.2 },
  },
  {
    od: "2026-06-01",
    predpis: "vyhláška č. 573/2025 Sb. ve znění vyhl. č. 78/2026 Sb.",
    kmOsobni: 5.9,
    kmJednostopa: 1.6,
    stravne: [155, 236, 370],
    palivo: { benzin95: 34.7, benzin98: 39, nafta: 44.5, elektrina: 7.2 },
  },
  {
    od: "2026-10-01",
    predpis: "vyhláška č. 573/2025 Sb. ve znění vyhl. č. 78/2026 a 175/2026 Sb.",
    kmOsobni: 5.9,
    kmJednostopa: 1.6,
    stravne: [155, 236, 370],
    palivo: { benzin95: 41.8, benzin98: 39, nafta: 44.5, elektrina: 7.2 },
  },
];

/** Sazby platné k danému dni (pro dřívější data první známé). */
export function sazbyKeDni(datum: string): Sazby {
  return [...SAZBY].reverse().find((s) => s.od <= datum.slice(0, 10)) ?? SAZBY[0];
}

/** Krácení stravného za každé bezplatné jídlo: podle délky (5–12, 12–18, nad 18 h). */
const KRACENI = [0.7, 0.35, 0.25];

export type Doprava = "auto" | "motocykl" | "firemni" | "verejna" | "jina";
export const DOPRAVA: Record<Doprava, string> = {
  auto: "Vlastní osobní auto",
  motocykl: "Vlastní motocykl",
  firemni: "Služební auto",
  verejna: "Veřejná doprava",
  jina: "Jiná",
};

export type DenCesty = { datum: string; hodin: number; jidel: number };
export type Vydaj = { popis: string; castka: number };

export type VstupCesty = {
  odjezd: string; // "2026-10-29T07:30"
  prijezd: string;
  doprava: Doprava;
  km: number;
  spotreba: number; // l nebo kWh na 100 km (technický průkaz, kombinovaná)
  palivo: Palivo;
  cenaPaliva: number; // Kč za l / kWh
  /** Bezplatná jídla podle dní (klíč = datum) */
  jidla: Record<string, number>;
  vydaje: Vydaj[];
  zaloha: number;
};

const naHalere = (x: number) => Math.round(x * 100 + (x >= 0 ? 1e-9 : -1e-9)) / 100;
const minut = (iso: string) => Date.parse(`${iso.length === 16 ? iso + ":00" : iso}Z`) / 60000;

/** Rozdělí cestu na kalendářní dny a spočítá hodiny v každém dni (stravné se počítá za kalendářní den). */
export function dnyCesty(odjezd: string, prijezd: string): DenCesty[] {
  const od = minut(odjezd);
  const doo = minut(prijezd);
  if (!Number.isFinite(od) || !Number.isFinite(doo) || doo <= od) return [];
  const dny: DenCesty[] = [];
  let den = odjezd.slice(0, 10);
  for (let i = 0; i < 60; i++) {
    const zacatek = Math.max(od, minut(`${den}T00:00`));
    const dalsi = new Date(Date.parse(`${den}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
    const konec = Math.min(doo, minut(`${dalsi}T00:00`));
    if (konec > zacatek) dny.push({ datum: den, hodin: Math.round(((konec - zacatek) / 60) * 100) / 100, jidel: 0 });
    if (konec >= doo) break;
    den = dalsi;
  }
  return dny;
}

export type Vyuctovani = {
  dny: (DenCesty & { pasmo: 0 | 1 | 2 | null; zakladni: number; kraceni: number; stravne: number })[];
  stravne: number;
  jizdne: { zakladni: number; palivo: number; celkem: number; sazbaKm: number };
  vydaje: number;
  celkem: number;
  zaloha: number;
  doplatek: number; // kladný = doplatit cestovateli, záporný = vrátí
  sazby: Sazby;
};

export function vyuctovat(v: VstupCesty): Vyuctovani {
  const sazby = sazbyKeDni(v.odjezd);
  const dny = dnyCesty(v.odjezd, v.prijezd).map((d) => {
    // 5–12 h včetně, déle než 12 h nejvýš 18 h, déle než 18 h (§ 163 odst. 1 ZP)
    const pasmo = d.hodin > 18 ? 2 : d.hodin > 12 ? 1 : d.hodin >= 5 ? 0 : null;
    const jidel = Math.max(0, Math.min(3, Math.floor(v.jidla[d.datum] ?? 0)));
    const zakladni = pasmo === null ? 0 : sazby.stravne[pasmo];
    const kraceni = pasmo === null ? 0 : Math.min(zakladni, naHalere(zakladni * KRACENI[pasmo] * jidel));
    return { ...d, jidel, pasmo: pasmo as 0 | 1 | 2 | null, zakladni, kraceni, stravne: naHalere(zakladni - kraceni) };
  });
  const stravne = naHalere(dny.reduce((s, d) => s + d.stravne, 0));

  const vlastni = v.doprava === "auto" || v.doprava === "motocykl";
  const km = vlastni && Number.isFinite(v.km) && v.km > 0 ? v.km : 0;
  const sazbaKm = v.doprava === "motocykl" ? sazby.kmJednostopa : sazby.kmOsobni;
  const zakladni = naHalere(km * sazbaKm);
  const palivo = naHalere(km * ((Number.isFinite(v.spotreba) ? v.spotreba : 0) / 100) * (Number.isFinite(v.cenaPaliva) ? v.cenaPaliva : 0));
  const jizdne = { zakladni, palivo, celkem: naHalere(zakladni + palivo), sazbaKm };

  const vydaje = naHalere(v.vydaje.reduce((s, x) => s + (Number.isFinite(x.castka) ? x.castka : 0), 0));
  const celkem = naHalere(stravne + jizdne.celkem + vydaje);
  const zaloha = Number.isFinite(v.zaloha) && v.zaloha > 0 ? naHalere(v.zaloha) : 0;
  return { dny, stravne, jizdne, vydaje, celkem, zaloha, doplatek: naHalere(celkem - zaloha), sazby };
}

export const PASMA = ["5–12 h", "12–18 h", "nad 18 h"];
