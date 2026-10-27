import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { FakturaA4 } from "@/components/faktura/FakturaA4";
import { Meritko } from "@/components/faktura/Meritko";
import { StavPill } from "@/components/faktura/StavPill";
import { Hlaska } from "@/components/Formular";
import { castka, datumCz, dnesIso, dnuMezi, dny } from "@/lib/faktura";
import { aktivniFirma } from "@/lib/firma";
import { dataUlozeneFaktury, nactiFakturu, nactiUpominky } from "@/lib/faktury";
import { vytvoritUpominkuAkce, zmenitStavAkce } from "../actions";
import { TlacitkoTisk } from "./Tisk";

export const metadata: Metadata = { title: "Faktura" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ vystaveno?: string; upraveno?: string; upominka?: string }> };

const tlacitko = "inline-flex min-h-11 items-center rounded-xl border-[1.5px] border-line bg-surface px-4 text-sm font-semibold text-navy hover:border-muted";

export default async function FakturaPage({ params, searchParams }: Props) {
  const firma = await aktivniFirma();
  if (!firma) redirect("/nastaveni");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const n = await nactiFakturu(firma.id, id);
  if (!n) notFound();
  const f = n.faktura;
  const p = await searchParams;
  const upominky = await nactiUpominky(f.id);
  const poSplatnosti = f.status === "vystavena" ? -dnuMezi(dnesIso(), f.due_date) : 0;
  const muzeUpominku = poSplatnosti > 0 && upominky.length < 3;

  return (
    <>
      <div className="netisknout flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/faktury" className="text-sm font-semibold text-muted hover:text-navy">
              ← Faktury
            </Link>
            <h1 className="num text-2xl font-extrabold tracking-tight">Faktura {f.number}</h1>
            <StavPill status={f.status} splatnost={f.due_date} />
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`/faktury/${f.id}/pdf`} className={tlacitko}>
              Stáhnout PDF
            </a>
            <TlacitkoTisk />
          </div>
        </div>

        {p.vystaveno === "1" && <Hlaska typ="info">Faktura je vystavená. Vytiskněte ji nebo uložte jako PDF a pošlete odběrateli.</Hlaska>}
        {p.upraveno === "1" && <Hlaska typ="info">Změny jsou uložené.</Hlaska>}
        {p.upominka === "chyba" && <Hlaska typ="chyba">Upomínku se nepodařilo vytvořit. Zkuste to prosím znovu.</Hlaska>}
        {p.upominka && /^[1-3]$/.test(p.upominka) && (
          <Hlaska typ="info">
            {p.upominka}. upomínka je vytvořená.{" "}
            <a href={`/faktury/${f.id}/upominka/${p.upominka}`} className="font-bold underline">
              Stáhnout PDF
            </a>{" "}
            a pošlete ji odběrateli.
          </Hlaska>
        )}

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-4">
          <div className="mr-auto text-sm">
            <span className="font-bold text-navy">{f.customer.name}</span>
            <span className="text-muted">
              {" "}
              · <span className="num">{castka(f.total)}</span> · splatnost {datumCz(f.due_date)}
              {f.paid_at && <> · uhrazeno {datumCz(f.paid_at)}</>}
            </span>
          </div>
          {f.status !== "stornovana" && (
            <Link href={`/faktury/${f.id}/upravit`} className={tlacitko}>
              Upravit
            </Link>
          )}
          {f.status === "vystavena" && (
            <form action={zmenitStavAkce}>
              <input type="hidden" name="id" value={f.id} />
              <input type="hidden" name="stav" value="uhrazena" />
              <button className="min-h-11 rounded-xl bg-navy px-4 text-sm font-semibold text-white hover:bg-navy-2">Označit jako uhrazenou</button>
            </form>
          )}
          {f.status === "uhrazena" && (
            <form action={zmenitStavAkce}>
              <input type="hidden" name="id" value={f.id} />
              <input type="hidden" name="stav" value="vystavena" />
              <button className={tlacitko}>Vrátit na neuhrazenou</button>
            </form>
          )}
          {f.status !== "stornovana" && (
            <details className="group relative">
              <summary className={tlacitko + " cursor-pointer list-none text-red hover:border-red"}>Stornovat</summary>
              <div className="absolute right-0 z-10 mt-2 w-72 rounded-xl border border-line bg-surface p-4 text-sm shadow-lg">
                <p className="mb-3 text-ink">
                  Stornovaná faktura zůstane v evidenci s vodoznakem STORNO a už ji nepůjde upravit. Číslo se znovu nepoužije.
                </p>
                <form action={zmenitStavAkce}>
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="stav" value="stornovana" />
                  <button className="min-h-10 w-full rounded-lg bg-red px-4 font-semibold text-white">Ano, stornovat</button>
                </form>
              </div>
            </details>
          )}
        </div>

        {(poSplatnosti > 0 || upominky.length > 0) && (
          <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4" aria-label="Upomínky">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                <h2 className="text-base font-bold">Upomínky</h2>
                {poSplatnosti > 0 && (
                  <p className="text-red">
                    Faktura je <strong>{poSplatnosti} {dny(poSplatnosti)}</strong> po splatnosti.
                  </p>
                )}
              </div>
              {muzeUpominku && (
                <form action={vytvoritUpominkuAkce}>
                  <input type="hidden" name="id" value={f.id} />
                  <button className="min-h-11 rounded-xl bg-navy px-4 text-sm font-semibold text-white hover:bg-navy-2">
                    Vytvořit {upominky.length + 1}. upomínku
                  </button>
                </form>
              )}
            </div>
            {upominky.length > 0 && (
              <ul className="divide-y divide-line rounded-xl border border-line">
                {upominky.map((u) => (
                  <li key={u.level} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                    <span>
                      <strong className="text-navy">{u.level}. upomínka</strong>
                      <span className="num text-muted">
                        {" "}
                        · vytvořena {datumCz(new Date(u.created_at).toLocaleDateString("sv-SE", { timeZone: "Europe/Prague" }))} · uhradit do{" "}
                        {datumCz(u.new_due_date)}
                      </span>
                    </span>
                    <a href={`/faktury/${f.id}/upominka/${u.level}`} className="font-semibold text-green-ink hover:underline">
                      Stáhnout PDF
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {upominky.length >= 3 && poSplatnosti > 0 && (
              <p className="text-[13px] text-muted">Odeslali jste všechny 3 upomínky. Další postup už je na vymáhání pohledávky.</p>
            )}
          </section>
        )}
      </div>

      <div className="tisk-oblast mx-auto w-full max-w-[860px] rounded-2xl bg-slate-200/70 p-3 sm:p-6 print:max-w-none print:rounded-none print:bg-transparent print:p-0">
        <div className="shadow-[0_18px_40px_-18px_rgba(15,37,55,0.35)] print:shadow-none">
          <Meritko>
            <FakturaA4 d={dataUlozeneFaktury(f, n.polozky)} />
          </Meritko>
        </div>
      </div>
    </>
  );
}
