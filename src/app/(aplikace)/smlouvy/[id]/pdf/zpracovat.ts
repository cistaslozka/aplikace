import { pdfSmlouvy } from "@/components/smlouva/SmlouvaPdf";
import { chybaPdf, souborKeStazeni } from "@/lib/chybaPdf";
import { aktivniFirma } from "@/lib/firma";
import { VZORY } from "@/lib/smlouvy/vzory";
import { dataUlozeneSmlouvy, nactiSmlouvu } from "@/lib/smlouvyDb";

// GET /smlouvy/<id>/pdf → smlouva jako PDF
export async function SmlouvaPdfRoute(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return chybaPdf("Smlouva nenalezena", 404);
    const firma = await aktivniFirma();
    if (!firma) return chybaPdf("Nepřihlášený uživatel", 401);
    const s = await nactiSmlouvu(firma.id, id);
    if (!s) return chybaPdf("Smlouva nenalezena", 404);
    const d = dataUlozeneSmlouvy(s);
    const pdf = await pdfSmlouvy(d, VZORY[s.kind]?.clanky(d) ?? []);
    return souborKeStazeni(new Uint8Array(pdf), `smlouva-${s.number}.pdf`, "application/pdf");
  } catch (e) {
    console.error("PDF smlouvy se nepodařilo vytvořit:", e);
    return chybaPdf("PDF se nepodařilo vytvořit. Zkuste to prosím znovu.", 500, e);
  }
}
