import { nazevSouboru } from "@/lib/faktura";
import { chybaPdf, souborKeStazeni } from "@/lib/chybaPdf";
import { aktivniFirma } from "@/lib/firma";
import { nactiFakturu } from "@/lib/faktury";
import { fakturaIsdoc } from "@/lib/isdoc";

export const runtime = "nodejs";

// GET /faktury/<id>/isdoc → faktura ve formátu ISDOC 6.0.2 pro účetní programy
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return chybaPdf("Faktura nenalezena", 404);
    const firma = await aktivniFirma();
    if (!firma) return chybaPdf("Nepřihlášený uživatel", 401);
    const n = await nactiFakturu(firma.id, id);
    if (!n) return chybaPdf("Faktura nenalezena", 404);
    const f = n.faktura;
    const xml = fakturaIsdoc({
      id: f.id,
      druh: f.kind,
      cislo: f.number,
      vs: f.variable_symbol,
      dodavatel: f.supplier,
      odberatel: f.customer,
      vystaveno: f.issue_date,
      duzp: f.taxable_date,
      splatnost: f.due_date,
      uhrada: f.payment_method,
      platce: f.vat_payer,
      polozky: n.polozky,
      rekapitulace: f.vat_recap,
      zaklad: f.subtotal,
      dph: f.vat_total,
      celkem: f.total,
      poznamka: f.note,
      uvod: f.intro_text,
      odpocet: f.advance_amount > 0 ? { cislo: n.zalohaCislo ?? "", castka: f.advance_amount, rekapitulace: f.advance_recap } : null,
      oprava: n.oprava,
    });
    return souborKeStazeni(xml, `${nazevSouboru(f.kind, f.number)}.isdoc`, "application/xml; charset=utf-8");
  } catch (e) {
    console.error("ISDOC faktury se nepodařilo vytvořit:", e);
    return chybaPdf("Soubor ISDOC se nepodařilo vytvořit. Zkuste to prosím znovu.", 500, e);
  }
}
