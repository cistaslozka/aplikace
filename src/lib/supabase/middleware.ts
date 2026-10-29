import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Stránky, které vidí i nepřihlášený návštěvník.
const VEREJNE = ["/", "/navrh", "/obchodni-podminky", "/ochrana-osobnich-udaju", "/cookies", "/vylouceni-odpovednosti"];
// Stránky pro přihlášení: přihlášeného uživatele z nich pošleme rovnou do aplikace.
const PRIHLASOVACI = ["/prihlaseni", "/registrace", "/zapomenute-heslo"];

function jeVerejna(cesta: string) {
  return VEREJNE.includes(cesta) || cesta.startsWith("/auth/") || cesta.startsWith("/pozvanka/");
}

// Obnoví přihlášení (cookies) při každém požadavku a hlídá přístup ke stránkám.
// Postup podle návodu Supabase pro Next.js (@supabase/ssr).
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // Mezi vytvořením klienta a getUser() nic nedávat, jinak se může rozbít obnova přihlášení.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const cesta = request.nextUrl.pathname;

  const presmeruj = (kam: string, parametry?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    url.pathname = kam;
    url.search = "";
    if (parametry) Object.entries(parametry).forEach(([k, v]) => url.searchParams.set(k, v));
    const r = NextResponse.redirect(url);
    // Přenést obnovené cookies i do přesměrování.
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  if (user) {
    // Přihlášený na úvodní nebo přihlašovací stránce → rovnou do aplikace.
    if (cesta === "/" || PRIHLASOVACI.includes(cesta)) return presmeruj("/prehled");
    return response;
  }

  if (jeVerejna(cesta) || PRIHLASOVACI.includes(cesta)) return response;

  // Nepřihlášený na stránce aplikace → přihlásit a pak vrátit, kam chtěl.
  return presmeruj("/prihlaseni", { dalsi: cesta + request.nextUrl.search });
}
