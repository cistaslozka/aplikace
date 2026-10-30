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

type ClenstviFirmy = { role: "owner" | "member"; firma: Firma };

/**
 * Přihlášený uživatel. `cache()` = v rámci jednoho požadavku se getUser() zavolá jen jednou,
 * i když ho potřebuje víc míst (layout, načtení firem). Ušetří to dotazy na server.
 */
export const prihlasenyUzivatel = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Firmy, do kterých má uživatel přístup, i s jejich úplnými údaji. Jeden dotaz s napojením
 * na organizace (RLS je pustí jen vlastní firmy), takže se nemusí načítat firma zvlášť.
 */
const clenstvi = cache(async (): Promise<ClenstviFirmy[]> => {
  const user = await prihlasenyUzivatel();
  if (!user) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memberships")
    .select(`role, created_at, organizations (${SLOUPCE})`)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (error) console.error("Načtení firem selhalo:", error.message);
  return (data ?? []).flatMap((m) => {
    const o = m.organizations as unknown as Firma | null;
    return o ? [{ role: m.role as "owner" | "member", firma: o }] : [];
  });
});

/** Seznam firem pro přepínač (jen id, název a role). */
export const mojeFirmy = cache(async (): Promise<{ id: string; name: string; role: "owner" | "member" }[]> => {
  return (await clenstvi()).map((c) => ({ id: c.firma.id, name: c.firma.name, role: c.role }));
});

/**
 * Firma, se kterou uživatel právě pracuje: vybraná v přepínači (cookie), jinak první, do které patří.
 */
export const aktivniFirma = cache(async (): Promise<Firma | null> => {
  const [firmy, c] = await Promise.all([clenstvi(), cookies()]);
  if (!firmy.length) return null;
  const vybrana = c.get(COOKIE_FIRMA)?.value;
  return (firmy.find((f) => f.firma.id === vybrana) ?? firmy[0]).firma;
});

/** Role přihlášeného uživatele v aktivní firmě. */
export async function mojeRole(organizationId: string): Promise<"owner" | "member" | null> {
  return (await clenstvi()).find((c) => c.firma.id === organizationId)?.role ?? null;
}
