"use client";

import { useActionState } from "react";
import { zapomenuteHesloAkce, type StavFormulare } from "../actions";
import { Hlaska, Karta, Odeslat, Pole, Prepinac } from "@/components/auth/Formular";

export function ZapomenuteHesloFormular() {
  const [stav, akce] = useActionState<StavFormulare, FormData>(zapomenuteHesloAkce, {});

  return (
    <Karta nadpis="Zapomenuté heslo" popis="Pošleme vám odkaz, přes který si nastavíte nové heslo.">
      {stav.chyba && <Hlaska typ="chyba">{stav.chyba}</Hlaska>}
      {stav.hotovo ? (
        <Hlaska typ="info">
          Pokud u nás účet s adresou <strong>{stav.email}</strong> existuje, poslali jsme na ni odkaz pro nastavení nového hesla.
        </Hlaska>
      ) : (
        <form action={akce} className="flex flex-col gap-5">
          <Pole id="email" label="E-mailová adresa" type="email" autoComplete="email" placeholder="vase@firma.cz" defaultValue={stav.email} />
          <Odeslat odesilam="Odesílám…">Poslat odkaz</Odeslat>
        </form>
      )}
      <Prepinac text="Vzpomněli jste si?" odkaz="Zpět na přihlášení" href="/prihlaseni" />
    </Karta>
  );
}
