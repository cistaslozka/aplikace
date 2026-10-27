import "server-only";
import type { DataFaktury } from "@/components/faktura/FakturaA4";
import { createClient } from "@/lib/supabase/server";
import { adresaLoga } from "./faktura";
import type { PoziceLoga, Polozka, Rekapitulace, SazbaDph, StavFaktury, Strana, Vzhled, ZpusobUhrady } from "./faktura";

export type FakturaRadek = {
  id: string;
  number: string;
  variable_symbol: string;
  client_id: string | null;
  supplier: Strana;
  customer: Strana;
  issue_date: string;
  taxable_date: string | null;
  due_date: string;
  payment_method: ZpusobUhrady;
  vat_payer: boolean;
  template: Vzhled;
  note: string | null;
  intro_text: string | null;
  logo_position: PoziceLoga | null;
  logo_path: string | null;
  status: StavFaktury;
  paid_at: string | null;
  subtotal: number;
  vat_total: number;
  total: number;
  vat_recap: Rekapitulace[];
  created_at: string;
};

const SLOUPCE =
  "id, number, variable_symbol, client_id, supplier, customer, issue_date, taxable_date, due_date, payment_method, vat_payer, template, note, intro_text, logo_position, logo_path, status, paid_at, subtotal, vat_total, total, vat_recap, created_at";

// Supabase vrací numeric jako text, převedeme na čísla.
function cisla(f: Record<string, unknown>): FakturaRadek {
  const r = f as unknown as FakturaRadek;
  return {
    ...r,
    subtotal: Number(r.subtotal),
    vat_total: Number(r.vat_total),
    total: Number(r.total),
    vat_recap: (r.vat_recap ?? []).map((x) => ({ rate: Number(x.rate), base: Number(x.base), vat: Number(x.vat) })),
  };
}

export async function seznamFaktur(organizationId: string): Promise<FakturaRadek[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select(SLOUPCE)
    .eq("organization_id", organizationId)
    .order("issue_date", { ascending: false })
    .order("number", { ascending: false })
    .limit(1000);
  if (error) console.error("Načtení faktur selhalo:", error.message);
  return (data ?? []).map(cisla);
}

export async function nactiFakturu(organizationId: string, id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select(SLOUPCE)
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();
  if (error) console.error("Načtení faktury selhalo:", error.message);
  if (!data) return null;
  const { data: polozky } = await supabase
    .from("invoice_items")
    .select("description, quantity, unit, unit_price, vat_rate")
    .eq("invoice_id", id)
    .order("position");
  return {
    faktura: cisla(data),
    polozky: (polozky ?? []).map(
      (p): Polozka => ({
        description: p.description,
        quantity: Number(p.quantity),
        unit: p.unit ?? "",
        unit_price: Number(p.unit_price),
        vat_rate: Number(p.vat_rate) as SazbaDph,
      }),
    ),
  };
}

/** Údaje dodavatele pro náhled (při uložení je databáze vezme znovu z firmy). */
export function dodavatelZFirmy(f: {
  name: string; legal_form: string; ico: string | null; dic: string | null; street: string | null; city: string | null; zip: string | null;
  registry_note: string | null; bank_account: string | null; iban: string | null; email: string | null; phone: string | null; web: string | null;
}): Strana {
  return {
    name: f.name, legal_form: f.legal_form, ico: f.ico, dic: f.dic, street: f.street, city: f.city, zip: f.zip, country: "CZ",
    registry_note: f.registry_note, bank_account: f.bank_account, iban: f.iban, email: f.email, phone: f.phone, web: f.web,
  };
}

export async function dalsiCisloFaktury(organizationId: string, rok: number): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("dalsi_cislo_faktury", { p_org: organizationId, p_rok: rok });
  if (error) console.error("Číslo faktury se nenačetlo:", error.message);
  return typeof data === "string" ? data : `${rok}0001`;
}

/** Údaje pro vykreslení uložené faktury (náhled, tisk i PDF). */
export function dataUlozeneFaktury(f: FakturaRadek, polozky: Polozka[]): DataFaktury {
  return {
    cislo: f.number,
    vs: f.variable_symbol,
    dodavatel: f.supplier,
    odberatel: f.customer,
    vystaveno: f.issue_date,
    duzp: f.taxable_date,
    splatnost: f.due_date,
    uhrada: f.payment_method,
    platce: f.vat_payer,
    polozky,
    rekapitulace: f.vat_recap,
    zaklad: f.subtotal,
    dph: f.vat_total,
    celkem: f.total,
    poznamka: f.note,
    uvod: f.intro_text,
    logo: adresaLoga(f.logo_path),
    logoPozice: f.logo_position,
    vzhled: f.template,
    stav: f.status,
    uhrazeno: f.paid_at,
  };
}
