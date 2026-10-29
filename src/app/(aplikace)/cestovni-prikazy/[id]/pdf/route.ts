import { pdfCestovnihoPrikazu } from "@/components/cestovni/CestovniPrikazPdf";
import { chybaPdf } from "@/lib/chybaPdf";
import { dataUlozeneCesty, nactiCestu } from "@/lib/cestovniDb";
import { aktivniFirma } from "@/lib/firma";

export const runtime = "nodejs";

// GET /cestovni-prikazy/<id>/pdf → cestovní příkaz s vyúčtováním jako PDF
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return chybaPdf("Cestovní příkaz nenalezen", 404);
    const firma = await aktivniFirma();
    if (!firma) return chybaPdf("Nepřihlášený uživatel", 401);
    const c = await nactiCestu(firma.id, id);
    if (!c) return chybaPdf("Cestovní příkaz nenalezen", 404);
    const pdf = await pdfCestovnihoPrikazu(dataUlozeneCesty(c));
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="cestovni-prikaz-${c.number}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("PDF cestovního příkazu se nepodařilo vytvořit:", e);
    return chybaPdf("PDF se nepodařilo vytvořit. Zkuste to prosím znovu.", 500, e);
  }
}
