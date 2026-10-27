import "server-only";
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

/**
 * Firma, se kterou uživatel právě pracuje. Zatím první firma, kterou založil;
 * přepínání mezi více firmami přibude s týmovým přístupem (tarif Pro).
 * cache() = v rámci jednoho požadavku se dotaz pošle jen jednou.
 */
export const aktivniFirma = cache(async (): Promise<Firma | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select(SLOUPCE)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("Načtení firmy selhalo:", error.message);
    return null;
  }
  return data as Firma | null;
});
