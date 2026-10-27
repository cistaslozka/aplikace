// Výpočty a formátování faktur. Čisté funkce, běží v prohlížeči (živý náhled) i na serveru.
// Výpočet je stejný jako v databázové funkci ulozit_fakturu, ta je ale rozhodující:
//   základ položky = round(množství × cena, 2)
//   DPH po sazbách = round(součet základů v sazbě × sazba / 100, 2)

export const SAZBY_DPH = [21, 12, 0] as const;
export type SazbaDph = (typeof SAZBY_DPH)[number];

export type Strana = {
  name: string;
  ico?: string | null;
  dic?: string | null;
  street?: string | null;
  city?: string | null;
  zip?: string | null;
  country?: string | null;
  email?: string | null;
  phone?: string | null;
  web?: string | null;
  legal_form?: string | null;
  registry_note?: string | null;
  bank_account?: string | null;
  iban?: string | null;
};

export type Polozka = {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  vat_rate: SazbaDph;
};

export type Rekapitulace = { rate: number; base: number; vat: number };

export type Vzhled = "minimal" | "corporate" | "creative";
export type ZpusobUhrady = "prevod" | "hotove" | "karta" | "dobirka";

export const ZPUSOBY_UHRADY: Record<ZpusobUhrady, string> = {
  prevod: "Bankovním převodem",
  hotove: "V hotovosti",
  karta: "Platební kartou",
  dobirka: "Dobírkou",
};

export const STAVY = {
  vystavena: "Čeká na úhradu",
  uhrazena: "Uhrazeno",
  stornovana: "Stornováno",
} as const;
export type StavFaktury = keyof typeof STAVY;

/** Zaokrouhlení na haléře jako v PostgreSQL round(): polovina od nuly. */
export function naHalere(x: number): number {
  const h = Math.round(Math.abs(x) * 100 + 1e-9) / 100;
  return x < 0 ? -h : h;
}

export function zakladPolozky(p: Pick<Polozka, "quantity" | "unit_price">): number {
  const q = Math.round(p.quantity * 1000) / 1000;
  return naHalere(q * naHalere(p.unit_price));
}

export function spocitej(polozky: Polozka[], platce: boolean) {
  const podleSazby = new Map<number, number>();
  for (const p of polozky) {
    const sazba = platce ? p.vat_rate : 0;
    podleSazby.set(sazba, naHalere((podleSazby.get(sazba) ?? 0) + zakladPolozky(p)));
  }
  const rekapitulace: Rekapitulace[] = [...podleSazby.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([rate, base]) => ({ rate, base, vat: naHalere((base * rate) / 100) }));
  const zaklad = naHalere(rekapitulace.reduce((s, r) => s + r.base, 0));
  const dph = naHalere(rekapitulace.reduce((s, r) => s + r.vat, 0));
  return { rekapitulace, zaklad, dph, celkem: naHalere(zaklad + dph) };
}

const kc = new Intl.NumberFormat("cs-CZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const cislo = new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 3 });

export function castka(x: number): string {
  return `${kc.format(x)} Kč`;
}

export function mnozstvi(x: number): string {
  return cislo.format(x);
}

export function datumCz(iso: string | null | undefined): string {
  if (!iso) return "";
  const [r, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d}. ${m}. ${r}`;
}

export function dnesIso(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Prague" }).format(new Date());
}

export function pridatDny(iso: string, dni: number): string {
  const [r, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(r, m - 1, d + dni));
  return dt.toISOString().slice(0, 10);
}

function utc(iso: string): number {
  const [r, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(r, m - 1, d);
}

export function dnuMezi(odIso: string, doIso: string): number {
  return Math.round((utc(doIso) - utc(odIso)) / 86_400_000);
}

/**
 * QR platba podle českého standardu SPAYD (Short Payment Descriptor),
 * který čtou všechny české bankovní aplikace.
 */
export function qrPlatba(o: { iban: string; castka: number; vs: string; zprava?: string; splatnost?: string }): string {
  const casti = [
    "SPD*1.0",
    `ACC:${o.iban.replace(/\s/g, "").toUpperCase()}`,
    `AM:${o.castka.toFixed(2)}`,
    "CC:CZK",
  ];
  if (o.splatnost) casti.push(`DT:${o.splatnost.replace(/-/g, "")}`);
  if (o.zprava) casti.push(`MSG:${o.zprava.replace(/\*/g, " ").normalize("NFD").replace(/[̀-ͯ]/g, "").slice(0, 60)}`);
  casti.push(`X-VS:${o.vs}`);
  return casti.join("*");
}

export function stavFaktury(status: StavFaktury, splatnost: string, dnes = dnesIso()) {
  if (status === "uhrazena") return { text: "Uhrazeno", typ: "zelena" as const };
  if (status === "stornovana") return { text: "Stornováno", typ: "seda" as const };
  const zbyva = dnuMezi(dnes, splatnost);
  if (zbyva < 0) return { text: `${-zbyva} ${dny(-zbyva)} po splatnosti`, typ: "cervena" as const };
  if (zbyva <= 3) return { text: zbyva === 0 ? "Splatná dnes" : `Splatná za ${zbyva} ${dny(zbyva)}`, typ: "oranzova" as const };
  return { text: "Čeká na úhradu", typ: "seda" as const };
}

export function dny(n: number) {
  return n === 1 ? "den" : n >= 2 && n <= 4 ? "dny" : "dní";
}
