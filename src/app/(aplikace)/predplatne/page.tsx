import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Hlaska } from "@/components/Formular";
import { datumCz, dny } from "@/lib/faktura";
import { aktivniFirma } from "@/lib/firma";
import { dniDo, TARIFY, type Tarif } from "@/lib/tarify";
import { zmenitTarifAkce } from "./actions";

export const metadata: Metadata = { title: "Předplatné" };

const CHYBY: Record<string, string> = {
  vlastnik: "Tarif může změnit jen vlastník firmy.",
  konec: "Zkušební doba skončila. Změna tarifu bude možná po spuštění plateb.",
  obecna: "Tarif se nepodařilo změnit. Zkuste to prosím znovu.",
};

type Props = { searchParams: Promise<{ zmeneno?: string; chyba?: string }> };

function Fajfka() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 shrink-0 text-green-ink">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default async function PredplatnePage({ searchParams }: Props) {
  const firma = await aktivniFirma();
  if (!firma) redirect("/nastaveni");
  const p = await searchParams;

  const tarif: Tarif = firma.plan;
  const zbyva = dniDo(firma.trial_ends_at);
  const zkusebni = new Date(firma.trial_ends_at).getTime() > Date.now();
  const konec = datumCz(new Date(firma.trial_ends_at).toLocaleDateString("sv-SE", { timeZone: "Europe/Prague" }));
  const procento = Math.min(100, Math.max(0, Math.round(((7 - zbyva) / 7) * 100)));

  return (
    <>
      <section>
        <h1 className="text-3xl font-extrabold tracking-tight">Předplatné</h1>
        <p className="mt-1 text-[15px] text-muted">Váš tarif, zkušební doba a změna tarifu.</p>
      </section>

      {p.zmeneno && p.zmeneno in TARIFY && <Hlaska typ="info">Hotovo, máte tarif {TARIFY[p.zmeneno as Tarif].nazev}.</Hlaska>}
      {p.chyba && <Hlaska typ="chyba">{CHYBY[p.chyba] ?? CHYBY.obecna}</Hlaska>}

      {/* Stav */}
      <section className="flex flex-col gap-4 rounded-2xl bg-navy p-6 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-300">Váš tarif</div>
            <div className="mt-1 flex items-center gap-3">
              <span className="font-display text-3xl font-extrabold">{TARIFY[tarif].nazev}</span>
              <span className="num rounded-full bg-white/10 px-3 py-1 text-sm font-semibold">{TARIFY[tarif].cena} Kč / měsíc</span>
            </div>
          </div>
          <span className={"rounded-full px-3 py-1 text-sm font-bold " + (zkusebni ? "bg-green text-navy" : "bg-amber-tint text-amber")}>
            {zkusebni ? "Zkušební doba zdarma" : "Zkušební doba skončila"}
          </span>
        </div>
        {zkusebni ? (
          <>
            <div className="h-2 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
              <div className="h-full rounded-full bg-green" style={{ width: `${procento}%` }} />
            </div>
            <p className="num text-[15px] text-slate-300">
              Zbývá <strong className="text-white">{zbyva} {dny(zbyva)}</strong>, do {konec}. Do té doby neplatíte nic a tarif můžete libovolně měnit.
            </p>
          </>
        ) : (
          <p className="text-[15px] text-slate-300">
            Placení předplatného brzy spustíme. Do té doby můžete aplikaci dál používat a nic se neztratí.
          </p>
        )}
      </section>

      {/* Tarify */}
      <section className="grid gap-5 md:grid-cols-2" aria-label="Tarify">
        {(Object.keys(TARIFY) as Tarif[]).map((k) => {
          const t = TARIFY[k];
          const aktivni = k === tarif;
          return (
            <article
              key={k}
              className={"flex flex-col gap-4 rounded-2xl border-2 bg-surface p-6 " + (aktivni ? "border-green" : "border-line")}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-extrabold">{t.nazev}</h2>
                  <p className="mt-1 text-[14px] text-muted">{t.popis}</p>
                </div>
                {aktivni && <span className="shrink-0 rounded-full bg-green-tint px-3 py-1 text-[13px] font-bold text-green-ink">Váš tarif</span>}
              </div>
              <div className="num">
                <span className="font-display text-4xl font-extrabold text-navy">{t.cena} Kč</span>
                <span className="text-muted"> / měsíc</span>
              </div>
              <ul className="flex flex-col gap-2 text-[14.5px]">
                {t.funkce.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <Fajfka />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-2">
                {aktivni ? (
                  <div className="flex min-h-12 items-center justify-center rounded-xl bg-slate-100 text-[15px] font-semibold text-muted">
                    Tento tarif máte
                  </div>
                ) : zkusebni ? (
                  <form action={zmenitTarifAkce}>
                    <input type="hidden" name="tarif" value={k} />
                    <button
                      className={
                        "min-h-12 w-full rounded-xl text-[15px] font-bold transition " +
                        (k === "pro" ? "bg-green text-navy hover:brightness-95" : "border-[1.5px] border-line bg-surface text-navy hover:border-muted")
                      }
                    >
                      Přejít na {t.nazev}
                    </button>
                  </form>
                ) : (
                  <div className="flex min-h-12 items-center justify-center rounded-xl border-[1.5px] border-dashed border-slate-300 px-3 text-center text-[14px] text-muted">
                    Změna bude možná po spuštění plateb
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </section>

      {/* Platby */}
      <section className="rounded-2xl border border-line bg-surface p-6">
        <h2 className="text-base font-bold">Platby a faktury za předplatné</h2>
        <p className="mt-2 text-[15px] text-muted">
          Zatím žádné platby. Po skončení zkušební doby tu najdete přehled plateb a faktury ke stažení.
        </p>
      </section>
    </>
  );
}
