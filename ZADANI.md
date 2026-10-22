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

## Plán (pořadí kroků)

| Krok | Co | Stav |
|---|---|---|
| 0 | Kostra aplikace, pravidla, napojení Supabase, Vercel | hotovo |
| 1 | Registrace a přihlášení (e-mail + heslo), ochrana stránek | další na řadě |
| 2 | Nastavení firmy: IČO → ARES, adresa, účet, plátce / neplátce DPH | |
| 3 | Adresář klientů (z ARES) | |
| 4 | Faktury: vystavení, číselná řada, položky, QR platba, PDF, stavy, upomínky | |
| 5 | Přehled s dlaždicemi (skutečná čísla, vlastní rozložení) | |
| 6 | Placení tarifů | |
| 7 | Smlouvy (dílo, služby, licence, NDA) | |
| 8 | HR dokumenty (Pro) – **až po kontrole právníkem** | |

První verze pro skutečné uživatele = kroky 0–5.

## Datový model (návrh, upřesní se v jednotlivých krocích)

Data patří **firmě**, ne uživateli. Jeden uživatel může mít víc firem a jedna firma víc
uživatelů (týmový přístup v Pro).

- `organizations` – firma / živnostník: název, IČO, DIČ, adresa, účet, `vat_payer`,
  `legal_form` (osvc / sro / …), `plan` (basic / pro)
- `memberships` – kdo má přístup k jaké firmě a s jakou rolí (owner / member)
- `clients` – adresář odběratelů (patří firmě)
- `number_series` – číselné řady dokladů (např. faktury 2026xxxx)
- `invoices` + `invoice_items` – faktury a jejich položky
- `dashboard_layouts` – rozložení dlaždic na přehledu pro každého uživatele
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
