"use client";

import Link from "next/link";
import { useActionState } from "react";
import { prihlasitAkce, type StavFormulare } from "../actions";
import { Hlaska, Karta, Odeslat, Pole, Prepinac } from "@/components/auth/Formular";

type Props = { chybaZAdresy?: string; email?: string; dalsi?: string; odhlaseno: boolean };

export function PrihlaseniFormular({ chybaZAdresy, email, dalsi, odhlaseno }: Props) {
  const [stav, akce] = useActionState<StavFormulare, FormData>(prihlasitAkce, { chyba: chybaZAdresy, email });

  return (
    <Karta nadpis="Přihlášení do účtu" popis="Vstupte do své čisté složky a spravujte agendu.">
      {odhlaseno && !stav.chyba && <Hlaska typ="info">Byli jste odhlášeni.</Hlaska>}
      {stav.chyba && <Hlaska typ="chyba">{stav.chyba}</Hlaska>}

      <form action={akce} className="flex flex-col gap-5">
        <input type="hidden" name="dalsi" value={dalsi ?? ""} />
        <Pole id="email" label="E-mailová adresa" type="email" autoComplete="email" placeholder="vase@firma.cz" defaultValue={stav.email} />
        <Pole
          id="password"
          label="Heslo"
          type="password"
          autoComplete="current-password"
          vedle={
            <Link href="/zapomenute-heslo" className="text-sm font-semibold text-green-ink hover:underline">
              Zapomenuté heslo?
            </Link>
          }
        />
        <Odeslat odesilam="Přihlašuji…">Přihlásit se do systému</Odeslat>
      </form>

      <Prepinac text="Nemáte ještě založený účet?" odkaz="Založit nový účet (7 dní zdarma)" href="/registrace" />
    </Karta>
  );
}
