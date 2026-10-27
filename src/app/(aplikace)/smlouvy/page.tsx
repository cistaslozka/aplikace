import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { datumCz, dnesIso, dnuMezi } from "@/lib/faktura";
import { aktivniFirma } from "@/lib/firma";
import { DRUHY_SMLUV, STAVY_SMLUV, type DruhSmlouvy } from "@/lib/smlouvy";
import { VZORY } from "@/lib/smlouvy/vzory";
import { seznamSmluv } from "@/lib/smlouvyDb";

export const metadata: Metadata = { title: "Smlouvy" };

const BARVA = { koncept: "bg-slate-100 text-slate-600", uzavrena: "bg-green-tint text-green-ink", ukoncena: "bg-amber-tint text-amber" } as const;
const POPISY: Record<DruhSmlouvy, string> = {
  dilo: "Web, grafika, stavba, výroba – výsledek s termínem a cenou.",
  sluzby: "Pravidelná nebo opakovaná služba (správa, účetnictví, marketing).",
  licence: "Svolení k užití vašeho díla (fotky, texty, software).",
  nda: "Ochrana důvěrných informací a know-how.",
  predavaci: "Potvrzení o předání díla nebo věci.",
  cestovni: "Pracovní cesta a vyúčtování náhrad.",
};

export default async function SmlouvyPage() {
  const firma = await aktivniFirma();
  if (!firma) redirect("/nastaveni");
  const smlouvy = await seznamSmluv(firma.id);
  const dnes = dnesIso();

  return (
    <>
      <section>
        <h1 className="text-3xl font-extrabold tracking-tight">Smlouvy</h1>
        <p className="mt-1 text-[15px] text-muted">Vyberte vzor, vyplňte pár údajů a smlouvu stáhněte jako PDF.</p>
      </section>

      <section aria-label="Nová smlouva" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(Object.keys(DRUHY_SMLUV) as DruhSmlouvy[]).map((k) =>
          VZORY[k] ? (
            <Link key={k} href={`/smlouvy/nova?druh=${k}`} className="group flex flex-col gap-1.5 rounded-2xl border-[1.5px] border-line bg-surface p-5 hover:border-green-ink">
              <span className="text-base font-bold text-navy group-hover:text-green-ink">+ {DRUHY_SMLUV[k].nazev}</span>
              <span className="text-[13px] text-muted">{POPISY[k]}</span>
            </Link>
          ) : (
            <div key={k} className="flex flex-col gap-1.5 rounded-2xl border-[1.5px] border-dashed border-line bg-surface/60 p-5">
              <span className="flex items-center gap-2 text-base font-bold text-muted">
                {DRUHY_SMLUV[k].nazev}
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">připravujeme</span>
              </span>
              <span className="text-[13px] text-muted">{POPISY[k]}</span>
            </div>
          ),
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="text-base font-bold">Vaše smlouvy</h2>
          <span className="num text-sm text-muted">{smlouvy.length}</span>
        </div>
        {smlouvy.length === 0 ? (
          <p className="px-5 py-8 text-center text-[15px] text-muted">Zatím tu žádná smlouva není. Vyberte vzor nahoře.</p>
        ) : (
          <ul className="divide-y divide-line">
            {smlouvy.map((s) => {
              const zbyva = s.valid_until && s.status === "uzavrena" ? dnuMezi(dnes, s.valid_until) : null;
              return (
                <li key={s.id}>
                  <Link href={`/smlouvy/${s.id}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3.5 hover:bg-slate-50">
                    <span className="min-w-0">
                      <span className="font-semibold text-navy">{s.title}</span>
                      <span className="text-muted"> · {s.customer.name}</span>
                      <span className="num block text-[13px] text-muted">
                        {s.number}
                        {s.valid_until && <> · termín {datumCz(s.valid_until)}</>}
                        {zbyva !== null && zbyva >= 0 && zbyva <= 30 && <span className="font-semibold text-amber"> · za {zbyva} dní</span>}
                      </span>
                    </span>
                    <span className={"rounded-full px-2.5 py-1 text-[12.5px] font-semibold " + BARVA[s.status]}>{STAVY_SMLUV[s.status]}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
