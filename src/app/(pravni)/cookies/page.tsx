import Link from "next/link";
import type { Metadata } from "next";
import { PROVOZOVATEL as P } from "@/lib/provozovatel";

export const metadata: Metadata = { title: "Cookies" };

// ⚠️ Návrh textu. Před spuštěním pro zákazníky ho musí zkontrolovat právník (CLAUDE.md, bod 7).
// Pokud přibude analytika nebo reklama, je potřeba přidat cookie lištu se souhlasem a doplnit tabulku.
export default function Cookies() {
  return (
    <>
      <h1>Cookies</h1>
      <p className="text-muted">Účinné od {P.platnostOd}</p>

      <p>
        Cookies jsou malé soubory, které si web ukládá ve vašem prohlížeči. Služba {P.web} používá <strong>jen nezbytné cookies</strong>,
        bez kterých by nefungovalo přihlášení. Nepoužíváme analytické, reklamní ani sledovací cookies, a proto po vás nežádáme souhlas.
      </p>

      <h2>Jaké cookies používáme</h2>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Název</th>
              <th>K čemu slouží</th>
              <th>Platnost</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="num">sb-…-auth-token</td>
              <td>Udržuje vás přihlášené a chrání účet (Supabase).</td>
              <td>Do odhlášení, nejdéle několik dní bez použití</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Jak cookies vypnout</h2>
      <p>
        Cookies můžete smazat nebo zablokovat v nastavení prohlížeče. Bez nezbytných cookies se ale do aplikace nepřihlásíte. Na základě §
        89 odst. 3 zákona č. 127/2005 Sb., o elektronických komunikacích, k nezbytným cookies souhlas nepotřebujeme.
      </p>

      <p>
        Více o zpracování údajů najdete v <Link href="/ochrana-osobnich-udaju">Zásadách ochrany osobních údajů</Link>.
      </p>
    </>
  );
}
