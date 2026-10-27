import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StavPill } from "@/components/faktura/StavPill";
import { castka, datumCz, dnesIso, dny, NAZVY_DOKLADU } from "@/lib/faktura";
import { aktivniFirma } from "@/lib/firma";
import { seznamFaktur } from "@/lib/faktury";
import { kUhrade, LIMIT_DPH, LIMIT_DPH_OKAMZITY, spocitejPrehled } from "@/lib/prehled";
import { dniDo } from "@/lib/tarify";

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
  const datumText = new Intl.DateTimeFormat("cs-CZ", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Prague" }).format(new Date());
  const zbyva = dniDo(firma.trial_ends_at);
  const doklady = await seznamFaktur(firma.id);
  const s = spocitejPrehled(doklady, dnes);
  const maxMesic = Math.max(...s.prijmy.mesice.map((m) => m.castka), 1);
  const limitStav = s.obrat.castka >= LIMIT_DPH ? "cervena" : s.obrat.procent >= 75 ? "oranzova" : "zelena";

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
                  {s.poSplatnosti.pocet === 1 ? "1 faktura je" : `${faktur(s.poSplatnosti.pocet)} ${s.poSplatnosti.pocet <= 4 ? "jsou" : "je"}`} po splatnosti
                </Link>
              </>
            )}
          </p>
        </div>
        <Link href="/predplatne" className="rounded-full bg-amber-tint px-3 py-1.5 text-[13px] font-semibold text-amber hover:underline">
          {zbyva > 0 ? `Zkušební doba: zbývá ${zbyva} ${dny(zbyva)}` : "Zkušební doba skončila"}
        </Link>
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
        {/* Neuhrazené */}
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

        {/* Po splatnosti */}
        <article className={karta}>
          <div className="flex items-center justify-between gap-2">
            <h2 className={nadpisKarty}>Po splatnosti</h2>
            {s.poSplatnosti.pocet > 0 ? <span className={stitek("cervena")}>Vyžaduje pozornost</span> : <span className={stitek("zelena")}>V pořádku</span>}
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

        {/* DPH: plátce = DPH za měsíc, neplátce = limit obratu */}
        {firma.vat_payer ? (
          <article className={karta}>
            <h2 className={nadpisKarty}>DPH na výstupu · {s.dph.mesic}</h2>
            <div className={velkeCislo + " text-navy"}>{castka(s.dph.castka)}</div>
            <p className="text-[13px] text-muted">Z vystavených faktur a daňových dokladů k platbě. DPH z přijatých faktur tu zatím není.</p>
          </article>
        ) : (
          <article className={karta}>
            <div className="flex items-center justify-between gap-2">
              <h2 className={nadpisKarty}>Obrat a limit pro DPH</h2>
              <span className={stitek(limitStav)}>{limitStav === "zelena" ? "V pořádku" : limitStav === "oranzova" ? "Blížíte se limitu" : "Limit překročen"}</span>
            </div>
            <div className={velkeCislo + " text-navy"}>{castka(s.obrat.castka)}</div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
              <div
                className={"h-full rounded-full " + (limitStav === "zelena" ? "bg-green" : limitStav === "oranzova" ? "bg-amber" : "bg-red")}
                style={{ width: `${Math.max(s.obrat.procent, s.obrat.castka > 0 ? 2 : 0)}%` }}
              />
            </div>
            <p className="num text-[13px] text-muted">
              {s.obrat.procent} % z limitu {castka(LIMIT_DPH).replace(",00", "")} za rok {s.obrat.rok}
              {s.obrat.castka >= LIMIT_DPH && <> · nad {castka(LIMIT_DPH_OKAMZITY).replace(",00", "")} se stáváte plátcem hned</>}
            </p>
          </article>
        )}

        {/* Příjmy */}
        <article className={karta + " gap-4 lg:col-span-2"}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold">Příjmy za posledních 6 měsíců</h2>
            <div className="num text-[13px] text-muted">
              Celkem <strong className="text-navy">{castka(s.prijmy.celkem)}</strong>
            </div>
          </div>
          <div className="grid h-[190px] grid-cols-6 items-end gap-2 border-b border-line sm:gap-3.5" role="img" aria-label={`Příjmy po měsících: ${s.prijmy.mesice.map((m) => `${m.celyNazev} ${castka(m.castka)}`).join(", ")}`}>
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

        {/* Rychlé akce */}
        <article className="flex flex-col gap-3 rounded-2xl bg-navy p-5 text-slate-300 sm:p-[22px]">
          <h2 className="text-lg text-white">Rychlé akce</h2>
          <Link href="/faktury/nova" className="flex min-h-12 items-center justify-between rounded-xl bg-green px-4 text-[15px] font-bold text-navy hover:brightness-95">
            Nová faktura <span aria-hidden="true">→</span>
          </Link>
          {[
            ["/faktury/nova?druh=zalohova", "Zálohová faktura"],
            ["/klienti", "Přidat klienta z ARES"],
            ["/faktury/export?rok=" + dnes.slice(0, 4), "Přehled faktur pro účetní"],
          ].map(([href, text]) => (
            <a key={href} href={href} className="flex min-h-12 items-center justify-between rounded-xl bg-white/7 px-4 text-[15px] font-semibold text-white hover:bg-white/12">
              {text} <span aria-hidden="true">→</span>
            </a>
          ))}
        </article>

        {/* Poslední doklady */}
        <article className={karta + " lg:col-span-2"}>
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
                  <Link href={`/faktury/${f.id}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 hover:bg-slate-50">
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

        {/* Končící smlouvy (přibude s krokem 7) */}
        <article className={karta}>
          <h2 className="text-lg font-bold">Končící smlouvy</h2>
          <p className="text-[13px] text-muted">Až budete mít smlouvy v aplikaci, tady uvidíte ty, kterým se blíží konec.</p>
        </article>
      </section>
    </>
  );
}
