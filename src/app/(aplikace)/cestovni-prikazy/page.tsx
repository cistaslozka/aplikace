import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { casCz } from "@/components/cestovni/CestovniPrikazA4";
import { castka } from "@/lib/faktura";
import { aktivniFirma } from "@/lib/firma";
import { seznamCest } from "@/lib/cestovniDb";

export const metadata: Metadata = { title: "Cestovní příkazy" };

export default async function CestovniPrikazyPage() {
  const firma = await aktivniFirma();
  if (!firma) redirect("/nastaveni");
  const cesty = await seznamCest(firma.id);
  const rok = new Date().getFullYear().toString();
  const letos = cesty.filter((c) => c.status === "platny" && c.trip.vstup.odjezd.startsWith(rok));

  return (
    <>
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Cestovní příkazy</h1>
          <p className="mt-1 text-[15px] text-muted">Pracovní cesty s vyúčtováním stravného, jízdného a výdajů podle sazeb na rok {rok}.</p>
        </div>
        <Link
          href="/cestovni-prikazy/novy"
          className="inline-flex min-h-11 items-center rounded-xl bg-green px-4 text-sm font-bold text-navy hover:brightness-95"
        >
          + Nový cestovní příkaz
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-2" aria-label="Souhrn">
        <div className="rounded-2xl border border-line bg-surface p-5">
          <div className="text-[13px] font-semibold text-muted">Cesty {rok}</div>
          <div className="num mt-1 font-display text-2xl font-extrabold text-navy">{letos.length}</div>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-5">
          <div className="text-[13px] font-semibold text-muted">Náhrady celkem {rok}</div>
          <div className="num mt-1 font-display text-2xl font-extrabold text-navy">{castka(letos.reduce((s, c) => s + c.total, 0))}</div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface">
        {cesty.length === 0 ? (
          <p className="px-5 py-10 text-center text-[15px] text-muted">
            Zatím žádné pracovní cesty. Až někam pojedete, zapište cestu a aplikace spočítá náhrady.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {cesty.map((c) => (
              <li key={c.id}>
                <Link href={`/cestovni-prikazy/${c.id}`} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-slate-50">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-navy">
                      {c.destination} <span className="font-normal text-muted">· {c.purpose}</span>
                    </div>
                    <div className="num text-[13px] text-muted">
                      {c.number} · {casCz(c.trip.vstup.odjezd)} · {c.traveler.name}
                      {c.status === "stornovany" && " · stornováno"}
                    </div>
                  </div>
                  <span className={"num shrink-0 font-bold " + (c.status === "stornovany" ? "text-muted line-through" : "text-navy")}>
                    {castka(c.total)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
