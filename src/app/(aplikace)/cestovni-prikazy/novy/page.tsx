import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dnesIso } from "@/lib/faktura";
import { aktivniFirma } from "@/lib/firma";
import { dodavatelZFirmy } from "@/lib/faktury";
import { createClient } from "@/lib/supabase/server";
import { CestovniEditor } from "../CestovniEditor";

export const metadata: Metadata = { title: "Nový cestovní příkaz" };

export default async function NovyCestovniPrikazPage() {
  const firma = await aktivniFirma();
  if (!firma) redirect("/nastaveni");
  const dnes = dnesIso();
  const rok = Number(dnes.slice(0, 4));
  const supabase = await createClient();
  const { data } = await supabase.rpc("dalsi_cislo_dokladu", { p_org: firma.id, p_rok: rok, p_druh: "cp" });
  return <CestovniEditor firma={dodavatelZFirmy(firma)} dalsiCislo={typeof data === "string" ? data : `CP${rok}0001`} dnes={dnes} />;
}
