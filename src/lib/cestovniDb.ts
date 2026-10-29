import "server-only";
import type { DataCesty } from "@/components/cestovni/CestovniPrikazA4";
import { createClient } from "@/lib/supabase/server";
import type { Strana } from "./faktura";
import type { VstupCesty } from "./cestovni";

export type CestovniPrikaz = {
  id: string;
  number: string;
  traveler: { name: string; address?: string | null };
  purpose: string;
  destination: string;
  departure_at: string;
  arrival_at: string;
  trip: { vstup: VstupCesty; vozidlo: { spz?: string | null; model?: string | null } };
  supplier: Strana;
  total: number;
  advance: number;
  note: string | null;
  status: "platny" | "stornovany";
  created_at: string;
};

const SLOUPCE =
  "id, number, traveler, purpose, destination, departure_at, arrival_at, trip, supplier, total, advance, note, status, created_at";

const cisla = (r: Record<string, unknown>) => {
  const c = r as unknown as CestovniPrikaz;
  return { ...c, total: Number(c.total), advance: Number(c.advance) };
};

export async function seznamCest(organizationId: string): Promise<CestovniPrikaz[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("travel_orders")
    .select(SLOUPCE)
    .eq("organization_id", organizationId)
    .order("departure_at", { ascending: false })
    .limit(1000);
  if (error) console.error("Načtení cestovních příkazů selhalo:", error.message);
  return (data ?? []).map(cisla);
}

export async function nactiCestu(organizationId: string, id: string): Promise<CestovniPrikaz | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("travel_orders")
    .select(SLOUPCE)
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();
  if (error) console.error("Načtení cestovního příkazu selhalo:", error.message);
  return data ? cisla(data) : null;
}

export function dataUlozeneCesty(c: CestovniPrikaz): DataCesty {
  return {
    cislo: c.number,
    firma: c.supplier,
    cestovatel: c.traveler,
    ucel: c.purpose,
    misto: c.destination,
    vozidlo: c.trip.vozidlo ?? {},
    vstup: c.trip.vstup,
    poznamka: c.note,
    storno: c.status === "stornovany",
  };
}
