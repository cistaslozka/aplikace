import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { datumCz, dnesIso, dnuMezi, dny } from "@/lib/faktura";
import { aktivniFirma } from "@/lib/firma";
import { DRUHY_SMLUV } from "@/lib/smlouvy";
import { seznamSmluv } from "@/lib/smlouvyDb";
import { createClient } from "@/lib/supabase/server";
import { mesicniPovinnosti, povinnosti, URADY, type Povinnost } from "@/lib/urady";
import { prepnoutPovinnostAkce } from "./actions";

export const metadata: Metadata = { title: "Úřady a lhůty" };

function Termin({ termin, dnes, hotovo }: { termin: string | null; dnes: string; hotovo: boolean }) {
  if (!termin) return <span className="text-[13px] text-muted">termín podle data skončení</span>;
  const zbyva = dnuMezi(dnes, termin);
  const barva = hotovo ? "text-muted" : zbyva < 0 ? "text-red" : zbyva <= 3 ? "text-amber" : "text-muted";
  return (
    <span className={"num text-[13px] font-semibold " + barva}>
      do {datumCz(termin)}
      {!hotovo && (zbyva < 0 ? ` · ${-zbyva} ${dny(-zbyva)} po termínu` : zbyva === 0 ? " · dnes" : ` · za ${zbyva} ${dny(zbyva)}`)}
    </span>
  );
}

export default async function UradyPage() {
  const firma = await aktivniFirma();
  if (!firma) redirect("/nastaveni");
  const dnes = dnesIso();
  const supabase = await createClient();
  const [smlouvy, { data: splnene }] = await Promise.all([
    seznamSmluv(firma.id),
    supabase.from("office_tasks").select("task_key").eq("organization_id", firma.id),
  ]);
  const hr = smlouvy.filter((s) => DRUHY_SMLUV[s.kind].hr);
  const hotove = new Set((splnene ?? []).map((x) => x.task_key));
  const vse: Povinnost[] = [...povinnosti(hr), ...(hr.some((s) => ["hpp", "dpp", "dpc"].includes(s.kind)) ? mesicniPovinnosti(dnes) : [])];
  const otevrene = vse.filter((p) => !hotove.has(p.klic)).sort((a, b) => (a.termin ?? "9999").localeCompare(b.termin ?? "9999"));
  const splnenePov = vse.filter((p) => hotove.has(p.klic));
  // údaje zaměstnanců pro vyplnění přihlášek
  const udaje = new Map(hr.map((s) => [s.id, s]));

  const Radek = ({ p, hotovo }: { p: Povinnost; hotovo: boolean }) => {
    const s = p.dokument ? udaje.get(p.dokument.id) : undefined;
    const f = (s?.fields ?? {}) as Record<string, string>;
    return (
      <li className="flex flex-col gap-2 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className={"font-semibold " + (hotovo ? "text-muted line-through" : "text-navy")}>{p.nadpis}</div>
            <div className="text-[13px] text-muted">
              {URADY[p.urad].nazev}
              {p.zamestnanec && <> · {p.zamestnanec}</>}
              {p.dokument && (
                <>
                  {" "}
                  ·{" "}
                  <Link href={`/smlouvy/${p.dokument.id}`} className="num font-semibold text-green-ink hover:underline">
                    {p.dokument.cislo}
                  </Link>
                </>
              )}
            </div>
            <Termin termin={p.termin} dnes={dnes} hotovo={hotovo} />
          </div>
          <form action={prepnoutPovinnostAkce}>
            <input type="hidden" name="klic" value={p.klic} />
            <input type="hidden" name="hotovo" value={hotovo ? "1" : "0"} />
            <button
              className={
                "min-h-10 rounded-xl px-4 text-sm font-semibold " +
                (hotovo ? "border-[1.5px] border-line bg-surface text-muted hover:border-muted" : "bg-green text-navy hover:brightness-95")
              }
            >
              {hotovo ? "Vrátit" : "Hotovo"}
            </button>
          </form>
        </div>
        {!hotovo && (
          <details className="text-[13.5px]">
            <summary className="cursor-pointer font-semibold text-green-ink">Jak na to</summary>
            <div className="mt-2 flex flex-col gap-2 rounded-xl bg-slate-50 p-3">
              <p>{p.popis}</p>
              {s && (
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
                  <dt className="text-muted">Zaměstnanec</dt>
                  <dd className="font-semibold">{s.customer.name}</dd>
                  {f.narozeni && (
                    <>
                      <dt className="text-muted">Datum narození</dt>
                      <dd className="num">{datumCz(f.narozeni)}</dd>
                    </>
                  )}
                  {f.bydliste && (
                    <>
                      <dt className="text-muted">Bydliště</dt>
                      <dd>{f.bydliste}</dd>
                    </>
                  )}
                  <dt className="text-muted">Druh</dt>
                  <dd>{DRUHY_SMLUV[s.kind].nazev}</dd>
                  {(f.nastup || f.od) && (
                    <>
                      <dt className="text-muted">Nástup</dt>
                      <dd className="num">{datumCz(f.nastup || f.od)}</dd>
                    </>
                  )}
                  <dt className="text-muted">Zaměstnavatel</dt>
                  <dd>
                    {firma.name}
                    {firma.ico && <span className="num"> · IČO {firma.ico}</span>}
                  </dd>
                </dl>
              )}
              {URADY[p.urad].odkaz && (
                <a href={URADY[p.urad].odkaz} target="_blank" rel="noreferrer" className="font-semibold text-green-ink hover:underline">
                  Otevřít {URADY[p.urad].nazev} ↗
                </a>
              )}
            </div>
          </details>
        )}
      </li>
    );
  };

  return (
    <>
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Úřady a lhůty</h1>
          <p className="mt-1 max-w-3xl text-[15px] text-muted">
            Co máte jako zaměstnavatel poslat na úřady a do kdy. Aplikace to pozná z HR dokumentů (nástup, skončení) a připraví údaje.
            Odeslání zatím děláte sami přes portál úřadu nebo datovou schránku.
          </p>
        </div>
        <Link href="/hr" className="text-sm font-semibold text-muted hover:text-navy">
          ← HR a zaměstnanci
        </Link>
      </section>

      <section className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="text-base font-bold">Čeká na vás</h2>
          <span className="num text-sm text-muted">{otevrene.length}</span>
        </div>
        {otevrene.length ? (
          <ul className="divide-y divide-line">
            {otevrene.map((p) => (
              <Radek key={p.klic} p={p} hotovo={false} />
            ))}
          </ul>
        ) : (
          <p className="px-5 py-8 text-center text-[15px] text-muted">
            {hr.length
              ? "Všechno máte hotové."
              : "Zatím žádní zaměstnanci. Až vytvoříte pracovní smlouvu, DPP nebo DPČ, objeví se tu, co je potřeba udělat."}
          </p>
        )}
      </section>

      {splnenePov.length > 0 && (
        <details className="overflow-hidden rounded-2xl border border-line bg-surface">
          <summary className="cursor-pointer px-5 py-4 text-base font-bold">Hotové ({splnenePov.length})</summary>
          <ul className="divide-y divide-line border-t border-line">
            {splnenePov.map((p) => (
              <Radek key={p.klic} p={p} hotovo />
            ))}
          </ul>
        </details>
      )}

      <p className="text-[13px] text-muted">
        Lhůty podle stavu k říjnu 2026 (jednotné měsíční hlášení zaměstnavatele od 1. 7. 2026). Jsou orientační – v nejasných případech se
        poraďte se mzdovou účetní.
      </p>
    </>
  );
}
