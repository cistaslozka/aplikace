import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { casCz, CestovniPrikazA4 } from "@/components/cestovni/CestovniPrikazA4";
import { Meritko } from "@/components/faktura/Meritko";
import { Hlaska } from "@/components/Formular";
import { castka } from "@/lib/faktura";
import { aktivniFirma } from "@/lib/firma";
import { dataUlozeneCesty, nactiCestu } from "@/lib/cestovniDb";
import { TlacitkoTisk } from "../../faktury/[id]/Tisk";
import { stornovatCestuAkce } from "../actions";

export const metadata: Metadata = { title: "Cestovní příkaz" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ vystaveno?: string; upraveno?: string; chyba?: string }> };

const tlacitko =
  "inline-flex min-h-11 items-center rounded-xl border-[1.5px] border-line bg-surface px-4 text-sm font-semibold text-navy hover:border-muted";

export default async function CestovniPrikazPage({ params, searchParams }: Props) {
  const firma = await aktivniFirma();
  if (!firma) redirect("/nastaveni");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const c = await nactiCestu(firma.id, id);
  if (!c) notFound();
  const p = await searchParams;
  const storno = c.status === "stornovany";

  return (
    <>
      <div className="netisknout flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/cestovni-prikazy" className="text-sm font-semibold text-muted hover:text-navy">
              ← Cestovní příkazy
            </Link>
            <h1 className="num text-2xl font-extrabold tracking-tight">Cestovní příkaz {c.number}</h1>
            {storno && <span className="rounded-full bg-slate-100 px-3 py-1 text-[13px] font-semibold text-slate-600">Stornováno</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a href={`/cestovni-prikazy/${c.id}/pdf`} className={tlacitko}>
              Stáhnout PDF
            </a>
            <TlacitkoTisk />
          </div>
        </div>

        {p.vystaveno === "1" && <Hlaska typ="info">Cestovní příkaz je uložený. Vytiskněte ho, podepište a přiložte účtenky.</Hlaska>}
        {p.upraveno === "1" && <Hlaska typ="info">Změny jsou uložené.</Hlaska>}
        {p.chyba && <Hlaska typ="chyba">{p.chyba.slice(0, 200)}</Hlaska>}

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-4">
          <div className="mr-auto text-sm">
            <span className="font-bold text-navy">{c.destination}</span>
            <span className="text-muted">
              {" "}
              · {c.traveler.name} · {casCz(c.trip.vstup.odjezd)} · náhrady <span className="num">{castka(c.total)}</span>
            </span>
          </div>
          {!storno && (
            <>
              <Link href={`/cestovni-prikazy/${c.id}/upravit`} className={tlacitko}>
                Upravit
              </Link>
              <details className="group relative">
                <summary className={tlacitko + " cursor-pointer list-none text-red hover:border-red"}>Stornovat</summary>
                <div className="absolute right-0 z-10 mt-2 w-72 rounded-xl border border-line bg-surface p-4 text-sm shadow-lg">
                  <p className="mb-3 text-ink">
                    Stornovaný cestovní příkaz zůstane v evidenci s vodoznakem STORNO a už ho nepůjde upravit.
                  </p>
                  <form action={stornovatCestuAkce}>
                    <input type="hidden" name="id" value={c.id} />
                    <button className="min-h-10 w-full rounded-lg bg-red px-4 font-semibold text-white">Ano, stornovat</button>
                  </form>
                </div>
              </details>
            </>
          )}
        </div>
      </div>

      <div className="tisk-oblast mx-auto w-full max-w-[860px] rounded-2xl bg-slate-200/70 p-3 sm:p-6 print:max-w-none print:rounded-none print:bg-transparent print:p-0">
        <div className="shadow-[0_18px_40px_-18px_rgba(15,37,55,0.35)] print:shadow-none">
          <Meritko>
            <CestovniPrikazA4 d={dataUlozeneCesty(c)} />
          </Meritko>
        </div>
      </div>
    </>
  );
}
