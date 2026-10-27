import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { adresaLoga, dnesIso } from "@/lib/faktura";
import { aktivniFirma } from "@/lib/firma";
import { dodavatelZFirmy, nactiFakturu } from "@/lib/faktury";
import { FakturaEditor } from "../../FakturaEditor";

export const metadata: Metadata = { title: "Úprava faktury" };

export default async function UpravitFakturuPage({ params }: { params: Promise<{ id: string }> }) {
  const firma = await aktivniFirma();
  if (!firma) redirect("/nastaveni");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const n = await nactiFakturu(firma.id, id);
  if (!n) notFound();
  const f = n.faktura;
  if (f.status === "stornovana") redirect(`/faktury/${id}`);

  return (
    <FakturaEditor
      dodavatel={dodavatelZFirmy(firma)}
      platce={f.vat_payer}
      dnes={dnesIso()}
      dalsiCislo={f.number}
      logo={adresaLoga(firma.logo_path)}
      vychozi={{
        id: f.id,
        cislo: f.number,
        vs: f.variable_symbol,
        kind: f.kind === "zalohova" ? "zalohova" : "faktura",
        client_id: f.client_id,
        customer: f.customer,
        issue_date: f.issue_date,
        taxable_date: f.taxable_date,
        due_date: f.due_date,
        payment_method: f.payment_method,
        template: f.template,
        note: f.note ?? "",
        intro_text: f.intro_text ?? "",
        logo_position: f.logo_position,
        polozky: n.polozky,
      }}
    />
  );
}
