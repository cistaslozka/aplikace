"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SAZBY_DPH, ZPUSOBY_UHRADY, dnesIso, type PoziceLoga, type SazbaDph, type Vzhled, type ZpusobUhrady } from "@/lib/faktura";
import { aktivniFirma } from "@/lib/firma";
import { createClient } from "@/lib/supabase/server";

export type NovaFaktura = {
  id?: string;
  kind?: "faktura" | "zalohova";
  client_id: string | null;
  customer: {
    name: string;
    ico?: string | null;
    dic?: string | null;
    street?: string | null;
    city?: string | null;
    zip?: string | null;
    country?: string | null;
    email?: string | null;
  } | null;
  issue_date: string;
  taxable_date: string | null;
  due_date: string;
  payment_method: ZpusobUhrady;
  template: Vzhled;
  note: string;
  intro_text: string;
  logo_position: PoziceLoga | null;
  polozky: { description: string; quantity: number; unit: string; unit_price: number; vat_rate: SazbaDph }[];
};

export type VysledekUlozeni = { ok: false; chyba: string } | { ok: true };

const datum = (x: string) => /^\d{4}-\d{2}-\d{2}$/.test(x) && !Number.isNaN(Date.parse(x));
const VZHLEDY: Vzhled[] = ["minimal", "corporate", "creative"];

export async function ulozitFakturuAkce(f: NovaFaktura): Promise<VysledekUlozeni> {
  const firma = await aktivniFirma();
  if (!firma) return { ok: false, chyba: "Nejdřív vyplňte údaje o své firmě v Nastavení." };

  if (!f.customer?.name?.trim()) return { ok: false, chyba: "Vyberte odběratele." };
  if (!datum(f.issue_date) || !datum(f.due_date)) return { ok: false, chyba: "Zkontrolujte data vystavení a splatnosti." };
  if (f.due_date < f.issue_date) return { ok: false, chyba: "Splatnost nemůže být dřív než datum vystavení." };
  if (f.taxable_date && !datum(f.taxable_date)) return { ok: false, chyba: "Zkontrolujte datum zdanitelného plnění." };
  if (!(f.payment_method in ZPUSOBY_UHRADY)) return { ok: false, chyba: "Vyberte způsob úhrady." };
  if (!VZHLEDY.includes(f.template)) return { ok: false, chyba: "Vyberte vzhled faktury." };

  const polozky = f.polozky
    .map((p) => ({ ...p, description: p.description.trim(), unit: p.unit.trim() }))
    .filter((p) => p.description || p.unit_price);
  if (!polozky.length) return { ok: false, chyba: "Přidejte aspoň jednu položku." };
  for (const [i, p] of polozky.entries()) {
    if (!p.description) return { ok: false, chyba: `Položka ${i + 1}: doplňte popis.` };
    if (!Number.isFinite(p.quantity) || p.quantity === 0) return { ok: false, chyba: `Položka ${i + 1}: množství musí být nenulové číslo.` };
    if (!Number.isFinite(p.unit_price)) return { ok: false, chyba: `Položka ${i + 1}: zkontrolujte cenu.` };
    if (!SAZBY_DPH.includes(p.vat_rate)) return { ok: false, chyba: `Položka ${i + 1}: vyberte sazbu DPH.` };
  }

  const c = f.customer;
  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("ulozit_fakturu", {
    p_faktura: {
      id: f.id ?? null,
      kind: f.kind === "zalohova" ? "zalohova" : "faktura",
      organization_id: firma.id,
      client_id: f.client_id,
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
      issue_date: f.issue_date,
      taxable_date: f.taxable_date,
      due_date: f.due_date,
      payment_method: f.payment_method,
      template: f.template,
      note: f.note.trim().slice(0, 1000),
      intro_text: (f.intro_text ?? "").trim().slice(0, 1000),
      logo_position: f.logo_position && ["vlevo", "vpravo", "dole"].includes(f.logo_position) ? f.logo_position : null,
    },
    p_polozky: polozky,
  });

  if (error || !id) {
    console.error("Uložení faktury selhalo:", error?.code, error?.message);
    if (error?.code === "23514") return { ok: false, chyba: "Některý údaj nesedí. Zkontrolujte data a položky." };
    if (error?.code === "P0001") return { ok: false, chyba: error.message };
    return { ok: false, chyba: "Fakturu se nepodařilo uložit. Zkuste to prosím znovu." };
  }

  revalidatePath("/faktury");
  revalidatePath("/prehled");
  redirect(`/faktury/${id}${f.id ? "?upraveno=1" : "?vystaveno=1"}`);
}

export async function zmenitStavAkce(form: FormData) {
  const firma = await aktivniFirma();
  const id = String(form.get("id") ?? "");
  const stav = String(form.get("stav") ?? "");
  if (!firma || !/^[0-9a-f-]{36}$/i.test(id)) return;

  // Datum úhrady: zadané (ne v budoucnosti), jinak dnešek
  const zadane = String(form.get("datum") ?? "");
  const dnes = dnesIso();
  const datumUhrady = datum(zadane) && zadane <= dnes ? zadane : dnes;
  const zmena =
    stav === "uhrazena"
      ? { status: "uhrazena", paid_at: datumUhrady }
      : stav === "vystavena"
        ? { status: "vystavena", paid_at: null }
        : stav === "stornovana"
          ? { status: "stornovana", paid_at: null }
          : null;
  if (!zmena) return;

  const supabase = await createClient();
  const { error } = await supabase.from("invoices").update(zmena).eq("id", id).eq("organization_id", firma.id);
  revalidatePath("/faktury");
  revalidatePath(`/faktury/${id}`);
  revalidatePath("/prehled");
  if (error) {
    console.error("Změna stavu faktury selhala:", error.message);
    // Hláška z databáze je česky a srozumitelná (např. „Nejdřív stornujte daňový doklad“)
    redirect(`/faktury/${id}?chyba=${encodeURIComponent(error.code === "P0001" ? error.message : "Stav se nepodařilo změnit.")}`);
  }
  redirect(`/faktury/${id}`);
}

export async function vystavitDdppAkce(form: FormData) {
  const firma = await aktivniFirma();
  const id = String(form.get("id") ?? "");
  const platba = String(form.get("datum") ?? "");
  if (!firma || !/^[0-9a-f-]{36}$/i.test(id)) return;
  if (!datum(platba)) redirect(`/faktury/${id}?chyba=${encodeURIComponent("Zadejte datum přijetí platby.")}`);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("vystavit_ddpp", { p_zaloha: id, p_datum_platby: platba, p_dnes: dnesIso() });
  if (error || !data) {
    console.error("Vystavení daňového dokladu selhalo:", error?.code, error?.message);
    const zprava = error && ["P0001", "22023"].includes(error.code) ? error.message : "Daňový doklad se nepodařilo vystavit. Zkuste to prosím znovu.";
    redirect(`/faktury/${id}?chyba=${encodeURIComponent(zprava)}`);
  }
  revalidatePath("/faktury");
  revalidatePath(`/faktury/${id}`);
  redirect(`/faktury/${data}?vystaveno=1`);
}

export async function vytvoritUpominkuAkce(form: FormData) {
  const firma = await aktivniFirma();
  const id = String(form.get("id") ?? "");
  if (!firma || !/^[0-9a-f-]{36}$/i.test(id)) return;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("vytvorit_upominku", { p_faktura: id, p_dnes: dnesIso() });
  if (error) {
    console.error("Vytvoření upomínky selhalo:", error.code, error.message);
    redirect(`/faktury/${id}?upominka=chyba`);
  }
  revalidatePath(`/faktury/${id}`);
  redirect(`/faktury/${id}?upominka=${data}`);
}
