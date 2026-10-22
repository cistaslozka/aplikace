import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { createClient } from "@/lib/supabase/server";

// Rozvržení všech stránek po přihlášení: boční menu + obsah.
// Na mobilu je menu nahoře a dá se posouvat do strany.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Pojistka navíc k middleware: bez přihlášení se aplikace nevykreslí.
  if (!user) redirect("/prihlaseni");

  return (
    <div className="min-h-screen md:flex">
      <Sidebar email={user.email ?? ""} />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">{children}</div>
      </main>
    </div>
  );
}
