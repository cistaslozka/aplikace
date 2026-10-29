"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adresaWebu } from "@/lib/auth";
import { aktivniFirma, COOKIE_FIRMA, mojeFirmy } from "@/lib/firma";
import { createClient } from "@/lib/supabase/server";

const uuid = (x: unknown) => typeof x === "string" && /^[0-9a-f-]{36}$/i.test(x);

export async function vytvoritPozvankuAkce(_: unknown, form: FormData): Promise<{ odkaz?: string; chyba?: string }> {
  const firma = await aktivniFirma();
  if (!firma) return { chyba: "Nejdřív vyplňte údaje o firmě." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("vytvorit_pozvanku", {
    p_org: firma.id,
    p_label: String(form.get("label") ?? "").slice(0, 100),
  });
  if (error || typeof data !== "string") {
    console.error("Vytvoření pozvánky selhalo:", error?.code, error?.message);
    return { chyba: error && ["P0001", "42501"].includes(error.code) ? error.message : "Pozvánku se nepodařilo vytvořit." };
  }
  revalidatePath("/nastaveni/tym");
  return { odkaz: `${await adresaWebu()}/pozvanka/${data}` };
}

export async function zrusitPozvankuAkce(form: FormData) {
  const id = form.get("id");
  if (!uuid(id)) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("zrusit_pozvanku", { p_id: id as string });
  if (error) console.error("Zrušení pozvánky selhalo:", error.code, error.message);
  revalidatePath("/nastaveni/tym");
}

export async function odebratClenaAkce(form: FormData) {
  const firma = await aktivniFirma();
  const user = form.get("user");
  if (!firma || !uuid(user)) return;
  const supabase = await createClient();
  const {
    data: { user: ja },
  } = await supabase.auth.getUser();
  const { error } = await supabase.rpc("odebrat_clena", { p_org: firma.id, p_user: user as string });
  if (error) {
    console.error("Odebrání člena selhalo:", error.code, error.message);
    redirect(
      `/nastaveni/tym?chyba=${encodeURIComponent(error.code === "P0001" || error.code === "42501" ? error.message : "Nepodařilo se to.")}`,
    );
  }
  // Kdo odešel sám, přepne se na jinou firmu
  if (ja?.id === user) {
    (await cookies()).delete(COOKIE_FIRMA);
    revalidatePath("/", "layout");
    redirect("/prehled");
  }
  revalidatePath("/nastaveni/tym");
}

export async function prepnoutFirmuAkce(form: FormData) {
  const id = form.get("firma");
  if (!uuid(id) || !(await mojeFirmy()).some((f) => f.id === id)) return;
  (await cookies()).set(COOKIE_FIRMA, id as string, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
  redirect("/prehled");
}

export async function prijmoutPozvankuAkce(form: FormData) {
  const kod = String(form.get("kod") ?? "");
  if (!/^[0-9a-f]{48}$/.test(kod)) redirect("/prehled");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("prijmout_pozvanku", { p_token: kod });
  if (error || !uuid(data)) {
    console.error("Přijetí pozvánky selhalo:", error?.code, error?.message);
    redirect(`/pozvanka/${kod}?chyba=${encodeURIComponent(error?.code === "P0001" ? error.message : "Pozvánku se nepodařilo přijmout.")}`);
  }
  (await cookies()).set(COOKIE_FIRMA, data as string, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
  redirect("/prehled?pozvanka=prijata");
}
