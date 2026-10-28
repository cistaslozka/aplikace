import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Meritko } from "@/components/faktura/Meritko";
import { Hlaska } from "@/components/Formular";
import { SmlouvaA4 } from "@/components/smlouva/SmlouvaA4";
import { datumCz } from "@/lib/faktura";
import { aktivniFirma } from "@/lib/firma";
import { DRUHY_SMLUV, role, STAVY_SMLUV } from "@/lib/smlouvy";
import { VZORY } from "@/lib/smlouvy/vzory";
import { dataUlozeneSmlouvy, nactiSmlouvu } from "@/lib/smlouvyDb";
import { smazatPodpisyAkce, zmenitStavSmlouvyAkce } from "../actions";
import { Podepsat } from "./Podepsat";

export const metadata: Metadata = { title: "Smlouva" };

const tlacitko = "inline-flex min-h-11 items-center rounded-xl border-[1.5px] border-line bg-surface px-4 text-sm font-semibold text-navy hover:border-muted";
const BARVA = { koncept: "bg-slate-100 text-slate-600", uzavrena: "bg-green-tint text-green-ink", ukoncena: "bg-amber-tint text-amber" } as const;

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ vytvoreno?: string; upraveno?: string }> };

function ZmenaStavu({ id, stav, text, hlavni = false }: { id: string; stav: string; text: string; hlavni?: boolean }) {
  return (
    <form action={zmenitStavSmlouvyAkce}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="stav" value={stav} />
      <button className={hlavni ? "min-h-11 rounded-xl bg-navy px-4 text-sm font-semibold text-white hover:bg-navy-2" : tlacitko}>{text}</button>
    </form>
  );
}

export default async function SmlouvaPage({ params, searchParams }: Props) {
  const firma = await aktivniFirma();
  if (!firma) redirect("/nastaveni");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const s = await nactiSmlouvu(firma.id, id);
  if (!s) notFound();
  const p = await searchParams;
  const d = dataUlozeneSmlouvy(s);
  const clanky = VZORY[s.kind]?.clanky(d) ?? [];
  const r = role(d);
  const podpisy = s.signatures ?? {};
  const podepsano = !!(podpisy.my || podpisy.oni);
  const pole = (k: string) => (typeof s.fields?.[k] === "string" ? (s.fields[k] as string).trim() : "");

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/smlouvy" className="text-sm font-semibold text-muted hover:text-navy">
              ← Smlouvy
            </Link>
            <h1 className="text-2xl font-extrabold tracking-tight">
              {s.title} <span className="num font-semibold text-muted">č. {s.number}</span>
            </h1>
            <span className={"rounded-full px-2.5 py-1 text-[12.5px] font-semibold " + BARVA[s.status]}>{STAVY_SMLUV[s.status]}</span>
          </div>
          <a href={`/smlouvy/${s.id}/pdf`} className="inline-flex min-h-11 items-center rounded-xl bg-green px-5 text-sm font-bold text-navy hover:brightness-95">
            Stáhnout PDF
          </a>
        </div>

        {p.vytvoreno === "1" && <Hlaska typ="info">Smlouva je vytvořená jako koncept. Stáhněte PDF, nechte ji podepsat a pak ji označte jako uzavřenou.</Hlaska>}
        {p.upraveno === "1" && <Hlaska typ="info">Změny jsou uložené.</Hlaska>}

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-4">
          <div className="mr-auto text-sm">
            <span className="text-muted">{DRUHY_SMLUV[s.kind].nazev} · </span>
            <span className="font-bold text-navy">{s.customer.name}</span>
            {s.valid_until && <span className="text-muted"> · termín {datumCz(s.valid_until)}</span>}
          </div>
          {s.status === "koncept" && (
            <>
              {!podepsano && (
                <Link href={`/smlouvy/${s.id}/upravit`} className={tlacitko}>
                  Upravit
                </Link>
              )}
              <ZmenaStavu id={s.id} stav="uzavrena" text="Označit jako podepsanou" hlavni />
            </>
          )}
          {s.status === "uzavrena" && (
            <>
              <ZmenaStavu id={s.id} stav="koncept" text="Vrátit na koncept" />
              <ZmenaStavu id={s.id} stav="ukoncena" text="Ukončit smlouvu" />
            </>
          )}
          {s.status === "ukoncena" && <ZmenaStavu id={s.id} stav="uzavrena" text="Obnovit jako platnou" />}
        </div>
        {s.status !== "koncept" && <p className="text-[13px] text-muted">Podepsanou smlouvu nelze upravit. Změny se řeší dodatkem.</p>}

        {s.status === "koncept" && (
          <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4" aria-label="Podpisy">
            <div>
              <h2 className="text-base font-bold">Podpis na obrazovce</h2>
              <p className="text-[13px] text-muted">
                Podepište prstem nebo myší, třeba přímo u klienta. Když podepíšou obě strany, smlouva se označí jako podepsaná. Můžete ji také vytisknout a podepsat
                na papíře.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {(
                [
                  ["my", r.my, pole("zastupce_my") || ""],
                  ["oni", r.oni, pole("zastupce_oni") || s.customer.name],
                ] as const
              ).map(([strana, nazevRole, jmeno]) =>
                podpisy[strana] ? (
                  <div key={strana} className="flex items-center gap-3 text-sm">
                    <span className="rounded-full bg-green-tint px-2.5 py-1 text-[12.5px] font-semibold text-green-ink">Podepsáno</span>
                    <span>
                      {nazevRole}: <strong className="text-navy">{podpisy[strana]!.jmeno}</strong>
                    </span>
                  </div>
                ) : (
                  <Podepsat key={strana} id={s.id} strana={strana} role={nazevRole} vychoziJmeno={jmeno} />
                ),
              )}
            </div>
            {podepsano && (
              <form action={smazatPodpisyAkce}>
                <input type="hidden" name="id" value={s.id} />
                <button className="text-sm font-semibold text-red hover:underline">Smazat podpisy a smlouvu upravit</button>
              </form>
            )}
          </section>
        )}
      </div>

      <div className="mx-auto w-full max-w-[860px] rounded-2xl bg-slate-200/70 p-3 sm:p-6">
        <div className="shadow-[0_18px_40px_-18px_rgba(15,37,55,0.35)]">
          <Meritko volnaVyska>
            <SmlouvaA4 d={d} clanky={clanky} />
          </Meritko>
        </div>
      </div>
    </>
  );
}
