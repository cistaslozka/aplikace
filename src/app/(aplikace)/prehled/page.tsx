import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Přehled" };
// Datum se počítá při každém otevření, ne jednou při sestavení.
export const dynamic = "force-dynamic";

// Dlaždice zatím ukazují prázdný stav. Skutečná čísla se napojí
// v kroku 5, až budou v databázi faktury.
function Tile({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
      <h2 className="font-sans text-sm font-semibold text-muted">{title}</h2>
      <div className="num font-display text-3xl font-extrabold text-navy">{value}</div>
      <p className="text-[13px] text-muted">{note}</p>
    </article>
  );
}

export default function PrehledPage() {
  const dnes = new Intl.DateTimeFormat("cs-CZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Prague",
  }).format(new Date());

  return (
    <>
      <section>
        <h1 className="text-3xl font-extrabold tracking-tight">Dobrý den</h1>
        <p className="mt-1 text-[15px] text-muted first-letter:uppercase">{dnes}</p>
      </section>

      <section aria-label="Dlaždice přehledu" className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Tile title="Neuhrazené faktury" value="0 Kč" note="Zatím jste nevystavili žádnou fakturu." />
        <Tile title="Po splatnosti" value="0 Kč" note="Hlídáme splatnost za vás." />
        <Tile title="Obrat a limit pro DPH" value="0 Kč" note="Limit 2 000 000 Kč za kalendářní rok." />
      </section>

      <section className="flex flex-col items-start gap-4 rounded-2xl bg-navy p-6 text-slate-300">
        <h2 className="text-lg text-white">Začněte první fakturou</h2>
        <p className="max-w-prose text-sm">
          Vyplníte IČO odběratele, údaje se doplní z ARES a fakturu stáhnete jako PDF s QR platbou.
        </p>
        <Link href="/faktury/nova" className="rounded-xl bg-green px-4 py-3 text-[15px] font-bold text-navy hover:brightness-95">
          Nová faktura
        </Link>
      </section>
    </>
  );
}
