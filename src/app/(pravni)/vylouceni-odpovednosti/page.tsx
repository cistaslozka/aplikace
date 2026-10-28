import Link from "next/link";
import type { Metadata } from "next";
import { PROVOZOVATEL as P } from "@/lib/provozovatel";

export const metadata: Metadata = { title: "Vyloučení odpovědnosti" };

// ⚠️ Návrh textu. Před spuštěním pro zákazníky ho musí zkontrolovat právník (CLAUDE.md, bod 7).
export default function VylouceniOdpovednosti() {
  return (
    <>
      <h1>Vyloučení odpovědnosti</h1>
      <p className="text-muted">Účinné od {P.platnostOd}</p>

      <h2>Nejsme advokáti ani daňoví poradci</h2>
      <p>
        Služba {P.web} je nástroj, který vám pomáhá s doklady a smlouvami. Vzory smluv, texty na dokladech a nápovědy v aplikaci jsou
        obecné. Připravujeme je pečlivě, ale <strong>nejsou právní, daňovou ani účetní radou</strong> a nemusí odpovídat vaší konkrétní
        situaci.
      </p>

      <h2>Za doklady a smlouvy odpovídáte vy</h2>
      <ul>
        <li>Před odesláním faktury nebo podpisem smlouvy zkontrolujte, že údaje jsou správné a úplné.</li>
        <li>Údaje načtené z registru ARES přebíráme tak, jak je registr poskytuje. Před použitím je zkontrolujte.</li>
        <li>
          Upozornění na limity (např. obrat pro registraci k DPH) jsou orientační. Rozhodující jsou vaše účetní záznamy a platné zákony.
        </li>
        <li>U důležitých nebo neobvyklých případů se poraďte s advokátem, daňovým poradcem nebo účetní.</li>
      </ul>

      <h2>Zákony se mění</h2>
      <p>
        Vzory průběžně aktualizujeme podle platných předpisů. Může se ale stát, že změna zákona se do aplikace promítne se zpožděním. Pokud
        si všimnete chyby, napište nám na {P.email}.
      </p>

      <p>
        Odpovědnost provozovatele dále upravují <Link href="/obchodni-podminky">obchodní podmínky</Link>.
      </p>
    </>
  );
}
