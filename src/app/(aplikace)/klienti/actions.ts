"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { nactiZAresSLimitem } from "@/lib/ares";
import { aktivniFirma } from "@/lib/firma";
import { naNavrh, SLOUPCE_KLIENTA, type Klient, type KlientNavrh } from "@/lib/klienti";
import { createClient } from "@/lib/supabase/server";
import { jePlatneIco, normalizujDic, normalizujIco, normalizujPsc } from "@/lib/validace";

/** Našeptávač: klienti firmy podle jména nebo IČO (bez ohledu na háčky). */
export async function hledatKlientyAkce(dotaz: string): Promise<KlientNavrh[]> {
  const firma = await aktivniFirma();
  if (!firma) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("hledat_klienty", {
    p_org: firma.id,
    p_dotaz: dotaz.slice(0, 100),
    p_pocet: 8,
  });
  if (error) {
    console.error("Hledání klientů selhalo:", error.message);
    return [];
  }
  return ((data ?? []) as Klient[]).map(naNavrh);
}

export type VysledekNacteni = { ok: true; klient: KlientNavrh; novy: boolean } | { ok: false; chyba: string };

/**
 * Klient podle IČO: nejdřív z adresáře (do ARES se neptáme), jinak z ARES
 * a rovnou uložit do adresáře, aby se příště našel podle jména.
 */
export async function klientPodleIcoAkce(icoVstup: string): Promise<VysledekNacteni> {
  const ico = normalizujIco(icoVstup);
  if (!jePlatneIco(ico)) return { ok: false, chyba: "IČO má 8 číslic a toto nevychází. Zkontrolujte překlep." };

  const firma = await aktivniFirma();
  if (!firma) return { ok: false, chyba: "Nejdřív vyplňte údaje o své firmě v Nastavení." };
  if (firma.ico === ico) return { ok: false, chyba: "To je IČO vaší vlastní firmy." };

  const supabase = await createClient();
  const { data: ulozeny } = await supabase
    .from("clients")
    .select(SLOUPCE_KLIENTA)
    .eq("organization_id", firma.id)
    .eq("ico", ico)
    .maybeSingle();
  if (ulozeny) return { ok: true, klient: naNavrh(ulozeny as Klient), novy: false };

  const ares = await nactiZAresSLimitem(ico);
  if (!ares.ok) return ares;

  const f = ares.firma;
  const { data: novy, error } = await supabase
    .from("clients")
    .insert({
      organization_id: firma.id,
      name: f.name,
      ico: f.ico,
      dic: f.dic,
      vat_payer: f.vat_payer,
      street: f.street || null,
      city: f.city || null,
      zip: f.zip || null,
      from_ares: true,
      ares_checked_at: new Date().toISOString(),
    })
    .select(SLOUPCE_KLIENTA)
    .single();
  if (error || !novy) {
    console.error("Uložení klienta z ARES selhalo:", error?.message);
    return { ok: false, chyba: "Klienta se nepodařilo uložit. Zkuste to prosím znovu." };
  }
  revalidatePath("/klienti");
  return { ok: true, klient: naNavrh(novy as Klient), novy: true };
}

// ---------------------------------------------------------------------------
// Ruční přidání a úprava klienta
// ---------------------------------------------------------------------------

export type StavKlienta = { chyby?: Record<string, string>; chyba?: string; ulozeno?: boolean };

function pole(form: FormData, nazev: string): string {
  const v = form.get(nazev);
  return typeof v === "string" ? v.trim() : "";
}

export async function ulozitKlientaAkce(_: StavKlienta, form: FormData): Promise<StavKlienta> {
  const firma = await aktivniFirma();
  if (!firma) return { chyba: "Nejdřív vyplňte údaje o své firmě v Nastavení." };

  const chyby: Record<string, string> = {};
  const id = pole(form, "id") || null;

  const name = pole(form, "name");
  if (!name) chyby.name = "Vyplňte název nebo jméno.";
  if (name.length > 200) chyby.name = "Název je příliš dlouhý.";

  const country = (pole(form, "country") || "CZ").toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) chyby.country = "Vyberte zemi.";

  const icoVstup = pole(form, "ico");
  const ico = icoVstup ? normalizujIco(icoVstup) : null;
  if (ico && country === "CZ" && !jePlatneIco(ico)) chyby.ico = "IČO nevychází, zkontrolujte překlep.";
  if (ico && !/^\d{8}$/.test(ico)) chyby.ico = "IČO má 8 číslic.";

  const dicVstup = pole(form, "dic");
  const dic = dicVstup ? normalizujDic(dicVstup) : null;
  if (dicVstup && !dic) chyby.dic = "DIČ má tvar kódu země a čísla, např. CZ12345678.";

  const zipVstup = pole(form, "zip");
  let zip: string | null = null;
  if (zipVstup) {
    zip = country === "CZ" ? normalizujPsc(zipVstup) : zipVstup.slice(0, 20);
    if (!zip) chyby.zip = "PSČ má 5 číslic.";
  }

  const email = pole(form, "email");
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) chyby.email = "E-mail nevypadá správně.";

  if (Object.keys(chyby).length) return { chyby, chyba: "Zkontrolujte prosím označená pole." };

  const data = {
    name,
    ico,
    dic,
    street: pole(form, "street") || null,
    city: pole(form, "city") || null,
    zip,
    country,
    email: email || null,
    phone: pole(form, "phone").slice(0, 30) || null,
    note: pole(form, "note").slice(0, 1000) || null,
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("clients").update(data).eq("id", id).eq("organization_id", firma.id)
    : await supabase.from("clients").insert({ ...data, organization_id: firma.id });

  if (error) {
    if (error.code === "23505") return { chyby: { ico: "Klient s tímto IČO už v adresáři je." }, chyba: "Tento klient už v adresáři je." };
    console.error("Uložení klienta selhalo:", error.message);
    return { chyba: "Uložení se nepovedlo. Zkuste to prosím znovu." };
  }

  revalidatePath("/klienti");
  if (!id) redirect("/klienti?pridano=1");
  return { ulozeno: true };
}

export async function smazatKlientaAkce(form: FormData) {
  const firma = await aktivniFirma();
  const id = pole(form, "id");
  if (!firma || !id) return;
  const supabase = await createClient();
  const { error } = await supabase.from("clients").delete().eq("id", id).eq("organization_id", firma.id);
  if (error) console.error("Smazání klienta selhalo:", error.message);
  revalidatePath("/klienti");
  redirect("/klienti?smazano=1");
}
