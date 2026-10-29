import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dnesIso } from "@/lib/faktura";
import { aktivniFirma } from "@/lib/firma";
import { dodavatelZFirmy } from "@/lib/faktury";
import type { DruhSmlouvy } from "@/lib/smlouvy";
import { VZORY } from "@/lib/smlouvy/vzory";
import { dalsiCisloSmlouvy } from "@/lib/smlouvyDb";
import { SmlouvaEditor } from "../SmlouvaEditor";

export const metadata: Metadata = { title: "Nová smlouva" };

export default async function NovaSmlouvaPage({ searchParams }: { searchParams: Promise<{ druh?: string }> }) {
  const firma = await aktivniFirma();
  if (!firma) redirect("/nastaveni");
  const { druh = "dilo" } = await searchParams;
  if (!(druh in VZORY)) redirect("/smlouvy");
  const dnes = dnesIso();
  const cislo = await dalsiCisloSmlouvy(firma.id, Number(dnes.slice(0, 4)));
  return (
    <SmlouvaEditor
      druh={druh as DruhSmlouvy}
      my={{ ...dodavatelZFirmy(firma), vat_payer: firma.vat_payer }}
      dalsiCislo={cislo}
      dnes={dnes}
    />
  );
}
