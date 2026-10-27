import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StavPill } from "@/components/faktura/StavPill";
import { castka, datumCz, dnesIso } from "@/lib/faktura";
import { aktivniFirma } from "@/lib/firma";
import { seznamFaktur, type FakturaRadek } from "@/lib/faktury";

export const metadata: Metadata = { title: "Faktury" };

type Filtr = "vse" | "ceka" | "po" | "uhrazeno" | "zalohy" | "storno";
const FILTRY: [Filtr, string][] = [
  ["vse", "Vše"],
  ["ceka", "Čeká na úhradu"],
  ["po", "Po splatnosti"],
  ["uhrazeno", "Uhrazeno"],
  ["zalohy", "Zálohy"],
  ["storno", "Storno"],
];

function sedi(f: FakturaRadek, filtr: Filtr, dnes: string) {
  switch (filtr) {
    case "ceka":
      return f.status === "vystavena";
    case "po":
      return f.status === "vystavena" && f.due_date < dnes;
    case "uhrazeno":
      return f.status === "uhrazena";
    case "zalohy":
      return f.kind === "zalohova" || f.kind === "ddpp";
    case "storno":
      return f.status === "stornovana";
    default:
      return true;
  }
}

const faktur = (n: number) => `${n} ${n === 1 ? "faktura" : n >= 2 && n <= 4 ? "faktury" : "faktur"}`;

type Props = { searchParams: Promise<{ stav?: string }> };

export default async function FakturyPage({ searchParams }: Props) {
  const firma = await aktivniFirma();
  if (!firma) redirect("/nastaveni");
  const p = await searchParams;
  const filtr: Filtr = FILTRY.some(([k]) => k === p.stav) ? (p.stav as Filtr) : "vse";
  const dnes = dnesIso();
  const rok = dnes.slice(0, 4);

  const vsechny = await seznamFaktur(firma.id);
  const faktury = vsechny.filter((f) => sedi(f, filtr, dnes));
  const neuhrazene = vsechny.filter((f) => f.status === "vystavena");
  const poSplatnosti = neuhrazene.filter((f) => f.due_date < dnes);
  // U konečné faktury počítáme jen to, co zbývá doplatit (záloha už je zaplacená)
  const soucet = (xs: FakturaRadek[]) => xs.reduce((s, f) => s + f.total - f.advance_amount, 0);
  // Do příjmů počítáme jen faktury: zaplacená záloha se později odečte na konečné faktuře
  const uhrazenoLetos = vsechny.filter((f) => f.kind === "faktura" && f.status === "uhrazena" && (f.paid_at ?? "").startsWith(rok));

  const dlazdice = [
    { nazev: "Čeká na úhradu", hodnota: castka(soucet(neuhrazene)), pod: faktur(neuhrazene.length), cervena: false },
    { nazev: "Po splatnosti", hodnota: castka(soucet(poSplatnosti)), pod: faktur(poSplatnosti.length), cervena: poSplatnosti.length > 0 },
    { nazev: `Uhrazené faktury ${rok}`, hodnota: castka(uhrazenoLetos.reduce((s, f) => s + f.total, 0)), pod: faktur(uhrazenoLetos.length), cervena: false },
  ];

  return (
    <>
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Faktury</h1>
          <p className="mt-1 text-[15px] text-muted">Vystavené faktury, jejich stav a úhrady.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {vsechny.length > 0 && (
            <a
              href={`/faktury/export?rok=${rok}`}
              title="Přehled všech faktur za rok pro účetní"
              className="inline-flex min-h-12 items-center rounded-xl border-[1.5px] border-line bg-surface px-4 text-sm font-semibold text-navy hover:border-muted"
            >
              Přehled {rok} do Excelu
            </a>
          )}
          <Link href="/faktury/nova" className="inline-flex min-h-12 items-center rounded-xl bg-green px-5 text-[15px] font-bold text-navy hover:brightness-95">
            + Nová faktura
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {dlazdice.map((d) => (
          <div key={d.nazev} className="rounded-2xl border border-line bg-surface p-5">
            <div className="text-sm font-semibold text-muted">{d.nazev}</div>
            <div className={"num mt-1 font-display text-2xl font-extrabold " + (d.cervena ? "text-red" : "text-navy")}>{d.hodnota}</div>
            <div className="num text-[13px] text-muted">{d.pod}</div>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-line bg-surface">
        <nav aria-label="Filtr faktur" className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2">
          {FILTRY.map(([k, t]) => (
            <Link
              key={k}
              href={k === "vse" ? "/faktury" : `/faktury?stav=${k}`}
              aria-current={filtr === k ? "page" : undefined}
              className={
                "rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap " +
                (filtr === k ? "bg-green-tint text-green-ink" : "text-muted hover:text-navy")
              }
            >
              {t}
            </Link>
          ))}
        </nav>

        {faktury.length === 0 ? (
          <p className="px-5 py-10 text-center text-[15px] text-muted">
            {vsechny.length === 0 ? (
              <>
                Zatím jste nevystavili žádnou fakturu.{" "}
                <Link href="/faktury/nova" className="font-semibold text-green-ink hover:underline">
                  Vystavit první
                </Link>
              </>
            ) : (
              "V tomto filtru nic není."
            )}
          </p>
        ) : (
          <>
            {/* Mobil: karty */}
            <ul className="divide-y divide-line md:hidden">
              {faktury.map((f) => (
                <li key={f.id}>
                  <Link href={`/faktury/${f.id}`} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-navy">{f.customer.name}</div>
                      <div className="num text-[13px] text-muted">
                        {f.kind === "zalohova" && "Záloha · "}
                        {f.kind === "ddpp" && "Daňový doklad · "}
                        {f.number} · splatnost {datumCz(f.due_date)}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="num font-bold text-navy">{castka(f.total - f.advance_amount)}</span>
                      <StavPill status={f.status} splatnost={f.due_date} dnes={dnes} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            {/* Počítač: tabulka */}
            <table className="hidden w-full text-left text-sm md:table">
              <thead className="text-[12px] font-semibold tracking-wide text-muted uppercase">
                <tr className="border-b border-line">
                  <th className="px-5 py-3">Číslo</th>
                  <th className="px-3 py-3">Odběratel</th>
                  <th className="px-3 py-3">Vystaveno</th>
                  <th className="px-3 py-3">Splatnost</th>
                  <th className="px-3 py-3 text-right">Částka</th>
                  <th className="px-5 py-3">Stav</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {faktury.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50">
                    <td className="num px-5 py-3.5 font-semibold">
                      <Link href={`/faktury/${f.id}`} className="text-navy hover:text-green-ink hover:underline">
                        {f.number}
                      </Link>
                    </td>
                    <td className="max-w-64 truncate px-3 py-3.5">
                      {f.kind === "zalohova" && (
                        <span className="mr-2 rounded-full bg-amber-tint px-2 py-0.5 text-[11.5px] font-semibold text-amber">Záloha</span>
                      )}
                      {f.kind === "ddpp" && (
                        <span className="mr-2 rounded-full bg-green-tint px-2 py-0.5 text-[11.5px] font-semibold text-green-ink">Daňový doklad</span>
                      )}
                      {f.customer.name}
                    </td>
                    <td className="num px-3 py-3.5 text-muted">{datumCz(f.issue_date)}</td>
                    <td className="num px-3 py-3.5 text-muted">{datumCz(f.due_date)}</td>
                    <td className="num px-3 py-3.5 text-right font-bold text-navy">{castka(f.total - f.advance_amount)}</td>
                    <td className="px-5 py-3.5">
                      <StavPill status={f.status} splatnost={f.due_date} dnes={dnes} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>
    </>
  );
}
