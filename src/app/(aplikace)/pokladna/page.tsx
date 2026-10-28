import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { castka, datumCz, dnesIso } from "@/lib/faktura";
import { aktivniFirma } from "@/lib/firma";
import { KRATCE_POKLADNY, zustatek } from "@/lib/pokladna";
import { seznamPokladny } from "@/lib/pokladnaDb";

export const metadata: Metadata = { title: "Pokladna" };

const FILTRY = [
  ["vse", "Vše"],
  ["prijem", "Příjmy"],
  ["vydej", "Výdaje"],
] as const;
type Filtr = (typeof FILTRY)[number][0];

type Props = { searchParams: Promise<{ druh?: string; rok?: string }> };

export default async function PokladnaPage({ searchParams }: Props) {
  const firma = await aktivniFirma();
  if (!firma) redirect("/nastaveni");
  const p = await searchParams;
  const filtr: Filtr = FILTRY.some(([k]) => k === p.druh) ? (p.druh as Filtr) : "vse";
  const dnes = dnesIso();
  const rok = /^20\d{2}$/.test(p.rok ?? "") ? p.rok! : dnes.slice(0, 4);

  const vsechny = await seznamPokladny(firma.id);
  const letos = vsechny.filter((d) => d.issue_date.startsWith(rok));
  const doklady = letos.filter((d) => filtr === "vse" || d.kind === filtr);
  const platne = letos.filter((d) => d.status !== "stornovany");
  const soucet = (k: "prijem" | "vydej") => platne.filter((d) => d.kind === k).reduce((s, d) => s + d.amount, 0);
  const roky = [...new Set([dnes.slice(0, 4), ...vsechny.map((d) => d.issue_date.slice(0, 4))])].sort().reverse();

  const dlazdice = [
    { nazev: "Zůstatek v pokladně", hodnota: castka(zustatek(vsechny)), pod: "všechny platné doklady" },
    { nazev: `Příjmy ${rok}`, hodnota: castka(soucet("prijem")), pod: `${platne.filter((d) => d.kind === "prijem").length} dokladů` },
    { nazev: `Výdaje ${rok}`, hodnota: castka(soucet("vydej")), pod: `${platne.filter((d) => d.kind === "vydej").length} dokladů` },
  ];
  const odkaz = (z: { druh?: string; rok?: string }) => {
    const q = new URLSearchParams({ ...(filtr !== "vse" ? { druh: filtr } : {}), ...(rok !== dnes.slice(0, 4) ? { rok } : {}), ...z });
    if (q.get("druh") === "vse") q.delete("druh");
    return `/pokladna${q.size ? `?${q}` : ""}`;
  };

  return (
    <>
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Pokladna</h1>
          <p className="mt-1 text-[15px] text-muted">Příjmové a výdajové pokladní doklady pro platby v hotovosti.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/pokladna/nova?druh=prijem"
            className="inline-flex min-h-11 items-center rounded-xl bg-green px-4 text-sm font-bold text-navy hover:brightness-95"
          >
            + Příjem
          </Link>
          <Link
            href="/pokladna/nova?druh=vydej"
            className="inline-flex min-h-11 items-center rounded-xl border-[1.5px] border-line bg-surface px-4 text-sm font-semibold text-navy hover:border-muted"
          >
            + Výdaj
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Souhrn pokladny">
        {dlazdice.map((d) => (
          <div key={d.nazev} className="rounded-2xl border border-line bg-surface p-5">
            <div className="text-[13px] font-semibold text-muted">{d.nazev}</div>
            <div className="num mt-1 font-display text-2xl font-extrabold text-navy">{d.hodnota}</div>
            <div className="text-[13px] text-muted">{d.pod}</div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-line bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
          <nav className="flex flex-wrap gap-1" aria-label="Filtr dokladů">
            {FILTRY.map(([k, t]) => (
              <Link
                key={k}
                href={odkaz({ druh: k })}
                aria-current={filtr === k ? "page" : undefined}
                className={
                  "rounded-lg px-3 py-1.5 text-sm font-semibold " +
                  (filtr === k ? "bg-green-tint text-green-ink" : "text-muted hover:text-navy")
                }
              >
                {t}
              </Link>
            ))}
          </nav>
          {roky.length > 1 && (
            <nav className="flex gap-1" aria-label="Rok">
              {roky.map((r) => (
                <Link
                  key={r}
                  href={odkaz({ rok: r })}
                  aria-current={r === rok ? "page" : undefined}
                  className={
                    "num rounded-lg px-3 py-1.5 text-sm font-semibold " +
                    (r === rok ? "bg-slate-100 text-navy" : "text-muted hover:text-navy")
                  }
                >
                  {r}
                </Link>
              ))}
            </nav>
          )}
        </div>
        {doklady.length === 0 ? (
          <p className="px-5 py-10 text-center text-[15px] text-muted">
            {vsechny.length
              ? "V tomto filtru nic není."
              : "Zatím žádné pokladní doklady. Až přijmete nebo vyplatíte hotovost, zapište ji tady."}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {doklady.map((d) => (
              <li key={d.id}>
                <Link href={`/pokladna/${d.id}`} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-slate-50">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-navy">
                      <span
                        className={
                          "mr-2 rounded-full px-2 py-0.5 text-[11.5px] font-semibold " +
                          (d.kind === "prijem" ? "bg-green-tint text-green-ink" : "bg-amber-tint text-amber")
                        }
                      >
                        {KRATCE_POKLADNY[d.kind]}
                      </span>
                      {d.purpose}
                    </div>
                    <div className="num text-[13px] text-muted">
                      {d.number} · {datumCz(d.issue_date)} · {d.partner.name}
                      {d.status === "stornovany" && " · stornováno"}
                    </div>
                  </div>
                  <span
                    className={
                      "num shrink-0 font-bold " +
                      (d.status === "stornovany" ? "text-muted line-through" : d.kind === "prijem" ? "text-green-ink" : "text-navy")
                    }
                  >
                    {d.kind === "prijem" ? "+" : "−"}
                    {castka(d.amount)}
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
