import {
  castka,
  datumCz,
  mnozstvi,
  qrPlatba,
  zakladPolozky,
  ZPUSOBY_UHRADY,
  type PoziceLoga,
  type Polozka,
  type Rekapitulace,
  type Strana,
  type Vzhled,
  type ZpusobUhrady,
} from "@/lib/faktura";
import { formatujIban } from "@/lib/validace";
import { QrKod } from "./QrKod";

export type DataFaktury = {
  cislo: string; // "20260001" nebo text pro koncept
  vs: string;
  dodavatel: Strana;
  odberatel: Strana | null;
  vystaveno: string;
  duzp: string | null;
  splatnost: string;
  uhrada: ZpusobUhrady;
  platce: boolean;
  polozky: Polozka[];
  rekapitulace: Rekapitulace[];
  zaklad: number;
  dph: number;
  celkem: number;
  poznamka?: string | null;
  vzhled: Vzhled;
  stav?: "vystavena" | "uhrazena" | "stornovana";
  uhrazeno?: string | null;
  /** Adresa obrázku loga (nepovinné) a kde na faktuře je */
  logo?: string | null;
  logoPozice?: PoziceLoga | null;
  /** Vlastní text nad položkami */
  uvod?: string | null;
};

// Styly tří vzhledů. Obsah faktury je ve všech stejný, mění se jen vzhled.
const V = {
  minimal: {
    hlavicka: "flex items-start justify-between gap-6 border-b border-line px-[44px] pt-[44px] pb-[22px] text-navy",
    nadpis: "font-display text-[34px] leading-none font-extrabold tracking-tight",
    podnadpis: "mt-1.5 text-[12px] text-muted",
    stitek: "mb-1 text-[9.5px] font-bold tracking-[0.08em] text-muted uppercase",
    pruh: "grid grid-cols-4 gap-3 border-y border-line py-3",
    hlavaTabulky: "border-b-[1.5px] border-navy text-navy",
    celkem: "text-right text-navy",
  },
  corporate: {
    hlavicka: "flex items-center justify-between gap-6 bg-navy px-[44px] py-[30px] text-white",
    nadpis: "font-sans text-[24px] leading-none font-bold tracking-[0.12em] uppercase",
    podnadpis: "mt-2 text-[12px] text-slate-300",
    stitek: "mb-1 text-[9.5px] font-bold tracking-[0.08em] text-navy uppercase",
    pruh: "grid grid-cols-4 gap-3 border border-slate-300 bg-slate-50 px-3 py-2.5",
    hlavaTabulky: "bg-line text-navy",
    celkem: "rounded bg-navy px-4 py-3 text-right text-white",
  },
  creative: {
    hlavicka: "flex items-start justify-between gap-6 border-b-[6px] border-green bg-green-tint px-[44px] pt-[44px] pb-[26px] text-navy",
    nadpis: "font-display text-[42px] leading-none font-extrabold tracking-tight text-green-ink",
    podnadpis: "mt-2 text-[12px] text-navy",
    stitek: "mb-1 text-[9.5px] font-bold tracking-[0.08em] text-green-ink uppercase",
    pruh: "grid grid-cols-4 gap-3 rounded-lg bg-slate-50 px-3 py-3",
    hlavaTabulky: "border-b-[1.5px] border-green text-green-ink",
    celkem: "rounded-xl bg-green-soft px-4 py-3 text-right text-navy",
  },
} satisfies Record<Vzhled, Record<string, string>>;

function Logo({ src, vyska = 56 }: { src: string; vyska?: number }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-md bg-white p-1">
      {/* eslint-disable-next-line @next/next/no-img-element -- obyčejný obrázek kvůli tisku do PDF */}
      <img src={src} alt="Logo" style={{ maxHeight: vyska, maxWidth: 170 }} className="block h-auto w-auto object-contain" />
    </span>
  );
}

function Adresa({ s }: { s: Strana }) {
  const obec = [s.zip, s.city].filter(Boolean).join(" ");
  return (
    <>
      {s.street && <div>{s.street}</div>}
      {obec && <div>{obec}</div>}
      {s.country && s.country !== "CZ" && <div>{s.country}</div>}
    </>
  );
}

/**
 * Faktura ve formátu A4 (794 × 1123 px = 210 × 297 mm při 96 dpi).
 * Stejná komponenta slouží pro živý náhled, detail i tisk do PDF.
 */
export function FakturaA4({ d }: { d: DataFaktury }) {
  const v = V[d.vzhled];
  const logo = d.logo && d.logoPozice ? d.logoPozice : null;
  const iban = d.dodavatel.iban ? formatujIban(d.dodavatel.iban) : null;
  const prevod = d.uhrada === "prevod";
  const qr =
    prevod && d.dodavatel.iban && d.celkem > 0 && d.stav !== "stornovana" && d.stav !== "uhrazena"
      ? qrPlatba({
          iban: d.dodavatel.iban,
          castka: d.celkem,
          vs: d.vs,
          splatnost: d.splatnost,
          zprava: `Faktura ${d.cislo}`,
        })
      : null;

  return (
    <article
      className="faktura-a4 relative flex h-[1123px] w-[794px] flex-col overflow-hidden bg-white font-sans text-[12px] leading-[1.5] text-slate-800"
      aria-label={`Faktura ${d.cislo}`}
    >
      {d.stav === "stornovana" && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center" aria-hidden="true">
          <span className="-rotate-[24deg] rounded-xl border-[6px] border-red/50 px-10 py-3 font-display text-[88px] font-extrabold tracking-widest text-red/40">
            STORNO
          </span>
        </div>
      )}

      <header className={v.hlavicka}>
        <div className="flex items-center gap-4">
          {logo === "vlevo" && <Logo src={d.logo!} />}
          <div>
            <div className={v.nadpis}>Faktura</div>
            <div className={"num " + v.podnadpis}>
              č. {d.cislo}
              {d.platce ? " · daňový doklad" : ""}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 text-right text-[13px] leading-tight font-bold">
          {logo === "vpravo" && <Logo src={d.logo!} />}
          <div>
            {d.dodavatel.name}
            {d.dodavatel.web && <div className="mt-1 text-[11px] font-normal opacity-80">{d.dodavatel.web}</div>}
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-5 px-[44px] py-[26px]">
        <div className="grid grid-cols-2 gap-8">
          <section>
            <div className={v.stitek}>Dodavatel</div>
            <div className="text-[13px] font-bold text-navy">{d.dodavatel.name}</div>
            <Adresa s={d.dodavatel} />
            <div className="num mt-1">
              {d.dodavatel.ico && <>IČO {d.dodavatel.ico}</>}
              {d.dodavatel.dic && <> · DIČ {d.dodavatel.dic}</>}
            </div>
            {!d.platce && <div className="font-semibold">Nejsem plátce DPH.</div>}
            {(d.dodavatel.email || d.dodavatel.phone) && (
              <div className="mt-1 text-[11px] text-slate-600">{[d.dodavatel.email, d.dodavatel.phone].filter(Boolean).join(" · ")}</div>
            )}
          </section>
          <section>
            <div className={v.stitek}>Odběratel</div>
            {d.odberatel ? (
              <>
                <div className="text-[13px] font-bold text-navy">{d.odberatel.name}</div>
                <Adresa s={d.odberatel} />
                <div className="num mt-1">
                  {d.odberatel.ico && <>IČO {d.odberatel.ico}</>}
                  {d.odberatel.dic && <> · DIČ {d.odberatel.dic}</>}
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-muted">Vyberte odběratele</div>
            )}
          </section>
        </div>

        <div className={"num " + v.pruh}>
          <div>
            <div className={v.stitek}>Vystaveno</div>
            {datumCz(d.vystaveno)}
          </div>
          {d.platce ? (
            <div>
              <div className={v.stitek}>Datum zdan. plnění</div>
              {datumCz(d.duzp ?? d.vystaveno)}
            </div>
          ) : (
            <div>
              <div className={v.stitek}>Var. symbol</div>
              {d.vs}
            </div>
          )}
          <div>
            <div className={v.stitek}>Splatnost</div>
            <strong className="text-navy">{datumCz(d.splatnost)}</strong>
          </div>
          <div>
            <div className={v.stitek}>Úhrada</div>
            {ZPUSOBY_UHRADY[d.uhrada]}
          </div>
        </div>

        {prevod && (d.dodavatel.bank_account || iban) && (
          <div className="num grid grid-cols-[auto_1fr] gap-x-6 gap-y-0.5 text-[11.5px]">
            {d.dodavatel.bank_account && (
              <>
                <span className="text-muted">Číslo účtu</span>
                <span className="font-semibold text-navy">{d.dodavatel.bank_account}</span>
              </>
            )}
            {iban && (
              <>
                <span className="text-muted">IBAN</span>
                <span>{iban}</span>
              </>
            )}
            {d.platce && (
              <>
                <span className="text-muted">Variabilní symbol</span>
                <span className="font-semibold text-navy">{d.vs}</span>
              </>
            )}
          </div>
        )}

        {d.uvod && <p className="text-[12px] whitespace-pre-line text-slate-800">{d.uvod}</p>}

        <table className="num w-full border-collapse text-[11.5px]">
          <thead>
            <tr className={v.hlavaTabulky}>
              <th className="py-2 pr-2 pl-2 text-left font-semibold">Položka</th>
              <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">Množství</th>
              <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">{d.platce ? "Cena bez DPH" : "Cena"}</th>
              {d.platce && <th className="px-2 py-2 text-right font-semibold">DPH</th>}
              <th className="py-2 pr-2 pl-2 text-right font-semibold whitespace-nowrap">{d.platce ? "Základ" : "Celkem"}</th>
            </tr>
          </thead>
          <tbody>
            {d.polozky.map((p, i) => (
              <tr key={i} className="border-b border-line align-top">
                <td className="py-2 pr-2 pl-2 break-words">{p.description || <span className="text-slate-400">Popis položky</span>}</td>
                <td className="px-2 py-2 text-right whitespace-nowrap">
                  {mnozstvi(p.quantity)} {p.unit}
                </td>
                <td className="px-2 py-2 text-right whitespace-nowrap">{castka(p.unit_price)}</td>
                {d.platce && <td className="px-2 py-2 text-right whitespace-nowrap">{p.vat_rate} %</td>}
                <td className="py-2 pr-2 pl-2 text-right font-semibold whitespace-nowrap">{castka(zakladPolozky(p))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-start justify-between gap-6">
          {d.platce ? (
            <table className="num border-collapse text-[11px]">
              <thead>
                <tr className="text-muted">
                  <th className="pr-4 pb-1 text-left font-semibold">Sazba</th>
                  <th className="pr-4 pb-1 text-right font-semibold">Základ</th>
                  <th className="pr-4 pb-1 text-right font-semibold">DPH</th>
                  <th className="pb-1 text-right font-semibold">Celkem</th>
                </tr>
              </thead>
              <tbody>
                {d.rekapitulace.map((r) => (
                  <tr key={r.rate}>
                    <td className="pr-4">{r.rate} %</td>
                    <td className="pr-4 text-right">{castka(r.base)}</td>
                    <td className="pr-4 text-right">{castka(r.vat)}</td>
                    <td className="text-right">{castka(r.base + r.vat)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <span />
          )}
          <div className={v.celkem}>
            <div className="text-[10px] font-bold tracking-[0.08em] uppercase opacity-75">
              {d.stav === "uhrazena" ? "Uhrazeno" : "Celkem k úhradě"}
            </div>
            <div className="num font-display text-[26px] leading-tight font-extrabold">{castka(d.celkem)}</div>
            {d.platce && <div className="num text-[10.5px] opacity-75">z toho DPH {castka(d.dph)}</div>}
          </div>
        </div>

        {d.poznamka && <p className="text-[11.5px] whitespace-pre-line text-ink">{d.poznamka}</p>}

        <div className="mt-auto flex items-end justify-between gap-6">
          {qr ? (
            <div className="flex items-center gap-3">
              <QrKod text={qr} velikost={104} popis={`QR platba ${castka(d.celkem)}`} />
              <div className="text-[10.5px] text-slate-600">
                <div className="font-bold text-navy">QR platba</div>
                Naskenujte v aplikaci své banky.
              </div>
            </div>
          ) : (
            <span />
          )}
          {logo === "dole" && <Logo src={d.logo!} vyska={48} />}
          {d.stav === "uhrazena" && d.uhrazeno && (
            <div className="rounded-lg border-2 border-green-ink px-3 py-1.5 text-center text-[11px] font-bold text-green-ink">
              UHRAZENO {datumCz(d.uhrazeno)}
            </div>
          )}
        </div>
      </div>

      <footer className="border-t border-line px-[44px] py-3 text-[9.5px] text-muted">
        {[d.dodavatel.registry_note, d.platce ? null : "Nejsem plátce DPH.", "Vystaveno v systému čistásložka.cz."]
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
