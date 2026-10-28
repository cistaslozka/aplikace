import "server-only";
import type { DataPokladny } from "@/components/pokladna/PokladniDokladList";
import { createClient } from "@/lib/supabase/server";
import { cislaPokladny, SLOUPCE_POKLADNY, type PokladniDoklad } from "./pokladna";

export async function seznamPokladny(organizationId: string): Promise<PokladniDoklad[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cash_documents")
    .select(SLOUPCE_POKLADNY)
    .eq("organization_id", organizationId)
    .order("issue_date", { ascending: false })
    .order("number", { ascending: false })
    .limit(2000);
  if (error) console.error("Načtení pokladny selhalo:", error.message);
  return (data ?? []).map(cislaPokladny);
}

export async function nactiPokladniDoklad(organizationId: string, id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cash_documents")
    .select(SLOUPCE_POKLADNY)
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();
  if (error) console.error("Načtení pokladního dokladu selhalo:", error.message);
  if (!data) return null;
  const d = cislaPokladny(data);
  const faktura = d.invoice_id
    ? ((await supabase.from("invoices").select("number").eq("id", d.invoice_id).maybeSingle()).data?.number ?? null)
    : null;
  return { doklad: d, faktura };
}

export function dataUlozenehoDokladu(d: PokladniDoklad, faktura: string | null): DataPokladny {
  return {
    druh: d.kind,
    cislo: d.number,
    datum: d.issue_date,
    castka: d.amount,
    ucel: d.purpose,
    partner: d.partner,
    firma: d.supplier,
    platce: d.vat_payer,
    sazba: d.vat_rate,
    zaklad: d.vat_base,
    dph: d.vat_amount,
    faktura,
    poznamka: d.note,
    storno: d.status === "stornovany",
  };
}
