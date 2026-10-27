import { nazevSouboru } from "@/lib/faktura";
import { chybaPdf } from "@/lib/chybaPdf";
import { pdfFaktury } from "@/components/faktura/FakturaPdf";
import { aktivniFirma } from "@/lib/firma";
import { dataUlozeneFaktury, nactiFakturu } from "@/lib/faktury";

export const runtime = "nodejs";

// GET /faktury/<id>/pdf → stáhne fakturu jako PDF (jen přihlášený člen firmy)
async function vytvorit(params: Promise<{ id: string }>): Promise<Response> {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return chybaPdf("Faktura nenalezena", 404);
  const firma = await aktivniFirma();
  if (!firma) return chybaPdf("Nepřihlášený uživatel", 401);
  const n = await nactiFakturu(firma.id, id);
  if (!n) return chybaPdf("Faktura nenalezena", 404);

  try {
    const pdf = await pdfFaktury(dataUlozeneFaktury(n.faktura, n.polozky));
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${nazevSouboru(n.faktura.kind, n.faktura.number)}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("PDF faktury se nepodařilo vytvořit:", e);
    return chybaPdf("PDF se nepodařilo vytvořit. Zkuste to prosím znovu.", 500, e);
  }
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    return await vytvorit(params);
  } catch (e) {
    console.error("Stažení PDF selhalo:", e);
    return chybaPdf("PDF se nepodařilo vytvořit. Zkuste to prosím znovu.", 500, e);
  }
}
