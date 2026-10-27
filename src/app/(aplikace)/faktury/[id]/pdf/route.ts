import { pdfFaktury } from "@/components/faktura/FakturaPdf";
import { aktivniFirma } from "@/lib/firma";
import { dataUlozeneFaktury, nactiFakturu } from "@/lib/faktury";

export const runtime = "nodejs";

// GET /faktury/<id>/pdf → stáhne fakturu jako PDF (jen přihlášený člen firmy)
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Faktura nenalezena", { status: 404 });
  const firma = await aktivniFirma();
  if (!firma) return new Response("Nepřihlášený uživatel", { status: 401 });
  const n = await nactiFakturu(firma.id, id);
  if (!n) return new Response("Faktura nenalezena", { status: 404 });

  try {
    const pdf = await pdfFaktury(dataUlozeneFaktury(n.faktura, n.polozky));
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="faktura-${n.faktura.number}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("PDF faktury se nepodařilo vytvořit:", (e as Error).message);
    return new Response("PDF se nepodařilo vytvořit. Zkuste to prosím znovu.", { status: 500 });
  }
}
