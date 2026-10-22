"use client";

import { useActionState } from "react";
import { registrovatAkce, type StavFormulare } from "../actions";
import { Hlaska, Karta, Odeslat, Pole, Prepinac } from "@/components/auth/Formular";

const MIN_DELKA_HESLA = 8;

type Props = { chybaZAdresy?: string; email?: string; odeslano: boolean };

export function RegistraceFormular({ chybaZAdresy, email, odeslano }: Props) {
  const [stav, akce] = useActionState<StavFormulare, FormData>(registrovatAkce, {
    chyba: chybaZAdresy,
    email,
    hotovo: odeslano,
  });

  if (stav.hotovo) {
    return (
      <Karta nadpis="Zkontrolujte e-mail" popis="Už jen jeden krok k vaší čisté složce.">
        <Hlaska typ="info">
          Na adresu <strong>{stav.email}</strong> jsme poslali odkaz pro potvrzení účtu. Klikněte na něj a budete
          přihlášeni.
        </Hlaska>
        <p className="text-center text-sm text-muted">E-mail nepřišel? Podívejte se i do složky Spam nebo Hromadné.</p>
        <Prepinac text="Máte už potvrzeno?" odkaz="Přihlásit se" href="/prihlaseni" />
      </Karta>
    );
  }

  return (
    <Karta nadpis="Založení nového účtu" popis="Získejte přístup k tarifu Basic na 7 dní zcela zdarma.">
      {stav.chyba && <Hlaska typ="chyba">{stav.chyba}</Hlaska>}

      <form action={akce} className="flex flex-col gap-5">
        <Pole id="email" label="E-mailová adresa" type="email" autoComplete="email" placeholder="vase@firma.cz" defaultValue={stav.email} />
        <Pole id="password" label="Heslo" type="password" autoComplete="new-password" minLength={MIN_DELKA_HESLA} placeholder={`Aspoň ${MIN_DELKA_HESLA} znaků`} />
        <Pole id="password_confirm" label="Heslo znovu" type="password" autoComplete="new-password" minLength={MIN_DELKA_HESLA} placeholder="Pro kontrolu" />
        <Odeslat odesilam="Zakládám účet…">Dokončit registraci a vyzkoušet</Odeslat>
      </form>

      <Prepinac text="Máte už u nás účet?" odkaz="Přihlásit se" href="/prihlaseni" />
    </Karta>
  );
}
