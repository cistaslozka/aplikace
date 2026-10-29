"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { CestovniPrikazA4 } from "@/components/cestovni/CestovniPrikazA4";
import { Meritko } from "@/components/faktura/Meritko";
import { Hlaska, Pole, tridyVstupu } from "@/components/Formular";
import { DOPRAVA, dnyCesty, PALIVA, sazbyKeDni, vyuctovat, type Doprava, type Palivo, type VstupCesty } from "@/lib/cestovni";
import { castka, datumCz, type Strana } from "@/lib/faktura";
import { ulozitCestuAkce, type NovaCesta } from "./actions";

/** „1 234,50" → 1234.5 */
function cislo(text: string): number {
  const t = text.replace(/\s/g, "").replace(",", ".");
  return t === "" ? NaN : Number(t);
}
const text = (x: number) => (x ? String(x).replace(".", ",") : "");
const kladne = (t: string) => (Number.isFinite(cislo(t)) && cislo(t) > 0 ? cislo(t) : 0);

type RadekVydaje = { klic: number; popis: string; castka: string };

export function CestovniEditor({
  firma,
  dalsiCislo,
  dnes,
  vychozi,
}: {
  firma: Strana;
  dalsiCislo: string;
  dnes: string;
  vychozi?: NovaCesta & { id: string; cislo: string };
}) {
  const v0 = vychozi?.vstup;
  const [jmeno, setJmeno] = useState(vychozi?.cestovatel.name ?? firma.name);
  const [adresa, setAdresa] = useState(vychozi?.cestovatel.address ?? "");
  const [ucel, setUcel] = useState(vychozi?.ucel ?? "");
  const [misto, setMisto] = useState(vychozi?.misto ?? "");
  const [odjezd, setOdjezd] = useState(v0?.odjezd ?? `${dnes}T07:00`);
  const [prijezd, setPrijezd] = useState(v0?.prijezd ?? `${dnes}T17:00`);
  const [doprava, setDoprava] = useState<Doprava>(v0?.doprava ?? "auto");
  const [km, setKm] = useState(text(v0?.km ?? 0));
  const [spotreba, setSpotreba] = useState(text(v0?.spotreba ?? 0));
  const [palivo, setPalivo] = useState<Palivo>(v0?.palivo ?? "benzin95");
  // Cena paliva: z vyhlášky, dokud ji uživatel nepřepíše (např. podle účtenky)
  const [vlastniCena, setVlastniCena] = useState(v0 ? v0.cenaPaliva !== sazbyKeDni(v0.odjezd).palivo[v0.palivo] : false);
  const [cenaText, setCenaText] = useState(v0 && vlastniCena ? text(v0.cenaPaliva) : "");
  const [spz, setSpz] = useState(vychozi?.vozidlo.spz ?? "");
  const [model, setModel] = useState(vychozi?.vozidlo.model ?? "");
  const [jidla, setJidla] = useState<Record<string, number>>(v0?.jidla ?? {});
  const [vydaje, setVydaje] = useState<RadekVydaje[]>(
    v0?.vydaje.length ? v0.vydaje.map((x, i) => ({ klic: i + 1, popis: x.popis, castka: text(x.castka) })) : [],
  );
  const [zaloha, setZaloha] = useState(text(v0?.zaloha ?? 0));
  const [poznamka, setPoznamka] = useState(vychozi?.poznamka ?? "");
  const [chyba, setChyba] = useState<string | null>(null);
  const [ukladam, start] = useTransition();

  const vlastniVuz = doprava === "auto" || doprava === "motocykl";
  const cenaVyhlaska = sazbyKeDni(odjezd).palivo[palivo];
  const cenaPaliva = vlastniCena ? kladne(cenaText) : cenaVyhlaska;
  const dny = useMemo(() => dnyCesty(odjezd, prijezd), [odjezd, prijezd]);

  const vstup: VstupCesty = {
    odjezd,
    prijezd,
    doprava,
    km: vlastniVuz ? kladne(km) : 0,
    spotreba: vlastniVuz ? kladne(spotreba) : 0,
    palivo,
    cenaPaliva: vlastniVuz ? cenaPaliva : 0,
    jidla: Object.fromEntries(dny.map((d) => [d.datum, jidla[d.datum] ?? 0])),
    vydaje: vydaje.map((x) => ({ popis: x.popis.trim(), castka: kladne(x.castka) })).filter((x) => x.popis || x.castka),
    zaloha: kladne(zaloha),
  };
  const vysledek = vyuctovat(vstup);

  function ulozit() {
    setChyba(null);
    if (!jmeno.trim()) return setChyba("Napište jméno cestovatele.");
    if (!ucel.trim()) return setChyba("Napište účel cesty.");
    if (!misto.trim()) return setChyba("Napište, kam cesta vede.");
    if (!dny.length) return setChyba("Konec cesty musí být po začátku.");
    if (vlastniVuz && !vstup.km) return setChyba("Zadejte počet ujetých kilometrů.");
    if (vlastniVuz && !vstup.spotreba) return setChyba("Zadejte spotřebu podle technického průkazu.");
    start(async () => {
      const r = await ulozitCestuAkce({
        id: vychozi?.id,
        cestovatel: { name: jmeno, address: adresa },
        ucel,
        misto,
        vozidlo: { spz, model },
        vstup,
        poznamka,
      });
      if (r && !r.ok) setChyba(r.chyba);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/cestovni-prikazy" className="text-sm font-semibold text-muted hover:text-navy">
            ← Cestovní příkazy
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {vychozi ? "Úprava cestovního příkazu" : "Nový cestovní příkaz"}{" "}
            <span className="num font-semibold text-muted">č. {vychozi?.cislo ?? dalsiCislo}</span>
          </h1>
        </div>
        <button
          type="button"
          onClick={ulozit}
          disabled={ukladam}
          className="min-h-12 rounded-xl bg-green px-6 text-[15px] font-bold text-navy transition hover:brightness-95 disabled:cursor-wait disabled:opacity-70"
        >
          {ukladam ? "Ukládám…" : vychozi ? "Uložit změny" : "Uložit cestovní příkaz"}
        </button>
      </div>

      {chyba && <Hlaska typ="chyba">{chyba}</Hlaska>}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-base font-bold">Cesta</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Pole id="jmeno" label="Kdo jede">
                <input id="jmeno" value={jmeno} maxLength={200} onChange={(e) => setJmeno(e.target.value)} className={tridyVstupu()} />
              </Pole>
              <Pole id="adresa" label="Bydliště (nepovinné)">
                <input id="adresa" value={adresa} maxLength={300} onChange={(e) => setAdresa(e.target.value)} className={tridyVstupu()} />
              </Pole>
              <Pole id="misto" label="Kam">
                <input
                  id="misto"
                  value={misto}
                  maxLength={300}
                  onChange={(e) => setMisto(e.target.value)}
                  placeholder="Např. Praha, sídlo klienta"
                  className={tridyVstupu()}
                />
              </Pole>
              <Pole id="ucel" label="Účel cesty">
                <input
                  id="ucel"
                  value={ucel}
                  maxLength={500}
                  onChange={(e) => setUcel(e.target.value)}
                  placeholder="Např. jednání s klientem"
                  className={tridyVstupu()}
                />
              </Pole>
              <Pole id="odjezd" label="Začátek cesty">
                <input
                  id="odjezd"
                  type="datetime-local"
                  value={odjezd}
                  onChange={(e) => e.target.value && setOdjezd(e.target.value)}
                  className={tridyVstupu() + " num"}
                />
              </Pole>
              <Pole id="prijezd" label="Konec cesty">
                <input
                  id="prijezd"
                  type="datetime-local"
                  min={odjezd}
                  value={prijezd}
                  onChange={(e) => e.target.value && setPrijezd(e.target.value)}
                  className={tridyVstupu() + " num"}
                />
              </Pole>
            </div>
          </section>

          <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-base font-bold">Doprava</h2>
            <Pole id="doprava" label="Čím">
              <select id="doprava" value={doprava} onChange={(e) => setDoprava(e.target.value as Doprava)} className={tridyVstupu()}>
                {Object.entries(DOPRAVA).map(([k, t]) => (
                  <option key={k} value={k}>
                    {t}
                  </option>
                ))}
              </select>
            </Pole>
            {vlastniVuz ? (
              <div className="grid gap-4 sm:grid-cols-6">
                <div className="sm:col-span-2">
                  <Pole id="km" label="Ujeto km (tam i zpět)">
                    <input
                      id="km"
                      inputMode="decimal"
                      value={km}
                      onChange={(e) => setKm(e.target.value)}
                      placeholder="0"
                      className={tridyVstupu() + " num"}
                    />
                  </Pole>
                </div>
                <div className="sm:col-span-2">
                  <Pole id="palivo" label="Palivo">
                    <select id="palivo" value={palivo} onChange={(e) => setPalivo(e.target.value as Palivo)} className={tridyVstupu()}>
                      {Object.entries(PALIVA).map(([k, p]) => (
                        <option key={k} value={k}>
                          {p.nazev}
                        </option>
                      ))}
                    </select>
                  </Pole>
                </div>
                <div className="sm:col-span-2">
                  <Pole id="spotreba" label={`Spotřeba (${PALIVA[palivo].jednotka}/100 km)`} napoveda="Kombinovaná z technického průkazu.">
                    <input
                      id="spotreba"
                      inputMode="decimal"
                      value={spotreba}
                      onChange={(e) => setSpotreba(e.target.value)}
                      placeholder="Např. 6,2"
                      className={tridyVstupu() + " num"}
                    />
                  </Pole>
                </div>
                <div className="sm:col-span-6">
                  <Pole
                    id="cena"
                    label={`Cena paliva (Kč/${PALIVA[palivo].jednotka})`}
                    napoveda={
                      vlastniCena
                        ? "Cena podle účtenky z čerpací stanice."
                        : `Průměrná cena podle vyhlášky platné ${datumCz(odjezd.slice(0, 10))}. Máte-li účtenku, můžete zadat skutečnou cenu.`
                    }
                  >
                    <div className="flex flex-wrap gap-2">
                      <input
                        id="cena"
                        inputMode="decimal"
                        value={vlastniCena ? cenaText : text(cenaVyhlaska)}
                        readOnly={!vlastniCena}
                        onChange={(e) => setCenaText(e.target.value)}
                        className={tridyVstupu() + " num max-w-40" + (vlastniCena ? "" : " text-muted")}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setVlastniCena(!vlastniCena);
                          if (!vlastniCena) setCenaText(text(cenaVyhlaska));
                        }}
                        className="min-h-11 rounded-xl border-[1.5px] border-line bg-surface px-4 text-sm font-semibold text-navy hover:border-muted"
                      >
                        {vlastniCena ? "Použít cenu z vyhlášky" : "Zadat cenu z účtenky"}
                      </button>
                    </div>
                  </Pole>
                </div>
                <div className="sm:col-span-3">
                  <Pole id="model" label="Auto (nepovinné)">
                    <input
                      id="model"
                      value={model}
                      maxLength={100}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="Např. Škoda Octavia"
                      className={tridyVstupu()}
                    />
                  </Pole>
                </div>
                <div className="sm:col-span-3">
                  <Pole id="spz" label="SPZ (nepovinné)">
                    <input
                      id="spz"
                      value={spz}
                      maxLength={20}
                      onChange={(e) => setSpz(e.target.value.toUpperCase())}
                      className={tridyVstupu() + " num"}
                    />
                  </Pole>
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-muted">Jízdenky, taxi nebo parkovné zapište níže mezi výdaje.</p>
            )}
          </section>

          <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
            <div>
              <h2 className="text-base font-bold">Stravné</h2>
              <p className="mt-0.5 text-[13px] text-muted">
                Počítá se za každý den podle délky cesty. Jídlo zdarma (např. oběd od klienta) stravné snižuje.
              </p>
            </div>
            {vysledek.dny.length ? (
              <ul className="divide-y divide-line rounded-xl border border-line">
                {vysledek.dny.map((d) => (
                  <li key={d.datum} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <span className="num">
                      <strong className="text-navy">{datumCz(d.datum)}</strong> · {String(d.hodin).replace(".", ",")} h ·{" "}
                      <span className="font-semibold">{castka(d.stravne)}</span>
                    </span>
                    <label className="flex items-center gap-2 text-[13px] text-muted">
                      Jídel zdarma
                      <select
                        value={jidla[d.datum] ?? 0}
                        onChange={(e) => setJidla({ ...jidla, [d.datum]: Number(e.target.value) })}
                        disabled={d.pasmo === null}
                        className="num min-h-9 rounded-lg border-[1.5px] border-line bg-surface px-2 text-sm text-navy"
                      >
                        {[0, 1, 2, 3].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-red">Konec cesty musí být po začátku.</p>
            )}
          </section>

          <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-base font-bold">Další výdaje a záloha</h2>
            {vydaje.map((x, i) => (
              <div key={x.klic} className="grid grid-cols-[1fr_9rem_auto] items-end gap-2">
                <Pole id={`vp-${x.klic}`} label={i === 0 ? "Výdaj" : ""}>
                  <input
                    id={`vp-${x.klic}`}
                    value={x.popis}
                    maxLength={200}
                    onChange={(e) => setVydaje(vydaje.map((y) => (y.klic === x.klic ? { ...y, popis: e.target.value } : y)))}
                    placeholder="Např. ubytování, jízdenka, parkovné"
                    className={tridyVstupu()}
                  />
                </Pole>
                <Pole id={`vc-${x.klic}`} label={i === 0 ? "Částka" : ""}>
                  <input
                    id={`vc-${x.klic}`}
                    inputMode="decimal"
                    value={x.castka}
                    onChange={(e) => setVydaje(vydaje.map((y) => (y.klic === x.klic ? { ...y, castka: e.target.value } : y)))}
                    className={tridyVstupu() + " num"}
                  />
                </Pole>
                <button
                  type="button"
                  onClick={() => setVydaje(vydaje.filter((y) => y.klic !== x.klic))}
                  aria-label={`Odebrat výdaj ${i + 1}`}
                  className="mb-0.5 grid size-11 place-items-center rounded-lg border border-line text-muted hover:border-red hover:text-red"
                >
                  ×
                </button>
              </div>
            ))}
            <div className="flex flex-wrap items-end justify-between gap-3">
              <button
                type="button"
                onClick={() => setVydaje([...vydaje, { klic: Math.max(0, ...vydaje.map((x) => x.klic)) + 1, popis: "", castka: "" }])}
                className="min-h-11 rounded-xl border-[1.5px] border-dashed border-slate-400 px-4 text-sm font-semibold text-navy hover:border-navy"
              >
                + Přidat výdaj
              </button>
              <div className="w-40">
                <Pole id="zaloha" label="Vyplacená záloha">
                  <input
                    id="zaloha"
                    inputMode="decimal"
                    value={zaloha}
                    onChange={(e) => setZaloha(e.target.value)}
                    placeholder="0"
                    className={tridyVstupu() + " num"}
                  />
                </Pole>
              </div>
            </div>
            <Pole id="poznamka" label="Poznámka (nepovinné)">
              <textarea
                id="poznamka"
                rows={2}
                maxLength={1000}
                value={poznamka}
                onChange={(e) => setPoznamka(e.target.value)}
                className={tridyVstupu()}
              />
            </Pole>
            <div className="num text-right text-[15px]">
              <div className="text-[13px] text-muted">
                Stravné {castka(vysledek.stravne)} · jízdné {castka(vysledek.jizdne.celkem)} · výdaje {castka(vysledek.vydaje)}
              </div>
              {vysledek.doplatek >= 0 ? "K výplatě" : "Cestovatel vrátí"}{" "}
              <strong className="ml-1 font-display text-2xl text-navy">{castka(Math.abs(vysledek.doplatek))}</strong>
            </div>
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-3 xl:sticky xl:top-6" aria-label="Náhled cestovního příkazu">
          <h2 className="text-base font-bold">Náhled</h2>
          <div className="rounded-2xl bg-slate-200/70 p-3 sm:p-5">
            <div className="shadow-[0_18px_40px_-18px_rgba(15,37,55,0.35)]">
              <Meritko>
                <CestovniPrikazA4
                  d={{
                    cislo: vychozi?.cislo ?? dalsiCislo,
                    firma,
                    cestovatel: { name: jmeno, address: adresa },
                    ucel,
                    misto,
                    vozidlo: { spz, model },
                    vstup,
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
