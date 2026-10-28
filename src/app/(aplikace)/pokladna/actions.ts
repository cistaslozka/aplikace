"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { dnesIso } from "@/lib/faktura";
import { aktivniFirma } from "@/lib/firma";
import type { DruhPokladny } from "@/lib/pokladna";
import { createClient } from "@/lib/supabase/server";

export type NovyPokladniDoklad = {
  kind: DruhPokladny;
  issue_date: string;
  amount: number;
  purpose: string;
  partner: { name: string; ico?: string | null; street?: string | null; city?: string | null; zip?: string | null };
  vat_rate: number | null;
  invoice_id: string | null;
  note: string;
};

export async function ulozitPokladniDokladAkce(d: NovyPokladniDoklad): Promise<{ ok: false; chyba: string } | undefined> {
  const firma = await aktivniFirma();
  if (!firma) return { ok: false, chyba: "Nejdřív vyplňte údaje o své firmě v Nastavení." };
  if (d.kind !== "prijem" && d.kind !== "vydej") return { ok: false, chyba: "Vyberte příjem nebo výdaj." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.issue_date)) return { ok: false, chyba: "Zkontrolujte datum." };
  if (!Number.isFinite(d.amount) || d.amount <= 0) return { ok: false, chyba: "Zadejte částku větší než nula." };
  if (!d.purpose.trim()) return { ok: false, chyba: "Napište účel platby." };
  if (!d.partner.name.trim())
    return { ok: false, chyba: d.kind === "prijem" ? "Napište, od koho peníze přijímáte." : "Napište, komu peníze vyplácíte." };
  if (d.vat_rate !== null && ![0, 12, 21].includes(d.vat_rate)) return { ok: false, chyba: "Vyberte sazbu DPH." };

  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("ulozit_pokladni_doklad", {
    p: {
      organization_id: firma.id,
      kind: d.kind,
      issue_date: d.issue_date,
      amount: Math.round(d.amount * 100) / 100,
      purpose: d.purpose.trim().slice(0, 300),
      partner: {
        name: d.partner.name.trim().slice(0, 200),
        ico: d.partner.ico || null,
        street: d.partner.street || null,
        city: d.partner.city || null,
        zip: d.partner.zip || null,
      },
      vat_rate: d.vat_rate,
      invoice_id: d.invoice_id && /^[0-9a-f-]{36}$/i.test(d.invoice_id) ? d.invoice_id : null,
      note: d.note.trim().slice(0, 500),
    },
    p_dnes: dnesIso(),
  });
  if (error || !id) {
    console.error("Uložení pokladního dokladu selhalo:", error?.code, error?.message);
    if (error && ["P0001", "22023"].includes(error.code)) return { ok: false, chyba: error.message };
    return { ok: false, chyba: "Doklad se nepodařilo uložit. Zkuste to prosím znovu." };
  }
  revalidatePath("/pokladna");
  if (d.invoice_id) {
    revalidatePath("/faktury");
    revalidatePath(`/faktury/${d.invoice_id}`);
    revalidatePath("/prehled");
  }
  redirect(`/pokladna/${id}?vystaveno=1`);
}

export async function stornovatPokladniDokladAkce(form: FormData) {
  const firma = await aktivniFirma();
  const id = String(form.get("id") ?? "");
  if (!firma || !/^[0-9a-f-]{36}$/i.test(id)) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("stornovat_pokladni_doklad", { p_id: id });
  revalidatePath("/pokladna");
  revalidatePath(`/pokladna/${id}`);
  revalidatePath("/faktury");
  if (error) {
    console.error("Storno pokladního dokladu selhalo:", error.code, error.message);
    redirect(`/pokladna/${id}?chyba=${encodeURIComponent(error.code === "P0001" ? error.message : "Doklad se nepodařilo stornovat.")}`);
  }
  redirect(`/pokladna/${id}`);
}
