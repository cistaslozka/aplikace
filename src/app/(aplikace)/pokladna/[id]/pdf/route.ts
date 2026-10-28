import { pdfPokladnihoDokladu } from "@/components/pokladna/PokladniDokladPdf";
import { chybaPdf } from "@/lib/chybaPdf";
import { aktivniFirma } from "@/lib/firma";
import { dataUlozenehoDokladu, nactiPokladniDoklad } from "@/lib/pokladnaDb";

export const runtime = "nodejs";

// GET /pokladna/<id>/pdf → pokladní doklad jako PDF (A5 na šířku)
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return chybaPdf("Doklad nenalezen", 404);
    const firma = await aktivniFirma();
    if (!firma) return chybaPdf("Nepřihlášený uživatel", 401);
    const n = await nactiPokladniDoklad(firma.id, id);
    if (!n) return chybaPdf("Doklad nenalezen", 404);
    const pdf = await pdfPokladnihoDokladu(dataUlozenehoDokladu(n.doklad, n.faktura));
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="pokladni-doklad-${n.doklad.number}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("PDF pokladního dokladu se nepodařilo vytvořit:", e);
    return chybaPdf("PDF se nepodařilo vytvořit. Zkuste to prosím znovu.", 500, e);
  }
}
