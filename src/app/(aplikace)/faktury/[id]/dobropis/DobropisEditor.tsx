"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { FakturaA4 } from "@/components/faktura/FakturaA4";
import { Meritko } from "@/components/faktura/Meritko";
import { Hlaska, Pole, tridyVstupu } from "@/components/Formular";
import {
  castka,
  datumCz,
  naHalere,
  pridatDny,
  SAZBY_DPH,
  spocitej,
  zakladPolozky,
  type PoziceLoga,
  type Polozka,
  type SazbaDph,
  type Strana,
  type Vzhled,
  type ZpusobUhrady,
} from "@/lib/faktura";
import { vystavitDobropisAkce } from "../../actions";

type Radek = { klic: number; description: string; quantity: string; unit: string; unit_price: string; vat_rate: SazbaDph };

const VZHLEDY: [Vzhled, string][] = [
  ["minimal", "Minimalistický"],
  ["corporate", "Korporátní"],
  ["creative", "Kreativní"],
];

/** „1 234,50" → 1234.5 */
function cislo(text: string): number {
  const t = text.replace(/\s/g, "").replace(",", ".");
  if (t === "" || t === "-") return NaN;
  return Number(t);
}
const textCisla = (x: number) => String(x).replace(".", ",");

export type PuvodniFaktura = {
  id: string;
  cislo: string;
  vs: string;
  vystaveno: string;
  celkem: number;
  /** Kolik z faktury ještě zbývá opravit (po předchozích dobropisech) */
  zbyva: number;
  dodavatel: Strana;
  odberatel: Strana;
  platce: boolean;
  uhrada: ZpusobUhrady;
  vzhled: Vzhled;
  logo: string | null;
  logoPozice: PoziceLoga | null;
  polozky: Polozka[];
};

export function DobropisEditor({ puvodni, dalsiCislo, dnes }: { puvodni: PuvodniFaktura; dalsiCislo: string; dnes: string }) {
  const f = puvodni;
  const celaFaktura = (): Radek[] =>
    f.polozky.map((p, i) => ({
      klic: i + 1,
      description: p.description,
      quantity: textCisla(-p.quantity),
      unit: p.unit,
      unit_price: textCisla(p.unit_price),
      vat_rate: p.vat_rate,
    }));
  // Když už k faktuře nějaký dobropis je, nabídneme rovnou slevu místo vrácení celé faktury
  const jenSleva = (klic = 1): Radek[] => [
    {
      klic,
      description: `Sleva z faktury č. ${f.cislo}`,
      quantity: "-1",
      unit: "",
      unit_price: "",
      vat_rate: f.polozky[0]?.vat_rate ?? (f.platce ? 21 : 0),
    },
  ];
  const castecne = f.zbyva < f.celkem;
  const [rezim, setRezim] = useState<"cela" | "sleva" | "vlastni">(castecne ? "sleva" : "cela");
  const [radky, setRadky] = useState<Radek[]>(castecne ? jenSleva() : celaFaktura());
  const [duvod, setDuvod] = useState("");
  const [vystaveno, setVystaveno] = useState(dnes);
  const [splatnost, setSplatnost] = useState(pridatDny(dnes, 14));
  const [poznamka, setPoznamka] = useState("");
  const [vzhled, setVzhled] = useState<Vzhled>(f.vzhled);
  const [chyba, setChyba] = useState<string | null>(null);
  const [ukladam, start] = useTransition();

  const polozky: Polozka[] = useMemo(
    () =>
      radky.map((r) => ({
        description: r.description,
        quantity: Number.isFinite(cislo(r.quantity)) ? cislo(r.quantity) : 0,
        unit: r.unit,
        unit_price: Number.isFinite(cislo(r.unit_price)) ? cislo(r.unit_price) : 0,
        vat_rate: f.platce ? r.vat_rate : 0,
      })),
    [radky, f.platce],
  );
  const soucty = useMemo(() => spocitej(polozky, f.platce), [polozky, f.platce]);
  const poOprave = naHalere(f.zbyva + soucty.celkem);

  const zmen = (klic: number, z: Partial<Radek>) => {
    setRadky((rs) => rs.map((r) => (r.klic === klic ? { ...r, ...z } : r)));
    setRezim("vlastni");
  };

  function ulozit() {
    setChyba(null);
    const vyplnene = radky.filter((r) => r.description.trim() || r.unit_price.trim());
    if (!vyplnene.length) return setChyba("Přidejte aspoň jednu položku.");
    for (const [i, r] of vyplnene.entries()) {
      if (!r.description.trim()) return setChyba(`Položka ${i + 1}: doplňte popis.`);
      if (!Number.isFinite(cislo(r.quantity)) || cislo(r.quantity) === 0) return setChyba(`Položka ${i + 1}: zadejte množství.`);
      if (!Number.isFinite(cislo(r.unit_price))) return setChyba(`Položka ${i + 1}: zadejte cenu číslem, např. 1 250,50.`);
    }
    if (soucty.celkem >= 0) return setChyba("Dobropis musí cenu snižovat. Zadejte množství se znaménkem minus, např. −1.");
    if (poOprave < 0) return setChyba(`Dobropis může být nejvýš na ${castka(f.zbyva)}.`);
    start(async () => {
      const v = await vystavitDobropisAkce({
        faktura_id: f.id,
        issue_date: vystaveno,
        due_date: splatnost,
        correction_reason: duvod,
        note: poznamka,
        template: vzhled,
        polozky: vyplnene.map((r) => ({
          description: r.description.trim(),
          quantity: cislo(r.quantity),
          unit: r.unit.trim(),
          unit_price: cislo(r.unit_price),
          vat_rate: f.platce ? r.vat_rate : 0,
        })),
      });
      if (v && !v.ok) setChyba(v.chyba);
    });
  }

  const volba = (aktivni: boolean) =>
    "min-h-10 rounded-xl border-[1.5px] px-3.5 text-sm font-semibold transition " +
    (aktivni ? "border-green-ink bg-green-tint text-green-ink" : "border-line bg-surface text-navy hover:border-muted");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/faktury/${f.id}`} className="text-sm font-semibold text-muted hover:text-navy">
            ← Faktura {f.cislo}
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Nový dobropis <span className="num font-semibold text-muted">č. {dalsiCislo}</span>
          </h1>
        </div>
        <button
          type="button"
          onClick={ulozit}
          disabled={ukladam}
          className="min-h-12 rounded-xl bg-green px-6 text-[15px] font-bold text-navy transition hover:brightness-95 disabled:cursor-wait disabled:opacity-70"
        >
          {ukladam ? "Vystavuji…" : "Vystavit dobropis"}
        </button>
      </div>

      {chyba && <Hlaska typ="chyba">{chyba}</Hlaska>}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <Hlaska typ="info">
            Dobropis {f.platce ? "(opravný daňový doklad) " : ""}snižuje částku faktury <strong className="num">{f.cislo}</strong> pro{" "}
            <strong>{f.odberatel.name.replace(/\.$/, "")}</strong>. Původní faktura zůstane beze změny.
            {f.platce && " Jako plátce DPH ho vystavte do 15 dnů od zjištění důvodu opravy."}
          </Hlaska>

          <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-base font-bold">Co opravujete</h2>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Rozsah dobropisu">
              <button
                type="button"
                aria-pressed={rezim === "cela"}
                disabled={castecne}
                onClick={() => {
                  setRadky(celaFaktura());
                  setRezim("cela");
                }}
                className={volba(rezim === "cela") + " disabled:cursor-not-allowed disabled:opacity-50"}
                title={castecne ? "K faktuře už je dobropis, celá částka nejde vrátit znovu." : undefined}
              >
                Celá faktura
              </button>
              <button
                type="button"
                aria-pressed={rezim === "sleva"}
                onClick={() => {
                  setRadky(jenSleva());
                  setRezim("sleva");
                }}
                className={volba(rezim === "sleva")}
              >
                Sleva nebo část ceny
              </button>
            </div>
            <Pole id="duvod" label="Důvod opravy" napoveda="Např. sleva za pozdní dodání, vrácení zboží, chybně účtované hodiny.">
              <input id="duvod" value={duvod} maxLength={500} onChange={(e) => setDuvod(e.target.value)} className={tridyVstupu()} />
            </Pole>
          </section>

          <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
            <div>
              <h2 className="text-base font-bold">Položky dobropisu</h2>
              <p className="mt-0.5 text-[13px] text-muted">Množství zadávejte se znaménkem minus, o tolik se cena sníží.</p>
            </div>
            <div className="flex flex-col gap-3">
              {radky.map((r, i) => (
                <div key={r.klic} className="grid grid-cols-2 gap-2 rounded-xl border border-line p-3 sm:grid-cols-12">
                  <div className="col-span-2 sm:col-span-12">
                    <label htmlFor={`popis-${r.klic}`} className="sr-only">
                      Popis položky {i + 1}
                    </label>
                    <input
                      id={`popis-${r.klic}`}
                      value={r.description}
                      onChange={(e) => zmen(r.klic, { description: e.target.value })}
                      className={tridyVstupu()}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor={`mn-${r.klic}`} className="mb-1 block text-[12px] font-semibold text-muted">
                      Množství
                    </label>
                    <input
                      id={`mn-${r.klic}`}
                      inputMode="decimal"
                      value={r.quantity}
                      onChange={(e) => zmen(r.klic, { quantity: e.target.value })}
                      className={tridyVstupu() + " num"}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor={`j-${r.klic}`} className="mb-1 block text-[12px] font-semibold text-muted">
                      Jednotka
                    </label>
                    <input
                      id={`j-${r.klic}`}
                      value={r.unit}
                      onChange={(e) => zmen(r.klic, { unit: e.target.value })}
                      className={tridyVstupu()}
                    />
                  </div>
                  <div className={f.platce ? "sm:col-span-3" : "sm:col-span-4"}>
                    <label htmlFor={`c-${r.klic}`} className="mb-1 block text-[12px] font-semibold text-muted">
                      {f.platce ? "Cena bez DPH" : "Cena za jednotku"}
                    </label>
                    <input
                      id={`c-${r.klic}`}
                      inputMode="decimal"
                      value={r.unit_price}
                      placeholder="0"
                      onChange={(e) => zmen(r.klic, { unit_price: e.target.value })}
                      className={tridyVstupu() + " num"}
                    />
                  </div>
                  {f.platce && (
                    <div className="sm:col-span-2">
                      <label htmlFor={`d-${r.klic}`} className="mb-1 block text-[12px] font-semibold text-muted">
                        DPH
                      </label>
                      <select
                        id={`d-${r.klic}`}
                        value={r.vat_rate}
                        onChange={(e) => zmen(r.klic, { vat_rate: Number(e.target.value) as SazbaDph })}
                        className={tridyVstupu()}
                      >
                        {SAZBY_DPH.map((s) => (
                          <option key={s} value={s}>
                            {s} %
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className={"col-span-2 flex items-end justify-between gap-2 " + (f.platce ? "sm:col-span-3" : "sm:col-span-4")}>
                    <div>
                      <div className="mb-1 text-[12px] font-semibold text-muted">{f.platce ? "Základ" : "Celkem"}</div>
                      <div className="num py-3 text-[15px] font-bold whitespace-nowrap text-navy">{castka(zakladPolozky(polozky[i]))}</div>
                    </div>
                    {radky.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setRadky((rs) => rs.filter((x) => x.klic !== r.klic));
                          setRezim("vlastni");
                        }}
                        aria-label={`Odebrat položku ${i + 1}`}
                        className="mb-1.5 grid size-10 place-items-center rounded-lg border border-line text-muted hover:border-red hover:text-red"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          aria-hidden="true"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setRadky((rs) => [...rs, ...jenSleva(Math.max(0, ...rs.map((x) => x.klic)) + 1).map((x) => ({ ...x, description: "" }))]);
                  setRezim("vlastni");
                }}
                className="min-h-11 rounded-xl border-[1.5px] border-dashed border-slate-400 px-4 text-sm font-semibold text-navy hover:border-navy"
              >
                + Přidat položku
              </button>
              <div className="num text-right text-[15px]">
                <div className="text-[13px] text-muted">
                  {f.zbyva < f.celkem ? "Z faktury zbývá" : "Faktura"} {castka(f.zbyva)} · po opravě{" "}
                  <span className={poOprave < 0 ? "font-semibold text-red" : ""}>{castka(poOprave)}</span>
                </div>
                Snížení celkem{" "}
                <strong className={"ml-1 font-display text-2xl " + (soucty.celkem >= 0 || poOprave < 0 ? "text-red" : "text-navy")}>
                  {castka(soucty.celkem)}
                </strong>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-base font-bold">Termíny a poznámka</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Pole id="vystaveno" label="Datum vystavení" napoveda={`Nejdřív ${datumCz(f.vystaveno)}, kdy byla vystavena faktura.`}>
                <input
                  id="vystaveno"
                  type="date"
                  min={f.vystaveno}
                  value={vystaveno}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    setVystaveno(e.target.value);
                    if (splatnost < e.target.value) setSplatnost(pridatDny(e.target.value, 14));
                  }}
                  className={tridyVstupu() + " num"}
                />
              </Pole>
              <Pole id="splatnost" label="Vrátit do" napoveda="Do kdy peníze vrátíte nebo započtete.">
                <input
                  id="splatnost"
                  type="date"
                  min={vystaveno}
                  value={splatnost}
                  onChange={(e) => e.target.value && setSplatnost(e.target.value)}
                  className={tridyVstupu() + " num"}
                />
              </Pole>
            </div>
            <Pole id="poznamka" label="Text pod položkami (nepovinné)">
              <textarea
                id="poznamka"
                rows={2}
                maxLength={1000}
                value={poznamka}
                onChange={(e) => setPoznamka(e.target.value)}
                placeholder="Např. Částku vám vrátíme na účet, ze kterého jste platili."
                className={tridyVstupu()}
              />
            </Pole>
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-3 xl:sticky xl:top-6" aria-label="Náhled dobropisu">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold">Náhled</h2>
            <div role="group" aria-label="Vzhled dokladu" className="flex flex-wrap gap-1 rounded-xl bg-slate-200/70 p-1">
              {VZHLEDY.map(([k, t]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={vzhled === k}
                  onClick={() => setVzhled(k)}
                  className={
                    "min-h-9 rounded-lg px-3 text-[13px] font-semibold " +
                    (vzhled === k ? "bg-surface text-navy shadow-sm" : "text-slate-600")
                  }
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-slate-200/70 p-3 sm:p-5">
            <div className="shadow-[0_18px_40px_-18px_rgba(15,37,55,0.35)]">
              <Meritko>
                <FakturaA4
                  d={{
                    druh: "dobropis",
                    cislo: dalsiCislo,
                    vs: f.vs,
                    dodavatel: f.dodavatel,
                    odberatel: f.odberatel,
                    vystaveno,
                    duzp: f.platce ? vystaveno : null,
                    splatnost,
                    uhrada: f.uhrada,
                    platce: f.platce,
                    polozky,
                    rekapitulace: soucty.rekapitulace,
                    zaklad: soucty.zaklad,
                    dph: soucty.dph,
                    celkem: soucty.celkem,
                    poznamka,
                    oprava: { cislo: f.cislo, vystaveno: f.vystaveno, duvod },
                    logo: f.logo,
                    logoPozice: f.logoPozice,
                    vzhled,
                  }}
                />
              </Meritko>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
