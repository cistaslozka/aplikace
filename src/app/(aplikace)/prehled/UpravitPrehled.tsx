"use client";

import { useState, useTransition } from "react";
import { DLAZDICE, type PolozkaRozlozeni } from "@/lib/rozlozeni";
import { ulozitRozlozeniAkce } from "./actions";

const NAZVY = Object.fromEntries(DLAZDICE.map((d) => [d.id, d.nazev])) as Record<string, string>;

function Sipka({ nahoru }: { nahoru: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {nahoru ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
    </svg>
  );
}

export function UpravitPrehled({ rozlozeni }: { rozlozeni: PolozkaRozlozeni[] }) {
  const [otevreno, setOtevreno] = useState(false);
  const [seznam, setSeznam] = useState(rozlozeni);
  const [chyba, setChyba] = useState(false);
  const [ukladam, start] = useTransition();

  const posun = (i: number, o: number) =>
    setSeznam((s) => {
      const j = i + o;
      if (j < 0 || j >= s.length) return s;
      const n = [...s];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  function ulozit(novy: PolozkaRozlozeni[] | null) {
    setChyba(false);
    start(async () => {
      const v = await ulozitRozlozeniAkce(novy);
      if (!v.ok) return setChyba(true);
      if (!novy) setSeznam(rozlozeni.map((x) => ({ ...x, zapnuto: true })));
      setOtevreno(false);
    });
  }

  const tlacitko = "min-h-11 rounded-xl border-[1.5px] border-line bg-surface px-4 text-sm font-semibold text-navy hover:border-muted";

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSeznam(rozlozeni);
          setOtevreno((o) => !o);
        }}
        aria-expanded={otevreno}
        className={tlacitko + " inline-flex items-center gap-2"}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
        Upravit přehled
      </button>

      {otevreno && (
        <section aria-label="Úprava přehledu" className="order-last flex w-full flex-col gap-4 rounded-2xl border border-green-soft bg-green-tint p-5">
          <div>
            <h2 className="text-base font-bold">Co chcete na přehledu vidět?</h2>
            <p className="text-[13px] text-muted">Dlaždice zapněte nebo vypněte a šipkami změňte pořadí. Nastavení platí jen pro vás.</p>
          </div>
          <ul className="flex flex-col gap-2">
            {seznam.map((x, i) => (
              <li key={x.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2">
                <label className="flex min-h-10 flex-1 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={x.zapnuto}
                    onChange={(e) => setSeznam((s) => s.map((y) => (y.id === x.id ? { ...y, zapnuto: e.target.checked } : y)))}
                    className="size-5 accent-green-ink"
                  />
                  <span className={"text-[15px] font-semibold " + (x.zapnuto ? "text-navy" : "text-muted line-through")}>{NAZVY[x.id]}</span>
                </label>
                <button type="button" onClick={() => posun(i, -1)} disabled={i === 0} aria-label={`Posunout ${NAZVY[x.id]} nahoru`} className="grid size-10 place-items-center rounded-lg border border-line text-navy hover:border-muted disabled:opacity-30">
                  <Sipka nahoru />
                </button>
                <button type="button" onClick={() => posun(i, 1)} disabled={i === seznam.length - 1} aria-label={`Posunout ${NAZVY[x.id]} dolů`} className="grid size-10 place-items-center rounded-lg border border-line text-navy hover:border-muted disabled:opacity-30">
                  <Sipka nahoru={false} />
                </button>
              </li>
            ))}
          </ul>
          {chyba && (
            <p role="alert" className="text-sm font-semibold text-red">
              Nastavení se nepodařilo uložit. Zkuste to prosím znovu.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => ulozit(seznam)} disabled={ukladam} className="min-h-11 rounded-xl bg-green px-5 text-sm font-bold text-navy hover:brightness-95 disabled:opacity-60">
              {ukladam ? "Ukládám…" : "Uložit přehled"}
            </button>
            <button type="button" onClick={() => setOtevreno(false)} className={tlacitko}>
              Zrušit
            </button>
            <button type="button" onClick={() => ulozit(null)} disabled={ukladam} className="min-h-11 px-2 text-sm font-semibold text-muted hover:text-navy">
              Obnovit výchozí
            </button>
          </div>
        </section>
      )}
    </>
  );
}
