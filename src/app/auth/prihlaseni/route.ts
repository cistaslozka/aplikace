import { NextResponse, type NextRequest } from "next/server";
import { bezpecnyCil, heslo, prihlasit, text } from "@/lib/auth";

// Přihlášení z formuláře na úvodní stránce (public/uvod_cistaslozka.html).
// Formulář posílá obyčejný POST, odpověď je přesměrování.
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const email = text(form, "email");
  const vysledek = await prihlasit(email, heslo(form, "password"));
  const url = request.nextUrl.clone();
  url.search = "";

  if (vysledek.ok) {
    url.pathname = bezpecnyCil(text(form, "dalsi"));
  } else {
    url.pathname = "/prihlaseni";
    url.searchParams.set("chyba", vysledek.kod);
    if (email) url.searchParams.set("email", email);
  }
  return NextResponse.redirect(url, 303);
}
