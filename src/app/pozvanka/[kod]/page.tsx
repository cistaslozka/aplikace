import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import { prijmoutPozvankuAkce } from "@/app/(aplikace)/nastaveni/tym/actions";

export const metadata: Metadata = { title: "Pozvánka do firmy", robots: { index: false } };

const STAVY: Record<string, string> = {
  pouzita: "Tento odkaz už byl použitý.",
  zrusena: "Tento odkaz byl zrušený.",
  vyprsela: "Platnost odkazu vypršela.",
};

type Props = { params: Promise<{ kod: string }>; searchParams: Promise<{ chyba?: string }> };

export default async function PozvankaPage({ params, searchParams }: Props) {
  const { kod } = await params;
  const p = await searchParams;
  const supabase = await createClient();
  const platnyTvar = /^[0-9a-f]{48}$/.test(kod);
  const [{ data }, { data: u }] = await Promise.all([
    platnyTvar ? supabase.rpc("nahled_pozvanky", { p_token: kod }) : Promise.resolve({ data: null }),
    supabase.auth.getUser(),
  ]);
  const pozvanka = (data as { firma: string; stav: string }[] | null)?.[0] ?? null;
  const cil = encodeURIComponent(`/pozvanka/${kod}`);

  return (
    <div className="grid min-h-screen place-items-center bg-page px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-5 rounded-3xl border border-line bg-surface p-8 shadow-sm">
        <div className="rounded-xl bg-navy px-4 py-3">
          <Logo />
        </div>
        {!pozvanka ? (
          <>
            <h1 className="text-2xl font-extrabold tracking-tight">Pozvánka nenalezena</h1>
            <p className="text-[15px] text-muted">Zkontrolujte, že jste otevřeli celý odkaz, nebo požádejte o nový.</p>
          </>
        ) : pozvanka.stav !== "platna" ? (
          <>
            <h1 className="text-2xl font-extrabold tracking-tight">Pozvánka do firmy {pozvanka.firma}</h1>
            <p className="text-[15px] text-muted">{STAVY[pozvanka.stav]} Požádejte o nový odkaz.</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold tracking-tight">Pozvánka do firmy {pozvanka.firma}</h1>
            <p className="text-[15px] text-muted">
              Dostanete přístup k fakturám, smlouvám a dalším dokladům této firmy v aplikaci čistásložka.cz.
            </p>
            {p.chyba && <p className="rounded-xl bg-red-tint px-4 py-3 text-sm text-red">{p.chyba.slice(0, 200)}</p>}
            {u.user ? (
              <form action={prijmoutPozvankuAkce}>
                <input type="hidden" name="kod" value={kod} />
                <button className="min-h-12 w-full rounded-xl bg-green text-[15px] font-bold text-navy hover:brightness-95">
                  Přijmout pozvánku
                </button>
                <p className="mt-2 text-center text-[13px] text-muted">Přihlášeni jako {u.user.email}</p>
              </form>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  href={`/registrace?dalsi=${cil}`}
                  className="flex min-h-12 items-center justify-center rounded-xl bg-green text-[15px] font-bold text-navy hover:brightness-95"
                >
                  Vytvořit účet a přijmout
                </Link>
                <Link
                  href={`/prihlaseni?dalsi=${cil}`}
                  className="flex min-h-12 items-center justify-center rounded-xl border-[1.5px] border-line text-[15px] font-semibold text-navy hover:border-muted"
                >
                  Mám účet, přihlásit se
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
