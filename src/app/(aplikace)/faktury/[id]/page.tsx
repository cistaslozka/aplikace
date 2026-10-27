import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { FakturaA4 } from "@/components/faktura/FakturaA4";
import { Meritko } from "@/components/faktura/Meritko";
import { StavPill } from "@/components/faktura/StavPill";
import { Hlaska } from "@/components/Formular";
import { castka, datumCz, dnesIso, dnuMezi, dny, NAZVY_DOKLADU, pridatDny } from "@/lib/faktura";
import { aktivniFirma } from "@/lib/firma";
import { dataUlozeneFaktury, nactiFakturu, nactiSouvisejici, nactiUpominky } from "@/lib/faktury";
import { vystavitDdppAkce, vytvoritUpominkuAkce, zmenitStavAkce } from "../actions";
import { TlacitkoTisk } from "./Tisk";

export const metadata: Metadata = { title: "Faktura" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ vystaveno?: string; upraveno?: string; upominka?: string; chyba?: string }> };

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
  const [upominky, souvisejici] = await Promise.all([nactiUpominky(f.id), nactiSouvisejici(f)]);
  const dnes = dnesIso();
  const danovyDoklad = souvisejici.navazane.find((x) => x.kind === "ddpp" && x.status !== "stornovana") ?? null;
  const konecna = souvisejici.navazane.find((x) => x.kind === "faktura" && x.status !== "stornovana") ?? null;
  // Konečnou fakturu lze vystavit k zaplacené záloze; plátce nejdřív potřebuje daňový doklad
  const lzeVyuctovat = f.kind === "zalohova" && f.status === "uhrazena" && !konecna && (!f.vat_payer || !!danovyDoklad);
  // Zálohu s daňovým dokladem a daňový doklad samotný už upravit nejde
  const lzeUpravit = f.status !== "stornovana" && f.kind !== "ddpp" && !danovyDoklad && !konecna;
  const lzeVratit = f.status === "uhrazena" && f.kind !== "ddpp" && !danovyDoklad && !konecna;
  const lhutaDdpp = f.paid_at ? pridatDny(f.paid_at.slice(0, 10), 15) : null;
  const poSplatnosti = f.status === "vystavena" ? -dnuMezi(dnes, f.due_date) : 0;
  const muzeUpominku = poSplatnosti > 0 && upominky.length < 3;

  return (
    <>
      <div className="netisknout flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/faktury" className="text-sm font-semibold text-muted hover:text-navy">
              ← Faktury
            </Link>
            <h1 className="num text-2xl font-extrabold tracking-tight">
              {NAZVY_DOKLADU[f.kind]} {f.number}
            </h1>
            <StavPill status={f.status} splatnost={f.due_date} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Stáhnout doklad" className="flex overflow-hidden rounded-xl border-[1.5px] border-line bg-surface text-sm font-semibold text-navy">
              <span className="flex items-center px-3 text-muted">Stáhnout</span>
              <a href={`/faktury/${f.id}/pdf`} className="flex min-h-11 items-center border-l border-line px-3.5 hover:bg-green-tint">
                PDF
              </a>
              <a href={`/faktury/${f.id}/isdoc`} title="Pro účetní programy (Pohoda, Money, ABRA…)" className="flex min-h-11 items-center border-l border-line px-3.5 hover:bg-green-tint">
                ISDOC
              </a>
              <a href={`/faktury/${f.id}/xlsx`} className="flex min-h-11 items-center border-l border-line px-3.5 hover:bg-green-tint">
                Excel
              </a>
            </div>
            <TlacitkoTisk />
          </div>
        </div>

        {p.vystaveno === "1" && <Hlaska typ="info">{f.kind === "zalohova" ? "Zálohová faktura je vystavená." : "Faktura je vystavená."} Stáhněte ji jako PDF a pošlete odběrateli.</Hlaska>}
        {p.upraveno === "1" && <Hlaska typ="info">Změny jsou uložené.</Hlaska>}
        {p.chyba && <Hlaska typ="chyba">{p.chyba.slice(0, 200)}</Hlaska>}
        {p.upominka === "chyba" && <Hlaska typ="chyba">Upomínku se nepodařilo vytvořit. Zkuste to prosím znovu.</Hlaska>}
        {p.upominka && /^[1-3]$/.test(p.upominka) && (
          <Hlaska typ="info">
            {p.upominka}. upomínka je vytvořená.{" "}
            <a href={`/faktury/${f.id}/upominka/${p.upominka}`} className="font-bold underline">
              Stáhnout PDF
            </a>{" "}
            a pošlete ji odběrateli e-mailem nebo poštou. Aplikace ji zatím sama neposílá.
          </Hlaska>
        )}

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-4">
          <div className="mr-auto text-sm">
            <span className="font-bold text-navy">{f.customer.name}</span>
            <span className="text-muted">
              {" "}
              · <span className="num">{castka(f.total - f.advance_amount)}</span> · splatnost {datumCz(f.due_date)}
              {f.paid_at && <> · uhrazeno {datumCz(f.paid_at)}</>}
            </span>
          </div>
          {lzeUpravit && (
            <Link href={`/faktury/${f.id}/upravit`} className={tlacitko}>
              Upravit
            </Link>
          )}
          {f.status === "vystavena" && (
            <form action={zmenitStavAkce} className="flex items-center gap-2">
              <input type="hidden" name="id" value={f.id} />
              <input type="hidden" name="stav" value="uhrazena" />
              <label className="sr-only" htmlFor="datum-uhrady">
                Datum úhrady
              </label>
              <input
                id="datum-uhrady"
                type="date"
                name="datum"
                defaultValue={dnes}
                max={dnes}
                title="Datum, kdy vám peníze přišly"
                className="num min-h-11 rounded-xl border-[1.5px] border-line bg-surface px-3 text-sm text-navy"
              />
              <button className="min-h-11 rounded-xl bg-navy px-4 text-sm font-semibold text-white hover:bg-navy-2">Označit jako uhrazenou</button>
            </form>
          )}
          {lzeVratit && (
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

        {f.kind === "zalohova" && f.vat_payer && f.status !== "stornovana" && (
          <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4" aria-label="Daňový doklad k přijaté platbě">
            <h2 className="text-base font-bold">Daňový doklad k přijaté platbě</h2>
            {danovyDoklad ? (
              <p className="text-sm">
                Vystaven{" "}
                <Link href={`/faktury/${danovyDoklad.id}`} className="num font-semibold text-green-ink hover:underline">
                  daňový doklad {danovyDoklad.number}
                </Link>{" "}
                ({datumCz(danovyDoklad.issue_date)}).
              </p>
            ) : f.status === "vystavena" ? (
              <p className="text-sm text-muted">
                Až vám odběratel zálohu zaplatí, označte ji jako uhrazenou. Pak tu vystavíte daňový doklad. Jako plátce DPH ho musíte vystavit do 15 dnů
                od přijetí platby.
              </p>
            ) : (
              <>
                <p className={"text-sm " + (lhutaDdpp && lhutaDdpp < dnes ? "text-red" : "text-ink")}>
                  Záloha je zaplacená. Daňový doklad vystavte nejpozději <strong className="num">{lhutaDdpp ? datumCz(lhutaDdpp) : "do 15 dnů"}</strong>
                  {lhutaDdpp && lhutaDdpp < dnes ? " – lhůta už uplynula, vystavte ho co nejdříve." : "."}
                </p>
                <form action={vystavitDdppAkce} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={f.id} />
                  <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted" htmlFor="datum-platby">
                    Datum přijetí platby
                    <input
                      id="datum-platby"
                      type="date"
                      name="datum"
                      required
                      defaultValue={f.paid_at?.slice(0, 10) ?? dnes}
                      max={dnes}
                      className="num min-h-11 rounded-xl border-[1.5px] border-line bg-surface px-3 text-sm font-normal text-navy"
                    />
                  </label>
                  <button className="min-h-11 rounded-xl bg-green px-4 text-sm font-bold text-navy hover:brightness-95">Vystavit daňový doklad</button>
                </form>
              </>
            )}
          </section>
        )}

        {f.kind === "zalohova" && f.status === "uhrazena" && (konecna || lzeVyuctovat) && (
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4" aria-label="Vyúčtování zálohy">
            <div className="text-sm">
              <h2 className="text-base font-bold">Vyúčtování zálohy</h2>
              {konecna ? (
                <p>
                  Záloha je vyúčtovaná na{" "}
                  <Link href={`/faktury/${konecna.id}`} className="num font-semibold text-green-ink hover:underline">
                    faktuře {konecna.number}
                  </Link>
                  .
                </p>
              ) : (
                <p className="text-muted">Až práci dokončíte, vystavte konečnou fakturu. Zaplacená záloha se na ní odečte.</p>
              )}
            </div>
            {lzeVyuctovat && (
              <Link href={`/faktury/nova?zaloha=${f.id}`} className="inline-flex min-h-11 items-center rounded-xl bg-green px-4 text-sm font-bold text-navy hover:brightness-95">
                Vystavit konečnou fakturu
              </Link>
            )}
          </section>
        )}

        {f.kind === "faktura" && souvisejici.zaloha && (
          <p className="text-sm text-muted">
            Konečná faktura k{" "}
            <Link href={`/faktury/${souvisejici.zaloha.id}`} className="num font-semibold text-green-ink hover:underline">
              zálohové faktuře {souvisejici.zaloha.number}
            </Link>
            . Zaplacená záloha je odečtená.
          </p>
        )}

        {f.kind === "ddpp" && souvisejici.zaloha && (
          <p className="text-sm text-muted">
            Patří k{" "}
            <Link href={`/faktury/${souvisejici.zaloha.id}`} className="num font-semibold text-green-ink hover:underline">
              zálohové faktuře {souvisejici.zaloha.number}
            </Link>
            . Daňový doklad nejde upravit. Když je v něm chyba, stornujte ho a vystavte nový.
          </p>
        )}

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
              <p className="text-[13px] text-muted">Vytvořili jste všechny 3 upomínky. Pokud faktura zůstane neuhrazená, další krok je vymáhání pohledávky.</p>
            )}
          </section>
        )}
      </div>

      <div className="tisk-oblast mx-auto w-full max-w-[860px] rounded-2xl bg-slate-200/70 p-3 sm:p-6 print:max-w-none print:rounded-none print:bg-transparent print:p-0">
        <div className="shadow-[0_18px_40px_-18px_rgba(15,37,55,0.35)] print:shadow-none">
          <Meritko>
            <FakturaA4 d={dataUlozeneFaktury(f, n.polozky, n.zalohaCislo)} />
          </Meritko>
        </div>
      </div>
    </>
  );
}
