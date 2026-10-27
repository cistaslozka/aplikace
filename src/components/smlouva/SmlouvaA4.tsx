import { datumCz } from "@/lib/faktura";
import { DRUHY_SMLUV, malym, popisStrany, role, type Clanek, type DataSmlouvy } from "@/lib/smlouvy";
import { VZORY } from "@/lib/smlouvy/vzory";

/*
  Smlouva na obrazovce (náhled v editoru a detail). Šířka A4, výška podle obsahu.
  Rozvržení odpovídá PDF v SmlouvaPdf.tsx – když měníš jedno, uprav i druhé.
*/

const RIMSKA = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

const V = {
  minimal: { hlava: "border-b border-line pb-6 text-navy", nadpis: "font-display text-[30px] font-extrabold tracking-tight", clanek: "text-navy" },
  corporate: { hlava: "-mx-[56px] -mt-[56px] mb-2 bg-navy px-[56px] pt-[44px] pb-[30px] text-white", nadpis: "text-[22px] font-bold tracking-[0.12em] uppercase", clanek: "text-navy" },
  creative: { hlava: "-mx-[56px] -mt-[56px] mb-2 border-b-[6px] border-green bg-green-tint px-[56px] pt-[48px] pb-[28px] text-navy", nadpis: "font-display text-[34px] font-extrabold tracking-tight text-green-ink", clanek: "text-green-ink" },
} as const;

function Strana({ s, role: r }: { s: DataSmlouvy["my"] | null; role: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      {s ? (
        popisStrany(s).map((radek, i) => (
          <div key={i} className={i === 0 ? "text-[13px] font-bold text-navy" : ""}>
            {radek}
          </div>
        ))
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 px-3 py-3 text-muted">Vyberte druhou smluvní stranu</div>
      )}
      <div className="mt-1 text-muted">(dále jen „{malym(r)}“)</div>
    </div>
  );
}

export function SmlouvaA4({ d, clanky }: { d: DataSmlouvy; clanky: Clanek[] }) {
  const v = V[d.vzhled];
  const r = role(d);
  const zastupce = (k: string) => (typeof d.pole[k] === "string" ? (d.pole[k] as string).trim() : "");
  // strana, která dodává (zhotovitel), je v záhlaví vždy první
  const strany = d.myDodavame
    ? [
        { s: d.my, r: r.my, z: zastupce("zastupce_my") },
        { s: d.oni, r: r.oni, z: zastupce("zastupce_oni") },
      ]
    : [
        { s: d.oni, r: r.oni, z: zastupce("zastupce_oni") },
        { s: d.my, r: r.my, z: zastupce("zastupce_my") },
      ];

  return (
    <article className="smlouva-a4 relative min-h-[1123px] w-[794px] bg-white p-[56px] font-sans text-[12.5px] leading-[1.6] text-slate-800" aria-label={`${d.nazev} ${d.cislo}`}>
      <header className={v.hlava}>
        <div className={v.nadpis}>{d.nazev}</div>
        <div className="num mt-1.5 text-[12px] opacity-80">
          č. {d.cislo}
          {VZORY[d.druh]?.podtitul && ` · ${VZORY[d.druh]!.podtitul}`}
        </div>
      </header>

      <section className="mt-6 flex flex-col gap-4">
        <div className={"text-[11px] font-bold tracking-[0.08em] uppercase " + v.clanek}>{d.druh === "predavaci" ? "Strany" : "Smluvní strany"}</div>
        {strany.map((x, i) => (
          <div key={i} className="grid grid-cols-[110px_1fr] gap-3">
            <div className="font-semibold text-navy">{x.r}</div>
            <div>
              <Strana s={x.s} role={x.r} />
              {x.z && <div className="mt-0.5">zastoupen(a): {x.z}</div>}
            </div>
          </div>
        ))}
        <p>{VZORY[d.druh]?.uvod ?? "uzavírají tuto smlouvu:"}</p>
      </section>

      {clanky.map((c, i) => (
        <section key={i} className="mt-6 break-inside-avoid-page">
          <h3 className={"text-center text-[13px] font-bold " + v.clanek}>
            Článek {RIMSKA[i] ?? i + 1}.
            <br />
            {c.nadpis}
          </h3>
          <ol className="mt-2 flex flex-col gap-1.5">
            {c.odstavce.map((o, j) => (
              <li key={j} className="grid grid-cols-[24px_1fr]">
                <span className="num text-muted">{j + 1}.</span>
                <span className="whitespace-pre-line">{o}</span>
              </li>
            ))}
          </ol>
        </section>
      ))}

      <section className="mt-10 grid grid-cols-2 gap-10 break-inside-avoid-page">
        {strany.map((x, i) => (
          <div key={i}>
            <div>
              V {d.misto || "…………………"} dne {d.datum ? datumCz(d.datum) : "…………………"}
            </div>
            <div className="mt-14 border-t border-slate-400 pt-1.5">
              <div className="font-semibold text-navy">{x.r}</div>
              <div className="text-muted">{x.s?.name ?? ""}</div>
              {x.z && <div className="text-muted">{x.z}</div>}
            </div>
          </div>
        ))}
      </section>

      <footer className="mt-10 border-t border-line pt-3 text-[9.5px] text-muted">
        {DRUHY_SMLUV[d.druh].nazev} č. {d.cislo} · Vytvořeno v systému čistásložka.cz
      </footer>
    </article>
  );
}
