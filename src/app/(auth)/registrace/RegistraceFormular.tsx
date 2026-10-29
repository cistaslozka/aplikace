"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registrovatAkce, type StavFormulare } from "../actions";
import { Hlaska, Karta, Odeslat, Pole, Prepinac } from "@/components/auth/Formular";

const MIN_DELKA_HESLA = 8;

type Props = { chybaZAdresy?: string; email?: string; odeslano: boolean; dalsi?: string };

export function RegistraceFormular({ chybaZAdresy, email, odeslano, dalsi }: Props) {
  const [stav, akce] = useActionState<StavFormulare, FormData>(registrovatAkce, {
    chyba: chybaZAdresy,
    email,
    hotovo: odeslano,
  });

  if (stav.hotovo) {
    return (
      <Karta nadpis="Zkontrolujte e-mail" popis="Už jen jeden krok k vaší čisté složce.">
        <Hlaska typ="info">
          Na adresu <strong>{stav.email}</strong> jsme poslali odkaz pro potvrzení účtu. Klikněte na něj a budete přihlášeni.
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
        {dalsi && <input type="hidden" name="dalsi" value={dalsi} />}
        <Pole id="email" label="E-mailová adresa" type="email" autoComplete="email" placeholder="vase@firma.cz" defaultValue={stav.email} />
        <Pole
          id="password"
          label="Heslo"
          type="password"
          autoComplete="new-password"
          minLength={MIN_DELKA_HESLA}
          placeholder={`Aspoň ${MIN_DELKA_HESLA} znaků`}
        />
        <Pole
          id="password_confirm"
          label="Heslo znovu"
          type="password"
          autoComplete="new-password"
          minLength={MIN_DELKA_HESLA}
          placeholder="Pro kontrolu"
        />
        <Odeslat odesilam="Zakládám účet…">Dokončit registraci a vyzkoušet</Odeslat>
        <p className="text-center text-[13px] leading-relaxed text-muted">
          Registrací souhlasíte s{" "}
          <Link href="/obchodni-podminky" target="_blank" className="font-semibold text-green-ink underline">
            obchodními podmínkami
          </Link>{" "}
          a berete na vědomí{" "}
          <Link href="/ochrana-osobnich-udaju" target="_blank" className="font-semibold text-green-ink underline">
            zásady ochrany osobních údajů
          </Link>
          .
        </p>
      </form>

      <Prepinac
        text="Máte už u nás účet?"
        odkaz="Přihlásit se"
        href={dalsi ? `/prihlaseni?dalsi=${encodeURIComponent(dalsi)}` : "/prihlaseni"}
      />
    </Karta>
  );
}
