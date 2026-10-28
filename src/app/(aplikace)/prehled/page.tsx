import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StavPill } from "@/components/faktura/StavPill";
import { castka, datumCz, dnesIso, dnuMezi, dny, NAZVY_DOKLADU, pridatDny } from "@/lib/faktura";
import { aktivniFirma } from "@/lib/firma";
import { seznamFaktur } from "@/lib/faktury";
import { kUhrade, LIMIT_DPH, LIMIT_DPH_OKAMZITY, spocitejPrehled } from "@/lib/prehled";
import { DLAZDICE, slozRozlozeni, type IdDlazdice } from "@/lib/rozlozeni";
import { createClient } from "@/lib/supabase/server";
import { dniDo } from "@/lib/tarify";
import { UpravitPrehled } from "./UpravitPrehled";

const SIROKE = new Set<string>(DLAZDICE.filter((d) => d.siroka).map((d) => d.id));

export const metadata: Metadata = { title: "Přehled" };

const karta = "flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 sm:p-[22px]";
const nadpisKarty = "font-sans text-sm font-semibold text-muted";
const velkeCislo = "num font-display text-[32px] leading-tight font-extrabold";
const stitek = (barva: "zelena" | "cervena" | "oranzova") =>
  "rounded-full px-2.5 py-0.5 text-xs font-bold " +
  (barva === "zelena" ? "bg-green-tint text-green-ink" : barva === "cervena" ? "bg-red-tint text-red" : "bg-amber-tint text-amber");

const faktur = (n: number) => `${n} ${n === 1 ? "faktura" : n >= 2 && n <= 4 ? "faktury" : "faktur"}`;
const tisice = (x: number) => (x >= 1000 ? `${Math.round(x / 1000).toLocaleString("cs-CZ")} tis.` : x > 0 ? `${Math.round(x)}` : "");

type Props = { searchParams: Promise<{ vitejte?: string; heslo?: string }> };

export default async function PrehledPage({ searchParams }: Props) {
  const firma = await aktivniFirma();
  // Nový uživatel: nejdřív údaje o firmě, bez nich nejde vystavit doklad.
  if (!firma) redirect("/nastaveni");

  const p = await searchParams;
  const dnes = dnesIso();
  const datumText = new Intl.DateTimeFormat("cs-CZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Prague",
  }).format(new Date());
  const zbyva = dniDo(firma.trial_ends_at);
  const supabase = await createClient();
  const [doklady, ulozene, koncici] = await Promise.all([
    seznamFaktur(firma.id),
    supabase.from("dashboard_layouts").select("tiles").eq("organization_id", firma.id).maybeSingle(),
    // uzavřené smlouvy, kterým termín končí do 30 dnů (nebo nedávno skončil)
    supabase
      .from("contracts")
      .select("id, title, number, customer, valid_until")
      .eq("organization_id", firma.id)
      .eq("status", "uzavrena")
      .gte("valid_until", pridatDny(dnes, -14))
      .lte("valid_until", pridatDny(dnes, 30))
      .order("valid_until")
      .limit(5),
  ]);
  const koncSmlouvy = (koncici.data ?? []) as { id: string; title: string; number: string; customer: { name: string }; valid_until: string }[];
  const rozlozeni = slozRozlozeni(ulozene.data?.tiles);
  const s = spocitejPrehled(doklady, dnes);
  const maxMesic = Math.max(...s.prijmy.mesice.map((m) => m.castka), 1);
  const limitStav = s.obrat.castka >= LIMIT_DPH ? "cervena" : s.obrat.procent >= 75 ? "oranzova" : "zelena";

  const prvky: Record<IdDlazdice, React.ReactNode> = {
    neuhrazeno: (
      <>
        <article className={karta}>
          <div className="flex items-center justify-between gap-2">
            <h2 className={nadpisKarty}>Neuhrazené doklady</h2>
            <Link href="/faktury?stav=ceka" className="text-[13px] font-semibold text-green-ink hover:underline">
              Zobrazit
            </Link>
          </div>
          <div className={velkeCislo + " text-navy"}>{castka(s.neuhrazeno.castka)}</div>
          <p className="text-[13px] text-muted">
            {s.neuhrazeno.pocet === 0
              ? "Nikdo vám nic nedluží."
              : `${s.neuhrazeno.pocet === 1 ? "1 doklad čeká" : `${s.neuhrazeno.pocet} ${s.neuhrazeno.pocet <= 4 ? "doklady čekají" : "dokladů čeká"}`} na úhradu`}
            {s.neuhrazeno.nejblizsiSplatnost && <> · nejbližší splatnost {datumCz(s.neuhrazeno.nejblizsiSplatnost)}</>}
          </p>
        </article>
      </>
    ),
    po_splatnosti: (
      <>
        <article className={karta}>
          <div className="flex items-center justify-between gap-2">
            <h2 className={nadpisKarty}>Po splatnosti</h2>
            {s.poSplatnosti.pocet > 0 ? (
              <span className={stitek("cervena")}>Vyžaduje pozornost</span>
            ) : (
              <span className={stitek("zelena")}>V pořádku</span>
            )}
          </div>
          <div className={velkeCislo + (s.poSplatnosti.pocet ? " text-red" : " text-navy")}>{castka(s.poSplatnosti.castka)}</div>
          {s.poSplatnosti.pocet > 0 ? (
            <Link href="/faktury?stav=po" className="text-[13px] font-semibold text-green-ink hover:underline">
              {faktur(s.poSplatnosti.pocet)}, nejstarší {s.poSplatnosti.nejstarsiDni} {dny(s.poSplatnosti.nejstarsiDni)} · poslat upomínky →
            </Link>
          ) : (
            <p className="text-[13px] text-muted">Žádná faktura není po splatnosti.</p>
          )}
        </article>
      </>
    ),
    dph: (
      <>
        {firma.vat_payer ? (
          <article className={karta}>
            <h2 className={nadpisKarty}>DPH na výstupu · {s.dph.mesic}</h2>
            <div className={velkeCislo + " text-navy"}>{castka(s.dph.castka)}</div>
            <p className="text-[13px] text-muted">
              Z vystavených faktur a daňových dokladů k platbě. DPH z přijatých faktur tu zatím není.
            </p>
          </article>
        ) : (
          <article className={karta}>
            <div className="flex items-center justify-between gap-2">
              <h2 className={nadpisKarty}>Obrat a limit pro DPH</h2>
              <span className={stitek(limitStav)}>
                {limitStav === "zelena" ? "V pořádku" : limitStav === "oranzova" ? "Blížíte se limitu" : "Limit překročen"}
              </span>
            </div>
            <div className={velkeCislo + " text-navy"}>{castka(s.obrat.castka)}</div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
              <div
                className={
                  "h-full rounded-full " + (limitStav === "zelena" ? "bg-green" : limitStav === "oranzova" ? "bg-amber" : "bg-red")
                }
                style={{ width: `${Math.max(s.obrat.procent, s.obrat.castka > 0 ? 2 : 0)}%` }}
              />
            </div>
            <p className="num text-[13px] text-muted">
              {s.obrat.procent} % z limitu {castka(LIMIT_DPH).replace(",00", "")} za rok {s.obrat.rok}
              {s.obrat.castka >= LIMIT_DPH && <> · nad {castka(LIMIT_DPH_OKAMZITY).replace(",00", "")} se stáváte plátcem hned</>}
            </p>
          </article>
        )}
      </>
    ),
    prijmy: (
      <>
        <article className={karta + " h-full gap-4"}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold">Příjmy za posledních 6 měsíců</h2>
            <div className="num text-[13px] text-muted">
              Celkem <strong className="text-navy">{castka(s.prijmy.celkem)}</strong>
            </div>
          </div>
          <div
            className="grid h-[190px] grid-cols-6 items-end gap-2 border-b border-line sm:gap-3.5"
            role="img"
            aria-label={`Příjmy po měsících: ${s.prijmy.mesice.map((m) => `${m.celyNazev} ${castka(m.castka)}`).join(", ")}`}
          >
            {s.prijmy.mesice.map((m, i) => (
              <div key={m.klic} className="flex h-full flex-col items-center justify-end gap-1.5">
                <span className="num text-[12px] text-muted">{tisice(m.castka)}</span>
                <span
                  className={"w-full max-w-14 rounded-t-lg " + (m.castka ? (i === 5 ? "bg-green-ink" : "bg-green") : "bg-line")}
                  style={{ height: m.castka ? `${Math.max(4, Math.round((m.castka / maxMesic) * 150))}px` : "3px" }}
                />
              </div>
            ))}
          </div>
          <div className="-mt-2 grid grid-cols-6 gap-2 sm:gap-3.5">
            {s.prijmy.mesice.map((m) => (
              <span key={m.klic} className="text-center text-[12px] font-semibold text-muted">
                {m.nazev}
              </span>
            ))}
          </div>
          <p className="text-[12.5px] text-muted">Podle data úhrady: zaplacené faktury a zálohy.</p>
        </article>
      </>
    ),
    akce: (
      <>
        <article className="flex flex-col gap-3 rounded-2xl bg-navy p-5 text-slate-300 sm:p-[22px]">
          <h2 className="text-lg text-white">Rychlé akce</h2>
          <Link
            href="/faktury/nova"
            className="flex min-h-12 items-center justify-between rounded-xl bg-green px-4 text-[15px] font-bold text-navy hover:brightness-95"
          >
            Nová faktura <span aria-hidden="true">→</span>
          </Link>
          {[
            ["/faktury/nova?druh=zalohova", "Zálohová faktura"],
            ["/klienti", "Přidat klienta z ARES"],
            ["/faktury/export?rok=" + dnes.slice(0, 4), "Přehled faktur pro účetní"],
          ].map(([href, text]) => (
            <a
              key={href}
              href={href}
              className="flex min-h-12 items-center justify-between rounded-xl bg-white/7 px-4 text-[15px] font-semibold text-white hover:bg-white/12"
            >
              {text} <span aria-hidden="true">→</span>
            </a>
          ))}
        </article>
      </>
    ),
    posledni: (
      <>
        <article className={karta + " h-full"}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold">Poslední doklady</h2>
            <Link href="/faktury" className="text-[13px] font-semibold text-green-ink hover:underline">
              Všechny doklady →
            </Link>
          </div>
          {s.posledni.length === 0 ? (
            <p className="py-4 text-[14px] text-muted">Zatím tu nic není.</p>
          ) : (
            <ul className="divide-y divide-line">
              {s.posledni.map((f) => (
                <li key={f.id}>
                  <Link
                    href={`/faktury/${f.id}`}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 hover:bg-slate-50"
                  >
                    <span className="min-w-0">
                      <span className="num font-semibold text-navy">{f.number}</span>
                      <span className="text-muted"> · {f.customer.name}</span>
                      {f.kind !== "faktura" && <span className="text-[12.5px] text-muted"> · {NAZVY_DOKLADU[f.kind]}</span>}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="num font-bold text-navy">{castka(kUhrade(f))}</span>
                      <span className="flex sm:w-36 sm:justify-end">
                        <StavPill status={f.status} splatnost={f.due_date} dnes={dnes} />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </article>
      </>
    ),
    smlouvy: (
      <>
        <article className={karta}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold">Končící smlouvy</h2>
            <Link href="/smlouvy" className="text-[13px] font-semibold text-green-ink hover:underline">
              Smlouvy →
            </Link>
          </div>
          {koncSmlouvy.length === 0 ? (
            <p className="text-[13px] text-muted">Žádné smlouvě v příštích 30 dnech nekončí termín.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {koncSmlouvy.map((k) => {
                const zbyva = dnuMezi(dnes, k.valid_until);
                return (
                  <li key={k.id}>
                    <Link href={`/smlouvy/${k.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:bg-slate-50">
                      <span className="min-w-0 text-sm">
                        <span className="block truncate font-semibold text-navy">{k.title}</span>
                        <span className="block truncate text-[12.5px] text-muted">{k.customer.name}</span>
                      </span>
                      <span className={"shrink-0 text-[12.5px] font-semibold " + (zbyva < 0 ? "text-red" : zbyva <= 7 ? "text-amber" : "text-muted")}>
                        {zbyva < 0 ? `skončila před ${-zbyva} ${dny(-zbyva)}` : zbyva === 0 ? "končí dnes" : `končí za ${zbyva} ${dny(zbyva)}`}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </article>
      </>
    ),
  };

  return (
    <>
      {p.vitejte === "1" && (
        <p role="status" className="rounded-xl bg-green-tint px-4 py-3 text-sm font-medium text-green-ink">
          Hotovo, údaje o firmě jsou uložené. Teď už můžete vystavit první fakturu.
        </p>
      )}
      {p.heslo === "zmeneno" && (
        <p role="status" className="rounded-xl bg-green-tint px-4 py-3 text-sm font-medium text-green-ink">
          Nové heslo je uložené.
        </p>
      )}

      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold tracking-tight">Dobrý den</h1>
          <p className="mt-1 text-[15px] text-muted">
            <span className="inline-block first-letter:uppercase">{datumText}</span> · {firma.name}
            {s.poSplatnosti.pocet > 0 && (
              <>
                {" "}
                ·{" "}
                <Link href="/faktury?stav=po" className="font-semibold text-red hover:underline">
                  {s.poSplatnosti.pocet === 1
                    ? "1 faktura je"
                    : `${faktur(s.poSplatnosti.pocet)} ${s.poSplatnosti.pocet <= 4 ? "jsou" : "je"}`}{" "}
                  po splatnosti
                </Link>
              </>
            )}
          </p>
        </div>
        {/* contents: panel úprav se zalomí pod záhlaví přes celou šířku */}
        <div className="contents">
          <Link href="/predplatne" className="ml-auto rounded-full bg-amber-tint px-3 py-1.5 text-[13px] font-semibold text-amber hover:underline">
            {zbyva > 0 ? `Zkušební doba: zbývá ${zbyva} ${dny(zbyva)}` : "Zkušební doba skončila"}
          </Link>
          <UpravitPrehled rozlozeni={rozlozeni} />
        </div>
      </section>

      {doklady.length === 0 && (
        <section className="flex flex-col items-start gap-4 rounded-2xl bg-navy p-6 text-slate-300">
          <h2 className="text-lg text-white">Začněte první fakturou</h2>
          <p className="max-w-prose text-sm">Vyplníte IČO odběratele, údaje se doplní z ARES a fakturu stáhnete jako PDF s QR platbou.</p>
          <Link href="/faktury/nova" className="rounded-xl bg-green px-4 py-3 text-[15px] font-bold text-navy hover:brightness-95">
            Nová faktura
          </Link>
        </section>
      )}

      <section aria-label="Dlaždice přehledu" className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {rozlozeni
          .filter((x) => x.zapnuto)
          .map((x) => (
            <div key={x.id} className={"flex flex-col *:flex-1 " + (SIROKE.has(x.id) ? "lg:col-span-2" : "")}>
              {prvky[x.id]}
            </div>
          ))}
        {rozlozeni.every((x) => !x.zapnuto) && (
          <p className="text-[15px] text-muted lg:col-span-3">Všechny dlaždice jsou vypnuté. Zapněte si je tlačítkem Upravit přehled.</p>
        )}
      </section>
    </>
  );
}
