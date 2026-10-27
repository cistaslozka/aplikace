import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Strana, Vzhled } from "./faktura";
import { DRUHY_SMLUV, type DataSmlouvy, type DruhSmlouvy, type StavSmlouvy } from "./smlouvy";

export type SmlouvaRadek = {
  id: string;
  kind: DruhSmlouvy;
  number: string;
  client_id: string | null;
  we_supply: boolean;
  supplier: Strana & { vat_payer?: boolean };
  customer: Strana;
  title: string;
  fields: Record<string, unknown>;
  place: string | null;
  signed_on: string | null;
  valid_until: string | null;
  template: Vzhled;
  status: StavSmlouvy;
  created_at: string;
};

const SLOUPCE = "id, kind, number, client_id, we_supply, supplier, customer, title, fields, place, signed_on, valid_until, template, status, created_at";

export async function seznamSmluv(organizationId: string): Promise<SmlouvaRadek[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("contracts").select(SLOUPCE).eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(1000);
  if (error) console.error("Načtení smluv selhalo:", error.message);
  return (data ?? []) as SmlouvaRadek[];
}

export async function nactiSmlouvu(organizationId: string, id: string): Promise<SmlouvaRadek | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("contracts").select(SLOUPCE).eq("organization_id", organizationId).eq("id", id).maybeSingle();
  if (error) console.error("Načtení smlouvy selhalo:", error.message);
  return (data as SmlouvaRadek | null) ?? null;
}

export function dataUlozeneSmlouvy(s: SmlouvaRadek): DataSmlouvy {
  return {
    druh: s.kind,
    cislo: s.number,
    nazev: s.title || DRUHY_SMLUV[s.kind].nazev,
    myDodavame: s.we_supply,
    my: s.supplier,
    oni: s.customer,
    pole: s.fields ?? {},
    misto: s.place ?? "",
    datum: s.signed_on,
    vzhled: s.template,
    stav: s.status,
  };
}

/** Náhled čísla další smlouvy (nic nerezervuje). */
export async function dalsiCisloSmlouvy(organizationId: string, rok: number): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.from("number_series").select("last_number").eq("organization_id", organizationId).eq("kind", "smlouva").eq("year", rok).maybeSingle();
  return `S${rok}${String((data?.last_number ?? 0) + 1).padStart(4, "0")}`;
}
