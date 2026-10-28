"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Meritko } from "@/components/faktura/Meritko";
import { Hlaska, Pole, tridyVstupu } from "@/components/Formular";
import { PokladniDokladList, rozpisDph } from "@/components/pokladna/PokladniDokladList";
import { VyberKlienta } from "@/components/VyberKlienta";
import { castka, type Strana } from "@/lib/faktura";
import type { KlientNavrh } from "@/lib/klienti";
import { LIMIT_HOTOVOSTI, NAZVY_POKLADNY, type DruhPokladny } from "@/lib/pokladna";
import { ulozitPokladniDokladAkce } from "../actions";

export type PredvyplneniFaktury = { id: string; cislo: string; castka: number; odberatel: Strana; sazba: number | null };

/** „1 234,50" → 1234.5 */
function cislo(text: string): number {
  const t = text.replace(/\s/g, "").replace(",", ".");
  return t === "" ? NaN : Number(t);
}

export function NovyDoklad({
  vychoziDruh,
  cislaDokladu,
  firma,
  platce,
  dnes,
  faktura,
}: {
  vychoziDruh: DruhPokladny;
  cislaDokladu: Record<DruhPokladny, string>;
  firma: Strana;
  platce: boolean;
  dnes: string;
  faktura?: PredvyplneniFaktury;
}) {
  const [druh, setDruh] = useState<DruhPokladny>(vychoziDruh);
  const [datum, setDatum] = useState(dnes);
  const [castkaText, setCastkaText] = useState(faktura ? String(faktura.castka).replace(".", ",") : "");
  const [ucel, setUcel] = useState(faktura ? `Úhrada faktury č. ${faktura.cislo}` : "");
  const [partner, setPartner] = useState<Strana>(faktura?.odberatel ?? { name: "" });
  const [sazba, setSazba] = useState<number | null>(faktura ? faktura.sazba : platce ? 21 : null);
  const [poznamka, setPoznamka] = useState("");
  const [chyba, setChyba] = useState<string | null>(null);
  const [ukladam, start] = useTransition();
  const prijem = druh === "prijem";

  const c = cislo(castkaText);
  const castkaOk = Number.isFinite(c) && c > 0;
  const dph = rozpisDph(castkaOk ? c : 0, platce ? sazba : null);

  function vybrat(k: KlientNavrh) {
    setPartner({ name: k.name, ico: k.ico, dic: k.dic, street: k.street, city: k.city, zip: k.zip, country: k.country });
  }

  function ulozit() {
    setChyba(null);
    if (!castkaOk) return setChyba("Zadejte částku číslem, např. 1 250,50.");
    if (!ucel.trim()) return setChyba("Napište účel platby.");
    if (!partner.name.trim()) return setChyba(prijem ? "Napište, od koho peníze přijímáte." : "Napište, komu peníze vyplácíte.");
    start(async () => {
      const v = await ulozitPokladniDokladAkce({
        kind: druh,
        issue_date: datum,
        amount: c,
        purpose: ucel,
        partner: { name: partner.name, ico: partner.ico, street: partner.street, city: partner.city, zip: partner.zip },
        vat_rate: platce ? sazba : null,
        invoice_id: faktura?.id ?? null,
        note: poznamka,
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
          <Link href={faktura ? `/faktury/${faktura.id}` : "/pokladna"} className="text-sm font-semibold text-muted hover:text-navy">
            ← {faktura ? `Faktura ${faktura.cislo}` : "Pokladna"}
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {NAZVY_POKLADNY[druh]} <span className="num font-semibold text-muted">č. {cislaDokladu[druh]}</span>
          </h1>
        </div>
        <button
          type="button"
          onClick={ulozit}
          disabled={ukladam}
          className="min-h-12 rounded-xl bg-green px-6 text-[15px] font-bold text-navy transition hover:brightness-95 disabled:cursor-wait disabled:opacity-70"
        >
          {ukladam ? "Ukládám…" : "Uložit doklad"}
        </button>
      </div>

      {chyba && <Hlaska typ="chyba">{chyba}</Hlaska>}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          {faktura ? (
            <Hlaska typ="info">
              Hotovostní úhrada faktury <strong className="num">{faktura.cislo}</strong>. Po uložení se faktura označí jako uhrazená.
            </Hlaska>
          ) : (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Druh dokladu">
              <button type="button" aria-pressed={prijem} onClick={() => setDruh("prijem")} className={volba(prijem)}>
                Příjem peněz
              </button>
              <button type="button" aria-pressed={!prijem} onClick={() => setDruh("vydej")} className={volba(!prijem)}>
                Výdej peněz
              </button>
            </div>
          )}

          <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-base font-bold">Platba</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Pole id="castka" label="Částka v hotovosti">
                <input
                  id="castka"
                  inputMode="decimal"
                  value={castkaText}
                  onChange={(e) => setCastkaText(e.target.value)}
                  placeholder="0"
                  className={tridyVstupu() + " num"}
                />
              </Pole>
              <Pole id="datum" label="Datum">
                <input
                  id="datum"
                  type="date"
                  max={dnes}
                  value={datum}
                  onChange={(e) => e.target.value && setDatum(e.target.value)}
                  className={tridyVstupu() + " num"}
                />
              </Pole>
            </div>
            {castkaOk && c > LIMIT_HOTOVOSTI && (
              <Hlaska typ="chyba">
                Platba nad {castka(LIMIT_HOTOVOSTI)} za den jednomu příjemci se v hotovosti platit nesmí (zákon o omezení plateb v
                hotovosti). Použijte převod.
              </Hlaska>
            )}
            <Pole id="ucel" label="Účel platby">
              <input
                id="ucel"
                value={ucel}
                maxLength={300}
                onChange={(e) => setUcel(e.target.value)}
                placeholder={prijem ? "Např. tržba za zboží, vklad do pokladny" : "Např. nákup kancelářských potřeb, výběr z pokladny"}
                className={tridyVstupu()}
              />
            </Pole>
            {platce && (
              <Pole id="sazba" label="DPH v částce" napoveda="Částku zadávejte včetně DPH. Vklad nebo výběr peněz je bez DPH.">
                <select
                  id="sazba"
                  value={sazba === null ? "" : String(sazba)}
                  onChange={(e) => setSazba(e.target.value === "" ? null : Number(e.target.value))}
                  className={tridyVstupu()}
                >
                  <option value="21">21 %</option>
                  <option value="12">12 %</option>
                  <option value="0">0 %</option>
                  <option value="">bez DPH (např. vklad, výběr, záloha)</option>
                </select>
              </Pole>
            )}
          </section>

          <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-base font-bold">{prijem ? "Od koho" : "Komu"}</h2>
            {!faktura && <VyberKlienta onVyber={vybrat} label="Vybrat z adresáře (nepovinné)" />}
            <div className="grid gap-4 sm:grid-cols-6">
              <div className="sm:col-span-4">
                <Pole id="jmeno" label="Jméno nebo název firmy">
                  <input
                    id="jmeno"
                    value={partner.name}
                    maxLength={200}
                    onChange={(e) => setPartner({ ...partner, name: e.target.value })}
                    className={tridyVstupu()}
                  />
                </Pole>
              </div>
              <div className="sm:col-span-2">
                <Pole id="ico" label="IČO (nepovinné)">
                  <input
                    id="ico"
                    value={partner.ico ?? ""}
                    onChange={(e) => setPartner({ ...partner, ico: e.target.value })}
                    className={tridyVstupu() + " num"}
                  />
                </Pole>
              </div>
              <div className="sm:col-span-6">
                <Pole id="ulice" label="Adresa (nepovinné)">
                  <input
                    id="ulice"
                    value={[partner.street, [partner.zip, partner.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}
                    onChange={(e) => setPartner({ ...partner, street: e.target.value, city: null, zip: null })}
                    placeholder="Ulice a číslo, PSČ a obec"
                    className={tridyVstupu()}
                  />
                </Pole>
              </div>
            </div>
            <Pole id="poznamka" label="Poznámka (nepovinné)">
              <textarea
                id="poznamka"
                rows={2}
                maxLength={500}
                value={poznamka}
                onChange={(e) => setPoznamka(e.target.value)}
                className={tridyVstupu()}
              />
            </Pole>
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-3 xl:sticky xl:top-6" aria-label="Náhled dokladu">
          <h2 className="text-base font-bold">Náhled</h2>
          <div className="rounded-2xl bg-slate-200/70 p-3 sm:p-5">
            <div className="shadow-[0_18px_40px_-18px_rgba(15,37,55,0.35)]">
              <Meritko vyska={561}>
                <PokladniDokladList
                  d={{
                    druh,
                    cislo: cislaDokladu[druh],
                    datum,
                    castka: castkaOk ? c : 0,
                    ucel,
                    partner,
                    firma,
                    platce,
                    sazba: platce ? sazba : null,
                    zaklad: dph.zaklad,
                    dph: dph.dph,
                    faktura: faktura?.cislo,
                    poznamka,
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
