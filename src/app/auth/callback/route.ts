import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { bezpecnyCil } from "@/lib/auth";

// Sem vede odkaz z e-mailu (potvrzení registrace, obnova hesla).
// Supabase pošle ?code=…, ten vyměníme za přihlášení.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const cil = bezpecnyCil(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${cil}`);
    console.error("Výměna kódu z e-mailu selhala:", error.code, error.message);
  }

  return NextResponse.redirect(`${origin}/prihlaseni?chyba=odkaz`);
}
