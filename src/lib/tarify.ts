// Tarify podle ZADANI.md. Ceny jsou za měsíc včetně všeho, co je v tarifu.
export type Tarif = "basic" | "pro";

export const TARIFY: Record<Tarif, { nazev: string; cena: number; popis: string; funkce: string[] }> = {
  basic: {
    nazev: "Basic",
    cena: 199,
    popis: "Pro živnostníky, kteří fakturují a uzavírají smlouvy.",
    funkce: [
      "Faktury pro plátce i neplátce DPH",
      "Zálohové faktury, QR platby, upomínky",
      "Archiv dokladů, grafy a vlastní přehled",
      "Smlouvy o dílo a o službách, licenční smlouva, NDA",
      "Předávací protokoly a cestovní příkazy",
      "Adresář klientů s načtením z ARES",
    ],
  },
  pro: {
    nazev: "Pro",
    cena: 449,
    popis: "Pro firmy se zaměstnanci a týmem.",
    funkce: [
      "Vše z tarifu Basic",
      "HR dokumenty: HPP, DPP, DPČ, mzdové výměry, ukončení poměru",
      "Firemní procesy: svěření majetku, BOZP, GDPR",
      "Pokladní doklady a dobropisy",
      "B2B smlouvy a plné moci",
      "Týmový přístup: víc uživatelů v jedné firmě",
    ],
  },
};

export function dniDo(iso: string, ted = Date.now()): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - ted) / 86_400_000));
}
