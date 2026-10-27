import { chybaPdf, souborKeStazeni } from "@/lib/chybaPdf";
import { aktivniFirma } from "@/lib/firma";
import { nactiFakturu } from "@/lib/faktury";
import { fakturaXlsx } from "@/lib/xlsx";

export const runtime = "nodejs";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// GET /faktury/<id>/xlsx → faktura jako tabulka Excel
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return chybaPdf("Faktura nenalezena", 404);
    const firma = await aktivniFirma();
    if (!firma) return chybaPdf("Nepřihlášený uživatel", 401);
    const n = await nactiFakturu(firma.id, id);
    if (!n) return chybaPdf("Faktura nenalezena", 404);
    const f = n.faktura;
    const xlsx = await fakturaXlsx({
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
      stav: f.status,
    });
    return souborKeStazeni(new Uint8Array(xlsx), `faktura-${f.number}.xlsx`, XLSX);
  } catch (e) {
    console.error("XLSX faktury se nepodařilo vytvořit:", e);
    return chybaPdf("Soubor Excel se nepodařilo vytvořit. Zkuste to prosím znovu.", 500, e);
  }
}
