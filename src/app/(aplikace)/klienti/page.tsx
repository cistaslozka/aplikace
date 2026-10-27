import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Hlaska } from "@/components/Formular";
import { aktivniFirma } from "@/lib/firma";
import { SLOUPCE_KLIENTA, type Klient } from "@/lib/klienti";
import { createClient } from "@/lib/supabase/server";
import { HledatKlienta } from "./HledatKlienta";

export const metadata: Metadata = { title: "Adresář klientů" };

type Props = { searchParams: Promise<{ pridano?: string; smazano?: string }> };

const datum = new Intl.DateTimeFormat("cs-CZ", { day: "numeric", month: "numeric", year: "numeric", timeZone: "Europe/Prague" });

export default async function KlientiPage({ searchParams }: Props) {
  const firma = await aktivniFirma();
  if (!firma) redirect("/nastaveni");
  const p = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select(SLOUPCE_KLIENTA)
    .eq("organization_id", firma.id)
    .order("name", { ascending: true })
    .limit(500);
  const klienti = (data ?? []) as Klient[];

  return (
    <>
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Adresář klientů</h1>
          <p className="mt-1 text-[15px] text-muted">
            Klienta načtete z ARES jen jednou. Příště ho najdete podle jména a údaje se doplní samy.
          </p>
        </div>
        <Link href="/klienti/novy" className="rounded-xl border-[1.5px] border-line bg-surface px-4 py-2.5 text-sm font-semibold text-navy hover:border-muted">
          + Přidat klienta ručně
        </Link>
      </section>

      {p.pridano === "1" && <Hlaska typ="info">Klient je uložený v adresáři.</Hlaska>}
      {p.smazano === "1" && <Hlaska typ="info">Klient je smazaný z adresáře.</Hlaska>}

      <section className="rounded-2xl border border-line bg-surface p-5">
        <HledatKlienta />
      </section>

      <section className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="text-base font-bold">Všichni klienti</h2>
          <span className="num text-sm text-muted">{klienti.length}</span>
        </div>
        {klienti.length === 0 ? (
          <p className="px-5 py-8 text-center text-[15px] text-muted">
            Zatím tu nikdo není. Zadejte IČO prvního klienta do pole nahoře.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-[12px] tracking-wide text-muted uppercase">
                  <th className="px-5 py-3 font-semibold">Název</th>
                  <th className="px-3 py-3 font-semibold">IČO</th>
                  <th className="px-3 py-3 font-semibold">Obec</th>
                  <th className="px-3 py-3 font-semibold whitespace-nowrap">Naposledy na dokladu</th>
                  <th className="px-5 py-3"><span className="sr-only">Akce</span></th>
                </tr>
              </thead>
              <tbody>
                {klienti.map((k) => (
                  <tr key={k.id} className="border-t border-line">
                    <td className="px-5 py-3">
                      <Link href={`/klienti/${k.id}`} className="font-semibold text-navy hover:underline">
                        {k.name}
                      </Link>
                      {k.dic && <span className="ml-2 text-[12px] text-muted">{k.dic}</span>}
                    </td>
                    <td className="num px-3 py-3 whitespace-nowrap">{k.ico ?? "—"}</td>
                    <td className="px-3 py-3">{k.city ?? "—"}</td>
                    <td className="num px-3 py-3 whitespace-nowrap text-muted">
                      {k.last_used_at ? datum.format(new Date(k.last_used_at)) : "zatím ne"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/klienti/${k.id}`} className="font-semibold text-green-ink hover:underline">
                        Upravit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
