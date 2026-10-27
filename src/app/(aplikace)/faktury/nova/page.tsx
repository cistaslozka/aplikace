import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { adresaLoga, dnesIso } from "@/lib/faktura";
import { aktivniFirma } from "@/lib/firma";
import { dalsiCisloDokladu, dodavatelZFirmy } from "@/lib/faktury";
import { FakturaEditor } from "../FakturaEditor";

export const metadata: Metadata = { title: "Nová faktura" };

export default async function NovaFakturaPage({ searchParams }: { searchParams: Promise<{ druh?: string }> }) {
  const { druh } = await searchParams;
  const firma = await aktivniFirma();
  if (!firma) redirect("/nastaveni");
  const dnes = dnesIso();
  const rok = Number(dnes.slice(0, 4));
  const [cislo, cisloZalohy] = await Promise.all([
    dalsiCisloDokladu(firma.id, rok, "faktura"),
    dalsiCisloDokladu(firma.id, rok, "zalohova"),
  ]);
  return (
    <FakturaEditor
      dodavatel={dodavatelZFirmy(firma)}
      platce={firma.vat_payer}
      dnes={dnes}
      dalsiCislo={cislo}
      dalsiCisloZalohy={cisloZalohy}
      vychoziDruh={druh === "zalohova" ? "zalohova" : "faktura"}
      logo={adresaLoga(firma.logo_path)}
    />
  );
}
