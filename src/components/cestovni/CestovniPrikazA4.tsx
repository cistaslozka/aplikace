import { castka, datumCz, mnozstvi, type Strana } from "@/lib/faktura";
import { DOPRAVA, PALIVA, PASMA, vyuctovat, type VstupCesty } from "@/lib/cestovni";

export type DataCesty = {
  cislo: string;
  firma: Strana;
  cestovatel: { name: string; address?: string | null };
  ucel: string;
  misto: string;
  vozidlo: { spz?: string | null; model?: string | null };
  vstup: VstupCesty;
  poznamka?: string | null;
  storno?: boolean;
};

/** „2026-10-29T07:30“ → „29. 10. 2026 7:30“ */
export function casCz(iso: string): string {
  if (!iso) return "";
  const [d, t] = iso.split("T");
  return `${datumCz(d)}${t ? ` ${Number(t.slice(0, 2))}:${t.slice(3, 5)}` : ""}`;
}

const stitek = "mb-1 text-[9.5px] font-bold tracking-[0.08em] text-muted uppercase";

/** Cestovní příkaz s vyúčtováním na list A4. Stejný obsah má PDF v CestovniPrikazPdf. */
export function CestovniPrikazA4({ d }: { d: DataCesty }) {
  const v = vyuctovat(d.vstup);
  const vlastni = d.vstup.doprava === "auto" || d.vstup.doprava === "motocykl";
  const palivo = PALIVA[d.vstup.palivo];

  return (
    <article className="relative flex h-[1123px] w-[794px] flex-col overflow-hidden bg-white px-[44px] py-[40px] font-sans text-[12px] leading-[1.5] text-slate-800">
      {d.storno && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center" aria-hidden="true">
          <span className="-rotate-[24deg] rounded-xl border-[6px] border-red/50 px-10 py-3 font-display text-[88px] font-extrabold tracking-widest text-red/40">
            STORNO
          </span>
        </div>
      )}

      <header className="flex items-start justify-between gap-6 border-b-[1.5px] border-navy pb-3">
        <div>
          <div className="font-display text-[30px] leading-tight font-extrabold text-navy">Cestovní příkaz</div>
          <div className="num text-[13px] text-muted">č. {d.cislo} · s vyúčtováním tuzemské pracovní cesty</div>
        </div>
        <div className="text-right text-[11.5px]">
          <div className={stitek}>Zaměstnavatel / podnikatel</div>
          <div className="text-[13px] font-bold text-navy">{d.firma.name}</div>
          <div>{[d.firma.street, [d.firma.zip, d.firma.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</div>
          <div className="num">{d.firma.ico && <>IČO {d.firma.ico}</>}</div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-x-8 gap-y-3 pt-4">
        <div>
          <div className={stitek}>Cestovatel</div>
          <div className="text-[13px] font-bold text-navy">{d.cestovatel.name || <span className="text-muted">Jméno</span>}</div>
          {d.cestovatel.address && <div>{d.cestovatel.address}</div>}
        </div>
        <div>
          <div className={stitek}>Místo jednání</div>
          <div className="text-[13px] font-semibold">{d.misto || <span className="text-muted">Kam</span>}</div>
        </div>
        <div className="col-span-2">
          <div className={stitek}>Účel cesty</div>
          <div className="whitespace-pre-line">{d.ucel || <span className="text-muted">Proč</span>}</div>
        </div>
        <div>
          <div className={stitek}>Začátek cesty</div>
          <div className="num">{casCz(d.vstup.odjezd)}</div>
        </div>
        <div>
          <div className={stitek}>Konec cesty</div>
          <div className="num">{casCz(d.vstup.prijezd)}</div>
        </div>
        <div className="col-span-2">
          <div className={stitek}>Způsob dopravy</div>
          <div>
            {DOPRAVA[d.vstup.doprava]}
            {vlastni && (
              <span className="num text-muted">
                {" "}
                · {[d.vozidlo.model, d.vozidlo.spz && `SPZ ${d.vozidlo.spz}`].filter(Boolean).join(", ")}
                {(d.vozidlo.model || d.vozidlo.spz) && " · "}
                {palivo.nazev}, spotřeba {mnozstvi(d.vstup.spotreba)} {palivo.jednotka}/100 km
              </span>
            )}
          </div>
        </div>
      </section>

      <h2 className="mt-5 border-b border-line pb-1 text-[13px] font-bold text-navy">Vyúčtování</h2>

      <table className="num mt-2 w-full border-collapse text-[11.5px]">
        <thead>
          <tr className="border-b-[1.5px] border-navy text-navy">
            <th className="py-1.5 pr-2 text-left font-semibold">Stravné – den</th>
            <th className="px-2 py-1.5 text-right font-semibold">Hodin</th>
            <th className="px-2 py-1.5 text-right font-semibold">Pásmo</th>
            <th className="px-2 py-1.5 text-right font-semibold">Sazba</th>
            <th className="px-2 py-1.5 text-right font-semibold">Jídla zdarma</th>
            <th className="px-2 py-1.5 text-right font-semibold">Krácení</th>
            <th className="py-1.5 pl-2 text-right font-semibold">Náhrada</th>
          </tr>
        </thead>
        <tbody>
          {v.dny.length ? (
            v.dny.map((x) => (
              <tr key={x.datum} className="border-b border-line">
                <td className="py-1.5 pr-2">{datumCz(x.datum)}</td>
                <td className="px-2 py-1.5 text-right">{mnozstvi(x.hodin)}</td>
                <td className="px-2 py-1.5 text-right">{x.pasmo === null ? "pod 5 h" : PASMA[x.pasmo]}</td>
                <td className="px-2 py-1.5 text-right">{castka(x.zakladni)}</td>
                <td className="px-2 py-1.5 text-right">{x.jidel}</td>
                <td className="px-2 py-1.5 text-right">{x.kraceni ? `−${castka(x.kraceni)}` : "–"}</td>
                <td className="py-1.5 pl-2 text-right font-semibold">{castka(x.stravne)}</td>
              </tr>
            ))
          ) : (
            <tr className="border-b border-line">
              <td colSpan={7} className="py-2 text-muted">
                Zadejte začátek a konec cesty.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="num mt-3 grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-[12px]">
        <span>Stravné celkem</span>
        <span className="text-right font-semibold">{castka(v.stravne)}</span>
        {vlastni && (
          <>
            <span>
              Jízdné: {mnozstvi(d.vstup.km)} km × {castka(v.jizdne.sazbaKm)} (základní náhrada)
            </span>
            <span className="text-right">{castka(v.jizdne.zakladni)}</span>
            <span>
              Pohonné hmoty: {mnozstvi(d.vstup.km)} km × {mnozstvi(d.vstup.spotreba)} {palivo.jednotka}/100 km ×{" "}
              {castka(d.vstup.cenaPaliva)}/{palivo.jednotka}
            </span>
            <span className="text-right">{castka(v.jizdne.palivo)}</span>
          </>
        )}
        {d.vstup.vydaje
          .filter((x) => x.popis || x.castka)
          .map((x, i) => (
            <span key={i} className="contents">
              <span>{x.popis || "Výdaj"}</span>
              <span className="text-right">{castka(x.castka || 0)}</span>
            </span>
          ))}
      </div>

      <div className="mt-3 flex items-end justify-between gap-6 rounded-lg bg-slate-50 px-4 py-3">
        <div className="num text-[11.5px] text-muted">
          <div>Náhrady celkem {castka(v.celkem)}</div>
          {v.zaloha > 0 && <div>Vyplacená záloha −{castka(v.zaloha)}</div>}
        </div>
        <div className="text-right">
          <div className={stitek}>{v.doplatek >= 0 ? "K výplatě cestovateli" : "Cestovatel vrátí"}</div>
          <div className="num font-display text-[26px] leading-tight font-extrabold text-navy">{castka(Math.abs(v.doplatek))}</div>
        </div>
      </div>

      {d.poznamka && <p className="mt-3 text-[11.5px] whitespace-pre-line">{d.poznamka}</p>}

      <div className="mt-auto grid grid-cols-3 gap-6 pt-6">
        {["Cestovatel", "Cestu povolil", "Vyúčtování schválil"].map((p) => (
          <div key={p} className="border-t border-slate-400 pt-1 text-center text-[10.5px] text-muted">
            {p}
          </div>
        ))}
      </div>
      <footer className="pt-3 text-[9px] text-muted">
        Sazby stravného a náhrad: zákoník práce, {v.sazby.predpis} Vystaveno v systému čistásložka.cz.
      </footer>
    </article>
  );
}
