// Tarify podle ZADANI.md. Ceny jsou za měsíc včetně všeho, co je v tarifu.
export type Tarif = "basic" | "pro";

/** Funkce v tarifu. `brzy` = zatím ve vývoji, v ceníku se ukáže štítek „Brzy“. */
export type Funkce = { t: string; brzy?: boolean };

export const TARIFY: Record<Tarif, { nazev: string; cena: number; popis: string; brzy?: boolean; funkce: Funkce[] }> = {
  basic: {
    nazev: "Basic",
    cena: 199,
    popis: "Pro živnostníky, kteří fakturují a uzavírají smlouvy.",
    funkce: [
      { t: "Faktury pro plátce i neplátce DPH" },
      { t: "Zálohové faktury, QR platby, upomínky" },
      { t: "Archiv dokladů, grafy a vlastní přehled" },
      { t: "Smlouvy o dílo a o službách, licenční smlouva, NDA" },
      { t: "Předávací protokoly a podpis na obrazovce" },
      { t: "Adresář klientů s načtením z ARES" },
      { t: "Cestovní příkazy s vyúčtováním" },
    ],
  },
  pro: {
    nazev: "Pro",
    cena: 449,
    popis: "Pro firmy se zaměstnanci a týmem.",
    funkce: [
      { t: "Vše z tarifu Basic" },
      { t: "HR dokumenty: pracovní smlouva, DPP, DPČ, mzdový výměr, výpověď" },
      { t: "Dohoda o rozvázání, upozornění na porušení povinností, svěření předmětů" },
      { t: "Úřady a lhůty: co a do kdy poslat na ČSSZ, pojišťovnu a finanční úřad" },
      { t: "B2B smlouvy: kupní, rámcová, nájemní a plná moc" },
      { t: "Pokladní doklady a dobropisy" },
      { t: "Týmový přístup: víc uživatelů v jedné firmě" },
    ],
  },
};

export function dniDo(iso: string, ted = Date.now()): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - ted) / 86_400_000));
}
