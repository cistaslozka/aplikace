"use server";

import { revalidatePath } from "next/cache";
import { aktivniFirma } from "@/lib/firma";
import { createClient } from "@/lib/supabase/server";

export async function prepnoutPovinnostAkce(form: FormData) {
  const firma = await aktivniFirma();
  const klic = String(form.get("klic") ?? "").slice(0, 120);
  if (!firma || !klic) return;
  const supabase = await createClient();
  const { error } =
    form.get("hotovo") === "1"
      ? await supabase.from("office_tasks").delete().eq("organization_id", firma.id).eq("task_key", klic)
      : await supabase.from("office_tasks").insert({ organization_id: firma.id, task_key: klic });
  if (error) console.error("Uložení povinnosti selhalo:", error.code, error.message);
  revalidatePath("/hr/urady");
  revalidatePath("/hr");
}
