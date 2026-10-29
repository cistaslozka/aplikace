"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Meritko } from "@/components/faktura/Meritko";
import { Hlaska, Pole, tridyVstupu } from "@/components/Formular";
import { SmlouvaA4 } from "@/components/smlouva/SmlouvaA4";
import { VyberKlienta } from "@/components/VyberKlienta";
import type { Strana, Vzhled } from "@/lib/faktura";
import type { KlientNavrh } from "@/lib/klienti";
import { DRUHY_SMLUV, malym, role, type DataSmlouvy, type DruhSmlouvy, type PoleFormulare } from "@/lib/smlouvy";
import { VZORY } from "@/lib/smlouvy/vzory";
import { ulozitSmlouvuAkce, type NovaSmlouva } from "./actions";

const VZHLEDY: [Vzhled, string][] = [
  ["minimal", "Minimalistický"],
  ["corporate", "Korporátní"],
  ["creative", "Kreativní"],
];

export type VychoziSmlouva = NovaSmlouva & { id: string; cislo: string };

const sirkaTrida = (s: PoleFormulare["sirka"]) => (s === "pul" ? "sm:col-span-3" : s === "tretina" ? "sm:col-span-2" : "sm:col-span-6");

export function SmlouvaEditor({
  druh,
  my,
  dalsiCislo,
  dnes,
  vychozi,
}: {
  druh: DruhSmlouvy;
  my: Strana & { vat_payer?: boolean };
  dalsiCislo: string;
  dnes: string;
  vychozi?: VychoziSmlouva;
}) {
  const vzor = VZORY[druh]!;
  const [myDodavame, setMyDodavame] = useState(vychozi?.we_supply ?? true);
  const [oni, setOni] = useState<{ id: string | null; s: Strana } | null>(
    vychozi?.customer ? { id: vychozi.client_id, s: vychozi.customer } : null,
  );
  const [nazev, setNazev] = useState(vychozi?.title ?? DRUHY_SMLUV[druh].nazev);
  const [pole, setPole] = useState<Record<string, unknown>>(() => ({ ...vzor.vychozi(!!my.vat_payer), ...(vychozi?.fields ?? {}) }));
  const [misto, setMisto] = useState(vychozi?.place ?? my.city ?? "");
  const [datum, setDatum] = useState(vychozi?.signed_on ?? dnes);
  const [vzhled, setVzhled] = useState<Vzhled>(vychozi?.template ?? "minimal");
  const [chyba, setChyba] = useState<string | null>(null);
  const [ukladam, start] = useTransition();
  const r = role({ druh, myDodavame });

  const data: DataSmlouvy = {
    druh,
    cislo: vychozi?.cislo ?? dalsiCislo,
    nazev,
    myDodavame,
    my,
    oni: oni?.s ?? null,
    pole,
    misto,
    datum,
    vzhled,
  };
  const clanky = vzor.clanky(data);

  const nastav = (k: string, v: string) => setPole((p) => ({ ...p, [k]: v }));

  function vybrat(k: KlientNavrh) {
    setOni({
      id: k.id,
      s: { name: k.name, ico: k.ico, dic: k.dic, street: k.street, city: k.city, zip: k.zip, country: k.country, email: k.email },
    });
    setChyba(null);
  }

  function ulozit() {
    setChyba(null);
    if (!oni) return setChyba("Vyberte druhou smluvní stranu.");
    const c = vzor.chyby(pole);
    if (c) return setChyba(c);
    start(async () => {
      const v = await ulozitSmlouvuAkce({
        id: vychozi?.id,
        kind: druh,
        client_id: oni.id,
        we_supply: myDodavame,
        customer: oni.s,
        title: nazev,
        fields: pole,
        place: misto,
        signed_on: datum,
        template: vzhled,
      });
      if (v && !v.ok) setChyba(v.chyba);
    });
  }

  const volba = (aktivni: boolean) =>
    "min-h-10 rounded-xl border-[1.5px] px-3.5 text-sm font-semibold transition " +
    (aktivni ? "border-green-ink bg-green-tint text-green-ink" : "border-line bg-surface text-navy hover:border-muted");

  function vstup(p: PoleFormulare) {
    const id = `pole-${p.k}`;
    const hodnota = typeof pole[p.k] === "string" || typeof pole[p.k] === "number" ? String(pole[p.k]) : "";
    if (p.typ === "textarea")
      return (
        <textarea
          id={id}
          rows={3}
          value={hodnota}
          placeholder={p.placeholder}
          onChange={(e) => nastav(p.k, e.target.value)}
          className={tridyVstupu()}
        />
      );
    if (p.typ === "select")
      return (
        <select id={id} value={hodnota} onChange={(e) => nastav(p.k, e.target.value)} className={tridyVstupu()}>
          {p.moznosti!.map(([k, t]) => (
            <option key={k} value={k}>
              {t}
            </option>
          ))}
        </select>
      );
    return (
      <input
        id={id}
        type={p.typ === "date" ? "date" : "text"}
        inputMode={p.typ === "kc" || p.typ === "cislo" ? "decimal" : undefined}
        value={hodnota}
        placeholder={p.placeholder}
        onChange={(e) => nastav(p.k, e.target.value)}
        className={tridyVstupu() + (p.typ !== "text" ? " num" : "")}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/smlouvy" className="text-sm font-semibold text-muted hover:text-navy">
            ← Smlouvy
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {vychozi ? "Úprava smlouvy" : `Nová ${malym(DRUHY_SMLUV[druh].nazev)}`}{" "}
            <span className="num font-semibold text-muted">č. {vychozi?.cislo ?? dalsiCislo}</span>
          </h1>
        </div>
        <button
          type="button"
          onClick={ulozit}
          disabled={ukladam}
          className="min-h-12 rounded-xl bg-green px-6 text-[15px] font-bold text-navy transition hover:brightness-95 disabled:cursor-wait disabled:opacity-70"
        >
          {ukladam ? "Ukládám…" : vychozi ? "Uložit změny" : "Vytvořit smlouvu"}
        </button>
      </div>

      {chyba && <Hlaska typ="chyba">{chyba}</Hlaska>}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-base font-bold">Smluvní strany</h2>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Vaše role ve smlouvě">
              <button type="button" aria-pressed={myDodavame} onClick={() => setMyDodavame(true)} className={volba(myDodavame)}>
                Jsem {malym(DRUHY_SMLUV[druh].my)}
              </button>
              <button type="button" aria-pressed={!myDodavame} onClick={() => setMyDodavame(false)} className={volba(!myDodavame)}>
                Jsem {malym(DRUHY_SMLUV[druh].oni)}
              </button>
            </div>
            <p className="text-sm">
              <span className="text-muted">{r.my}:</span> <strong className="text-navy">{my.name}</strong>
            </p>
            {oni ? (
              <div className="flex items-start justify-between gap-4 rounded-xl border border-line bg-slate-50 p-4">
                <div className="min-w-0 text-sm">
                  <div className="text-[12px] font-semibold text-muted">{r.oni}</div>
                  <div className="font-bold text-navy">{oni.s.name}</div>
                  <div className="text-muted">
                    {[oni.s.street, [oni.s.zip, oni.s.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}
                  </div>
                  <div className="num text-[13px] text-muted">{oni.s.ico && `IČO ${oni.s.ico}`}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setOni(null)}
                  className="shrink-0 text-sm font-semibold text-green-ink hover:underline"
                >
                  Změnit
                </button>
              </div>
            ) : (
              <VyberKlienta onVyber={vybrat} label={`${r.oni}: najít v adresáři nebo zadat IČO`} />
            )}
          </section>

          {vzor.formular.map((sekce) => (
            <section key={sekce.nadpis} className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
              <h2 className="text-base font-bold">{sekce.nadpis}</h2>
              <div className="grid gap-4 sm:grid-cols-6">
                {sekce.pole.map((p) => (
                  <div key={p.k} className={sirkaTrida(p.sirka)}>
                    <Pole id={`pole-${p.k}`} label={p.label} napoveda={p.napoveda}>
                      {vstup(p)}
                    </Pole>
                  </div>
                ))}
              </div>
            </section>
          ))}

          <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-base font-bold">Název a podpis</h2>
            <div className="grid gap-4 sm:grid-cols-6">
              <div className="sm:col-span-6">
                <Pole id="nazev" label="Název smlouvy">
                  <input id="nazev" value={nazev} onChange={(e) => setNazev(e.target.value)} className={tridyVstupu()} />
                </Pole>
              </div>
              <div className="sm:col-span-3">
                <Pole id="misto" label="Místo podpisu">
                  <input
                    id="misto"
                    value={misto}
                    onChange={(e) => setMisto(e.target.value)}
                    placeholder="Např. Brno"
                    className={tridyVstupu()}
                  />
                </Pole>
              </div>
              <div className="sm:col-span-3">
                <Pole id="datum" label="Datum podpisu">
                  <input
                    id="datum"
                    type="date"
                    value={datum}
                    onChange={(e) => setDatum(e.target.value)}
                    className={tridyVstupu() + " num"}
                  />
                </Pole>
              </div>
            </div>
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-3 xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)]" aria-label="Náhled smlouvy">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold">Náhled</h2>
            <div role="group" aria-label="Vzhled smlouvy" className="flex flex-wrap gap-1 rounded-xl bg-slate-200/70 p-1">
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
          <div className="overflow-y-auto rounded-2xl bg-slate-200/70 p-3 sm:p-5">
            <div className="shadow-[0_18px_40px_-18px_rgba(15,37,55,0.35)]">
              <Meritko volnaVyska>
                <SmlouvaA4 d={data} clanky={clanky} />
              </Meritko>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
