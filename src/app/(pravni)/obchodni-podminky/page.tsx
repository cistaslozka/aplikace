import Link from "next/link";
import type { Metadata } from "next";
import { PROVOZOVATEL as P } from "@/lib/provozovatel";
import { TARIFY } from "@/lib/tarify";

export const metadata: Metadata = { title: "Obchodní podmínky" };

// ⚠️ Návrh textu. Před spuštěním pro zákazníky ho musí zkontrolovat právník (CLAUDE.md, bod 7).
export default function ObchodniPodminky() {
  return (
    <>
      <h1>Obchodní podmínky služby čistásložka.cz</h1>
      <p className="text-muted">Účinné od {P.platnostOd}</p>

      <h2>1. Úvodní ustanovení</h2>
      <ol>
        <li>
          Tyto obchodní podmínky upravují vztah mezi provozovatelem služby čistásložka.cz, kterým je {P.nazev}, IČO {P.ico}, se sídlem{" "}
          {P.sidlo}, {P.zapis} (dále jen „provozovatel“), a uživatelem služby (dále jen „uživatel“).
        </li>
        <li>
          Služba čistásložka.cz je online aplikace pro vystavování faktur a dalších dokladů, tvorbu smluv podle vzorů a správu související
          agendy (dále jen „služba“).
        </li>
        <li>
          Služba je určena <strong>podnikatelům</strong> (osobám samostatně výdělečně činným a právnickým osobám), kteří ji používají v
          rámci své podnikatelské činnosti. Na vztah se proto neuplatní ustanovení o ochraně spotřebitele.
        </li>
        <li>
          Smlouva o poskytování služby vzniká dokončením registrace, kterou uživatel potvrzuje, že se s těmito podmínkami seznámil a
          souhlasí s nimi.
        </li>
      </ol>

      <h2>2. Registrace a uživatelský účet</h2>
      <ol>
        <li>Uživatel je povinen uvádět pravdivé a úplné údaje a udržovat je aktuální.</li>
        <li>
          Uživatel chrání své přihlašovací údaje a odpovídá za činnost provedenou pod svým účtem. Zneužití účtu bez zbytečného odkladu
          oznámí provozovateli.
        </li>
        <li>Údaje o firmách se mohou načítat z veřejného registru ARES. Uživatel je před použitím na dokladu zkontroluje.</li>
      </ol>

      <h2>3. Zkušební doba, tarify a cena</h2>
      <ol>
        <li>
          Po registraci může uživatel službu 7 dní zdarma vyzkoušet. Po skončení zkušební doby je pro další používání nutné zaplatit zvolený
          tarif.
        </li>
        <li>
          Tarify: <strong>Basic</strong> za {TARIFY.basic.cena} Kč měsíčně a <strong>Pro</strong> za {TARIFY.pro.cena} Kč měsíčně. Rozsah
          tarifů je popsán na webu služby. Je-li provozovatel plátcem DPH, připočítává se k ceně DPH v zákonné sazbě.
        </li>
        <li>
          Předplatné se platí předem na každé předplatné období (měsíc) a automaticky se obnovuje, dokud ho uživatel nezruší. O platbě
          vystaví provozovatel daňový doklad.
        </li>
        <li>Změnu ceny oznámí provozovatel uživateli nejméně 30 dní předem. Nová cena platí od následujícího předplatného období.</li>
      </ol>

      <h2>4. Zrušení předplatného a ukončení smlouvy</h2>
      <ol>
        <li>
          Uživatel může předplatné kdykoli zrušit. Služba mu zůstane dostupná do konce již zaplaceného období. Za nevyužitou část období se
          peníze nevracejí.
        </li>
        <li>
          Provozovatel může smlouvu ukončit, pokud uživatel podstatně porušuje tyto podmínky nebo službu zneužívá, zejména k protiprávnímu
          jednání.
        </li>
        <li>
          Po ukončení smlouvy má uživatel 30 dní na stažení svých dokladů (PDF, ISDOC, Excel). Poté provozovatel data uživatele smaže, pokud
          mu zákon neukládá je uchovat déle.
        </li>
      </ol>

      <h2>5. Vzory dokumentů a odpovědnost za obsah</h2>
      <ol>
        <li>
          Vzory smluv a dalších dokumentů jsou obecné a nemusí odpovídat každé situaci.{" "}
          <strong>Nejsou právním ani daňovým poradenstvím.</strong> U důležitých nebo neobvyklých případů doporučujeme konzultaci s
          advokátem nebo daňovým poradcem.
        </li>
        <li>Za obsah, správnost a použití vystavených dokladů a uzavřených smluv odpovídá uživatel.</li>
        <li>
          Provozovatel odpovídá za škodu způsobenou porušením svých povinností. Celková náhrada škody je omezena výší poplatků, které
          uživatel zaplatil za posledních 12 měsíců. Omezení se nevztahuje na škodu způsobenou úmyslně nebo z hrubé nedbalosti.
        </li>
      </ol>

      <h2>6. Dostupnost služby</h2>
      <ol>
        <li>
          Provozovatel se snaží o nepřetržitý provoz služby. Nezaručuje však, že bude dostupná vždy a bez chyb. Plánované odstávky oznamuje
          předem, pokud je to možné.
        </li>
        <li>
          Uživatel si důležité doklady průběžně stahuje a uchovává podle svých zákonných povinností (např. archivace účetních dokladů).
        </li>
      </ol>

      <h2>7. Osobní údaje a zpracování údajů klientů uživatele</h2>
      <ol>
        <li>
          Zpracování osobních údajů uživatele popisují <Link href="/ochrana-osobnich-udaju">Zásady ochrany osobních údajů</Link>.
        </li>
        <li>
          Údaje, které uživatel do služby vkládá o svých odběratelích, zaměstnancích a dalších osobách, zpracovává provozovatel jako{" "}
          <strong>zpracovatel</strong> podle čl. 28 obecného nařízení o ochraně osobních údajů (GDPR). Správcem těchto údajů je uživatel.
        </li>
        <li>
          Provozovatel tyto údaje zpracovává jen pro poskytování služby a podle pokynů uživatele vyplývajících z jejího používání. Zachovává
          o nich mlčenlivost, chrání je přiměřenými technickými a organizačními opatřeními a využívá jen dalších zpracovatelů uvedených v
          Zásadách ochrany osobních údajů. Po skončení smlouvy je smaže, pokud zákon nevyžaduje jejich uchování. Na žádost uživatele mu
          poskytne součinnost při plnění jeho povinností správce.
        </li>
      </ol>

      <h2>8. Změny obchodních podmínek</h2>
      <ol>
        <li>
          Provozovatel může tyto podmínky změnit. Změnu oznámí uživateli e-mailem nebo v aplikaci nejméně 30 dní před její účinností.
          Nesouhlasí-li uživatel se změnou, může předplatné zrušit.
        </li>
      </ol>

      <h2>9. Závěrečná ustanovení</h2>
      <ol>
        <li>
          Vztahy neupravené těmito podmínkami se řídí právním řádem České republiky, zejména zákonem č. 89/2012 Sb., občanský zákoník.
        </li>
        <li>Spory budou řešit přednostně dohodou, jinak příslušný soud v České republice.</li>
        <li>Kontakt na provozovatele: {P.email}.</li>
      </ol>
    </>
  );
}
