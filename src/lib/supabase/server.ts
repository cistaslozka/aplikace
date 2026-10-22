import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Supabase na serveru (stránky, server actions, route handlers).
// Přihlášení se drží v cookies, které spravuje @supabase/ssr.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Volá se ze Server Component, kde cookies zapisovat nejde.
            // Přihlášení obnoví middleware (přibude v kroku 1).
          }
        },
      },
    },
  );
}
