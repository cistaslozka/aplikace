"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { aktivniFirma } from "@/lib/firma";
import { createClient } from "@/lib/supabase/server";

export async function zmenitTarifAkce(form: FormData) {
  const firma = await aktivniFirma();
  const tarif = String(form.get("tarif") ?? "");
  if (!firma || (tarif !== "basic" && tarif !== "pro")) redirect("/predplatne");

  const supabase = await createClient();
  const { error } = await supabase.rpc("zmenit_tarif", { p_org: firma.id, p_plan: tarif });
  if (error) {
    console.error("Změna tarifu selhala:", error.code, error.message);
    redirect(`/predplatne?chyba=${error.code === "42501" ? "vlastnik" : error.code === "P0001" ? "konec" : "obecna"}`);
  }
  revalidatePath("/", "layout");
  redirect(`/predplatne?zmeneno=${tarif}`);
}
