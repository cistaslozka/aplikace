import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { adresaLoga, dnesIso, pridatDny, type Rekapitulace } from "@/lib/faktura";
import { aktivniFirma } from "@/lib/firma";
import { dalsiCisloDokladu, dodavatelZFirmy, nactiFakturu, nactiSouvisejici } from "@/lib/faktury";
import { FakturaEditor, type VychoziFaktura } from "../FakturaEditor";

export const metadata: Metadata = { title: "Nová faktura" };

type Props = { searchParams: Promise<{ druh?: string; zaloha?: string }> };

export default async function NovaFakturaPage({ searchParams }: Props) {
  const { druh, zaloha: zalohaId } = await searchParams;
  const firma = await aktivniFirma();
  if (!firma) redirect("/nastaveni");
  const dnes = dnesIso();
  const rok = Number(dnes.slice(0, 4));
  const [cislo, cisloZalohy] = await Promise.all([dalsiCisloDokladu(firma.id, rok, "faktura"), dalsiCisloDokladu(firma.id, rok, "zalohova")]);

  // Konečná faktura ze zaplacené zálohy: předvyplnit odběratele a položky
  let predloha: VychoziFaktura | undefined;
  let vyuctovani: { id: string; cislo: string; castka: number; rekapitulace: Rekapitulace[] } | undefined;
  if (zalohaId && /^[0-9a-f-]{36}$/i.test(zalohaId)) {
    const n = await nactiFakturu(firma.id, zalohaId);
    const z = n?.faktura;
    if (!n || !z || z.kind !== "zalohova" || z.status !== "uhrazena") redirect(`/faktury/${zalohaId}`);
    const { navazane } = await nactiSouvisejici(z);
    if (navazane.some((x) => x.kind === "faktura" && x.status !== "stornovana")) redirect(`/faktury/${zalohaId}`);
    if (z.vat_payer && !navazane.some((x) => x.kind === "ddpp" && x.status !== "stornovana")) {
      redirect(`/faktury/${zalohaId}?chyba=${encodeURIComponent("Nejdřív vystavte daňový doklad k přijaté platbě.")}`);
    }
    vyuctovani = { id: z.id, cislo: z.number, castka: z.total, rekapitulace: z.vat_recap };
    predloha = {
      kind: "faktura",
      cislo,
      vs: cislo,
      client_id: z.client_id,
      customer: z.customer,
      issue_date: dnes,
      taxable_date: dnes,
      due_date: pridatDny(dnes, 14),
      payment_method: z.payment_method,
      template: z.template,
      note: "",
      intro_text: "",
      logo_position: z.logo_position,
      polozky: n.polozky.map((p) => ({ ...p, description: p.description.replace(/^Záloha( na)?\s*/i, "") || p.description })),
    };
  }

  return (
    <FakturaEditor
      dodavatel={dodavatelZFirmy(firma)}
      platce={firma.vat_payer}
      dnes={dnes}
      dalsiCislo={cislo}
      dalsiCisloZalohy={cisloZalohy}
      vychoziDruh={druh === "zalohova" ? "zalohova" : "faktura"}
      logo={adresaLoga(firma.logo_path)}
      predloha={predloha}
      vyuctovani={vyuctovani}
    />
  );
}
