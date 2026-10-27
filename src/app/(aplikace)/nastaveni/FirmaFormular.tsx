"use client";

import { startTransition, useActionState, useState, useTransition } from "react";
import { Pole, Sekce, vstup } from "@/components/Formular";
import { nactiAresAkce, ulozitFirmuAkce, type StavFirmy } from "./actions";

export type HodnotyFirmy = {
  name: string;
  legal_form: "osvc" | "sro" | "jina";
  ico: string;
  dic: string;
  vat_payer: boolean;
  street: string;
  city: string;
  zip: string;
  registry_note: string;
  bank_account: string;
  iban: string;
  email: string;
  phone: string;
  web: string;
};

const FORMY: { hodnota: HodnotyFirmy["legal_form"]; nazev: string; popis: string }[] = [
  { hodnota: "osvc", nazev: "Živnostník (OSVČ)", popis: "Podnikáte na živnostenský list" },
  { hodnota: "sro", nazev: "Společnost s.r.o.", popis: "Firma zapsaná v obchodním rejstříku" },
  { hodnota: "jina", nazev: "Jiná forma", popis: "a.s., spolek, družstvo…" },
];

export function FirmaFormular({ vychozi, nova }: { vychozi: HodnotyFirmy; nova: boolean }) {
  const [h, setH] = useState<HodnotyFirmy>(vychozi);
  const [stav, akce, ukladam] = useActionState<StavFirmy, FormData>(ulozitFirmuAkce, {});
  const [nacitam, startNacitani] = useTransition();
  const [ares, setAres] = useState<{ typ: "ok" | "chyba"; text: string } | null>(null);

  const nastav = <K extends keyof HodnotyFirmy>(k: K, v: HodnotyFirmy[K]) => {
    setH((p) => ({ ...p, [k]: v }));
    if (k === "ico") setAres(null);
  };

  // Odesíláme ručně, aby React po uložení nevymazal vyplněná pole (automatický reset formuláře).
  function odeslat(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => akce(data));
  }
  const text = (k: keyof HodnotyFirmy) => ({
    id: k,
    name: k,
    value: h[k] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => nastav(k, e.target.value as never),
    "aria-invalid": stav.chyby?.[k] ? true : undefined,
    "aria-describedby": stav.chyby?.[k] ? `${k}-chyba` : undefined,
    className: vstup + (stav.chyby?.[k] ? " border-red" : " border-line focus:border-green"),
  });

  function nacistAres() {
    setAres(null);
    startNacitani(async () => {
      const v = await nactiAresAkce(h.ico);
      if (!v.ok) {
        setAres({ typ: "chyba", text: v.chyba });
        return;
      }
      const f = v.firma;
      setH((p) => ({
        ...p,
        ico: f.ico,
        name: f.name,
        legal_form: f.legal_form,
        dic: f.dic ?? p.dic,
        vat_payer: f.vat_payer,
        street: f.street,
        city: f.city,
        zip: f.zip,
        registry_note: f.registry_note || p.registry_note,
      }));
      setAres({
        typ: "ok",
        text: `Načteno z ARES: ${f.name}${f.vat_payer ? " · plátce DPH" : " · neplátce DPH"}. Zkontrolujte údaje a doplňte účet.`,
      });
    });
  }

  return (
    <form onSubmit={odeslat} className="flex flex-col gap-5" noValidate>
      {stav.chyba && (
        <p role="alert" className="rounded-xl bg-red-tint px-4 py-3 text-sm font-medium text-red">
          {stav.chyba}
        </p>
      )}
      {stav.ulozeno && !stav.chyba && (
        <p role="status" className="rounded-xl bg-green-tint px-4 py-3 text-sm font-medium text-green-ink">
          Údaje jsou uložené. Použijí se na všech nových dokladech.
        </p>
      )}

      <Sekce nadpis="Kdo vystavuje doklady" popis="Stačí zadat IČO, zbytek doplníme z veřejného registru ARES.">
        <fieldset className="grid gap-2 sm:grid-cols-3">
          <legend className="mb-1.5 text-sm font-bold text-navy">Právní forma</legend>
          {FORMY.map((f) => (
            <label
              key={f.hodnota}
              className={
                "flex cursor-pointer flex-col gap-0.5 rounded-xl border-[1.5px] p-3 transition " +
                (h.legal_form === f.hodnota ? "border-green bg-green-tint" : "border-line hover:border-muted")
              }
            >
              <span className="flex items-center gap-2 text-sm font-bold text-navy">
                <input
                  type="radio"
                  name="legal_form"
                  value={f.hodnota}
                  checked={h.legal_form === f.hodnota}
                  onChange={() => nastav("legal_form", f.hodnota)}
                  className="accent-green-ink"
                />
                {f.nazev}
              </span>
              <span className="pl-6 text-[12px] text-muted">{f.popis}</span>
            </label>
          ))}
        </fieldset>

        <Pole id="ico" label="IČO" chyba={stav.chyby?.ico}>
          <div className="flex flex-wrap gap-2">
            <input {...text("ico")} inputMode="numeric" autoComplete="off" placeholder="např. 08912345" className={text("ico").className + " num min-w-0 flex-1 basis-40"} />
            <button
              type="button"
              onClick={nacistAres}
              disabled={nacitam || h.ico.replace(/\s/g, "").length < 6}
              className="min-h-12 rounded-xl bg-navy px-5 text-sm font-semibold text-white transition hover:bg-navy-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {nacitam ? "Načítám…" : "Načíst z ARES"}
            </button>
          </div>
        </Pole>
        {ares && (
          <p
            role={ares.typ === "chyba" ? "alert" : "status"}
            className={
              "rounded-xl px-4 py-3 text-sm font-medium " +
              (ares.typ === "chyba" ? "bg-red-tint text-red" : "bg-green-tint text-green-ink")
            }
          >
            {ares.text}
          </p>
        )}

        <Pole id="name" label={h.legal_form === "osvc" ? "Jméno a příjmení (obchodní jméno)" : "Název firmy"} chyba={stav.chyby?.name}>
          <input {...text("name")} autoComplete="organization" />
        </Pole>
      </Sekce>

      <Sekce nadpis="Sídlo" popis="Adresa, která se uvede na fakturách a smlouvách.">
        <Pole id="street" label="Ulice a číslo" chyba={stav.chyby?.street}>
          <input {...text("street")} autoComplete="address-line1" placeholder="Masarykova 412/18" />
        </Pole>
        <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
          <Pole id="zip" label="PSČ" chyba={stav.chyby?.zip}>
            <input {...text("zip")} inputMode="numeric" autoComplete="postal-code" placeholder="602 00" className={text("zip").className + " num"} />
          </Pole>
          <Pole id="city" label="Obec" chyba={stav.chyby?.city}>
            <input {...text("city")} autoComplete="address-level2" placeholder="Brno" />
          </Pole>
        </div>
      </Sekce>

      <Sekce nadpis="DPH" popis="Podle toho se na fakturách počítá a uvádí daň.">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border-[1.5px] border-line p-3">
          <input
            type="checkbox"
            name="vat_payer"
            checked={h.vat_payer}
            onChange={(e) => nastav("vat_payer", e.target.checked)}
            className="mt-0.5 size-5 accent-green-ink"
          />
          <span>
            <span className="block text-sm font-bold text-navy">Jsem plátce DPH</span>
            <span className="text-[13px] text-muted">
              {h.vat_payer
                ? "Faktury budou daňové doklady s DPH."
                : "Na fakturách bude uvedeno „Nejsem plátce DPH“."}
            </span>
          </span>
        </label>
        <Pole id="dic" label={h.vat_payer ? "DIČ" : "DIČ (nepovinné)"} chyba={stav.chyby?.dic} napoveda="Ve tvaru CZ12345678.">
          <input {...text("dic")} autoComplete="off" placeholder="CZ08912345" className={text("dic").className + " num"} />
        </Pole>
      </Sekce>

      <Sekce nadpis="Zápis v rejstříku" popis="Zákon vyžaduje tento údaj na fakturách i dopisech.">
        <Pole
          id="registry_note"
          label={h.legal_form === "sro" ? "Zápis v obchodním rejstříku" : "Údaj o zápisu"}
          chyba={stav.chyby?.registry_note}
          napoveda={
            h.legal_form === "sro"
              ? "Např. „Zapsáno v obchodním rejstříku vedeném Krajským soudem v Brně, oddíl C, vložka 12345.“ Najdete na justice.cz."
              : "U živnostníka stačí „Fyzická osoba zapsaná v živnostenském rejstříku.“"
          }
        >
          <textarea {...text("registry_note")} rows={2} />
        </Pole>
      </Sekce>

      <Sekce nadpis="Platby" popis="Účet se objeví na fakturách a v QR platbě.">
        <Pole
          id="bank_account"
          label="Číslo účtu"
          chyba={stav.chyby?.bank_account}
          napoveda="Ve tvaru 123456789/0800, s předčíslím 19-123456789/0800. IBAN dopočítáme sami."
        >
          <input {...text("bank_account")} inputMode="numeric" autoComplete="off" placeholder="19-2000145399/0800" className={text("bank_account").className + " num"} />
        </Pole>
        <Pole id="iban" label="IBAN (nepovinné)" chyba={stav.chyby?.iban} napoveda="Vyplňte jen pro účet v zahraniční bance.">
          <input {...text("iban")} autoComplete="off" placeholder="CZ65 0800 0000 1920 0014 5399" className={text("iban").className + " num"} />
        </Pole>
      </Sekce>

      <Sekce nadpis="Kontakt na dokladech" popis="Nepovinné. Klient uvidí, kam se ozvat.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Pole id="email" label="E-mail" chyba={stav.chyby?.email}>
            <input {...text("email")} type="email" autoComplete="email" placeholder="fakturace@firma.cz" />
          </Pole>
          <Pole id="phone" label="Telefon">
            <input {...text("phone")} type="tel" autoComplete="tel" placeholder="+420 777 123 456" />
          </Pole>
        </div>
        <Pole id="web" label="Web">
          <input {...text("web")} type="url" autoComplete="url" placeholder="www.firma.cz" />
        </Pole>
      </Sekce>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="submit"
          disabled={ukladam}
          className="min-h-12 rounded-xl bg-green px-6 text-[15px] font-bold text-navy transition hover:brightness-95 disabled:cursor-wait disabled:opacity-70"
        >
          {ukladam ? "Ukládám…" : nova ? "Uložit a pokračovat" : "Uložit změny"}
        </button>
      </div>
    </form>
  );
}
