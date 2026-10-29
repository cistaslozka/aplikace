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
    // Funkce navíc se teprve připravují (ZADANI.md, kroky 8–10). Až budou hotové, smazat `brzy`.
    brzy: true,
    funkce: [
      { t: "Vše z tarifu Basic" },
      { t: "HR dokumenty: HPP, DPP, DPČ, mzdové výměry, ukončení poměru", brzy: true },
      { t: "Firemní procesy: svěření majetku, BOZP, GDPR", brzy: true },
      { t: "Pokladní doklady a dobropisy", brzy: true },
      { t: "B2B smlouvy a plné moci", brzy: true },
      { t: "Týmový přístup: víc uživatelů v jedné firmě", brzy: true },
    ],
  },
};

export function dniDo(iso: string, ted = Date.now()): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - ted) / 86_400_000));
}
