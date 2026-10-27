# čistásložka.cz – společné zadání

Tento soubor je **jediný zdroj pravdy** pro oba vývojáře (Michael a Omar) i pro jejich AI
asistenty. Když se něco rozhodne jinak, upraví se nejdřív tady.

## Co stavíme

Online systém pro živnostníky (OSVČ) a firmy: faktury, smlouvy a HR dokumenty na jednom
místě. Uživatel vyplní formulář, údaje o firmách se doplní z ARES a dokument stáhne jako PDF.

- **Tarif Basic – 199 Kč / měsíc:** faktury (plátce i neplátce DPH), zálohovky, QR platby,
  upomínky, archiv, grafy, vlastní přehled, smlouvy o dílo / službách, licenční smlouva, NDA,
  předávací protokoly, cestovní příkazy, adresář klientů z ARES.
- **Tarif Pro – 449 Kč / měsíc:** vše z Basic + HR (HPP, DPP, DPČ, mzdové výměry, ukončení
  poměru, vytýkací dopisy), firemní procesy (svěření majetku, BOZP, GDPR), pokladní doklady,
  dobropisy, B2B smlouvy, plné moci, týmový přístup (víc uživatelů v jedné firmě).
- Tarify se dělí **podle funkcí, ne podle právní formy**. Volba „OSVČ / firma" při registraci
  jen přednastaví menu a údaje.
- Každý dokument má **3 vzhledy** (minimalistický, korporátní, kreativní). Obsah je vždy
  stejný, vzhled mění jen styl.

## Vzhled

Schválený návrh je v `public/navrh-aplikace.html` (na webu `/navrh`) (přehled, nová faktura, seznam faktur,
mobil). Úvodní a přihlašovací stránka: `public/uvod_cistaslozka.html` (na webu hlavní adresa `/`).
Až bude hotové skutečné přihlášení (krok 1), nahradí tyto HTML stránky.

- Barvy a písma jsou v `src/app/globals.css` (`bg-navy`, `text-green-ink`, `border-line` …).
  Nové hex kódy nevymýšlej, používej tyto.
- Písma: Inter (text), Plus Jakarta Sans (nadpisy a velká čísla).
- Název se píše **čistásložka.cz** (v textech s háčky). Adresy (doména, e-maily) bez háčků.
- Každá obrazovka musí fungovat i na mobilu (šířka 390 px, nic nepřetéká do stran).

## Technologie

- **Next.js 15** (App Router, TypeScript) + **Tailwind CSS 4**
- **Supabase**: databáze, přihlášení (Auth), soubory (Storage). Projekt „cistaslozka's Project",
  region Paříž (EU).
- **Vercel**: hosting, napojený na GitHub (každý push = nová verze webu).
- Kód: GitHub `cistaslozka/aplikace`. Úkoly: Trello „Čistá složka". Oznámení změn: Discord.
- Web: https://aplikace-blush.vercel.app (`/` úvod a přihlášení, `/navrh` návrh, `/prehled` aplikace)

## Přihlášení (jak funguje)

- E-mail + heslo přes Supabase Auth, heslo aspoň 8 znaků.
- Stránky: `/prihlaseni`, `/registrace`, `/zapomenute-heslo`, `/nove-heslo`.
  Formulář na úvodní stránce posílá data na `/auth/prihlaseni` a `/auth/registrace`.
- Odkazy z e-mailů (potvrzení účtu, nové heslo) vedou na `/auth/callback`.
- Nepřihlášeného uživatele aplikace pošle na přihlášení (`src/lib/supabase/middleware.ts`).
- V Supabase (Authentication → URL Configuration) musí být Site URL adresa webu a v Redirect URLs
  `https://aplikace-blush.vercel.app/**`, `https://*-cista-slozka.vercel.app/**` a `http://localhost:3000/**`.
- Před spuštěním pro veřejnost: vlastní odesílání e-mailů (SMTP, např. Resend), výchozí e-maily
  Supabase chodí jen členům týmu a jen pár za hodinu.

## Plán (pořadí kroků)

| Krok | Co | Stav |
|---|---|---|
| 0 | Kostra aplikace, pravidla, napojení Supabase, Vercel | hotovo |
| 1 | Registrace a přihlášení (e-mail + heslo), ochrana stránek | hotovo |
| 2 | Nastavení firmy: IČO → ARES, adresa, účet, plátce / neplátce DPH | hotovo |
| 3 | Adresář klientů (z ARES), našeptávač podle jména, limit dotazů do ARES | hotovo |
| 4a | Faktury: vystavení, číselná řada, položky a DPH, živý náhled ve 3 vzhledech, QR platba, stavy, tisk / PDF z prohlížeče | hotovo |
| 4b | Faktury: stažení PDF, upomínky, export ISDOC a XLSX, zálohová faktura, daňový doklad k přijaté platbě, vyúčtování zálohy (hotovo); odeslání e-mailem (až bude doména) | skoro hotovo |
| 5 | Přehled s dlaždicemi: skutečná čísla (5a) a vlastní rozložení – zapnout, vypnout, seřadit (5b) | hotovo |
| 6 | Placení tarifů (stránka Předplatné už je, chybí platební brána) | |
| 7 | Smlouvy a provozní doklady: smlouva o dílo, o službách, licenční, NDA, předávací protokol (**7a, 7b hotovo**); 7c podpis na obrazovce, hlídání končících smluv. Cestovní příkaz přesunut do kroku 10 | rozpracováno |
| 8 | Účetní doklady: dobropis (opravný daňový doklad), pokladní doklady (příjmový / výdajový), export pro účetní (ISDOC, XLSX) | |
| 9 | Pro: B2B rámcová, kupní a nájemní smlouva, plná moc, svěření majetku, záznam o školení BOZP, souhlas GDPR; týmový přístup (účetní, asistentka) | |
| 10 | HR dokumenty (Pro): HPP, DPP, DPČ, mzdový výměr, dohoda o rozvázání, výpověď, vytýkací dopis, cestovní příkaz a vyúčtování (sazby stravného) – **až po kontrole právníkem** | |
| 11 | **Datová schránka a úřady** (Pro): příprava přihlášky zaměstnance k ČSSZ (REGZEC, JMHZ) a odeslání přes datovou schránku – **návrh viz níže, čeká na rozhodnutí** | |

První verze pro skutečné uživatele = kroky 0–5.

### Kde jsme skončili (aktualizuje se po každém kroku)

- **Hotovo naposledy:** krok 7b – vzory smlouva o službách, licenční smlouva, NDA, předávací protokol
  (`src/lib/smlouvy/*.ts`, zapsané ve `vzory.ts` i s podtitulem podle zákona a úvodní větou).
- **Další na řadě:** krok 7c – podpis prstem / myší na obrazovce (obrázek podpisu ke smlouvě) a dlaždice
  Končící smlouvy na přehledu podle `contracts.valid_until`. Pak krok 8 (dobropis, pokladní doklady).
- **Čeká na rozhodnutí:** krok 6 – platební brána (Stripe / GoPay / Comgate), účet zakládají Michael a Omar.
  Odeslání e-mailem z kroku 4b přijde, až bude doména a služba Resend.
- Jak pokračovat v novém chatu: „Přečti ZADANI.md a pokračuj tam, kde jsme skončili.“

### Formáty ke stažení

Každý doklad jde stáhnout jako **PDF**. Faktury a účetní doklady navíc jako **ISDOC**
(český formát elektronické faktury, načtou ho účetní programy jako Pohoda, Money nebo ABRA)
a **XLSX** (Excel: jedna faktura i přehled faktur za období pro účetní).

### Datová schránka (krok 11, k rozhodnutí)

- Od roku 2026 hlásí zaměstnavatelé zaměstnance ČSSZ elektronicky: registrace zaměstnance
  (REGZEC) a každý měsíc jednotné měsíční hlášení (JMHZ). Jde to přes datovou schránku ČSSZ,
  ePortál ČSSZ nebo datové rozhraní. Zdroj: cssz.gov.cz a pruvodcepodnikanim.cz.
- **Varianta A (doporučená jako první):** aplikace připraví hotový soubor podání a uživatel ho
  odešle ze své datové schránky sám. Nemusíme u sebe držet přístupy do cizích datových schránek.
- **Varianta B (později):** přímé odeslání z aplikace přes rozhraní datových schránek (ISDS).
  Uživatel by nám musel svěřit přihlášení nebo certifikát ke své schránce → vyšší nároky na
  zabezpečení a právní kontrolu.
- Obsah podání musí zkontrolovat mzdová účetní nebo právník, než to pustíme uživatelům.

### Mimo rozsah (zatím)

Plné podvojné účetnictví, mzdy a výpočet odvodů, daňová přiznání. Aplikace připraví doklady
a podklady, účetní je zpracuje ve svém programu. Kdyby se mělo rozšířit, nejdřív se domluvíme.

## Datový model (návrh, upřesní se v jednotlivých krocích)

Data patří **firmě**, ne uživateli. Jeden uživatel může mít víc firem a jedna firma víc
uživatelů (týmový přístup v Pro).

- `organizations` – firma / živnostník: název, IČO, DIČ, adresa, účet, `vat_payer`,
  `legal_form` (osvc / sro / jina), `registry_note` (zápis v rejstříku), `plan` (basic / pro),
  `trial_ends_at` (7 dní od založení). **Hotovo v kroku 2.**
  Zakládá se jen funkcí `zalozit_firmu(…)` (vytvoří firmu i členství vlastníka najednou).
  `plan` a `trial_ends_at` uživatel sám měnit nesmí, mění je jen server (placení v kroku 6).
  Výjimka: během zkušební doby může vlastník firmy přepínat Basic / Pro zdarma funkcí
  `zmenit_tarif(org, plan)` (stránka `/predplatne`). Po zkušební době se tarif mění až po zaplacení.
- `memberships` – kdo má přístup k jaké firmě a s jakou rolí (owner / member). **Hotovo v kroku 2.**
  Pravidla používají `private.je_clen(org)`; schéma `private` není vidět přes API.
- `clients` – adresář odběratelů (patří firmě). **Hotovo v kroku 3.** Jedno IČO jen jednou na firmu.
  Hledání `hledat_klienty(org, dotaz)` podle jména (bez ohledu na háčky) nebo začátku IČO.
  Komponenta `src/components/VyberKlienta.tsx` je našeptávač pro faktury i smlouvy: klient z adresáře,
  nebo nové IČO → ARES → rovnou uložit. `last_used_at` nastavit při použití na dokladu (krok 4).
- Limit ARES: každé načtení jde přes `nactiZAresSLimitem` (src/lib/ares.ts) → funkce
  `ares_smim_se_zeptat()`: nejvýš 20 dotazů/min na uživatele a 250/min za celou aplikaci
  (ARES blokuje nad 500/min). Výsledky ARES se navíc pamatují 24 h.
- `number_series` – číselné řady dokladů: faktury `RRRR` + 4 číslice (20260001), variabilní symbol = číslo.
  **Hotovo v kroku 4a.**
- `invoices` + `invoice_items` – faktury a jejich položky. **Hotovo v kroku 4a.**
  Ukládá se jen funkcí `ulozit_fakturu(faktura, polozky)`: přidělí číslo, uloží kopii údajů
  dodavatele i odběratele (pozdější změna firmy nebo klienta starou fakturu nezmění) a částky
  spočítá sama databáze (zaokrouhlení na haléře, DPH za každou sazbu zvlášť: 21 %, 12 %, 0 %).
  Uživatel smí přímo měnit jen stav (vystavená / uhrazená / stornovaná) a datum úhrady.
  Faktury se nemažou, jen stornují (číslo se znovu nepoužije). Stornovanou nejde upravit.
  Výpočty pro náhled: `src/lib/faktura.ts` (stejné zaokrouhlení jako databáze).
- Logo firmy (nepovinné): `organizations.logo_path`, soubor v úložišti `loga` ve složce `<id firmy>/`
  (PNG / JPG do 1 MB, nahrávat smí jen členové firmy). Faktura si pamatuje `logo_position`
  (vlevo / vpravo / dole) a kopii `logo_path`, takže nové logo starou fakturu nezmění.
  Vlastní text na faktuře: `intro_text` (nad položkami) a `note` (pod položkami).
- PDF faktury: `/faktury/<id>/pdf` vytvoří skutečné PDF (knihovna @react-pdf/renderer,
  `src/components/faktura/FakturaPdf.tsx`). Rozvržení musí odpovídat náhledu `FakturaA4.tsx`:
  **když měníš jedno, uprav i druhé.** Písma pro PDF jsou v `src/fonts/` (licence OFL).
- Exporty faktury: `/faktury/<id>/isdoc` (ISDOC 6.0.2, `src/lib/isdoc.ts`, ověřeno proti oficiálnímu
  schématu `isdoc-invoice-6.0.2.xsd`), `/faktury/<id>/xlsx` a přehled za rok `/faktury/export?rok=2026`
  (`src/lib/xlsx.ts`). Stornované faktury jsou v přehledu s nulovými částkami.
- Druhy dokladů v `invoices.kind`: `faktura` (20260001), `zalohova` – zálohová faktura, nedaňový doklad
  (ZF20260001, VS 920260001, bez DUZP, v ISDOC DocumentType 4), `ddpp` – daňový doklad k přijaté platbě
  (DD20260001). Vystavuje ho jen funkce `vystavit_ddpp(záloha, datum platby, dnes)` z uhrazené zálohy plátce;
  DUZP = den přijetí platby, položky a částky se převezmou ze zálohy. Daňový doklad nejde upravit, jen
  stornovat; zálohu s platným daňovým dokladem nejde upravit, vrátit na neuhrazenou ani stornovat (hlídají
  triggery `private.hlidat_zalohu` a `private.hlidat_upravy_dokladu`). Každý druh má vlastní číselnou řadu. `related_invoice_id` = vazba na zálohu.
  Druh dokladu po vystavení změnit nejde. Do příjmů na přehledu se počítají jen faktury.
- Vyúčtování zálohy: konečná faktura (`kind = faktura`, `related_invoice_id` = záloha) má `advance_amount`
  (odečtená záloha vč. DPH) a `advance_recap` (rozpis podle sazeb z daňového dokladu; u neplátce sazba 0).
  Vytváří ji jen `ulozit_konecnou_fakturu(faktura, položky, záloha)`. K úhradě = `total − advance_amount`
  (QR, upomínky, seznam). V ISDOC `TaxedDeposits` + „AlreadyClaimed…“ u plátce, `NonTaxedDeposits` +
  `PaidDepositsAmount` u neplátce.
- `invoice_reminders` – upomínky (1.–3.) k neuhrazené faktuře po splatnosti. Vytváří je jen funkce
  `vytvorit_upominku(faktura, dnes)`, nová lhůta k úhradě je 7 dní. PDF: `/faktury/<id>/upominka/<1–3>`.
- `contracts` – smlouvy (druh, číslo S…, strany jako kopie, `fields` = vyplněný vzor, `valid_until`, stav
  koncept / uzavřená / ukončená). Uzavřenou smlouvu nejde upravit (změny dodatkem). **Hotovo v kroku 7a.**
- `dashboard_layouts` – rozložení dlaždic na přehledu pro každého uživatele **Hotovo v kroku 5b** (`tiles` = pořadí a zapnuté dlaždice, RLS: každý jen své).
- `waitlist` – zájemci o spuštění z webu awao.cz (už existuje; číst ho smí jen správce)

Každá tabulka má zapnuté **RLS** a pravidla „vidíš jen data firem, kde jsi členem".

## Pravidla spolupráce

1. Než začneš, stáhni si změny z GitHubu (`git pull`).
2. Pracuj ve **vlastní větvi** (`krok-1-prihlaseni`, `omar/uprava-prehledu` …), ne přímo v `main`.
3. Hotovou práci pošli jako **Pull request**. Druhý ho zkontroluje a schválí.
4. Změny databáze jen jako **migrace** (soubory v `supabase/migrations/`), nikdy ručním klikáním
   v Supabase, aby byly vidět v historii a šly zopakovat.
5. Na Trellu vždy přesuň kartu podle stavu (Rozpracováno → Ke kontrole → Hotovo).
6. Žádná tajná hesla ani klíče do kódu. Veřejné hodnoty patří do `.env.local`
   (vzor je v `.env.example`).
