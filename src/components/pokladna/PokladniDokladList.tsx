import { castka, datumCz, type Strana } from "@/lib/faktura";
import { castkaSlovy, NAZVY_POKLADNY, type DruhPokladny } from "@/lib/pokladna";

export type DataPokladny = {
  druh: DruhPokladny;
  cislo: string;
  datum: string;
  castka: number;
  ucel: string;
  partner: Strana | null;
  firma: Strana;
  platce: boolean;
  /** Sazba DPH, když je v částce DPH (jen plátce) */
  sazba: number | null;
  zaklad: number | null;
  dph: number | null;
  /** Číslo faktury, kterou doklad hradí */
  faktura?: string | null;
  poznamka?: string | null;
  storno?: boolean;
};

/** Rozpis DPH výpočtem shora (stejně jako v databázi). */
export function rozpisDph(c: number, sazba: number | null): { zaklad: number | null; dph: number | null } {
  if (sazba === null || !Number.isFinite(c)) return { zaklad: null, dph: null };
  const zaklad = Math.round(((c * 100) / (100 + sazba)) * 100) / 100;
  return { zaklad, dph: Math.round((c - zaklad) * 100) / 100 };
}

function Adresa({ s }: { s: Strana }) {
  const obec = [s.zip, s.city].filter(Boolean).join(" ");
  return <div>{[s.street, obec].filter(Boolean).join(", ")}</div>;
}

const stitek = "mb-1 text-[9.5px] font-bold tracking-[0.08em] text-muted uppercase";

/**
 * Pokladní doklad na list A5 na šířku (794 × 561 px). Stejný obsah má PDF v PokladniDokladPdf.
 */
export function PokladniDokladList({ d }: { d: DataPokladny }) {
  const prijem = d.druh === "prijem";
  const podpisy = prijem ? ["Vystavil", "Přijal (pokladník)", "Zaplatil"] : ["Vystavil", "Schválil", "Přijal"];
  return (
    <article
      className="relative flex h-[561px] w-[794px] flex-col overflow-hidden bg-white px-[40px] py-[32px] font-sans text-[12px] leading-[1.5] text-slate-800"
      aria-label={`${NAZVY_POKLADNY[d.druh]} ${d.cislo}`}
    >
      {d.storno && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center" aria-hidden="true">
          <span className="-rotate-[18deg] rounded-xl border-[6px] border-red/50 px-10 py-2 font-display text-[72px] font-extrabold tracking-widest text-red/40">
            STORNO
          </span>
        </div>
      )}

      <header className="flex items-start justify-between gap-6 border-b-[1.5px] border-navy pb-3">
        <div>
          <div className="font-display text-[24px] leading-tight font-extrabold text-navy">{NAZVY_POKLADNY[d.druh]}</div>
          <div className="num mt-0.5 text-[13px] text-muted">č. {d.cislo}</div>
        </div>
        <div className="text-right text-[11.5px]">
          <div className={stitek}>Účetní jednotka</div>
          <div className="text-[13px] font-bold text-navy">{d.firma.name}</div>
          <Adresa s={d.firma} />
          <div className="num">
            {d.firma.ico && <>IČO {d.firma.ico}</>}
            {d.firma.dic && <> · DIČ {d.firma.dic}</>}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-[1fr_auto] gap-8 pt-4">
        <section>
          <div className={stitek}>{prijem ? "Přijato od" : "Vyplaceno komu"}</div>
          {d.partner?.name ? (
            <>
              <div className="text-[13px] font-bold text-navy">{d.partner.name}</div>
              {(d.partner.street || d.partner.city) && <Adresa s={d.partner} />}
              {d.partner.ico && <div className="num">IČO {d.partner.ico}</div>}
            </>
          ) : (
            <div className="text-muted">Doplňte jméno</div>
          )}
        </section>
        <section className="text-right">
          <div className={stitek}>Datum</div>
          <div className="num text-[13px] font-semibold text-navy">{datumCz(d.datum)}</div>
        </section>
      </div>

      <section className="pt-4">
        <div className={stitek}>Účel platby</div>
        <div className="text-[13px] whitespace-pre-line">{d.ucel || <span className="text-muted">Např. tržba za zboží</span>}</div>
        {d.faktura && !d.ucel.includes(d.faktura) && (
          <div className="num mt-0.5 text-[11.5px] text-muted">Úhrada faktury č. {d.faktura}</div>
        )}
      </section>

      <div className="mt-4 flex items-end justify-between gap-6 rounded-lg bg-slate-50 px-4 py-3">
        <div className="min-w-0">
          <div className={stitek}>Slovy</div>
          <div className="text-[12px] first-letter:uppercase">{castkaSlovy(d.castka)}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className={stitek}>{prijem ? "Přijatá částka" : "Vyplacená částka"}</div>
          <div className="num font-display text-[26px] leading-tight font-extrabold text-navy">{castka(d.castka)}</div>
        </div>
      </div>

      {d.platce && d.sazba !== null && d.zaklad !== null && d.dph !== null && (
        <div className="num mt-2 text-right text-[11px] text-muted">
          Základ {castka(d.zaklad)} · DPH {d.sazba} % {castka(d.dph)} · celkem {castka(d.castka)}
        </div>
      )}
      {d.poznamka && <p className="mt-2 text-[11.5px] whitespace-pre-line">{d.poznamka}</p>}

      <div className="mt-auto grid grid-cols-3 gap-6 pt-4">
        {podpisy.map((p) => (
          <div key={p} className="border-t border-slate-400 pt-1 text-center text-[10.5px] text-muted">
            {p}
          </div>
        ))}
      </div>
      <footer className="pt-3 text-[9px] text-muted">
        {[d.firma.registry_note, d.platce ? null : "Nejsem plátce DPH.", "Vystaveno v systému čistásložka.cz."]
          .filter(Boolean)
          .map((t) =>
            String(t)
              .trim()
              .replace(/[.\s]*$/, "."),
          )
          .join(" ")}
      </footer>
    </article>
  );
}
