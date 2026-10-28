import Link from "next/link";
import type { Metadata } from "next";
import { PROVOZOVATEL as P } from "@/lib/provozovatel";

export const metadata: Metadata = { title: "Ochrana osobních údajů" };

// ⚠️ Návrh textu. Před spuštěním pro zákazníky ho musí zkontrolovat právník (CLAUDE.md, bod 7).
export default function OchranaOsobnichUdaju() {
  return (
    <>
      <h1>Zásady ochrany osobních údajů</h1>
      <p className="text-muted">Účinné od {P.platnostOd}</p>

      <p>
        V těchto zásadách vysvětlujeme, jaké osobní údaje zpracováváme, proč, jak dlouho a jaká máte práva. Řídíme se nařízením Evropského
        parlamentu a Rady (EU) 2016/679 (GDPR) a zákonem č. 110/2019 Sb., o zpracování osobních údajů.
      </p>

      <h2>1. Kdo je správce</h2>
      <p>
        Správcem osobních údajů uživatelů služby {P.web} je {P.nazev}, IČO {P.ico}, se sídlem {P.sidlo} (dále jen „my“). S dotazy nám pište
        na {P.email}.
      </p>

      <h2>2. Jaké údaje zpracováváme</h2>
      <ul>
        <li>
          <strong>Údaje o účtu:</strong> e-mail, heslo (uložené jen v zašifrované podobě), datum registrace.
        </li>
        <li>
          <strong>Údaje o vaší firmě:</strong> jméno nebo název, IČO, DIČ, adresa, bankovní účet, logo a další údaje, které uvedete v
          nastavení.
        </li>
        <li>
          <strong>Údaje o předplatném a platbách:</strong> zvolený tarif, historie plateb a vystavené daňové doklady.
        </li>
        <li>
          <strong>Technické údaje:</strong> IP adresa, typ prohlížeče a záznamy o přihlášení, které potřebujeme k zabezpečení služby.
        </li>
      </ul>

      <h2>3. Proč údaje zpracováváme a na jakém základě</h2>
      <ul>
        <li>
          <strong>Poskytování služby</strong> (účet, doklady, smlouvy) – plnění smlouvy, čl. 6 odst. 1 písm. b) GDPR.
        </li>
        <li>
          <strong>Účetnictví a daně</strong> (daňové doklady za předplatné) – plnění právní povinnosti, čl. 6 odst. 1 písm. c) GDPR.
        </li>
        <li>
          <strong>Zabezpečení služby a ochrana před zneužitím</strong> – oprávněný zájem, čl. 6 odst. 1 písm. f) GDPR.
        </li>
        <li>
          <strong>Provozní e-maily</strong> (např. konec zkušební doby, změna podmínek) – plnění smlouvy. Obchodní sdělení posíláme jen s
          vaším souhlasem nebo jako zákazníkům v souladu se zákonem č. 480/2004 Sb. a můžete je kdykoli odmítnout.
        </li>
      </ul>

      <h2>4. Údaje vašich klientů a zaměstnanců</h2>
      <p>
        Údaje, které do aplikace vkládáte o svých odběratelích, zaměstnancích a dalších osobách, zpracováváme jen jako{" "}
        <strong>zpracovatel</strong> pro vás. Správcem těchto údajů jste vy. Podmínky zpracování upravuje článek 7{" "}
        <Link href="/obchodni-podminky">obchodních podmínek</Link>.
      </p>

      <h2>5. Komu údaje předáváme</h2>
      <p>Údaje neprodáváme. Pro provoz služby využíváme tyto zpracovatele:</p>
      <ul>
        <li>
          <strong>Supabase</strong> – databáze a přihlašování. Data jsou uložena v datovém centru v Evropské unii (Francie).
        </li>
        <li>
          <strong>Vercel</strong> – provoz webové aplikace. Může docházet k přenosu do USA na základě standardních smluvních doložek a rámce
          EU–USA pro ochranu osobních údajů.
        </li>
        <li>
          <strong>Poskytovatel platební brány</strong> – zpracování plateb za předplatné. Údaje o platební kartě zadáváte přímo u něj, my je
          nevidíme.
        </li>
        <li>
          <strong>Poskytovatel rozesílání e-mailů</strong> – doručení e-mailů z aplikace.
        </li>
        <li>
          <strong>ARES</strong> (Ministerstvo financí) – při zadání IČO načítáme veřejné údaje o firmě. Předáváme jen zadané IČO.
        </li>
      </ul>
      <p>Údaje můžeme předat také orgánům veřejné moci, pokud nám to ukládá zákon.</p>

      <h2>6. Jak dlouho údaje uchováváme</h2>
      <ul>
        <li>Údaje o účtu a data v aplikaci po dobu trvání smlouvy a 30 dní po jejím ukončení, abyste si mohli doklady stáhnout.</li>
        <li>Daňové doklady za předplatné 10 let podle zákona o DPH a zákona o účetnictví.</li>
        <li>Technické záznamy o přihlášení nejdéle 12 měsíců.</li>
      </ul>

      <h2>7. Vaše práva</h2>
      <p>Máte právo:</p>
      <ul>
        <li>požadovat přístup ke svým údajům a jejich kopii,</li>
        <li>požadovat opravu nepřesných údajů,</li>
        <li>požadovat výmaz údajů, pokud je už nepotřebujeme nebo je zpracováváme neoprávněně,</li>
        <li>požadovat omezení zpracování,</li>
        <li>na přenositelnost údajů (doklady si můžete kdykoli stáhnout v PDF, ISDOC a Excelu),</li>
        <li>vznést námitku proti zpracování na základě oprávněného zájmu,</li>
        <li>odvolat souhlas, pokud jste ho udělili.</li>
      </ul>
      <p>
        Žádost pošlete na {P.email}. Odpovíme nejpozději do jednoho měsíce. Máte také právo podat stížnost u Úřadu pro ochranu osobních
        údajů (www.uoou.gov.cz).
      </p>

      <h2>8. Zabezpečení</h2>
      <p>
        Spojení s aplikací je šifrované (HTTPS). Přístup k datům je omezen tak, aby každý uživatel viděl jen data své firmy. Hesla ukládáme
        jen v zašifrované podobě.
      </p>

      <h2>9. Cookies</h2>
      <p>
        Jaké cookies používáme, popisuje stránka <Link href="/cookies">Cookies</Link>.
      </p>

      <h2>10. Změny zásad</h2>
      <p>Zásady můžeme aktualizovat. O podstatných změnách vás informujeme e-mailem nebo v aplikaci.</p>
    </>
  );
}
