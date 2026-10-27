import { naHalere, zakladPolozky, type Polozka, type Rekapitulace, type Strana, type ZpusobUhrady } from "./faktura";
import { rozeberUcet } from "./validace";

/*
  Faktura ve formátu ISDOC 6.0.2 (národní standard elektronické faktury, https://isdoc.cz).
  Pořadí elementů musí přesně odpovídat schématu isdoc-invoice-6.0.2.xsd, jinak ho účetní
  programy odmítnou. Test: xmllint --schema isdoc-invoice-6.0.2.xsd faktura.isdoc
*/

export type DataIsdoc = {
  id: string; // UUID faktury v naší databázi
  cislo: string;
  vs: string;
  dodavatel: Strana;
  odberatel: Strana;
  vystaveno: string;
  duzp: string | null;
  splatnost: string;
  uhrada: ZpusobUhrady;
  platce: boolean;
  polozky: Polozka[];
  rekapitulace: Rekapitulace[];
  zaklad: number;
  dph: number;
  celkem: number;
  poznamka?: string | null;
  uvod?: string | null;
  uhrazeno?: boolean;
};

// Kód způsobu platby podle číselníku ISDOC
const KOD_PLATBY: Record<ZpusobUhrady, number> = { hotove: 10, prevod: 42, karta: 48, dobirka: 50 };

const ZEME: Record<string, string> = { CZ: "Česká republika", SK: "Slovensko", DE: "Německo", AT: "Rakousko", PL: "Polsko" };

function esc(t: string | number | boolean | null | undefined): string {
  return String(t ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    // znaky, které XML 1.0 nedovoluje
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

const el = (nazev: string, obsah: string | number | boolean | null | undefined) => `<${nazev}>${esc(obsah)}</${nazev}>`;
const kc = (x: number) => naHalere(x).toFixed(2);

/** „Strážní 852/7" → ulice „Strážní", číslo „852/7". Bez čísla zůstane celá ulice a číslo prázdné. */
export function rozdelUlici(ulice: string | null | undefined): { ulice: string; cislo: string } {
  const t = (ulice ?? "").trim();
  const m = t.match(/^(.*\S)\s+(\d+[a-zA-Z]?(?:\/\d+[a-zA-Z]?)?)$/);
  return m ? { ulice: m[1], cislo: m[2] } : { ulice: t, cislo: "" };
}

function strana(s: Strana): string {
  const { ulice, cislo } = rozdelUlici(s.street);
  const zeme = (s.country || "CZ").toUpperCase();
  const kontakt =
    s.email || s.phone
      ? `<Contact>${s.phone ? el("Telephone", s.phone) : ""}${s.email ? el("ElectronicMail", s.email) : ""}</Contact>`
      : "";
  return (
    "<Party>" +
    `<PartyIdentification>${el("ID", s.ico ?? "")}</PartyIdentification>` +
    `<PartyName>${el("Name", s.name.replace(/\s+/g, " ").trim())}</PartyName>` +
    "<PostalAddress>" +
    el("StreetName", ulice) +
    el("BuildingNumber", cislo) +
    el("CityName", s.city ?? "") +
    el("PostalZone", (s.zip ?? "").replace(/\s/g, "")) +
    `<Country>${el("IdentificationCode", zeme)}${el("Name", ZEME[zeme] ?? zeme)}</Country>` +
    "</PostalAddress>" +
    (s.dic ? `<PartyTaxScheme>${el("CompanyID", s.dic)}${el("TaxScheme", "VAT")}</PartyTaxScheme>` : "") +
    kontakt +
    "</Party>"
  );
}

export function fakturaIsdoc(d: DataIsdoc): string {
  const sazba = (p: Polozka) => (d.platce ? p.vat_rate : 0);

  const radky = d.polozky
    .map((p, i) => {
      const zaklad = zakladPolozky(p);
      const dan = naHalere((zaklad * sazba(p)) / 100);
      const cenaSDph = naHalere(p.unit_price * (1 + sazba(p) / 100));
      return (
        "<InvoiceLine>" +
        el("ID", i + 1) +
        `<InvoicedQuantity${p.unit ? ` unitCode="${esc(p.unit)}"` : ""}>${p.quantity}</InvoicedQuantity>` +
        el("LineExtensionAmount", kc(zaklad)) +
        el("LineExtensionAmountTaxInclusive", kc(zaklad + dan)) +
        el("LineExtensionTaxAmount", kc(dan)) +
        el("UnitPrice", kc(p.unit_price)) +
        el("UnitPriceTaxInclusive", kc(cenaSDph)) +
        `<ClassifiedTaxCategory>${el("Percent", sazba(p))}${el("VATCalculationMethod", 0)}${el("VATApplicable", d.platce)}</ClassifiedTaxCategory>` +
        `<Item>${el("Description", p.description)}</Item>` +
        "</InvoiceLine>"
      );
    })
    .join("");

  // Rekapitulace DPH: u neplátce jeden řádek se sazbou 0 %
  const rekap: Rekapitulace[] = d.platce && d.rekapitulace.length ? d.rekapitulace : [{ rate: 0, base: d.zaklad, vat: 0 }];
  const souhrn = rekap
    .map(
      (r) =>
        "<TaxSubTotal>" +
        el("TaxableAmount", kc(r.base)) +
        el("TaxAmount", kc(r.vat)) +
        el("TaxInclusiveAmount", kc(r.base + r.vat)) +
        el("AlreadyClaimedTaxableAmount", kc(0)) +
        el("AlreadyClaimedTaxAmount", kc(0)) +
        el("AlreadyClaimedTaxInclusiveAmount", kc(0)) +
        el("DifferenceTaxableAmount", kc(r.base)) +
        el("DifferenceTaxAmount", kc(r.vat)) +
        el("DifferenceTaxInclusiveAmount", kc(r.base + r.vat)) +
        `<TaxCategory>${el("Percent", r.rate)}${el("VATApplicable", d.platce)}</TaxCategory>` +
        "</TaxSubTotal>",
    )
    .join("");

  const ucet = d.dodavatel.bank_account ? rozeberUcet(d.dodavatel.bank_account) : null;
  const detailPlatby =
    d.uhrada === "prevod" && (ucet || d.dodavatel.iban)
      ? "<Details>" +
        el("PaymentDueDate", d.splatnost) +
        el("ID", ucet ? `${ucet.predcisli ? ucet.predcisli + "-" : ""}${ucet.cislo}` : "") +
        el("BankCode", ucet?.banka ?? "") +
        el("Name", "") +
        el("IBAN", (d.dodavatel.iban ?? "").replace(/\s/g, "")) +
        el("BIC", "") +
        el("VariableSymbol", d.vs) +
        "</Details>"
      : "";

  const poznamka = [d.uvod, d.poznamka].filter((x) => x && x.trim()).join("\n");

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<Invoice xmlns="http://isdoc.cz/namespace/2013" version="6.0.2">' +
    el("DocumentType", 1) +
    el("ID", d.cislo) +
    el("UUID", d.id.toUpperCase()) +
    el("IssuingSystem", "čistásložka.cz") +
    el("IssueDate", d.vystaveno) +
    (d.platce ? el("TaxPointDate", d.duzp ?? d.vystaveno) : "") +
    el("VATApplicable", d.platce) +
    el("ElectronicPossibilityAgreementReference", "") +
    (poznamka ? el("Note", poznamka) : "") +
    el("LocalCurrencyCode", "CZK") +
    el("CurrRate", 1) +
    el("RefCurrRate", 1) +
    `<AccountingSupplierParty>${strana(d.dodavatel)}</AccountingSupplierParty>` +
    `<AccountingCustomerParty>${strana(d.odberatel)}</AccountingCustomerParty>` +
    `<InvoiceLines>${radky}</InvoiceLines>` +
    `<TaxTotal>${souhrn}${el("TaxAmount", kc(d.platce ? d.dph : 0))}</TaxTotal>` +
    "<LegalMonetaryTotal>" +
    el("TaxExclusiveAmount", kc(d.zaklad)) +
    el("TaxInclusiveAmount", kc(d.celkem)) +
    el("AlreadyClaimedTaxExclusiveAmount", kc(0)) +
    el("AlreadyClaimedTaxInclusiveAmount", kc(0)) +
    el("DifferenceTaxExclusiveAmount", kc(d.zaklad)) +
    el("DifferenceTaxInclusiveAmount", kc(d.celkem)) +
    el("PaidDepositsAmount", kc(0)) +
    el("PayableAmount", kc(d.celkem)) +
    "</LegalMonetaryTotal>" +
    `<PaymentMeans><Payment>${el("PaidAmount", kc(d.celkem))}${el("PaymentMeansCode", KOD_PLATBY[d.uhrada])}${detailPlatby}</Payment></PaymentMeans>` +
    "</Invoice>\n"
  );
}
