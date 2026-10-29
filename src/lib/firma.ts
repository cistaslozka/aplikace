import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Firma = {
  id: string;
  name: string;
  legal_form: "osvc" | "sro" | "jina";
  ico: string | null;
  dic: string | null;
  vat_payer: boolean;
  street: string | null;
  city: string | null;
  zip: string | null;
  registry_note: string | null;
  bank_account: string | null;
  iban: string | null;
  email: string | null;
  phone: string | null;
  web: string | null;
  logo_path: string | null;
  plan: "basic" | "pro";
  trial_ends_at: string;
};

const SLOUPCE =
  "id, name, legal_form, ico, dic, vat_payer, street, city, zip, registry_note, bank_account, iban, email, phone, web, logo_path, plan, trial_ends_at";

/** Cookie s id firmy, kterou si uživatel vybral (když je členem víc firem). */
export const COOKIE_FIRMA = "firma";

/** Firmy, do kterých má uživatel přístup (vlastní i ty, kam byl pozván). */
export const mojeFirmy = cache(async (): Promise<{ id: string; name: string; role: "owner" | "member" }[]> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("memberships")
    .select("role, created_at, organizations (id, name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (error) console.error("Načtení firem selhalo:", error.message);
  return (data ?? []).flatMap((m) => {
    const o = m.organizations as unknown as { id: string; name: string } | null;
    return o ? [{ id: o.id, name: o.name, role: m.role as "owner" | "member" }] : [];
  });
});

/**
 * Firma, se kterou uživatel právě pracuje: vybraná v přepínači (cookie), jinak první, do které patří.
 * cache() = v rámci jednoho požadavku se dotaz pošle jen jednou.
 */
export const aktivniFirma = cache(async (): Promise<Firma | null> => {
  const [firmy, c] = await Promise.all([mojeFirmy(), cookies()]);
  if (!firmy.length) return null;
  const vybrana = c.get(COOKIE_FIRMA)?.value;
  const id = firmy.find((f) => f.id === vybrana)?.id ?? firmy[0].id;
  const supabase = await createClient();
  const { data, error } = await supabase.from("organizations").select(SLOUPCE).eq("id", id).maybeSingle();
  if (error) {
    console.error("Načtení firmy selhalo:", error.message);
    return null;
  }
  return data as Firma | null;
});

/** Role přihlášeného uživatele v aktivní firmě. */
export async function mojeRole(organizationId: string): Promise<"owner" | "member" | null> {
  return (await mojeFirmy()).find((f) => f.id === organizationId)?.role ?? null;
}
