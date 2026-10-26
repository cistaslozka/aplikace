// Kontroly českých údajů. Čisté funkce bez závislostí, dají se použít v prohlížeči i na serveru.

/** IČO: 8 číslic, poslední je kontrolní (vážený součet modulo 11). */
export function jePlatneIco(ico: string): boolean {
  if (!/^\d{8}$/.test(ico)) return false;
  const c = ico.split("").map(Number);
  const soucet = c.slice(0, 7).reduce((s, d, i) => s + d * (8 - i), 0);
  return (11 - (soucet % 11)) % 10 === c[7];
}

/** Doplní IČO zleva nulami na 8 číslic (ARES vrací i kratší). */
export function normalizujIco(vstup: string): string {
  const cisla = vstup.replace(/\s/g, "");
  return /^\d{1,8}$/.test(cisla) ? cisla.padStart(8, "0") : cisla;
}

const VAHY_PREDCISLI = [10, 5, 8, 4, 2, 1];
const VAHY_CISLA = [6, 3, 7, 9, 10, 5, 8, 4, 2, 1];

function modulo11(cislo: string, vahy: number[]): boolean {
  const c = cislo.padStart(vahy.length, "0").split("").map(Number);
  return c.reduce((s, d, i) => s + d * vahy[i], 0) % 11 === 0;
}

export type CisloUctu = { predcisli: string; cislo: string; banka: string };

/** Rozloží „předčíslí-číslo/kód banky" a ověří kontrolní součty podle vyhlášky ČNB. */
export function rozeberUcet(vstup: string): CisloUctu | null {
  const m = vstup.replace(/\s/g, "").match(/^(?:(\d{1,6})-)?(\d{2,10})\/(\d{4})$/);
  if (!m) return null;
  const [, predcisli = "", cislo, banka] = m;
  if (predcisli && !modulo11(predcisli, VAHY_PREDCISLI)) return null;
  if (!modulo11(cislo, VAHY_CISLA)) return null;
  if (/^0+$/.test(cislo)) return null;
  return { predcisli: predcisli.replace(/^0+/, ""), cislo: cislo.replace(/^0+(?=\d{2})/, ""), banka };
}

export function formatujUcet(u: CisloUctu): string {
  return `${u.predcisli ? u.predcisli + "-" : ""}${u.cislo}/${u.banka}`;
}

function mod97(cisla: string): number {
  let zbytek = 0;
  for (const z of cisla) zbytek = (zbytek * 10 + Number(z)) % 97;
  return zbytek;
}

/** Ze českého čísla účtu spočítá IBAN (CZkk BBBB PPPPPP CCCCCCCCCC). */
export function ibanZUctu(u: CisloUctu): string {
  const bban = u.banka + u.predcisli.padStart(6, "0") + u.cislo.padStart(10, "0");
  // "CZ00" → C=12, Z=35, 00 na konec
  const kontrola = 98 - mod97(bban + "123500");
  return `CZ${String(kontrola).padStart(2, "0")}${bban}`;
}

/** Ověří IBAN (délka a kontrolní číslice modulo 97). */
export function jePlatnyIban(vstup: string): boolean {
  const iban = vstup.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[0-9A-Z]{10,30}$/.test(iban)) return false;
  if (iban.startsWith("CZ") && iban.length !== 24) return false;
  const preskladany = (iban.slice(4) + iban.slice(0, 4)).replace(/[A-Z]/g, (p) => String(p.charCodeAt(0) - 55));
  return mod97(preskladany) === 1;
}

export function formatujIban(iban: string): string {
  return iban.replace(/\s/g, "").toUpperCase().replace(/(.{4})/g, "$1 ").trim();
}

/** PSČ ve tvaru „602 00". */
export function normalizujPsc(vstup: string): string | null {
  const c = vstup.replace(/\s/g, "");
  return /^\d{5}$/.test(c) ? `${c.slice(0, 3)} ${c.slice(3)}` : null;
}

/** DIČ velkými písmeny bez mezer, např. CZ08912345. */
export function normalizujDic(vstup: string): string | null {
  const d = vstup.replace(/\s/g, "").toUpperCase();
  if (!d) return null;
  return /^[A-Z]{2}[0-9A-Z]{2,12}$/.test(d) ? d : null;
}
