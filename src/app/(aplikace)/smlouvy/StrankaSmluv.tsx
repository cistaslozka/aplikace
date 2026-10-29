import Link from "next/link";
import { redirect } from "next/navigation";
import { datumCz, dnesIso, dnuMezi } from "@/lib/faktura";
import { aktivniFirma } from "@/lib/firma";
import { DRUHY_SMLUV, STAVY_SMLUV, type DruhSmlouvy } from "@/lib/smlouvy";
import { VZORY } from "@/lib/smlouvy/vzory";
import { seznamSmluv } from "@/lib/smlouvyDb";

const BARVA = {
  koncept: "bg-slate-100 text-slate-600",
  uzavrena: "bg-green-tint text-green-ink",
  ukoncena: "bg-amber-tint text-amber",
} as const;
const POPISY: Record<DruhSmlouvy, string> = {
  dilo: "Web, grafika, stavba, výroba – výsledek s termínem a cenou.",
  sluzby: "Pravidelná nebo opakovaná služba (správa, účetnictví, marketing).",
  licence: "Svolení k užití vašeho díla (fotky, texty, software).",
  nda: "Ochrana důvěrných informací a know-how.",
  predavaci: "Potvrzení o předání díla nebo věci.",
  kupni: "Prodej věci jiné firmě – cena, předání, vlastnictví.",
  ramcova: "Dlouhodobá spolupráce, jednotlivé zakázky přes objednávky.",
  najem: "Pronájem kanceláře, skladu nebo stroje.",
  plna_moc: "Oprávnění, aby za vás jednal někdo jiný.",
  hpp: "Hlavní pracovní poměr – pozice, místo, nástup, mzda.",
  dpp: "Brigáda do 300 hodin ročně.",
  dpc: "Pravidelná práce do 20 hodin týdně.",
  mzdovy_vymer: "Stanovení mzdy a jejích složek.",
  dohoda_skonceni: "Ukončení pracovního poměru dohodou, i s odstupným.",
  vypoved: "Výpověď zaměstnance, nadbytečnost, zrušení ve zkušební době.",
  vytka: "Písemné upozornění na porušení pracovních povinností.",
  svereni: "Notebook, telefon nebo auto svěřené zaměstnanci.",
  cestovni: "Pracovní cesta a vyúčtování náhrad.",
};

/** Přehled vzorů a uložených dokumentů. Stejná stránka slouží pro Smlouvy i pro HR (zaměstnance). */
export async function StrankaSmluv({ hr }: { hr: boolean }) {
  const firma = await aktivniFirma();
  if (!firma) redirect("/nastaveni");
  const smlouvy = (await seznamSmluv(firma.id)).filter((s) => !!DRUHY_SMLUV[s.kind].hr === hr);
  const druhy = (Object.keys(DRUHY_SMLUV) as DruhSmlouvy[]).filter((k) => !!DRUHY_SMLUV[k].hr === hr);
  const dnes = dnesIso();

  return (
    <>
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight">{hr ? "HR a zaměstnanci" : "Smlouvy"}</h1>
          {hr && (
            <Link
              href="/hr/urady"
              className="inline-flex min-h-11 items-center rounded-xl bg-navy px-4 text-sm font-semibold text-white hover:bg-navy-2"
            >
              Úřady a lhůty →
            </Link>
          )}
        </div>
        <p className="mt-1 text-[15px] text-muted">
          {hr
            ? "Pracovní smlouvy, dohody a další dokumenty pro zaměstnance podle zákoníku práce. Vyplňte údaje a dokument stáhněte jako PDF."
            : "Vyberte vzor, vyplňte pár údajů a smlouvu stáhněte jako PDF."}
        </p>
      </section>

      <section aria-label="Nová smlouva" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {druhy.map((k) =>
          VZORY[k] || k === "cestovni" ? (
            <Link
              key={k}
              href={k === "cestovni" ? "/cestovni-prikazy/novy" : `/smlouvy/nova?druh=${k}`}
              className="group flex flex-col gap-1.5 rounded-2xl border-[1.5px] border-line bg-surface p-5 hover:border-green-ink"
            >
              <span className="flex items-center gap-2 text-base font-bold text-navy group-hover:text-green-ink">
                + {DRUHY_SMLUV[k].nazev}
                {DRUHY_SMLUV[k].pro && <span className="rounded-full bg-green-soft px-2 py-0.5 text-[11px] font-bold text-navy">PRO</span>}
              </span>
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
          <h2 className="text-base font-bold">{hr ? "Dokumenty zaměstnanců" : "Vaše smlouvy"}</h2>
          <span className="num text-sm text-muted">{smlouvy.length}</span>
        </div>
        {smlouvy.length === 0 ? (
          <p className="px-5 py-8 text-center text-[15px] text-muted">Zatím tu nic není. Vyberte vzor nahoře.</p>
        ) : (
          <ul className="divide-y divide-line">
            {smlouvy.map((s) => {
              const zbyva = s.valid_until && s.status === "uzavrena" ? dnuMezi(dnes, s.valid_until) : null;
              return (
                <li key={s.id}>
                  <Link
                    href={`/smlouvy/${s.id}`}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3.5 hover:bg-slate-50"
                  >
                    <span className="min-w-0">
                      <span className="font-semibold text-navy">{s.title}</span>
                      <span className="text-muted"> · {s.customer.name}</span>
                      <span className="num block text-[13px] text-muted">
                        {s.number}
                        {s.valid_until && <> · termín {datumCz(s.valid_until)}</>}
                        {zbyva !== null && zbyva >= 0 && zbyva <= 30 && <span className="font-semibold text-amber"> · za {zbyva} dní</span>}
                      </span>
                    </span>
                    <span className={"rounded-full px-2.5 py-1 text-[12.5px] font-semibold " + BARVA[s.status]}>
                      {STAVY_SMLUV[s.status]}
                    </span>
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
