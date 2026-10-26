import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { aktivniFirma } from "@/lib/firma";

export const metadata: Metadata = { title: "Přehled" };

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

function dniDo(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

function dny(n: number) {
  return n === 1 ? "den" : n >= 2 && n <= 4 ? "dny" : "dní";
}

type Props = { searchParams: Promise<{ vitejte?: string; heslo?: string }> };

export default async function PrehledPage({ searchParams }: Props) {
  const firma = await aktivniFirma();
  // Nový uživatel: nejdřív údaje o firmě, bez nich nejde vystavit doklad.
  if (!firma) redirect("/nastaveni");

  const p = await searchParams;
  const dnes = new Intl.DateTimeFormat("cs-CZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Prague",
  }).format(new Date());
  const zbyva = dniDo(firma.trial_ends_at);

  return (
    <>
      {p.vitejte === "1" && (
        <p role="status" className="rounded-xl bg-green-tint px-4 py-3 text-sm font-medium text-green-ink">
          Hotovo, údaje o firmě jsou uložené. Teď už můžete vystavit první fakturu.
        </p>
      )}
      {p.heslo === "zmeneno" && (
        <p role="status" className="rounded-xl bg-green-tint px-4 py-3 text-sm font-medium text-green-ink">
          Nové heslo je uložené.
        </p>
      )}

      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold tracking-tight">Dobrý den</h1>
          <p className="mt-1 text-[15px] text-muted">
            <span className="first-letter:uppercase inline-block">{dnes}</span> · {firma.name}
          </p>
        </div>
        {firma.plan === "basic" && (
          <span className="rounded-full bg-amber-tint px-3 py-1.5 text-[13px] font-semibold text-amber">
            {zbyva > 0 ? `Zkušební doba: zbývá ${zbyva} ${dny(zbyva)}` : "Zkušební doba skončila"}
          </span>
        )}
      </section>

      <section aria-label="Dlaždice přehledu" className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Tile title="Neuhrazené faktury" value="0 Kč" note="Zatím jste nevystavili žádnou fakturu." />
        <Tile title="Po splatnosti" value="0 Kč" note="Hlídáme splatnost za vás." />
        {firma.vat_payer ? (
          <Tile title="DPH k odvodu" value="0 Kč" note="Jste plátce DPH. Spočítáme daň z vystavených faktur." />
        ) : (
          <Tile title="Obrat a limit pro DPH" value="0 Kč" note="Limit 2 000 000 Kč za kalendářní rok." />
        )}
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
