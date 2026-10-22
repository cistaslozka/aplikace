import { NextResponse, type NextRequest } from "next/server";
import { heslo, registrovat, text } from "@/lib/auth";

// Registrace z formuláře na úvodní stránce (public/uvod_cistaslozka.html).
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const email = text(form, "email");
  const vysledek = await registrovat(email, heslo(form, "password"), heslo(form, "password_confirm"));
  const url = request.nextUrl.clone();
  url.search = "";

  if (vysledek.ok && vysledek.stav === "prihlasen") {
    url.pathname = "/prehled";
  } else if (vysledek.ok) {
    url.pathname = "/registrace";
    url.searchParams.set("odeslano", "1");
    url.searchParams.set("email", email);
  } else {
    url.pathname = "/registrace";
    url.searchParams.set("chyba", vysledek.kod);
    if (email) url.searchParams.set("email", email);
  }
  return NextResponse.redirect(url, 303);
}
