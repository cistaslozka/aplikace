import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Hlaska } from "@/components/Formular";
import { datumCz } from "@/lib/faktura";
import { aktivniFirma, mojeRole } from "@/lib/firma";
import { createClient } from "@/lib/supabase/server";
import { odebratClenaAkce, zrusitPozvankuAkce } from "./actions";
import { NovaPozvanka } from "./NovaPozvanka";

export const metadata: Metadata = { title: "Tým" };

const den = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Prague" });

export default async function TymPage({ searchParams }: { searchParams: Promise<{ chyba?: string }> }) {
  const firma = await aktivniFirma();
  if (!firma) redirect("/nastaveni");
  const p = await searchParams;
  const role = await mojeRole(firma.id);
  const vlastnik = role === "owner";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: clenove }, { data: pozvanky }] = await Promise.all([
    supabase.rpc("clenove_firmy", { p_org: firma.id }),
    vlastnik
      ? supabase
          .from("invitations")
          .select("id, label, created_at, expires_at")
          .eq("organization_id", firma.id)
          .is("accepted_at", null)
          .is("revoked_at", null)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as { id: string; label: string | null; created_at: string; expires_at: string }[] }),
  ]);

  return (
    <>
      <section>
        <h1 className="text-3xl font-extrabold tracking-tight">Tým</h1>
        <p className="mt-1 text-[15px] text-muted">
          Kdo má přístup k firmě {firma.name}. Pozvaní vidí a vystavují doklady stejně jako vy. Tým, předplatné a odebírání lidí spravuje
          jen vlastník.
        </p>
      </section>

      {p.chyba && <Hlaska typ="chyba">{p.chyba.slice(0, 200)}</Hlaska>}

      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-base font-bold">Lidé ve firmě</h2>
        <ul className="divide-y divide-line rounded-xl border border-line">
          {(clenove ?? []).map((c: { user_id: string; email: string; role: string; created_at: string }) => (
            <li key={c.user_id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <span>
                <strong className="text-navy">{c.email}</strong>
                {c.user_id === user?.id && <span className="text-muted"> (vy)</span>}
                <span className="text-muted">
                  {" "}
                  · {c.role === "owner" ? "vlastník" : "člen"} · od {datumCz(den(c.created_at))}
                </span>
              </span>
              {c.role !== "owner" && (vlastnik || c.user_id === user?.id) && (
                <form action={odebratClenaAkce}>
                  <input type="hidden" name="user" value={c.user_id} />
                  <button className="text-sm font-semibold text-red hover:underline">
                    {c.user_id === user?.id ? "Odejít z firmy" : "Odebrat"}
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>

      {vlastnik && (
        <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
          <div>
            <h2 className="text-base font-bold">Pozvat dalšího člověka</h2>
            <p className="mt-0.5 text-[13px] text-muted">
              Vytvořte odkaz a pošlete ho. Kdo ho otevře, přihlásí se nebo zaregistruje a dostane přístup k vaší firmě. Ve firmě může být
              nejvýš 10 lidí.
            </p>
          </div>
          <NovaPozvanka />
          {pozvanky && pozvanky.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-bold text-navy">Nevyužité odkazy</h3>
              <ul className="divide-y divide-line rounded-xl border border-line">
                {pozvanky.map((x) => (
                  <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                    <span>
                      {x.label ?? "Bez popisu"}
                      <span className="num text-muted"> · platí do {datumCz(den(x.expires_at))}</span>
                    </span>
                    <form action={zrusitPozvankuAkce}>
                      <input type="hidden" name="id" value={x.id} />
                      <button className="text-sm font-semibold text-red hover:underline">Zrušit odkaz</button>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </>
  );
}
