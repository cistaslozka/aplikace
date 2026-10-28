import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Meritko } from "@/components/faktura/Meritko";
import { Hlaska } from "@/components/Formular";
import { PokladniDokladList } from "@/components/pokladna/PokladniDokladList";
import { castka, datumCz } from "@/lib/faktura";
import { aktivniFirma } from "@/lib/firma";
import { NAZVY_POKLADNY } from "@/lib/pokladna";
import { dataUlozenehoDokladu, nactiPokladniDoklad } from "@/lib/pokladnaDb";
import { TlacitkoTisk } from "../../faktury/[id]/Tisk";
import { stornovatPokladniDokladAkce } from "../actions";

export const metadata: Metadata = { title: "Pokladní doklad" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ vystaveno?: string; chyba?: string }> };

const tlacitko =
  "inline-flex min-h-11 items-center rounded-xl border-[1.5px] border-line bg-surface px-4 text-sm font-semibold text-navy hover:border-muted";

export default async function PokladniDokladPage({ params, searchParams }: Props) {
  const firma = await aktivniFirma();
  if (!firma) redirect("/nastaveni");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const n = await nactiPokladniDoklad(firma.id, id);
  if (!n) notFound();
  const d = n.doklad;
  const p = await searchParams;
  const storno = d.status === "stornovany";

  return (
    <>
      <div className="netisknout flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/pokladna" className="text-sm font-semibold text-muted hover:text-navy">
              ← Pokladna
            </Link>
            <h1 className="num text-2xl font-extrabold tracking-tight">
              {NAZVY_POKLADNY[d.kind]} {d.number}
            </h1>
            {storno && <span className="rounded-full bg-slate-100 px-3 py-1 text-[13px] font-semibold text-slate-600">Stornováno</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a href={`/pokladna/${d.id}/pdf`} className={tlacitko}>
              Stáhnout PDF
            </a>
            <TlacitkoTisk />
          </div>
        </div>

        {p.vystaveno === "1" && (
          <Hlaska typ="info">
            Doklad je uložený{n.faktura ? ` a faktura ${n.faktura} je označená jako uhrazená` : ""}. Vytiskněte ho a nechte podepsat.
          </Hlaska>
        )}
        {p.chyba && <Hlaska typ="chyba">{p.chyba.slice(0, 200)}</Hlaska>}

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-4">
          <div className="mr-auto text-sm">
            <span className="font-bold text-navy">{d.partner.name}</span>
            <span className="text-muted">
              {" "}
              · <span className="num">{castka(d.amount)}</span> · {datumCz(d.issue_date)}
              {n.faktura && d.invoice_id && (
                <>
                  {" "}
                  · úhrada{" "}
                  <Link href={`/faktury/${d.invoice_id}`} className="num font-semibold text-green-ink hover:underline">
                    faktury {n.faktura}
                  </Link>
                </>
              )}
            </span>
          </div>
          {!storno && (
            <details className="group relative">
              <summary className={tlacitko + " cursor-pointer list-none text-red hover:border-red"}>Stornovat</summary>
              <div className="absolute right-0 z-10 mt-2 w-72 rounded-xl border border-line bg-surface p-4 text-sm shadow-lg">
                <p className="mb-3 text-ink">
                  Stornovaný doklad zůstane v evidenci s vodoznakem STORNO a nebude se počítat do zůstatku pokladny.
                  {n.faktura ? " Faktura, kterou hradil, se vrátí na neuhrazenou." : ""}
                </p>
                <form action={stornovatPokladniDokladAkce}>
                  <input type="hidden" name="id" value={d.id} />
                  <button className="min-h-10 w-full rounded-lg bg-red px-4 font-semibold text-white">Ano, stornovat</button>
                </form>
              </div>
            </details>
          )}
        </div>
      </div>

      <div className="tisk-oblast mx-auto w-full max-w-[860px] rounded-2xl bg-slate-200/70 p-3 sm:p-6 print:max-w-none print:rounded-none print:bg-transparent print:p-0">
        <div className="shadow-[0_18px_40px_-18px_rgba(15,37,55,0.35)] print:shadow-none">
          <Meritko vyska={561}>
            <PokladniDokladList d={dataUlozenehoDokladu(d, n.faktura)} />
          </Meritko>
        </div>
      </div>
    </>
  );
}
