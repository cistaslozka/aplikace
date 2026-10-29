import "server-only";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const MIN_DELKA_HESLA = 8;

export type Chyba = { ok: false; kod: string; chyba: string };
export type VysledekPrihlaseni = { ok: true } | Chyba;
export type VysledekRegistrace = { ok: true; stav: "prihlasen" | "potvrdit-email" } | Chyba;

// Srozumitelné české zprávy místo anglických chyb ze Supabase.
// Klíče jsou kódy chyb ze Supabase Auth a naše vlastní kódy.
const ZPRAVY: Record<string, string> = {
  invalid_credentials: "Nesprávný e-mail nebo heslo.",
  email_not_confirmed: "E-mail ještě není potvrzený. Klikněte na odkaz, který jsme vám poslali.",
  user_already_exists: "Účet s tímto e-mailem už existuje. Zkuste se přihlásit.",
  email_exists: "Účet s tímto e-mailem už existuje. Zkuste se přihlásit.",
  weak_password: `Heslo je příliš slabé. Použijte aspoň ${MIN_DELKA_HESLA} znaků, ideálně i číslice.`,
  email_address_invalid: "Tento e-mail nevypadá správně.",
  over_email_send_rate_limit: "Poslali jsme už příliš mnoho e-mailů. Zkuste to prosím za pár minut.",
  over_request_rate_limit: "Příliš mnoho pokusů. Zkuste to prosím za pár minut.",
  signup_disabled: "Registrace je teď vypnutá.",
  same_password: "Nové heslo musí být jiné než to současné.",
  // naše vlastní
  prazdne: "Vyplňte e-mail i heslo.",
  kratke: `Heslo musí mít aspoň ${MIN_DELKA_HESLA} znaků.`,
  hesla: "Hesla se neshodují.",
  odkaz: "Odkaz už neplatí nebo byl použitý. Požádejte o nový.",
};

export function zprava(kod: string | null | undefined): string | undefined {
  if (!kod) return undefined;
  return ZPRAVY[kod] ?? "Něco se nepovedlo. Zkuste to prosím znovu.";
}

function chyba(kod: string | undefined, detail?: string): Chyba {
  const k = kod && ZPRAVY[kod] ? kod : "neznama";
  if (k === "neznama") console.error("Supabase auth chyba:", kod, detail);
  return { ok: false, kod: k, chyba: zprava(k)! };
}

export async function adresaWebu(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// Bezpečný cíl po přihlášení: jen cesta v rámci našeho webu.
export function bezpecnyCil(next: string | null | undefined, vychozi = "/prehled"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return vychozi;
  return next;
}

export async function prihlasit(email: string, heslo: string): Promise<VysledekPrihlaseni> {
  if (!email || !heslo) return chyba("prazdne");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: heslo });
  if (error) return chyba(error.code, error.message);
  return { ok: true };
}

export async function registrovat(email: string, heslo: string, heslo2: string, dalsi?: string): Promise<VysledekRegistrace> {
  if (!email || !heslo) return chyba("prazdne");
  if (heslo.length < MIN_DELKA_HESLA) return chyba("kratke");
  if (heslo !== heslo2) return chyba("hesla");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: heslo,
    options: { emailRedirectTo: `${await adresaWebu()}/auth/callback?next=${encodeURIComponent(bezpecnyCil(dalsi))}` },
  });
  if (error) return chyba(error.code, error.message);
  // Když je v Supabase zapnuté potvrzování e-mailu, přihlášení vznikne až po kliknutí na odkaz.
  return { ok: true, stav: data.session ? "prihlasen" : "potvrdit-email" };
}

export async function poslatObnoveniHesla(email: string): Promise<{ ok: true } | Chyba> {
  if (!email) return chyba("prazdne");
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await adresaWebu()}/auth/callback?next=/nove-heslo`,
  });
  if (error) return chyba(error.code, error.message);
  return { ok: true };
}

export async function zmenitHeslo(heslo: string, heslo2: string): Promise<{ ok: true } | Chyba> {
  if (heslo.length < MIN_DELKA_HESLA) return chyba("kratke");
  if (heslo !== heslo2) return chyba("hesla");
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: heslo });
  if (error) return chyba(error.code, error.message);
  return { ok: true };
}

export async function odhlasit(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

export function text(form: FormData, nazev: string): string {
  const v = form.get(nazev);
  return typeof v === "string" ? v.trim() : "";
}

export function heslo(form: FormData, nazev: string): string {
  const v = form.get(nazev);
  return typeof v === "string" ? v : ""; // hesla neořezáváme
}
