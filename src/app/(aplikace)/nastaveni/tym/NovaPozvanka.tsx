"use client";

import { useActionState, useState } from "react";
import { Hlaska, Pole, tridyVstupu } from "@/components/Formular";
import { vytvoritPozvankuAkce } from "./actions";

export function NovaPozvanka() {
  const [stav, akce, odesilam] = useActionState(vytvoritPozvankuAkce, {});
  const [zkopirovano, setZkopirovano] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <form action={akce} className="flex flex-wrap items-end gap-2">
        <div className="min-w-60 flex-1">
          <Pole id="label" label="Pro koho (nepovinné)" napoveda="Jen pro vás, ať víte, komu jste odkaz poslali.">
            <input id="label" name="label" maxLength={100} placeholder="Např. účetní Jana" className={tridyVstupu()} />
          </Pole>
        </div>
        <button
          disabled={odesilam}
          className="mb-6 min-h-12 rounded-xl bg-green px-5 text-[15px] font-bold text-navy hover:brightness-95 disabled:opacity-70"
        >
          {odesilam ? "Vytvářím…" : "Vytvořit odkaz"}
        </button>
      </form>
      {stav.chyba && <Hlaska typ="chyba">{stav.chyba}</Hlaska>}
      {stav.odkaz && (
        <div className="flex flex-col gap-2 rounded-xl border border-green-soft bg-green-tint p-4 text-sm">
          <strong className="text-navy">Odkaz je připravený. Pošlete ho e-mailem nebo zprávou.</strong>
          <div className="flex flex-wrap gap-2">
            <input
              readOnly
              value={stav.odkaz}
              onFocus={(e) => e.target.select()}
              className={tridyVstupu() + " num min-w-0 flex-1 text-[13px]"}
              aria-label="Odkaz pozvánky"
            />
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(stav.odkaz!);
                setZkopirovano(true);
              }}
              className="min-h-11 rounded-xl bg-navy px-4 font-semibold text-white hover:bg-navy-2"
            >
              {zkopirovano ? "Zkopírováno" : "Kopírovat"}
            </button>
          </div>
          <span className="text-muted">Platí 7 dní a jde použít jen jednou. Celý odkaz uvidíte jen teď.</span>
        </div>
      )}
    </div>
  );
}
