// Pokladní doklady (příjmový PPD, výdajový VPD). Čisté funkce – běží v prohlížeči i na serveru.
import type { Strana } from "./faktura";

export type DruhPokladny = "prijem" | "vydej";
export const NAZVY_POKLADNY: Record<DruhPokladny, string> = { prijem: "Příjmový pokladní doklad", vydej: "Výdajový pokladní doklad" };
export const KRATCE_POKLADNY: Record<DruhPokladny, string> = { prijem: "Příjem", vydej: "Výdaj" };

/** Limit plateb v hotovosti podle zákona č. 254/2004 Sb. (za jeden den a jednoho příjemce). */
export const LIMIT_HOTOVOSTI = 270_000;

export type PokladniDoklad = {
  id: string;
  kind: DruhPokladny;
  number: string;
  issue_date: string;
  amount: number;
  purpose: string;
  partner: Strana;
  supplier: Strana;
  vat_payer: boolean;
  vat_rate: number | null;
  vat_base: number | null;
  vat_amount: number | null;
  invoice_id: string | null;
  note: string | null;
  status: "platny" | "stornovany";
  created_at: string;
};

export const SLOUPCE_POKLADNY =
  "id, kind, number, issue_date, amount, purpose, partner, supplier, vat_payer, vat_rate, vat_base, vat_amount, invoice_id, note, status, created_at";

export function cislaPokladny(r: Record<string, unknown>): PokladniDoklad {
  const d = r as unknown as PokladniDoklad;
  const n = (x: unknown) => (x === null || x === undefined ? null : Number(x));
  return { ...d, amount: Number(d.amount), vat_rate: n(d.vat_rate), vat_base: n(d.vat_base), vat_amount: n(d.vat_amount) };
}

/** Zůstatek pokladny: příjmy minus výdaje (bez stornovaných). */
export function zustatek(doklady: Pick<PokladniDoklad, "kind" | "amount" | "status">[]): number {
  const h = doklady.reduce((s, d) => (d.status === "stornovany" ? s : s + (d.kind === "prijem" ? 1 : -1) * Math.round(d.amount * 100)), 0);
  return h / 100;
}

// ——— Částka slovy („tisíc dvě stě deset korun“) ———

const JEDNOTKY = ["", "jedna", "dvě", "tři", "čtyři", "pět", "šest", "sedm", "osm", "devět"];
const NACTKY = ["deset", "jedenáct", "dvanáct", "třináct", "čtrnáct", "patnáct", "šestnáct", "sedmnáct", "osmnáct", "devatenáct"];
const DESITKY = ["", "", "dvacet", "třicet", "čtyřicet", "padesát", "šedesát", "sedmdesát", "osmdesát", "devadesát"];
const STOVKY = ["", "sto", "dvě stě", "tři sta", "čtyři sta", "pět set", "šest set", "sedm set", "osm set", "devět set"];

/** Číslo 0–999 slovy. `muzsky` = „jeden/dva“ (tisíc, milion), jinak „jedna/dvě“ (koruna). */
function doTisice(n: number, muzsky: boolean): string {
  const s = Math.floor(n / 100);
  const zbytek = n % 100;
  const casti = [STOVKY[s]];
  if (zbytek >= 10 && zbytek < 20) casti.push(NACTKY[zbytek - 10]);
  else {
    casti.push(DESITKY[Math.floor(zbytek / 10)]);
    const j = zbytek % 10;
    casti.push(muzsky && j === 1 ? "jeden" : muzsky && j === 2 ? "dva" : JEDNOTKY[j]);
  }
  return casti.filter(Boolean).join(" ");
}

/** Tvar podle počtu: 1 koruna, 2–4 koruny (i 22–24 …), jinak korun (i 21, 101 …). */
function tvar(n: number, jedna: string, dve: string, pet: string) {
  if (n === 1) return jedna;
  const d = n % 100;
  const j = n % 10;
  return (d < 10 || d > 20) && j >= 2 && j <= 4 ? dve : pet;
}

/** 1 210,50 → „tisíc dvě stě deset korun 50/100“ */
export function castkaSlovy(castka: number): string {
  const halere = Math.round(Math.abs(castka) * 100);
  const celkem = Math.floor(halere / 100);
  const h = halere % 100;
  const hal = h ? ` ${String(h).padStart(2, "0")}/100` : "";
  if (celkem === 0) return `nula korun${hal}`;
  const miliony = Math.floor(celkem / 1_000_000);
  const tisice = Math.floor((celkem % 1_000_000) / 1000);
  const zbytek = celkem % 1000;
  const casti: string[] = [];
  if (miliony) casti.push(miliony === 1 ? "milion" : `${doTisice(miliony, true)} ${tvar(miliony, "milion", "miliony", "milionů")}`);
  if (tisice) casti.push(tisice === 1 ? "tisíc" : `${doTisice(tisice, true)} ${tvar(tisice, "tisíc", "tisíce", "tisíc")}`);
  if (zbytek) casti.push(doTisice(zbytek, false));
  const koruny = zbytek === 0 ? "korun" : tvar(celkem, "koruna", "koruny", "korun");
  return `${casti.join(" ")} ${koruny}${hal}`;
}
