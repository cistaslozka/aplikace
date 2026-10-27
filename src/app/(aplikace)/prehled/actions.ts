"use server";

import { revalidatePath } from "next/cache";
import { aktivniFirma } from "@/lib/firma";
import { slozRozlozeni, VYCHOZI_ROZLOZENI, type PolozkaRozlozeni } from "@/lib/rozlozeni";
import { createClient } from "@/lib/supabase/server";

export async function ulozitRozlozeniAkce(rozlozeni: PolozkaRozlozeni[] | null): Promise<{ ok: boolean }> {
  const firma = await aktivniFirma();
  if (!firma) return { ok: false };
  const supabase = await createClient();
  // null = vrátit výchozí rozložení
  const tiles = rozlozeni ? slozRozlozeni(rozlozeni) : VYCHOZI_ROZLOZENI;
  const { error } = await supabase
    .from("dashboard_layouts")
    .upsert({ organization_id: firma.id, tiles, updated_at: new Date().toISOString() }, { onConflict: "user_id,organization_id" });
  if (error) {
    console.error("Uložení rozložení přehledu selhalo:", error.message);
    return { ok: false };
  }
  revalidatePath("/prehled");
  return { ok: true };
}
