"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SAZBY_DPH, ZPUSOBY_UHRADY, dnesIso, type SazbaDph, type Vzhled, type ZpusobUhrady } from "@/lib/faktura";
import { aktivniFirma } from "@/lib/firma";
import { createClient } from "@/lib/supabase/server";

export type NovaFaktura = {
  id?: string;
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
    },
    p_polozky: polozky,
  });

  if (error || !id) {
    console.error("Uložení faktury selhalo:", error?.code, error?.message);
    if (error?.code === "23514") return { ok: false, chyba: "Některý údaj nesedí. Zkontrolujte data a položky." };
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

  const zmena =
    stav === "uhrazena"
      ? { status: "uhrazena", paid_at: dnesIso() }
      : stav === "vystavena"
        ? { status: "vystavena", paid_at: null }
        : stav === "stornovana"
          ? { status: "stornovana", paid_at: null }
          : null;
  if (!zmena) return;

  const supabase = await createClient();
  const { error } = await supabase.from("invoices").update(zmena).eq("id", id).eq("organization_id", firma.id);
  if (error) console.error("Změna stavu faktury selhala:", error.message);
  revalidatePath("/faktury");
  revalidatePath(`/faktury/${id}`);
  revalidatePath("/prehled");
  redirect(`/faktury/${id}`);
}
