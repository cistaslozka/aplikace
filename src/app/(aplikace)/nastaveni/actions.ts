"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { nactiZAres, type VysledekAres } from "@/lib/ares";
import { aktivniFirma } from "@/lib/firma";
import { createClient } from "@/lib/supabase/server";
import {
  formatujUcet,
  ibanZUctu,
  jePlatneIco,
  jePlatnyIban,
  normalizujDic,
  normalizujIco,
  normalizujPsc,
  rozeberUcet,
} from "@/lib/validace";

export async function nactiAresAkce(icoVstup: string): Promise<VysledekAres> {
  const ico = normalizujIco(icoVstup);
  if (!jePlatneIco(ico)) return { ok: false, chyba: "IČO má 8 číslic a toto nevychází. Zkontrolujte překlep." };
  return nactiZAres(ico);
}

export type StavFirmy = { chyby?: Record<string, string>; chyba?: string; ulozeno?: boolean };

const FORMY = ["osvc", "sro", "jina"] as const;

function pole(form: FormData, nazev: string): string {
  const v = form.get(nazev);
  return typeof v === "string" ? v.trim() : "";
}

export async function ulozitFirmuAkce(_: StavFirmy, form: FormData): Promise<StavFirmy> {
  const chyby: Record<string, string> = {};

  const name = pole(form, "name");
  if (!name) chyby.name = "Vyplňte název nebo jméno.";
  if (name.length > 200) chyby.name = "Název je příliš dlouhý.";

  const legal_form = pole(form, "legal_form") as (typeof FORMY)[number];
  if (!FORMY.includes(legal_form)) chyby.legal_form = "Vyberte právní formu.";

  const icoVstup = pole(form, "ico");
  const ico = icoVstup ? normalizujIco(icoVstup) : null;
  if (ico && !jePlatneIco(ico)) chyby.ico = "IČO nevychází, zkontrolujte překlep.";

  const vat_payer = form.get("vat_payer") === "on";
  const dicVstup = pole(form, "dic");
  const dic = dicVstup ? normalizujDic(dicVstup) : null;
  if (dicVstup && !dic) chyby.dic = "DIČ má tvar CZ a 8–10 číslic.";
  if (vat_payer && !dic) chyby.dic = "Plátce DPH musí mít DIČ.";

  const street = pole(form, "street");
  const city = pole(form, "city");
  const zipVstup = pole(form, "zip");
  const zip = zipVstup ? normalizujPsc(zipVstup) : null;
  if (!street) chyby.street = "Vyplňte ulici a číslo.";
  if (!city) chyby.city = "Vyplňte obec.";
  if (!zip) chyby.zip = "PSČ má 5 číslic.";

  const ucetVstup = pole(form, "bank_account");
  const ucet = ucetVstup ? rozeberUcet(ucetVstup) : null;
  if (ucetVstup && !ucet) chyby.bank_account = "Číslo účtu nesedí. Tvar: 123456789/0800, případně s předčíslím 19-123456789/0800.";

  const ibanVstup = pole(form, "iban").replace(/\s/g, "").toUpperCase();
  if (ibanVstup && !jePlatnyIban(ibanVstup)) chyby.iban = "IBAN nesedí, zkontrolujte překlep.";
  const iban = ibanVstup || (ucet ? ibanZUctu(ucet) : null);

  const email = pole(form, "email");
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) chyby.email = "E-mail nevypadá správně.";

  const registry_note = pole(form, "registry_note");
  if (legal_form === "sro" && !registry_note)
    chyby.registry_note = "Doplňte zápis v obchodním rejstříku, musí být na každém dokladu.";

  if (Object.keys(chyby).length) return { chyby, chyba: "Zkontrolujte prosím označená pole." };

  const data = {
    name,
    legal_form,
    ico,
    dic,
    vat_payer,
    street,
    city,
    zip,
    registry_note: registry_note || null,
    bank_account: ucet ? formatujUcet(ucet) : null,
    iban,
    email: email || null,
    phone: pole(form, "phone") || null,
    web: pole(form, "web") || null,
  };

  const supabase = await createClient();
  const stavajici = await aktivniFirma();

  if (stavajici) {
    const { error } = await supabase.from("organizations").update(data).eq("id", stavajici.id);
    if (error) {
      console.error("Uložení firmy selhalo:", error.message);
      return { chyba: "Uložení se nepovedlo. Zkuste to prosím znovu." };
    }
    revalidatePath("/", "layout");
    return { ulozeno: true };
  }

  const { error } = await supabase.rpc("zalozit_firmu", {
    p_name: data.name,
    p_legal_form: data.legal_form,
    p_ico: data.ico,
    p_dic: data.dic,
    p_vat_payer: data.vat_payer,
    p_street: data.street,
    p_city: data.city,
    p_zip: data.zip,
    p_registry_note: data.registry_note,
    p_bank_account: data.bank_account,
    p_iban: data.iban,
    p_email: data.email,
    p_phone: data.phone,
    p_web: data.web,
  });
  if (error) {
    console.error("Založení firmy selhalo:", error.message);
    return { chyba: "Založení firmy se nepovedlo. Zkuste to prosím znovu." };
  }
  revalidatePath("/", "layout");
  redirect("/prehled?vitejte=1");
}
