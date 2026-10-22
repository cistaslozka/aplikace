"use client";

import { useActionState } from "react";
import { noveHesloAkce, type StavFormulare } from "../actions";
import { Hlaska, Karta, Odeslat, Pole } from "@/components/auth/Formular";

const MIN_DELKA_HESLA = 8;

export function NoveHesloFormular() {
  const [stav, akce] = useActionState<StavFormulare, FormData>(noveHesloAkce, {});

  return (
    <Karta nadpis="Nastavte si nové heslo" popis="Potom vás pustíme rovnou do aplikace.">
      {stav.chyba && <Hlaska typ="chyba">{stav.chyba}</Hlaska>}
      <form action={akce} className="flex flex-col gap-5">
        <Pole id="password" label="Nové heslo" type="password" autoComplete="new-password" minLength={MIN_DELKA_HESLA} placeholder={`Aspoň ${MIN_DELKA_HESLA} znaků`} />
        <Pole id="password_confirm" label="Nové heslo znovu" type="password" autoComplete="new-password" minLength={MIN_DELKA_HESLA} placeholder="Pro kontrolu" />
        <Odeslat odesilam="Ukládám…">Uložit nové heslo</Odeslat>
      </form>
    </Karta>
  );
}
