import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { adresaLoga, dnesIso } from "@/lib/faktura";
import { aktivniFirma } from "@/lib/firma";
import { dalsiCisloDokladu, nactiFakturu, nactiSouvisejici } from "@/lib/faktury";
import { DobropisEditor } from "./DobropisEditor";

export const metadata: Metadata = { title: "Nový dobropis" };

type Props = { params: Promise<{ id: string }> };

export default async function DobropisPage({ params }: Props) {
  const firma = await aktivniFirma();
  if (!firma) redirect("/nastaveni");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const n = await nactiFakturu(firma.id, id);
  if (!n) notFound();
  const f = n.faktura;
  if (f.kind !== "faktura" || f.status === "stornovana") redirect(`/faktury/${id}`);

  const { navazane } = await nactiSouvisejici(f);
  const zbyva = f.total + navazane.filter((x) => x.kind === "dobropis" && x.status !== "stornovana").reduce((s, x) => s + x.total, 0);
  if (zbyva <= 0) redirect(`/faktury/${id}?chyba=${encodeURIComponent("Faktura už je celá opravená dobropisy.")}`);

  const dnes = dnesIso();
  const cislo = await dalsiCisloDokladu(firma.id, Number(dnes.slice(0, 4)), "dobropis");

  return (
    <DobropisEditor
      puvodni={{
        id: f.id,
        cislo: f.number,
        vs: f.variable_symbol,
        vystaveno: f.issue_date,
        celkem: f.total,
        zbyva,
        dodavatel: f.supplier,
        odberatel: f.customer,
        platce: f.vat_payer,
        uhrada: f.payment_method,
        vzhled: f.template,
        logo: f.logo_position ? adresaLoga(f.logo_path) : null,
        logoPozice: f.logo_position,
        polozky: n.polozky,
      }}
      dalsiCislo={cislo}
      dnes={dnes}
    />
  );
}
