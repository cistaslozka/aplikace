"use client";

import { useRef, useState, useTransition } from "react";
import { Hlaska, Sekce } from "@/components/Formular";
import { adresaLoga } from "@/lib/faktura";
import { createClient } from "@/lib/supabase/client";
import { ulozitLogoAkce } from "./actions";

const TYPY: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const MAX = 1024 * 1024; // 1 MB

export function LogoFirmy({ firmaId, cesta }: { firmaId: string; cesta: string | null }) {
  const [aktualni, setAktualni] = useState(cesta);
  const [chyba, setChyba] = useState<string | null>(null);
  const [hotovo, setHotovo] = useState<string | null>(null);
  const [pracuji, start] = useTransition();
  const vstup = useRef<HTMLInputElement>(null);
  const url = adresaLoga(aktualni);

  function nahrat(soubor: File | undefined) {
    setChyba(null);
    setHotovo(null);
    if (!soubor) return;
    const pripona = TYPY[soubor.type];
    if (!pripona) return setChyba("Logo nahrajte jako obrázek PNG, JPG nebo WEBP.");
    if (soubor.size > MAX) return setChyba("Obrázek je větší než 1 MB. Zmenšete ho prosím.");

    start(async () => {
      const nova = `${firmaId}/logo-${Date.now()}.${pripona}`;
      const supabase = createClient();
      const { error } = await supabase.storage.from("loga").upload(nova, soubor, { contentType: soubor.type, cacheControl: "31536000" });
      if (error) {
        console.error("Nahrání loga selhalo:", error.message);
        setChyba("Logo se nepodařilo nahrát. Zkuste to prosím znovu.");
        return;
      }
      const v = await ulozitLogoAkce(nova);
      if (!v.ok) return setChyba(v.chyba);
      // Starý soubor nemažeme: mohou ho používat už vystavené faktury.
      setAktualni(nova);
      setHotovo("Logo je nahrané. Na faktuře si vyberete, kde bude.");
      if (vstup.current) vstup.current.value = "";
    });
  }

  function odebrat() {
    setChyba(null);
    setHotovo(null);
    start(async () => {
      const v = await ulozitLogoAkce(null);
      if (!v.ok) return setChyba(v.chyba);
      setAktualni(null);
      setHotovo("Logo je odebrané. Už vystavené faktury ho mají dál.");
    });
  }

  return (
    <Sekce nadpis="Logo" popis="Nepovinné. Na faktuře si pak vyberete, jestli a kde bude.">
      <div className="flex flex-wrap items-center gap-4">
        <div className="grid h-24 w-44 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-2">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element -- náhled nahraného loga
            <img src={url} alt="Logo firmy" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-[13px] text-muted">Bez loga</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label
            className={
              "inline-flex min-h-11 cursor-pointer items-center rounded-xl border-[1.5px] border-line bg-surface px-4 text-sm font-semibold text-navy hover:border-muted " +
              (pracuji ? "pointer-events-none opacity-60" : "")
            }
          >
            {pracuji ? "Pracuji…" : url ? "Nahrát jiné logo" : "Nahrát logo"}
            <input
              ref={vstup}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(e) => nahrat(e.target.files?.[0])}
            />
          </label>
          {url && !pracuji && (
            <button type="button" onClick={odebrat} className="self-start text-sm font-semibold text-red hover:underline">
              Odebrat logo
            </button>
          )}
          <span className="text-[12.5px] text-muted">PNG, JPG nebo WEBP do 1 MB. Nejlépe vypadá logo na šířku.</span>
        </div>
      </div>
      {chyba && <Hlaska typ="chyba">{chyba}</Hlaska>}
      {hotovo && <Hlaska typ="info">{hotovo}</Hlaska>}
    </Sekce>
  );
}
