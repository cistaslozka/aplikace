import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dnesIso } from "@/lib/faktura";
import { aktivniFirma } from "@/lib/firma";
import { dalsiCisloFaktury, dodavatelZFirmy } from "@/lib/faktury";
import { FakturaEditor } from "../FakturaEditor";

export const metadata: Metadata = { title: "Nová faktura" };

export default async function NovaFakturaPage() {
  const firma = await aktivniFirma();
  if (!firma) redirect("/nastaveni");
  const dnes = dnesIso();
  const cislo = await dalsiCisloFaktury(firma.id, Number(dnes.slice(0, 4)));
  return <FakturaEditor dodavatel={dodavatelZFirmy(firma)} platce={firma.vat_payer} dnes={dnes} dalsiCislo={cislo} />;
}
