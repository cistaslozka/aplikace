import { dnuMezi, naHalere, type DruhDokladu, type Rekapitulace, type StavFaktury } from "./faktura";

/*
  Čísla pro domovskou stránku (Přehled). Čistá funkce bez databáze, aby šla snadno otestovat.
  Pravidla:
  - „K úhradě" u konečné faktury = celkem minus odečtená záloha.
  - Příjmy = peníze, které skutečně přišly (podle data úhrady): zaplacené zálohy a doplatky faktur.
    Daňový doklad k platbě se nepočítá, peníze za něj už jsou v záloze.
  - Obrat pro limit DPH (neplátce) = vystavené faktury v kalendářním roce, bez storna a bez záloh.
  - DPH na výstupu (plátce) = DPH z faktur a daňových dokladů k platbě podle DUZP v měsíci,
    u konečné faktury bez DPH, která už byla v daňovém dokladu k záloze.
*/

export const LIMIT_DPH = 2_000_000;
export const LIMIT_DPH_OKAMZITY = 2_536_500;

export type DokladPrehledu = {
  id: string;
  kind: DruhDokladu;
  number: string;
  customer: { name: string };
  issue_date: string;
  taxable_date: string | null;
  due_date: string;
  status: StavFaktury;
  paid_at: string | null;
  total: number;
  vat_total: number;
  advance_amount: number;
  advance_recap: Rekapitulace[];
  created_at: string;
};

const MESICE = ["leden", "únor", "březen", "duben", "květen", "červen", "červenec", "srpen", "září", "říjen", "listopad", "prosinec"];
const MESICE_KRATCE = ["led", "úno", "bře", "dub", "kvě", "čvn", "čvc", "srp", "zář", "říj", "lis", "pro"];

export const kUhrade = (f: Pick<DokladPrehledu, "total" | "advance_amount">) => naHalere(f.total - f.advance_amount);

export function spocitejPrehled(doklady: DokladPrehledu[], dnes: string) {
  const rok = dnes.slice(0, 4);
  const mesic = dnes.slice(0, 7);
  const platne = doklady.filter((f) => f.status !== "stornovana");

  // Čeká na úhradu: faktury a zálohy (daňový doklad je vždy uhrazený)
  const neuhrazene = platne.filter((f) => f.status === "vystavena" && f.kind !== "ddpp");
  const poSplatnosti = neuhrazene.filter((f) => f.due_date < dnes);
  const nejblizsi = neuhrazene
    .filter((f) => f.due_date >= dnes)
    .map((f) => f.due_date)
    .sort()[0];

  // Příjmy po měsících (posledních 6 včetně aktuálního)
  const [r, m] = dnes.split("-").map(Number);
  const mesice = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(r, m - 1 - (5 - i), 1));
    const klic = d.toISOString().slice(0, 7);
    return { klic, nazev: MESICE_KRATCE[d.getUTCMonth()], celyNazev: MESICE[d.getUTCMonth()], castka: 0 };
  });
  for (const f of platne) {
    if (f.status !== "uhrazena" || !f.paid_at || f.kind === "ddpp") continue;
    const mes = mesice.find((x) => x.klic === f.paid_at!.slice(0, 7));
    if (mes) mes.castka = naHalere(mes.castka + kUhrade(f));
  }

  // Obrat za rok (pro neplátce: hlídání limitu DPH)
  const obrat = naHalere(platne.filter((f) => f.kind === "faktura" && f.issue_date.startsWith(rok)).reduce((s, f) => s + f.total, 0));

  // DPH na výstupu za aktuální měsíc (pro plátce)
  const dph = naHalere(
    platne
      .filter((f) => (f.kind === "faktura" || f.kind === "ddpp") && (f.taxable_date ?? f.issue_date).startsWith(mesic))
      .reduce((s, f) => s + f.vat_total - f.advance_recap.reduce((a, x) => a + x.vat, 0), 0),
  );

  const soucet = (xs: DokladPrehledu[]) => naHalere(xs.reduce((s, f) => s + kUhrade(f), 0));

  return {
    neuhrazeno: { castka: soucet(neuhrazene), pocet: neuhrazene.length, nejblizsiSplatnost: nejblizsi ?? null },
    poSplatnosti: {
      castka: soucet(poSplatnosti),
      pocet: poSplatnosti.length,
      nejstarsiDni: poSplatnosti.length ? Math.max(...poSplatnosti.map((f) => dnuMezi(f.due_date, dnes))) : 0,
    },
    prijmy: { mesice, celkem: naHalere(mesice.reduce((s, x) => s + x.castka, 0)) },
    obrat: { castka: obrat, rok, procent: Math.min(100, Math.round((obrat / LIMIT_DPH) * 100)) },
    dph: { castka: dph, mesic: MESICE[m - 1] },
    posledni: [...doklady].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5),
  };
}
