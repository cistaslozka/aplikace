import { pdfUpominky } from "@/components/faktura/FakturaPdf";
import { aktivniFirma } from "@/lib/firma";
import { dataUlozeneFaktury, nactiFakturu, nactiUpominky } from "@/lib/faktury";

export const runtime = "nodejs";

// GET /faktury/<id>/upominka/<1–3> → stáhne upomínku jako PDF
export async function GET(_: Request, { params }: { params: Promise<{ id: string; cislo: string }> }) {
  const { id, cislo } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[1-3]$/.test(cislo)) return new Response("Upomínka nenalezena", { status: 404 });
  const firma = await aktivniFirma();
  if (!firma) return new Response("Nepřihlášený uživatel", { status: 401 });
  const n = await nactiFakturu(firma.id, id);
  if (!n) return new Response("Faktura nenalezena", { status: 404 });
  const u = (await nactiUpominky(id)).find((x) => x.level === Number(cislo));
  if (!u) return new Response("Upomínka nenalezena", { status: 404 });

  try {
    const pdf = await pdfUpominky(dataUlozeneFaktury(n.faktura, n.polozky), u);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="upominka-${cislo}-faktura-${n.faktura.number}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("PDF upomínky se nepodařilo vytvořit:", (e as Error).message);
    return new Response("PDF se nepodařilo vytvořit. Zkuste to prosím znovu.", { status: 500 });
  }
}
