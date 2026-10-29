"use server";

import { redirect } from "next/navigation";
import { bezpecnyCil, heslo, odhlasit, poslatObnoveniHesla, prihlasit, registrovat, text, zmenitHeslo } from "@/lib/auth";

export type StavFormulare = { chyba?: string; hotovo?: boolean; email?: string };

export async function prihlasitAkce(_: StavFormulare, form: FormData): Promise<StavFormulare> {
  const email = text(form, "email");
  const v = await prihlasit(email, heslo(form, "password"));
  if (!v.ok) return { chyba: v.chyba, email };
  redirect(bezpecnyCil(text(form, "dalsi")));
}

export async function registrovatAkce(_: StavFormulare, form: FormData): Promise<StavFormulare> {
  const email = text(form, "email");
  const dalsi = bezpecnyCil(text(form, "dalsi"));
  const v = await registrovat(email, heslo(form, "password"), heslo(form, "password_confirm"), dalsi);
  if (!v.ok) return { chyba: v.chyba, email };
  if (v.stav === "prihlasen") redirect(dalsi);
  return { hotovo: true, email };
}

export async function zapomenuteHesloAkce(_: StavFormulare, form: FormData): Promise<StavFormulare> {
  const email = text(form, "email");
  const v = await poslatObnoveniHesla(email);
  if (!v.ok) return { chyba: v.chyba, email };
  return { hotovo: true, email };
}

export async function noveHesloAkce(_: StavFormulare, form: FormData): Promise<StavFormulare> {
  const v = await zmenitHeslo(heslo(form, "password"), heslo(form, "password_confirm"));
  if (!v.ok) return { chyba: v.chyba };
  redirect("/prehled?heslo=zmeneno");
}

export async function odhlasitAkce() {
  await odhlasit();
  redirect("/prihlaseni?odhlaseno=1");
}
