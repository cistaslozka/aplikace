# Pokyny pro AI asistenty (Claude, Gemini a další)

Na projektu pracují dva lidé, každý se svým AI asistentem. Aby výsledek byl jednotný:

1. **Než cokoli navrhneš nebo napíšeš, přečti `ZADANI.md`.** Plán, tarify, datový model
   i pravidla jsou tam. Když se tvůj návrh od `ZADANI.md` liší, řekni to a navrhni úpravu
   souboru, neimprovizuj potichu.
2. Drž se schváleného vzhledu v `public/navrh-aplikace.html` a barev v `src/app/globals.css`.
   Nové barvy ani písma nepřidávej.
3. Texty v aplikaci jsou česky, s háčky a čárkami, srozumitelně pro živnostníka (ne „entity",
   ale „klienti"; ne „submit", ale „Uložit").
4. Pracuj ve vlastní větvi a končí Pull requestem. Do `main` přímo nepushuj.
5. Databázi měň jen migracemi v `supabase/migrations/`. Každá tabulka musí mít RLS.
6. Před odevzdáním musí projít `npm run build` a `npm run lint`.
7. Doklady (faktury, smlouvy) musí splňovat české zákonné náležitosti. Když si nejsi jistý,
   napiš to do Pull requestu místo hádání.

## Příkazy

```bash
npm install        # poprvé
npm run dev        # spustí aplikaci na http://localhost:3000
npm run build      # kontrola, že se aplikace sestaví
npm run lint       # kontrola kódu
```

Nastavení: zkopíruj `.env.example` jako `.env.local`.

## Struktura

- `src/app/(aplikace)/…` – stránky po přihlášení (přehled, faktury, smlouvy, HR, klienti, nastavení)
- `src/components/` – sdílené části (boční menu, logo, ikony)
- `src/lib/supabase/` – připojení k Supabase (`client.ts` pro prohlížeč, `server.ts` pro server)
- `public/navrh-aplikace.html`, `public/uvod_cistaslozka.html` – schválené HTML návrhy (na webu `/navrh` a `/`), slouží jako předloha vzhledu
