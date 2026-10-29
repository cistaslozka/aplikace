"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Strana, Vzhled } from "@/lib/faktura";
import { aktivniFirma } from "@/lib/firma";
import type { DruhSmlouvy } from "@/lib/smlouvy";
import { VZORY } from "@/lib/smlouvy/vzory";
import { createClient } from "@/lib/supabase/server";

export type NovaSmlouva = {
  id?: string;
  kind: DruhSmlouvy;
  client_id: string | null;
  we_supply: boolean;
  customer: Strana | null;
  title: string;
  fields: Record<string, unknown>;
  place: string;
  signed_on: string;
  template: Vzhled;
};

const datum = (x: string) => /^\d{4}-\d{2}-\d{2}$/.test(x) && !Number.isNaN(Date.parse(x));

export async function ulozitSmlouvuAkce(s: NovaSmlouva): Promise<{ ok: false; chyba: string } | undefined> {
  const firma = await aktivniFirma();
  if (!firma) return { ok: false, chyba: "Nejdřív vyplňte údaje o své firmě v Nastavení." };
  const vzor = VZORY[s.kind];
  if (!vzor) return { ok: false, chyba: "Tento druh smlouvy zatím není k dispozici." };
  if (!s.customer?.name?.trim()) return { ok: false, chyba: "Vyberte druhou smluvní stranu." };
  if (!s.title.trim()) return { ok: false, chyba: "Zadejte název smlouvy." };
  const chyba = vzor.chyby(s.fields);
  if (chyba) return { ok: false, chyba };
  if (s.signed_on && !datum(s.signed_on)) return { ok: false, chyba: "Zkontrolujte datum podpisu." };

  // jen známá pole vzoru, texty zkrácené na rozumnou délku
  const povolene = new Set(vzor.formular.flatMap((x) => x.pole.map((p) => p.k)));
  const fields = Object.fromEntries(
    Object.entries(s.fields)
      .filter(([k, v]) => povolene.has(k) && (typeof v === "string" || typeof v === "number"))
      .map(([k, v]) => [k, typeof v === "string" ? v.slice(0, 4000) : v]),
  );
  const konec = vzor.konec && typeof fields[vzor.konec] === "string" && datum(fields[vzor.konec] as string) ? fields[vzor.konec] : null;

  const c = s.customer;
  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("ulozit_smlouvu", {
    p: {
      id: s.id ?? null,
      organization_id: firma.id,
      kind: s.kind,
      client_id: s.client_id,
      we_supply: s.we_supply,
      customer: {
        name: c.name.trim(),
        ico: c.ico || null,
        dic: c.dic || null,
        street: c.street || null,
        city: c.city || null,
        zip: c.zip || null,
        country: c.country || "CZ",
        email: c.email || null,
      },
      title: s.title.trim().slice(0, 200),
      fields,
      place: s.place.trim().slice(0, 100),
      signed_on: s.signed_on || null,
      valid_until: konec,
      template: s.template,
    },
  });
  if (error || !id) {
    console.error("Uložení smlouvy selhalo:", error?.code, error?.message);
    return {
      ok: false,
      chyba: error?.code === "P0001" || error?.code === "22023" ? error.message : "Smlouvu se nepodařilo uložit. Zkuste to prosím znovu.",
    };
  }
  revalidatePath("/smlouvy");
  revalidatePath("/prehled");
  redirect(`/smlouvy/${id}${s.id ? "?upraveno=1" : "?vytvoreno=1"}`);
}

export async function zmenitStavSmlouvyAkce(form: FormData) {
  const firma = await aktivniFirma();
  const id = String(form.get("id") ?? "");
  const stav = String(form.get("stav") ?? "");
  if (!firma || !/^[0-9a-f-]{36}$/i.test(id) || !["koncept", "uzavrena", "ukoncena"].includes(stav)) return;
  const supabase = await createClient();
  const { error } = await supabase.from("contracts").update({ status: stav }).eq("id", id).eq("organization_id", firma.id);
  if (error) console.error("Změna stavu smlouvy selhala:", error.message);
  revalidatePath("/smlouvy");
  revalidatePath(`/smlouvy/${id}`);
  redirect(`/smlouvy/${id}`);
}

export async function podepsatSmlouvuAkce(
  id: string,
  strana: "my" | "oni",
  obrazek: string,
  jmeno: string,
): Promise<{ ok: true; stav: string } | { ok: false; chyba: string }> {
  const firma = await aktivniFirma();
  if (!firma || !/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, chyba: "Smlouva nenalezena." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("podepsat_smlouvu", { p_smlouva: id, p_strana: strana, p_obrazek: obrazek, p_jmeno: jmeno });
  if (error) {
    console.error("Podpis smlouvy selhal:", error.code, error.message);
    return {
      ok: false,
      chyba: ["P0001", "22023"].includes(error.code) ? error.message : "Podpis se nepodařilo uložit. Zkuste to prosím znovu.",
    };
  }
  revalidatePath("/smlouvy");
  revalidatePath(`/smlouvy/${id}`);
  revalidatePath("/prehled");
  return { ok: true, stav: String(data) };
}

export async function smazatPodpisyAkce(form: FormData) {
  const firma = await aktivniFirma();
  const id = String(form.get("id") ?? "");
  if (!firma || !/^[0-9a-f-]{36}$/i.test(id)) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("smazat_podpisy_smlouvy", { p_smlouva: id });
  if (error) console.error("Smazání podpisů selhalo:", error.message);
  revalidatePath(`/smlouvy/${id}`);
  redirect(`/smlouvy/${id}`);
}
