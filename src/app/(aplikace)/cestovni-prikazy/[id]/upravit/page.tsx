import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { dnesIso } from "@/lib/faktura";
import { aktivniFirma } from "@/lib/firma";
import { nactiCestu } from "@/lib/cestovniDb";
import { CestovniEditor } from "../../CestovniEditor";

export const metadata: Metadata = { title: "Úprava cestovního příkazu" };

export default async function UpravitCestuPage({ params }: { params: Promise<{ id: string }> }) {
  const firma = await aktivniFirma();
  if (!firma) redirect("/nastaveni");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const c = await nactiCestu(firma.id, id);
  if (!c) notFound();
  if (c.status === "stornovany") redirect(`/cestovni-prikazy/${id}`);
  return (
    <CestovniEditor
      firma={c.supplier}
      dalsiCislo={c.number}
      dnes={dnesIso()}
      vychozi={{
        id: c.id,
        cislo: c.number,
        cestovatel: { name: c.traveler.name, address: c.traveler.address ?? "" },
        ucel: c.purpose,
        misto: c.destination,
        vozidlo: { spz: c.trip.vozidlo?.spz ?? "", model: c.trip.vozidlo?.model ?? "" },
        vstup: c.trip.vstup,
        poznamka: c.note ?? "",
      }}
    />
  );
}
