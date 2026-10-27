"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { FakturaA4 } from "@/components/faktura/FakturaA4";
import { Meritko } from "@/components/faktura/Meritko";
import { Hlaska, Pole, tridyVstupu } from "@/components/Formular";
import { VyberKlienta } from "@/components/VyberKlienta";
import {
  castka,
  datumCz,
  dnuMezi,
  pridatDny,
  SAZBY_DPH,
  spocitej,
  zakladPolozky,
  POZICE_LOGA,
  ZPUSOBY_UHRADY,
  type PoziceLoga,
  type Polozka,
  type SazbaDph,
  type Strana,
  type Vzhled,
  type ZpusobUhrady,
} from "@/lib/faktura";
import type { KlientNavrh } from "@/lib/klienti";
import { ulozitFakturuAkce, type NovaFaktura } from "./actions";

type RadekFormulare = { klic: number; description: string; quantity: string; unit: string; unit_price: string; vat_rate: SazbaDph };

const VZHLEDY: [Vzhled, string][] = [
  ["minimal", "Minimalistický"],
  ["corporate", "Korporátní"],
  ["creative", "Kreativní"],
];
const SPLATNOSTI = [7, 14, 30];

/** „1 234,50" → 1234.5 */
function cislo(text: string): number {
  const t = text.replace(/\s/g, "").replace(",", ".");
  if (t === "" || t === "-") return NaN;
  return Number(t);
}

function textCisla(x: number): string {
  return String(x).replace(".", ",");
}

// Klíč řádku: první řádky mají 1, 2, 3… (stejně na serveru i v prohlížeči), nové dostanou další číslo.
const novyRadek = (klic: number, vat: SazbaDph): RadekFormulare => ({ klic, description: "", quantity: "1", unit: "ks", unit_price: "", vat_rate: vat });

export type VychoziFaktura = Omit<NovaFaktura, "polozky"> & { polozky: Polozka[]; cislo: string; vs: string };

export function FakturaEditor({
  dodavatel,
  platce,
  dnes,
  dalsiCislo,
  logo,
  vychozi,
}: {
  dodavatel: Strana;
  platce: boolean;
  dnes: string;
  dalsiCislo: string;
  /** Adresa nahraného loga firmy, nebo null */
  logo: string | null;
  vychozi?: VychoziFaktura;
}) {
  const vychoziSazba: SazbaDph = platce ? 21 : 0;
  const [odberatel, setOdberatel] = useState<{ id: string | null; s: Strana } | null>(
    vychozi?.customer ? { id: vychozi.client_id, s: vychozi.customer } : null,
  );
  const [radky, setRadky] = useState<RadekFormulare[]>(() =>
    vychozi?.polozky.length
      ? vychozi.polozky.map((p, i) => ({
          klic: i + 1,
          description: p.description,
          quantity: textCisla(p.quantity),
          unit: p.unit,
          unit_price: textCisla(p.unit_price),
          vat_rate: p.vat_rate,
        }))
      : [novyRadek(1, vychoziSazba)],
  );
  const [vystaveno, setVystaveno] = useState(vychozi?.issue_date ?? dnes);
  const [duzp, setDuzp] = useState(vychozi?.taxable_date ?? vychozi?.issue_date ?? dnes);
  const [splatnost, setSplatnost] = useState(vychozi?.due_date ?? pridatDny(dnes, 14));
  const [uhrada, setUhrada] = useState<ZpusobUhrady>(vychozi?.payment_method ?? "prevod");
  const [vzhled, setVzhled] = useState<Vzhled>(vychozi?.template ?? "minimal");
  const [poznamka, setPoznamka] = useState(vychozi?.note ?? "");
  const [uvod, setUvod] = useState(vychozi?.intro_text ?? "");
  const [logoPozice, setLogoPozice] = useState<PoziceLoga | null>(vychozi ? vychozi.logo_position : logo ? "vpravo" : null);
  const [chyba, setChyba] = useState<string | null>(null);
  const [novyKlient, setNovyKlient] = useState(false);
  const [ukladam, startUkladani] = useTransition();

  const polozky: Polozka[] = useMemo(
    () =>
      radky.map((r) => ({
        description: r.description,
        quantity: Number.isFinite(cislo(r.quantity)) ? cislo(r.quantity) : 0,
        unit: r.unit,
        unit_price: Number.isFinite(cislo(r.unit_price)) ? cislo(r.unit_price) : 0,
        vat_rate: platce ? r.vat_rate : 0,
      })),
    [radky, platce],
  );
  const soucty = useMemo(() => spocitej(polozky, platce), [polozky, platce]);
  const dniSplatnosti = dnuMezi(vystaveno, splatnost);

  const zmenRadek = (klic: number, zmena: Partial<RadekFormulare>) =>
    setRadky((rs) => rs.map((r) => (r.klic === klic ? { ...r, ...zmena } : r)));

  function vybratKlienta(k: KlientNavrh, novy: boolean) {
    setOdberatel({
      id: k.id,
      s: { name: k.name, ico: k.ico, dic: k.dic, street: k.street, city: k.city, zip: k.zip, country: k.country, email: k.email },
    });
    setNovyKlient(novy);
    setChyba(null);
  }

  function zmenVystaveno(v: string) {
    if (!v) return;
    // Posunout splatnost i DUZP spolu s datem vystavení
    const posun = dnuMezi(vystaveno, splatnost);
    if (duzp === vystaveno) setDuzp(v);
    setVystaveno(v);
    setSplatnost(pridatDny(v, Math.max(0, posun)));
  }

  function ulozit() {
    setChyba(null);
    if (!odberatel) return setChyba("Vyberte odběratele.");
    const vyplnene = radky.filter((r) => r.description.trim() || r.unit_price.trim());
    if (!vyplnene.length) return setChyba("Přidejte aspoň jednu položku.");
    for (const [i, r] of vyplnene.entries()) {
      if (!r.description.trim()) return setChyba(`Položka ${i + 1}: doplňte popis.`);
      if (!Number.isFinite(cislo(r.quantity)) || cislo(r.quantity) === 0) return setChyba(`Položka ${i + 1}: zadejte množství.`);
      if (!Number.isFinite(cislo(r.unit_price))) return setChyba(`Položka ${i + 1}: zadejte cenu číslem, např. 1 250,50.`);
    }
    const data: NovaFaktura = {
      id: vychozi?.id,
      client_id: odberatel.id,
      customer: { name: odberatel.s.name, ico: odberatel.s.ico, dic: odberatel.s.dic, street: odberatel.s.street, city: odberatel.s.city, zip: odberatel.s.zip, country: odberatel.s.country, email: odberatel.s.email },
      issue_date: vystaveno,
      taxable_date: platce ? duzp : null,
      due_date: splatnost,
      payment_method: uhrada,
      template: vzhled,
      note: poznamka,
      intro_text: uvod,
      logo_position: logo ? logoPozice : null,
      polozky: vyplnene.map((r) => ({
        description: r.description.trim(),
        quantity: cislo(r.quantity),
        unit: r.unit.trim(),
        unit_price: cislo(r.unit_price),
        vat_rate: platce ? r.vat_rate : 0,
      })),
    };
    startUkladani(async () => {
      const v = await ulozitFakturuAkce(data);
      if (v && !v.ok) setChyba(v.chyba);
    });
  }

  const tlacitkoVolby = (aktivni: boolean) =>
    "min-h-10 rounded-xl border-[1.5px] px-3.5 text-sm font-semibold transition " +
    (aktivni ? "border-green-ink bg-green-tint text-green-ink" : "border-line bg-surface text-navy hover:border-muted");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/faktury" className="text-sm font-semibold text-muted hover:text-navy">
            ← Faktury
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {vychozi ? "Úprava faktury" : "Nová faktura"} <span className="num font-semibold text-muted">č. {vychozi?.cislo ?? dalsiCislo}</span>
          </h1>
        </div>
        <button
          type="button"
          onClick={ulozit}
          disabled={ukladam}
          className="min-h-12 rounded-xl bg-green px-6 text-[15px] font-bold text-navy transition hover:brightness-95 disabled:cursor-wait disabled:opacity-70"
        >
          {ukladam ? "Ukládám…" : vychozi ? "Uložit změny" : "Vystavit fakturu"}
        </button>
      </div>

      {chyba && <Hlaska typ="chyba">{chyba}</Hlaska>}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-green-soft bg-green-tint px-5 py-3.5 text-sm">
            <span>
              <strong className="text-navy">Fakturujete jako {dodavatel.name}</strong>
              {dodavatel.ico && <> · IČO {dodavatel.ico}</>} · {platce ? "plátce DPH" : "neplátce DPH"}
            </span>
            <Link href="/nastaveni" className="font-semibold text-green-ink hover:underline">
              Změnit údaje
            </Link>
          </div>

          {/* Odběratel */}
          <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-base font-bold">Odběratel</h2>
            {odberatel ? (
              <div className="flex items-start justify-between gap-4 rounded-xl border border-line bg-slate-50 p-4">
                <div className="min-w-0 text-sm">
                  <div className="font-bold text-navy">{odberatel.s.name}</div>
                  <div className="text-muted">
                    {[odberatel.s.street, [odberatel.s.zip, odberatel.s.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}
                  </div>
                  <div className="num text-[13px] text-muted">
                    {[odberatel.s.ico && `IČO ${odberatel.s.ico}`, odberatel.s.dic && `DIČ ${odberatel.s.dic}`].filter(Boolean).join(" · ")}
                  </div>
                  {novyKlient && <div className="mt-1 text-[13px] font-semibold text-green-ink">Načteno z ARES a uloženo do adresáře.</div>}
                </div>
                <button type="button" onClick={() => setOdberatel(null)} className="shrink-0 text-sm font-semibold text-green-ink hover:underline">
                  Změnit
                </button>
              </div>
            ) : (
              <VyberKlienta onVyber={vybratKlienta} label="Najít v adresáři nebo zadat IČO" />
            )}
          </section>

          {/* Položky */}
          <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-base font-bold">Položky</h2>
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
                      onChange={(e) => zmenRadek(r.klic, { description: e.target.value })}
                      placeholder={`Položka ${i + 1}, např. Návrh webu`}
                      className={tridyVstupu()}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor={`mn-${r.klic}`} className="mb-1 block text-[12px] font-semibold text-muted">
                      Množství
                    </label>
                    <input id={`mn-${r.klic}`} inputMode="decimal" value={r.quantity} onChange={(e) => zmenRadek(r.klic, { quantity: e.target.value })} className={tridyVstupu() + " num"} />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor={`j-${r.klic}`} className="mb-1 block text-[12px] font-semibold text-muted">
                      Jednotka
                    </label>
                    <input id={`j-${r.klic}`} value={r.unit} onChange={(e) => zmenRadek(r.klic, { unit: e.target.value })} placeholder="ks" className={tridyVstupu()} />
                  </div>
                  <div className={platce ? "sm:col-span-3" : "sm:col-span-4"}>
                    <label htmlFor={`c-${r.klic}`} className="mb-1 block text-[12px] font-semibold text-muted">
                      {platce ? "Cena bez DPH" : "Cena za jednotku"}
                    </label>
                    <input id={`c-${r.klic}`} inputMode="decimal" value={r.unit_price} onChange={(e) => zmenRadek(r.klic, { unit_price: e.target.value })} placeholder="0" className={tridyVstupu() + " num"} />
                  </div>
                  {platce && (
                    <div className="sm:col-span-2">
                      <label htmlFor={`d-${r.klic}`} className="mb-1 block text-[12px] font-semibold text-muted">
                        DPH
                      </label>
                      <select id={`d-${r.klic}`} value={r.vat_rate} onChange={(e) => zmenRadek(r.klic, { vat_rate: Number(e.target.value) as SazbaDph })} className={tridyVstupu()}>
                        {SAZBY_DPH.map((s) => (
                          <option key={s} value={s}>
                            {s} %
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className={"col-span-2 flex items-end justify-between gap-2 " + (platce ? "sm:col-span-3" : "sm:col-span-4")}>
                    <div>
                      <div className="mb-1 text-[12px] font-semibold text-muted">{platce ? "Základ" : "Celkem"}</div>
                      <div className="num py-3 text-[15px] font-bold whitespace-nowrap text-navy">{castka(zakladPolozky(polozky[i]))}</div>
                    </div>
                    {radky.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setRadky((rs) => rs.filter((x) => x.klic !== r.klic))}
                        aria-label={`Odebrat položku ${i + 1}`}
                        className="mb-1.5 grid size-10 place-items-center rounded-lg border border-line text-muted hover:border-red hover:text-red"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
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
                onClick={() => setRadky((rs) => [...rs, novyRadek(Math.max(0, ...rs.map((x) => x.klic)) + 1, rs[rs.length - 1]?.vat_rate ?? vychoziSazba)])}
                className="min-h-11 rounded-xl border-[1.5px] border-dashed border-slate-400 px-4 text-sm font-semibold text-navy hover:border-navy"
              >
                + Přidat položku
              </button>
              <div className="num text-right text-[15px]">
                {platce && (
                  <div className="text-[13px] text-muted">
                    Základ {castka(soucty.zaklad)} · DPH {castka(soucty.dph)}
                  </div>
                )}
                Celkem k úhradě <strong className="ml-1 font-display text-2xl text-navy">{castka(soucty.celkem)}</strong>
              </div>
            </div>
          </section>

          {/* Platba a termíny */}
          <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-base font-bold">Platba a termíny</h2>
            <div className={"grid gap-4 " + (platce ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
              <Pole id="vystaveno" label="Datum vystavení">
                <input id="vystaveno" type="date" value={vystaveno} onChange={(e) => zmenVystaveno(e.target.value)} className={tridyVstupu() + " num"} />
              </Pole>
              {platce && (
                <Pole id="duzp" label="Datum plnění (DUZP)" napoveda="Den, kdy jste dodali zboží nebo službu.">
                  <input id="duzp" type="date" value={duzp} onChange={(e) => e.target.value && setDuzp(e.target.value)} className={tridyVstupu() + " num"} />
                </Pole>
              )}
              <Pole id="splatnost" label="Datum splatnosti">
                <input id="splatnost" type="date" min={vystaveno} value={splatnost} onChange={(e) => e.target.value && setSplatnost(e.target.value)} className={tridyVstupu() + " num"} />
              </Pole>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Rychlá volba splatnosti">
              {SPLATNOSTI.map((d) => (
                <button key={d} type="button" onClick={() => setSplatnost(pridatDny(vystaveno, d))} className={tlacitkoVolby(dniSplatnosti === d)}>
                  {d} dní
                </button>
              ))}
              <span className="self-center pl-1 text-[13px] text-muted">splatná {datumCz(splatnost)}</span>
            </div>
            <Pole id="uhrada" label="Způsob úhrady">
              <select id="uhrada" value={uhrada} onChange={(e) => setUhrada(e.target.value as ZpusobUhrady)} className={tridyVstupu()}>
                {Object.entries(ZPUSOBY_UHRADY).map(([k, t]) => (
                  <option key={k} value={k}>
                    {t}
                  </option>
                ))}
              </select>
            </Pole>
            {uhrada === "prevod" && !dodavatel.iban && (
              <Hlaska typ="chyba">
                Nemáte vyplněný bankovní účet, na faktuře nebude QR platba.{" "}
                <Link href="/nastaveni" className="underline">
                  Doplnit v Nastavení
                </Link>
              </Hlaska>
            )}
          </section>

          {/* Vlastní text a logo */}
          <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
            <div>
              <h2 className="text-base font-bold">Vlastní text a logo</h2>
              <p className="mt-0.5 text-[13px] text-muted">Všechno nepovinné. Uvidíte to hned v náhledu.</p>
            </div>
            <Pole id="uvod" label="Text nad položkami">
              <textarea id="uvod" rows={2} maxLength={1000} value={uvod} onChange={(e) => setUvod(e.target.value)} placeholder="Např. Fakturujeme Vám za práce podle objednávky č. 15/2026:" className={tridyVstupu()} />
            </Pole>
            <Pole id="poznamka" label="Text pod položkami">
              <textarea id="poznamka" rows={2} maxLength={1000} value={poznamka} onChange={(e) => setPoznamka(e.target.value)} placeholder="Např. Děkujeme za spolupráci." className={tridyVstupu()} />
            </Pole>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-bold text-navy">Logo</span>
              {logo ? (
                <div className="flex flex-wrap gap-2" role="group" aria-label="Umístění loga">
                  {POZICE_LOGA.map(([k, t]) => (
                    <button key={t} type="button" aria-pressed={logoPozice === k} onClick={() => setLogoPozice(k)} className={tlacitkoVolby(logoPozice === k)}>
                      {t}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-muted">
                  Zatím nemáte nahrané logo.{" "}
                  <Link href="/nastaveni" className="font-semibold text-green-ink hover:underline">
                    Nahrát v Nastavení
                  </Link>
                </p>
              )}
            </div>
          </section>
        </div>

        {/* Náhled */}
        <aside className="flex min-w-0 flex-col gap-3 xl:sticky xl:top-6" aria-label="Náhled faktury">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold">Náhled</h2>
            <div role="group" aria-label="Vzhled faktury" className="flex flex-wrap gap-1 rounded-xl bg-slate-200/70 p-1">
              {VZHLEDY.map(([k, t]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={vzhled === k}
                  onClick={() => setVzhled(k)}
                  className={"min-h-9 rounded-lg px-3 text-[13px] font-semibold " + (vzhled === k ? "bg-surface text-navy shadow-sm" : "text-slate-600")}
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
                    cislo: vychozi?.cislo ?? dalsiCislo,
                    vs: vychozi?.vs ?? dalsiCislo,
                    dodavatel,
                    odberatel: odberatel?.s ?? null,
                    vystaveno,
                    duzp: platce ? duzp : null,
                    splatnost,
                    uhrada,
                    platce,
                    polozky,
                    ...{ rekapitulace: soucty.rekapitulace, zaklad: soucty.zaklad, dph: soucty.dph, celkem: soucty.celkem },
                    poznamka,
                    uvod,
                    logo,
                    logoPozice,
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
