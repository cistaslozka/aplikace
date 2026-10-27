"use client";

import Link from "next/link";
import { startTransition, useActionState, useState, useTransition } from "react";
import { Hlaska, Pole, Sekce, tridyVstupu } from "@/components/Formular";
import { nactiAresAkce } from "../nastaveni/actions";
import { smazatKlientaAkce, ulozitKlientaAkce, type StavKlienta } from "./actions";

export type HodnotyKlienta = {
  id: string;
  name: string;
  ico: string;
  dic: string;
  street: string;
  city: string;
  zip: string;
  country: string;
  email: string;
  phone: string;
  note: string;
};

const ZEME = [
  ["CZ", "Česko"],
  ["SK", "Slovensko"],
  ["DE", "Německo"],
  ["AT", "Rakousko"],
  ["PL", "Polsko"],
  ["HU", "Maďarsko"],
  ["GB", "Velká Británie"],
  ["US", "USA"],
] as const;

export function KlientFormular({ vychozi, novy }: { vychozi: HodnotyKlienta; novy: boolean }) {
  const [h, setH] = useState(vychozi);
  const [stav, akce, ukladam] = useActionState<StavKlienta, FormData>(ulozitKlientaAkce, {});
  const [nacitam, startNacitani] = useTransition();
  const [ares, setAres] = useState<{ typ: "info" | "chyba"; text: string } | null>(null);
  const [potvrditSmazani, setPotvrditSmazani] = useState(false);

  const nastav = (k: keyof HodnotyKlienta, v: string) => {
    setH((p) => ({ ...p, [k]: v }));
    if (k === "ico") setAres(null);
  };
  const text = (k: keyof HodnotyKlienta) => ({
    id: k,
    name: k,
    value: h[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => nastav(k, e.target.value),
    "aria-invalid": stav.chyby?.[k] ? true : undefined,
    "aria-describedby": stav.chyby?.[k] ? `${k}-chyba` : undefined,
    className: tridyVstupu(stav.chyby?.[k]),
  });

  function nacistAres() {
    setAres(null);
    startNacitani(async () => {
      const v = await nactiAresAkce(h.ico);
      if (!v.ok) return setAres({ typ: "chyba", text: v.chyba });
      const f = v.firma;
      setH((p) => ({ ...p, ico: f.ico, name: f.name, dic: f.dic ?? p.dic, street: f.street, city: f.city, zip: f.zip, country: "CZ" }));
      setAres({ typ: "info", text: `Načteno z ARES: ${f.name}. Uložte tlačítkem dole.` });
    });
  }

  function odeslat(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => akce(data));
  }

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={odeslat} className="flex flex-col gap-5" noValidate>
        <input type="hidden" name="id" value={h.id} />
        {stav.chyba && <Hlaska typ="chyba">{stav.chyba}</Hlaska>}
        {stav.ulozeno && !stav.chyba && <Hlaska typ="info">Změny jsou uložené.</Hlaska>}

        <Sekce nadpis="Klient" popis="Údaje, které se objeví na fakturách a smlouvách.">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px]">
            <Pole id="ico" label="IČO" chyba={stav.chyby?.ico}>
              <div className="flex flex-wrap gap-2">
                <input {...text("ico")} inputMode="numeric" autoComplete="off" placeholder="např. 27082440" className={tridyVstupu(stav.chyby?.ico) + " num min-w-0 flex-1 basis-36"} />
                <button
                  type="button"
                  onClick={nacistAres}
                  disabled={nacitam || h.ico.replace(/\s/g, "").length < 6}
                  className="min-h-12 rounded-xl bg-navy px-4 text-sm font-semibold text-white transition hover:bg-navy-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {nacitam ? "Načítám…" : novy ? "Načíst z ARES" : "Aktualizovat z ARES"}
                </button>
              </div>
            </Pole>
            <Pole id="country" label="Země" chyba={stav.chyby?.country}>
              <select {...text("country")}>
                {ZEME.map(([kod, nazev]) => (
                  <option key={kod} value={kod}>
                    {nazev}
                  </option>
                ))}
              </select>
            </Pole>
          </div>
          {ares && <Hlaska typ={ares.typ}>{ares.text}</Hlaska>}
          <Pole id="name" label="Název firmy nebo jméno" chyba={stav.chyby?.name}>
            <input {...text("name")} autoComplete="off" />
          </Pole>
          <Pole id="dic" label="DIČ (nepovinné)" chyba={stav.chyby?.dic} napoveda="U plátců DPH se uvádí na faktuře.">
            <input {...text("dic")} autoComplete="off" placeholder="CZ27082440" className={tridyVstupu(stav.chyby?.dic) + " num"} />
          </Pole>
        </Sekce>

        <Sekce nadpis="Adresa">
          <Pole id="street" label="Ulice a číslo">
            <input {...text("street")} autoComplete="off" />
          </Pole>
          <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
            <Pole id="zip" label="PSČ" chyba={stav.chyby?.zip}>
              <input {...text("zip")} autoComplete="off" className={tridyVstupu(stav.chyby?.zip) + " num"} />
            </Pole>
            <Pole id="city" label="Obec">
              <input {...text("city")} autoComplete="off" />
            </Pole>
          </div>
        </Sekce>

        <Sekce nadpis="Kontakt" popis="Nepovinné. E-mail použijeme pro odeslání faktury.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Pole id="email" label="E-mail" chyba={stav.chyby?.email}>
              <input {...text("email")} type="email" autoComplete="off" placeholder="ucetni@klient.cz" />
            </Pole>
            <Pole id="phone" label="Telefon">
              <input {...text("phone")} type="tel" autoComplete="off" />
            </Pole>
          </div>
          <Pole id="note" label="Poznámka pro vás" napoveda="Klient ji neuvidí.">
            <textarea {...text("note")} rows={2} />
          </Pole>
        </Sekce>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/klienti" className="text-sm font-semibold text-muted hover:text-navy">
            ← Zpět do adresáře
          </Link>
          <button
            type="submit"
            disabled={ukladam}
            className="min-h-12 rounded-xl bg-green px-6 text-[15px] font-bold text-navy transition hover:brightness-95 disabled:cursor-wait disabled:opacity-70"
          >
            {ukladam ? "Ukládám…" : novy ? "Uložit klienta" : "Uložit změny"}
          </button>
        </div>
      </form>

      {!novy && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-5">
          <div>
            <h2 className="text-base font-bold">Smazat klienta</h2>
            <p className="text-[13px] text-muted">Odstraní ho z adresáře. Vystavené doklady zůstanou beze změny.</p>
          </div>
          {potvrditSmazani ? (
            <form action={smazatKlientaAkce} className="flex flex-wrap gap-2">
              <input type="hidden" name="id" value={h.id} />
              <button type="button" onClick={() => setPotvrditSmazani(false)} className="min-h-11 rounded-xl border-[1.5px] border-line px-4 text-sm font-semibold text-navy">
                Ne, nechat
              </button>
              <button type="submit" className="min-h-11 rounded-xl bg-red px-4 text-sm font-semibold text-white">
                Ano, smazat
              </button>
            </form>
          ) : (
            <button type="button" onClick={() => setPotvrditSmazani(true)} className="min-h-11 rounded-xl border-[1.5px] border-red/40 px-4 text-sm font-semibold text-red hover:bg-red-tint">
              Smazat z adresáře
            </button>
          )}
        </section>
      )}
    </div>
  );
}
