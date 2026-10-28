import "server-only";
import ExcelJS from "exceljs";
import {
  NAZVY_DOKLADU,
  STAVY,
  type DruhDokladu,
  ZPUSOBY_UHRADY,
  zakladPolozky,
  naHalere,
  type Polozka,
  type Rekapitulace,
  type StavFaktury,
  type Strana,
  type ZpusobUhrady,
} from "./faktura";
import { formatujIban } from "./validace";

// Barvy z globals.css (ARGB)
const NAVY = "FF0F2537";
const TINT = "FFECFDF5";
const LINE = "FFE2E8F0";
const MUTED = "FF64748B";
const KC = '#,##0.00 "Kč"';
const DATUM = "d. m. yyyy";

/** "2026-10-27" → Date v poledne UTC, aby se v Excelu v žádném časovém pásmu neposunul den. */
const datum = (iso: string | null | undefined) => (iso ? new Date(`${iso}T12:00:00Z`) : null);

function sesit(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = "čistásložka.cz";
  wb.created = new Date();
  return wb;
}

function hlavickaTabulky(radek: ExcelJS.Row) {
  radek.font = { bold: true, color: { argb: NAVY } };
  radek.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TINT } };
    c.border = { bottom: { style: "thin", color: { argb: NAVY } } };
    c.alignment = { vertical: "middle", wrapText: true };
  });
  radek.height = 22;
}

const adresa = (s: Strana) =>
  [s.street, [s.zip, s.city].filter(Boolean).join(" "), s.country && s.country !== "CZ" ? s.country : null].filter(Boolean).join(", ");

export type DataXlsx = {
  druh?: DruhDokladu;
  cislo: string;
  vs: string;
  dodavatel: Strana;
  odberatel: Strana;
  vystaveno: string;
  duzp: string | null;
  splatnost: string;
  uhrada: ZpusobUhrady;
  platce: boolean;
  polozky: Polozka[];
  rekapitulace: Rekapitulace[];
  zaklad: number;
  dph: number;
  celkem: number;
  poznamka?: string | null;
  uvod?: string | null;
  stav: StavFaktury;
  odpocet?: { cislo: string; castka: number } | null;
  /** Dobropis: opravovaná faktura */
  oprava?: { cislo: string; vystaveno: string; duvod?: string | null } | null;
};

/** Jedna faktura jako list v Excelu. */
export async function fakturaXlsx(d: DataXlsx): Promise<Buffer> {
  const wb = sesit();
  const nazev = NAZVY_DOKLADU[d.druh ?? "faktura"];
  const dobropis = d.druh === "dobropis";
  const ws = wb.addWorksheet(`${d.druh === "zalohova" ? "Záloha" : dobropis ? "Dobropis" : "Faktura"} ${d.cislo}`, {
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  ws.columns = [{ width: 42 }, { width: 11 }, { width: 9 }, { width: 16 }, { width: 8 }, { width: 16 }, { width: 14 }, { width: 16 }];

  const nadpis = ws.addRow([`${nazev} ${d.cislo}`]);
  nadpis.font = { bold: true, size: 18, color: { argb: NAVY } };
  ws.addRow([
    d.druh === "zalohova"
      ? "Není daňový doklad."
      : dobropis
        ? `${d.platce ? "Opravný daňový doklad" : "Opravný doklad"}${d.oprava ? ` k faktuře č. ${d.oprava.cislo} ze dne ${d.oprava.vystaveno.split("-").reverse().map(Number).join(". ")}` : ""}`
        : d.platce
          ? "Daňový doklad"
          : "Nejsem plátce DPH.",
  ]).font = { color: { argb: MUTED } };
  if (dobropis && d.oprava?.duvod) ws.addRow([`Důvod opravy: ${d.oprava.duvod}`]);
  if (d.stav !== "vystavena")
    ws.addRow([dobropis && d.stav === "uhrazena" ? "Vypořádáno" : STAVY[d.stav]]).font = { bold: true, color: { argb: NAVY } };
  ws.addRow([]);

  const strany = ws.addRow(["Dodavatel", "", "", "Odběratel"]);
  strany.font = { bold: true, color: { argb: MUTED }, size: 9 };
  const radkyStran: [string, string][] = [
    [d.dodavatel.name, d.odberatel.name],
    [adresa(d.dodavatel), adresa(d.odberatel)],
    [d.dodavatel.ico ? `IČO ${d.dodavatel.ico}` : "", d.odberatel.ico ? `IČO ${d.odberatel.ico}` : ""],
    [d.dodavatel.dic ? `DIČ ${d.dodavatel.dic}` : "", d.odberatel.dic ? `DIČ ${d.odberatel.dic}` : ""],
  ];
  radkyStran.forEach(([a, b], i) => {
    const r = ws.addRow([a, "", "", b]);
    if (i === 0) r.font = { bold: true };
  });
  if (d.dodavatel.registry_note) ws.addRow([d.dodavatel.registry_note]).font = { size: 9, color: { argb: MUTED } };
  ws.addRow([]);

  const udaje: [string, string | Date | null][] = [
    ["Datum vystavení", datum(d.vystaveno)],
    ...(d.platce && d.druh !== "zalohova"
      ? ([[dobropis ? "Datum opravy" : "Datum zdanitelného plnění", datum(d.duzp ?? d.vystaveno)]] as [string, Date | null][])
      : []),
    ["Datum splatnosti", datum(d.splatnost)],
    ["Způsob úhrady", ZPUSOBY_UHRADY[d.uhrada]],
    ["Variabilní symbol", d.vs],
    ...(!dobropis && d.uhrada === "prevod" && d.dodavatel.bank_account
      ? ([["Číslo účtu", d.dodavatel.bank_account]] as [string, string][])
      : []),
    ...(!dobropis && d.uhrada === "prevod" && d.dodavatel.iban ? ([["IBAN", formatujIban(d.dodavatel.iban)]] as [string, string][]) : []),
  ];
  for (const [k, v] of udaje) {
    const r = ws.addRow([k, v]);
    r.getCell(1).font = { color: { argb: MUTED } };
    if (v instanceof Date) r.getCell(2).numFmt = DATUM;
    r.getCell(2).alignment = { horizontal: "left" };
  }
  ws.addRow([]);
  if (d.uvod) ws.addRow([d.uvod]);

  const hlava = d.platce
    ? ["Položka", "Množství", "Jednotka", "Cena bez DPH", "DPH %", "Základ", "DPH", "Celkem"]
    : ["Položka", "Množství", "Jednotka", "Cena za jednotku", "", "Celkem"];
  hlavickaTabulky(ws.addRow(hlava));
  for (const p of d.polozky) {
    const zaklad = zakladPolozky(p);
    const dan = d.platce ? naHalere((zaklad * p.vat_rate) / 100) : 0;
    const r = ws.addRow(
      d.platce
        ? [p.description, p.quantity, p.unit, p.unit_price, p.vat_rate / 100, zaklad, dan, naHalere(zaklad + dan)]
        : [p.description, p.quantity, p.unit, p.unit_price, null, zaklad],
    );
    r.getCell(1).alignment = { wrapText: true, vertical: "top" };
    r.getCell(4).numFmt = KC;
    r.getCell(5).numFmt = "0 %";
    [6, 7, 8].forEach((i) => (r.getCell(i).numFmt = KC));
    r.eachCell((c) => (c.border = { bottom: { style: "hair", color: { argb: LINE } } }));
  }
  ws.addRow([]);

  if (d.platce) {
    hlavickaTabulky(ws.addRow(["Rekapitulace DPH", "", "", "", "Sazba", "Základ", "DPH", "Celkem"]));
    for (const x of d.rekapitulace) {
      const r = ws.addRow(["", "", "", "", x.rate / 100, x.base, x.vat, naHalere(x.base + x.vat)]);
      r.getCell(5).numFmt = "0 %";
      [6, 7, 8].forEach((i) => (r.getCell(i).numFmt = KC));
    }
    ws.addRow([]);
  }

  const sloupecCelkem = d.platce ? 8 : 6;
  const radekCastky = (popis: string, castkaRadku: number) => {
    const r = ws.addRow([popis]);
    r.getCell(sloupecCelkem).value = castkaRadku;
    r.getCell(sloupecCelkem).numFmt = KC;
    return r;
  };
  if (d.odpocet) {
    radekCastky("Celkem za fakturu", d.celkem);
    radekCastky(`Uhrazeno zálohou ${d.odpocet.cislo}`, -d.odpocet.castka);
  }
  const celkem = d.odpocet
    ? radekCastky("Zbývá uhradit", naHalere(d.celkem - d.odpocet.castka))
    : d.platce
      ? ws.addRow([dobropis ? "Celkem snížení" : "Celkem k úhradě", "", "", "", "", d.zaklad, d.dph, d.celkem])
      : ws.addRow([dobropis ? "Celkem snížení" : "Celkem k úhradě", "", "", "", "", d.celkem]);
  celkem.font = { bold: true, size: 12, color: { argb: NAVY } };
  [6, 7, 8].forEach((i) => (celkem.getCell(i).numFmt = KC));
  if (d.poznamka) {
    ws.addRow([]);
    ws.addRow([d.poznamka]);
  }
  ws.addRow([]);
  ws.addRow(["Vystaveno v systému čistásložka.cz"]).font = { size: 9, color: { argb: MUTED } };

  return Buffer.from(await wb.xlsx.writeBuffer());
}

export type RadekPrehledu = {
  druh: DruhDokladu;
  cislo: string;
  vs: string;
  vystaveno: string;
  duzp: string | null;
  splatnost: string;
  odberatel: Strana;
  zaklad: number;
  dph: number;
  celkem: number;
  stav: StavFaktury;
  uhrazeno: string | null;
  uhrada: ZpusobUhrady;
};

/** Přehled faktur pro účetní: jeden řádek = jedna faktura, se součty a filtrem. */
export async function prehledFakturXlsx(radky: RadekPrehledu[], nazev: string): Promise<Buffer> {
  const wb = sesit();
  const ws = wb.addWorksheet("Faktury", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = [
    { header: "Doklad", key: "druh", width: 16 },
    { header: "Číslo", key: "cislo", width: 13 },
    { header: "Vystaveno", key: "vystaveno", width: 12, style: { numFmt: DATUM } },
    { header: "DUZP", key: "duzp", width: 12, style: { numFmt: DATUM } },
    { header: "Splatnost", key: "splatnost", width: 12, style: { numFmt: DATUM } },
    { header: "Odběratel", key: "odberatel", width: 36 },
    { header: "IČO", key: "ico", width: 11 },
    { header: "DIČ", key: "dic", width: 14 },
    { header: "Základ", key: "zaklad", width: 15, style: { numFmt: KC } },
    { header: "DPH", key: "dph", width: 13, style: { numFmt: KC } },
    { header: "Celkem", key: "celkem", width: 15, style: { numFmt: KC } },
    { header: "Stav", key: "stav", width: 13 },
    { header: "Uhrazeno", key: "uhrazeno", width: 12, style: { numFmt: DATUM } },
    { header: "Úhrada", key: "uhrada", width: 18 },
    { header: "Var. symbol", key: "vs", width: 12 },
  ];
  hlavickaTabulky(ws.getRow(1));
  for (const f of radky) {
    // Stornované faktury jsou v přehledu, ale s nulovými částkami, aby nezkreslovaly součty
    const storno = f.stav === "stornovana";
    ws.addRow({
      druh: NAZVY_DOKLADU[f.druh],
      cislo: f.cislo,
      vystaveno: datum(f.vystaveno),
      duzp: datum(f.duzp),
      splatnost: datum(f.splatnost),
      odberatel: f.odberatel.name,
      ico: f.odberatel.ico ?? "",
      dic: f.odberatel.dic ?? "",
      zaklad: storno ? 0 : f.zaklad,
      dph: storno ? 0 : f.dph,
      celkem: storno ? 0 : f.celkem,
      stav: STAVY[f.stav],
      uhrazeno: datum(f.uhrazeno),
      uhrada: ZPUSOBY_UHRADY[f.uhrada],
      vs: f.vs,
    });
  }
  const posledni = ws.rowCount;
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: posledni, column: 15 } };
  if (radky.length) {
    const soucet = ws.addRow({ druh: "Celkem" });
    for (const [klic, sloupec] of [
      ["zaklad", "I"],
      ["dph", "J"],
      ["celkem", "K"],
    ] as const) {
      const c = soucet.getCell(klic);
      c.value = {
        formula: `SUBTOTAL(9,${sloupec}2:${sloupec}${posledni})`,
        result: radky.reduce((s, f) => s + (f.stav === "stornovana" ? 0 : f[klic]), 0),
      };
      c.numFmt = KC;
    }
    soucet.font = { bold: true, color: { argb: NAVY } };
    soucet.eachCell((c) => (c.border = { top: { style: "thin", color: { argb: NAVY } } }));
  }
  ws.headerFooter = { oddHeader: `&L${nazev}&Rčistásložka.cz` };
  return Buffer.from(await wb.xlsx.writeBuffer());
}
