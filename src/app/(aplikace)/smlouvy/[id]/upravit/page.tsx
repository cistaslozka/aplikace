import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { dnesIso } from "@/lib/faktura";
import { aktivniFirma } from "@/lib/firma";
import { nactiSmlouvu } from "@/lib/smlouvyDb";
import { VZORY } from "@/lib/smlouvy/vzory";
import { SmlouvaEditor } from "../../SmlouvaEditor";

export const metadata: Metadata = { title: "Úprava smlouvy" };

export default async function UpravitSmlouvuPage({ params }: { params: Promise<{ id: string }> }) {
  const firma = await aktivniFirma();
  if (!firma) redirect("/nastaveni");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const s = await nactiSmlouvu(firma.id, id);
  if (!s) notFound();
  if (s.status !== "koncept" || !VZORY[s.kind]) redirect(`/smlouvy/${id}`);
  return (
    <SmlouvaEditor
      druh={s.kind}
      my={s.supplier}
      dalsiCislo={s.number}
      dnes={dnesIso()}
      vychozi={{
        id: s.id,
        cislo: s.number,
        kind: s.kind,
        client_id: s.client_id,
        we_supply: s.we_supply,
        customer: s.customer,
        title: s.title,
        fields: s.fields,
        place: s.place ?? "",
        signed_on: s.signed_on ?? "",
        template: s.template,
      }}
    />
  );
}
