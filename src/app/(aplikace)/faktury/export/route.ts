import { chybaPdf, souborKeStazeni } from "@/lib/chybaPdf";
import { aktivniFirma } from "@/lib/firma";
import { seznamFaktur } from "@/lib/faktury";
import { prehledFakturXlsx } from "@/lib/xlsx";

export const runtime = "nodejs";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// GET /faktury/export?rok=2026 → přehled faktur za rok jako Excel (pro účetní)
export async function GET(req: Request) {
  try {
    const firma = await aktivniFirma();
    if (!firma) return chybaPdf("Nepřihlášený uživatel", 401);
    const rokParam = new URL(req.url).searchParams.get("rok") ?? "";
    const rok = /^20\d{2}$/.test(rokParam) ? rokParam : null;
    const faktury = (await seznamFaktur(firma.id))
      .filter((f) => !rok || f.issue_date.startsWith(rok))
      .sort((a, b) => a.number.localeCompare(b.number));
    const xlsx = await prehledFakturXlsx(
      faktury.map((f) => ({
        druh: f.kind,
        cislo: f.number,
        vs: f.variable_symbol,
        vystaveno: f.issue_date,
        duzp: f.taxable_date,
        splatnost: f.due_date,
        odberatel: f.customer,
        zaklad: f.subtotal,
        dph: f.vat_total,
        celkem: f.total,
        stav: f.status,
        uhrazeno: f.paid_at,
        uhrada: f.payment_method,
      })),
      `${firma.name} – vydané doklady${rok ? ` ${rok}` : ""}`,
    );
    return souborKeStazeni(new Uint8Array(xlsx), `faktury-${rok ?? "vse"}.xlsx`, XLSX);
  } catch (e) {
    console.error("Přehled faktur do Excelu se nepodařilo vytvořit:", e);
    return chybaPdf("Soubor Excel se nepodařilo vytvořit. Zkuste to prosím znovu.", 500, e);
  }
}
