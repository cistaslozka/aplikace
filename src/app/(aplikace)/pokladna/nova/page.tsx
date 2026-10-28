import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dnesIso } from "@/lib/faktura";
import { aktivniFirma } from "@/lib/firma";
import { dodavatelZFirmy, nactiFakturu } from "@/lib/faktury";
import { createClient } from "@/lib/supabase/server";
import { NovyDoklad, type PredvyplneniFaktury } from "./NovyDoklad";

export const metadata: Metadata = { title: "Nový pokladní doklad" };

type Props = { searchParams: Promise<{ druh?: string; faktura?: string }> };

export default async function NovyPokladniDokladPage({ searchParams }: Props) {
  const firma = await aktivniFirma();
  if (!firma) redirect("/nastaveni");
  const p = await searchParams;
  const dnes = dnesIso();
  const rok = Number(dnes.slice(0, 4));
  const supabase = await createClient();
  const [{ data: ppd }, { data: vpd }] = await Promise.all([
    supabase.rpc("dalsi_cislo_dokladu", { p_org: firma.id, p_rok: rok, p_druh: "ppd" }),
    supabase.rpc("dalsi_cislo_dokladu", { p_org: firma.id, p_rok: rok, p_druh: "vpd" }),
  ]);

  // Hotovostní úhrada faktury: předvyplnit odběratele a částku
  let faktura: PredvyplneniFaktury | undefined;
  if (p.faktura && /^[0-9a-f-]{36}$/i.test(p.faktura)) {
    const n = await nactiFakturu(firma.id, p.faktura);
    const f = n?.faktura;
    if (!f || f.status !== "vystavena" || (f.kind !== "faktura" && f.kind !== "zalohova")) redirect(`/faktury/${p.faktura}`);
    faktura = {
      id: f.id,
      cislo: f.number,
      castka: f.total - f.advance_amount,
      odberatel: f.customer,
      // Jedna sazba na faktuře → předvyplnit ji u rozpisu DPH
      sazba: f.vat_payer && f.vat_recap.length === 1 ? f.vat_recap[0].rate : null,
    };
  }

  return (
    <NovyDoklad
      vychoziDruh={faktura ? "prijem" : p.druh === "vydej" ? "vydej" : "prijem"}
      cislaDokladu={{ prijem: typeof ppd === "string" ? ppd : `PPD${rok}0001`, vydej: typeof vpd === "string" ? vpd : `VPD${rok}0001` }}
      firma={dodavatelZFirmy(firma)}
      platce={firma.vat_payer}
      dnes={dnes}
      faktura={faktura}
    />
  );
}
