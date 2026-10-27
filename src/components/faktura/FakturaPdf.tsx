import "server-only";
import path from "node:path";
import { Document, Font, Image, Page, Path, StyleSheet, Svg, Text, View, renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { castka, datumCz, mnozstvi, qrPlatba, zakladPolozky, ZPUSOBY_UHRADY, type Strana } from "@/lib/faktura";
import { formatujIban } from "@/lib/validace";
import type { DataFaktury } from "./FakturaA4";

/*
  Faktura jako skutečné PDF (A4). Rozvržení odpovídá komponentě FakturaA4 (náhled na obrazovce):
  rozměry jsou převedené z px na body (× 0,75), barvy jsou tokeny z globals.css.
*/

const B = {
  navy: "#0f2537",
  green: "#10b981",
  greenInk: "#047857",
  greenSoft: "#a7f3d0",
  greenTint: "#ecfdf5",
  line: "#e2e8f0",
  ink: "#334155",
  muted: "#64748b",
  red: "#b91c1c",
  white: "#ffffff",
  slate50: "#f8fafc",
  slate300: "#cbd5e1",
  slate600: "#475569",
  slate800: "#1e293b",
};

let pismaRegistrovana = false;
function registrovatPisma() {
  if (pismaRegistrovana) return;
  const p = (f: string) => path.join(process.cwd(), "src/fonts", f);
  Font.register({
    family: "Inter",
    fonts: [
      { src: p("Inter-Regular.ttf"), fontWeight: 400 },
      { src: p("Inter-SemiBold.ttf"), fontWeight: 600 },
      { src: p("Inter-Bold.ttf"), fontWeight: 700 },
    ],
  });
  Font.register({ family: "Jakarta", src: p("PlusJakartaSans-ExtraBold.ttf"), fontWeight: 800 });
  // Česká slova nedělit spojovníkem
  Font.registerHyphenationCallback((slovo) => [slovo]);
  pismaRegistrovana = true;
}

const s = StyleSheet.create({
  page: { fontFamily: "Inter", fontSize: 9, lineHeight: 1.5, color: B.slate800, backgroundColor: B.white },
  telo: { paddingHorizontal: 33, paddingVertical: 19.5, flexGrow: 1, gap: 15 },
  bold: { fontWeight: 700 },
  semi: { fontWeight: 600 },
  muted: { color: B.muted },
  radek: { flexDirection: "row" },
  sloupec2: { flexDirection: "row", gap: 24 },
  pul: { flex: 1 },
  jmeno: { fontSize: 9.75, fontWeight: 700, color: B.navy },
  tab: { fontSize: 8.6 },
  bunka: { paddingVertical: 6, paddingHorizontal: 6 },
  vpravo: { textAlign: "right" },
  paticka: { borderTopWidth: 0.75, borderTopColor: B.line, paddingHorizontal: 33, paddingVertical: 9, fontSize: 7.1, color: B.muted },
});

const V = {
  minimal: {
    hlavicka: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 33, paddingTop: 33, paddingBottom: 16.5, borderBottomWidth: 0.75, borderBottomColor: B.line, color: B.navy },
    nadpis: { fontFamily: "Jakarta", fontWeight: 800, fontSize: 25.5, lineHeight: 1, color: B.navy },
    podnadpis: { marginTop: 4.5, fontSize: 9, color: B.muted },
    stitek: { fontSize: 7.1, fontWeight: 700, letterSpacing: 0.6, color: B.muted, marginBottom: 2 },
    pruh: { flexDirection: "row", gap: 9, borderTopWidth: 0.75, borderBottomWidth: 0.75, borderColor: B.line, paddingVertical: 9 },
    hlavaTabulky: { borderBottomWidth: 1.1, borderBottomColor: B.navy, color: B.navy },
    celkem: { alignItems: "flex-end", color: B.navy },
  },
  corporate: {
    hlavicka: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: B.navy, paddingHorizontal: 33, paddingVertical: 22.5, color: B.white },
    nadpis: { fontFamily: "Inter", fontWeight: 700, fontSize: 18, letterSpacing: 2.2, lineHeight: 1, color: B.white },
    podnadpis: { marginTop: 6, fontSize: 9, color: B.slate300 },
    stitek: { fontSize: 7.1, fontWeight: 700, letterSpacing: 0.6, color: B.navy, marginBottom: 2 },
    pruh: { flexDirection: "row", gap: 9, borderWidth: 0.75, borderColor: B.slate300, backgroundColor: B.slate50, paddingHorizontal: 9, paddingVertical: 7.5 },
    hlavaTabulky: { backgroundColor: B.line, color: B.navy },
    celkem: { alignItems: "flex-end", backgroundColor: B.navy, color: B.white, borderRadius: 3, paddingHorizontal: 12, paddingVertical: 9 },
  },
  creative: {
    hlavicka: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", backgroundColor: B.greenTint, borderBottomWidth: 4.5, borderBottomColor: B.green, paddingHorizontal: 33, paddingTop: 33, paddingBottom: 19.5, color: B.navy },
    nadpis: { fontFamily: "Jakarta", fontWeight: 800, fontSize: 31.5, lineHeight: 1, color: B.greenInk },
    podnadpis: { marginTop: 6, fontSize: 9, color: B.navy },
    stitek: { fontSize: 7.1, fontWeight: 700, letterSpacing: 0.6, color: B.greenInk, marginBottom: 2 },
    pruh: { flexDirection: "row", gap: 9, backgroundColor: B.slate50, borderRadius: 6, paddingHorizontal: 9, paddingVertical: 9 },
    hlavaTabulky: { borderBottomWidth: 1.1, borderBottomColor: B.green, color: B.greenInk },
    celkem: { alignItems: "flex-end", backgroundColor: B.greenSoft, color: B.navy, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 9 },
  },
} as const;

function Adresa({ x }: { x: Strana }) {
  const obec = [x.zip, x.city].filter(Boolean).join(" ");
  return (
    <>
      {x.street ? <Text>{x.street}</Text> : null}
      {obec ? <Text>{obec}</Text> : null}
      {x.country && x.country !== "CZ" ? <Text>{x.country}</Text> : null}
    </>
  );
}

function Qr({ text, velikost }: { text: string; velikost: number }) {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const d: string[] = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.modules.get(r, c)) d.push(`M${c + 2} ${r + 2}h1v1h-1z`);
  return (
    <Svg width={velikost} height={velikost} viewBox={`0 0 ${n + 4} ${n + 4}`}>
      <Path d={d.join("")} fill={B.navy} />
    </Svg>
  );
}

function Logo({ src, vyska = 42 }: { src: string; vyska?: number }) {
  return (
    <View style={{ backgroundColor: B.white, borderRadius: 4, padding: 3 }}>
      {/* eslint-disable-next-line jsx-a11y/alt-text -- Image v PDF nemá alt */}
      <Image src={src} style={{ maxHeight: vyska, maxWidth: 128, objectFit: "contain" }} />
    </View>
  );
}

const STITKY = (text: string) => text.toUpperCase();

function FakturaDokument({ d }: { d: DataFaktury }) {
  const v = V[d.vzhled];
  const iban = d.dodavatel.iban ? formatujIban(d.dodavatel.iban) : null;
  const prevod = d.uhrada === "prevod";
  const qr =
    prevod && d.dodavatel.iban && d.celkem > 0 && d.stav !== "stornovana" && d.stav !== "uhrazena"
      ? qrPlatba({ iban: d.dodavatel.iban, castka: d.celkem, vs: d.vs, splatnost: d.splatnost, zprava: `Faktura ${d.cislo}` })
      : null;
  const logo = d.logo && d.logoPozice ? d.logoPozice : null;
  const tabSloupce = d.platce ? ["44%", "13%", "17%", "9%", "17%"] : ["50%", "15%", "17.5%", "17.5%"];
  const paticka = [d.dodavatel.registry_note, d.platce ? null : "Nejsem plátce DPH.", "Vystaveno v systému čistásložka.cz."]
    .filter(Boolean)
    .map((t) => String(t).trim().replace(/[.\s]*$/, "."))
    .join(" ");

  return (
    <Document title={`Faktura ${d.cislo}`} author={d.dodavatel.name} creator="čistásložka.cz" producer="čistásložka.cz" language="cs">
      <Page size="A4" style={s.page}>
        {d.stav === "stornovana" && (
          <View fixed style={{ position: "absolute", top: 360, left: 0, right: 0, alignItems: "center" }}>
            <Text style={{ transform: "rotate(-24deg)", fontFamily: "Jakarta", fontWeight: 800, fontSize: 66, letterSpacing: 6, color: B.red, opacity: 0.4, borderWidth: 4.5, borderColor: B.red, borderRadius: 9, paddingHorizontal: 30, paddingVertical: 6 }}>
              STORNO
            </Text>
          </View>
        )}

        <View style={v.hlavicka}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {logo === "vlevo" && <Logo src={d.logo!} />}
            <View>
              <Text style={v.nadpis}>{d.vzhled === "corporate" ? "FAKTURA" : "Faktura"}</Text>
              <Text style={v.podnadpis}>
                č. {d.cislo}
                {d.platce ? " · daňový doklad" : ""}
              </Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end", gap: 6 }}>
            {logo === "vpravo" && <Logo src={d.logo!} />}
            <Text style={{ fontSize: 9.75, fontWeight: 700, textAlign: "right" }}>{d.dodavatel.name}</Text>
            {d.dodavatel.web ? <Text style={{ fontSize: 8.25, opacity: 0.8 }}>{d.dodavatel.web}</Text> : null}
          </View>
        </View>

        <View style={s.telo}>
          <View style={s.sloupec2}>
            <View style={s.pul}>
              <Text style={v.stitek}>{STITKY("Dodavatel")}</Text>
              <Text style={s.jmeno}>{d.dodavatel.name}</Text>
              <Adresa x={d.dodavatel} />
              <Text style={{ marginTop: 3 }}>
                {[d.dodavatel.ico && `IČO ${d.dodavatel.ico}`, d.dodavatel.dic && `DIČ ${d.dodavatel.dic}`].filter(Boolean).join(" · ")}
              </Text>
              {!d.platce && <Text style={s.semi}>Nejsem plátce DPH.</Text>}
              {d.dodavatel.email || d.dodavatel.phone ? (
                <Text style={{ marginTop: 3, fontSize: 8.25, color: B.slate600 }}>{[d.dodavatel.email, d.dodavatel.phone].filter(Boolean).join(" · ")}</Text>
              ) : null}
            </View>
            <View style={s.pul}>
              <Text style={v.stitek}>{STITKY("Odběratel")}</Text>
              {d.odberatel ? (
                <>
                  <Text style={s.jmeno}>{d.odberatel.name}</Text>
                  <Adresa x={d.odberatel} />
                  <Text style={{ marginTop: 3 }}>
                    {[d.odberatel.ico && `IČO ${d.odberatel.ico}`, d.odberatel.dic && `DIČ ${d.odberatel.dic}`].filter(Boolean).join(" · ")}
                  </Text>
                </>
              ) : null}
            </View>
          </View>

          <View style={v.pruh}>
            <View style={s.pul}>
              <Text style={v.stitek}>VYSTAVENO</Text>
              <Text>{datumCz(d.vystaveno)}</Text>
            </View>
            <View style={s.pul}>
              <Text style={v.stitek}>{d.platce ? "DATUM ZDAN. PLNĚNÍ" : "VAR. SYMBOL"}</Text>
              <Text>{d.platce ? datumCz(d.duzp ?? d.vystaveno) : d.vs}</Text>
            </View>
            <View style={s.pul}>
              <Text style={v.stitek}>SPLATNOST</Text>
              <Text style={{ fontWeight: 700, color: B.navy }}>{datumCz(d.splatnost)}</Text>
            </View>
            <View style={s.pul}>
              <Text style={v.stitek}>ÚHRADA</Text>
              <Text>{ZPUSOBY_UHRADY[d.uhrada]}</Text>
            </View>
          </View>

          {prevod && (d.dodavatel.bank_account || iban) ? (
            <View style={{ fontSize: 8.6, gap: 1 }}>
              {d.dodavatel.bank_account ? (
                <View style={s.radek}>
                  <Text style={[s.muted, { width: 82 }]}>Číslo účtu</Text>
                  <Text style={{ fontWeight: 600, color: B.navy }}>{d.dodavatel.bank_account}</Text>
                </View>
              ) : null}
              {iban ? (
                <View style={s.radek}>
                  <Text style={[s.muted, { width: 82 }]}>IBAN</Text>
                  <Text>{iban}</Text>
                </View>
              ) : null}
              {d.platce ? (
                <View style={s.radek}>
                  <Text style={[s.muted, { width: 82 }]}>Variabilní symbol</Text>
                  <Text style={{ fontWeight: 600, color: B.navy }}>{d.vs}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {d.uvod ? <Text>{d.uvod}</Text> : null}

          <View style={s.tab}>
            <View style={[s.radek, v.hlavaTabulky]} fixed>
              {(d.platce ? ["Položka", "Množství", "Cena bez DPH", "DPH", "Základ"] : ["Položka", "Množství", "Cena", "Celkem"]).map((t, i) => (
                <Text key={t} style={[s.bunka, { width: tabSloupce[i], fontWeight: 600 }, i > 0 ? s.vpravo : {}]}>
                  {t}
                </Text>
              ))}
            </View>
            {d.polozky.map((p, i) => {
              const bunky = [
                p.description,
                `${mnozstvi(p.quantity)} ${p.unit}`.trim(),
                castka(p.unit_price),
                ...(d.platce ? [`${p.vat_rate} %`] : []),
                castka(zakladPolozky(p)),
              ];
              return (
                <View key={i} style={[s.radek, { borderBottomWidth: 0.75, borderBottomColor: B.line }]} wrap={false}>
                  {bunky.map((t, j) => (
                    <Text key={j} style={[s.bunka, { width: tabSloupce[j] }, j > 0 ? s.vpravo : {}, j === bunky.length - 1 ? s.semi : {}]}>
                      {t}
                    </Text>
                  ))}
                </View>
              );
            })}
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 18 }} wrap={false}>
            {d.platce ? (
              <View style={{ fontSize: 8.25 }}>
                <View style={[s.radek, s.muted, { fontWeight: 600, marginBottom: 2 }]}>
                  <Text style={{ width: 36 }}>Sazba</Text>
                  <Text style={{ width: 70, textAlign: "right" }}>Základ</Text>
                  <Text style={{ width: 62, textAlign: "right" }}>DPH</Text>
                  <Text style={{ width: 70, textAlign: "right" }}>Celkem</Text>
                </View>
                {d.rekapitulace.map((r) => (
                  <View key={r.rate} style={s.radek}>
                    <Text style={{ width: 36 }}>{r.rate} %</Text>
                    <Text style={{ width: 70, textAlign: "right" }}>{castka(r.base)}</Text>
                    <Text style={{ width: 62, textAlign: "right" }}>{castka(r.vat)}</Text>
                    <Text style={{ width: 70, textAlign: "right" }}>{castka(r.base + r.vat)}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View />
            )}
            <View style={v.celkem}>
              <Text style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: 0.6, opacity: 0.75 }}>
                {d.stav === "uhrazena" ? "UHRAZENO" : "CELKEM K ÚHRADĚ"}
              </Text>
              <Text style={{ fontFamily: "Jakarta", fontWeight: 800, fontSize: 19.5, lineHeight: 1.2 }}>{castka(d.celkem)}</Text>
              {d.platce ? <Text style={{ fontSize: 7.9, opacity: 0.75 }}>z toho DPH {castka(d.dph)}</Text> : null}
            </View>
          </View>

          {d.poznamka ? <Text style={{ fontSize: 8.6, color: B.ink }}>{d.poznamka}</Text> : null}

          <View style={{ marginTop: "auto", flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 18 }} wrap={false}>
            {qr ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
                <Qr text={qr} velikost={78} />
                <View style={{ fontSize: 7.9, color: B.slate600 }}>
                  <Text style={{ fontWeight: 700, color: B.navy }}>QR platba</Text>
                  <Text>Naskenujte v aplikaci své banky.</Text>
                </View>
              </View>
            ) : (
              <View />
            )}
            {logo === "dole" && <Logo src={d.logo!} vyska={36} />}
            {d.stav === "uhrazena" && d.uhrazeno ? (
              <Text style={{ borderWidth: 1.5, borderColor: B.greenInk, borderRadius: 6, paddingHorizontal: 9, paddingVertical: 4, fontSize: 8.25, fontWeight: 700, color: B.greenInk }}>
                UHRAZENO {datumCz(d.uhrazeno)}
              </Text>
            ) : null}
          </View>
        </View>

        <Text style={s.paticka} fixed>
          {paticka}
        </Text>
      </Page>
    </Document>
  );
}

/** Logo se stáhne předem (jako data URL), aby PDF nespadlo na nedostupném obrázku. PDF umí jen PNG a JPG. */
async function pripravitLogo(d: DataFaktury): Promise<DataFaktury> {
  let logo: string | null = null;
  if (d.logo && d.logoPozice) {
    try {
      const r = await fetch(d.logo, { signal: AbortSignal.timeout(5000) });
      const typ = r.headers.get("content-type") ?? "";
      if (r.ok && (typ.includes("png") || typ.includes("jpeg"))) {
        logo = `data:${typ.split(";")[0]};base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`;
      }
    } catch (e) {
      console.error("Logo pro PDF se nenačetlo:", (e as Error).message);
    }
  }
  return { ...d, logo, logoPozice: logo ? d.logoPozice : null };
}

/** Když vykreslení s logem selže, zkusí to ještě jednou bez loga (lepší PDF bez loga než žádné). */
async function vykreslit(dokument: (d: DataFaktury) => React.ReactElement<DocumentProps>, d: DataFaktury): Promise<Buffer> {
  registrovatPisma();
  const s = await pripravitLogo(d);
  try {
    return await renderToBuffer(dokument(s));
  } catch (e) {
    if (!s.logo) throw e;
    console.error("PDF s logem se nepodařilo vytvořit, zkouším bez loga:", (e as Error).message);
    return renderToBuffer(dokument({ ...s, logo: null, logoPozice: null }));
  }
}

/** Vytvoří PDF faktury. */
export async function pdfFaktury(d: DataFaktury): Promise<Buffer> {
  return vykreslit((x) => <FakturaDokument d={x} />, d);
}

export type DataUpominky = { level: number; amount: number; new_due_date: string; created_at: string };

const TEXTY_UPOMINKY = {
  1: (c: string, vyst: string, spl: string) =>
    `dovolujeme si Vás upozornit, že jsme dosud neobdrželi úhradu faktury č. ${c} vystavené ${vyst} se splatností ${spl}. Pokud jste platbu již odeslali, považujte prosím tuto upomínku za bezpředmětnou.`,
  2: (c: string, vyst: string, spl: string) =>
    `znovu Vás upozorňujeme, že faktura č. ${c} vystavená ${vyst} se splatností ${spl} je stále neuhrazená. Prosíme o její úhradu bez dalšího odkladu.`,
  3: (c: string, vyst: string, spl: string) =>
    `opakovaně jsme Vás upozorňovali na neuhrazenou fakturu č. ${c} vystavenou ${vyst} se splatností ${spl}. Toto je poslední upomínka. Pokud částku neuhradíte v níže uvedeném termínu, budeme nuceni pohledávku vymáhat dalšími prostředky.`,
} as const;

function UpominkaDokument({ d, u }: { d: DataFaktury; u: DataUpominky }) {
  const v = V[d.vzhled];
  const iban = d.dodavatel.iban ? formatujIban(d.dodavatel.iban) : null;
  const datum = new Date(u.created_at).toLocaleDateString("sv-SE", { timeZone: "Europe/Prague" });
  const poSplatnosti = Math.max(0, Math.round((Date.parse(datum) - Date.parse(d.splatnost)) / 86_400_000));
  const qr = d.dodavatel.iban && u.amount > 0
    ? qrPlatba({ iban: d.dodavatel.iban, castka: u.amount, vs: d.vs, splatnost: u.new_due_date, zprava: `Faktura ${d.cislo}` })
    : null;
  const logo = d.logo && d.logoPozice ? d.logoPozice : null;
  const text = TEXTY_UPOMINKY[u.level as 1 | 2 | 3](d.cislo, datumCz(d.vystaveno), datumCz(d.splatnost));
  const nazev = `${u.level}. upomínka`;

  return (
    <Document title={`${nazev} k faktuře ${d.cislo}`} author={d.dodavatel.name} creator="čistásložka.cz" producer="čistásložka.cz" language="cs">
      <Page size="A4" style={s.page}>
        <View style={v.hlavicka}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {logo === "vlevo" && <Logo src={d.logo!} />}
            <View>
              <Text style={v.nadpis}>{d.vzhled === "corporate" ? "UPOMÍNKA" : "Upomínka"}</Text>
              <Text style={v.podnadpis}>
                {nazev} k faktuře č. {d.cislo}
              </Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end", gap: 6 }}>
            {logo === "vpravo" && <Logo src={d.logo!} />}
            <Text style={{ fontSize: 9.75, fontWeight: 700, textAlign: "right" }}>{d.dodavatel.name}</Text>
            {d.dodavatel.web ? <Text style={{ fontSize: 8.25, opacity: 0.8 }}>{d.dodavatel.web}</Text> : null}
          </View>
        </View>

        <View style={[s.telo, { gap: 18 }]}>
          <View style={s.sloupec2}>
            <View style={s.pul}>
              <Text style={v.stitek}>DODAVATEL</Text>
              <Text style={s.jmeno}>{d.dodavatel.name}</Text>
              <Adresa x={d.dodavatel} />
              <Text style={{ marginTop: 3 }}>
                {[d.dodavatel.ico && `IČO ${d.dodavatel.ico}`, d.dodavatel.dic && `DIČ ${d.dodavatel.dic}`].filter(Boolean).join(" · ")}
              </Text>
            </View>
            <View style={s.pul}>
              <Text style={v.stitek}>ODBĚRATEL</Text>
              {d.odberatel ? (
                <>
                  <Text style={s.jmeno}>{d.odberatel.name}</Text>
                  <Adresa x={d.odberatel} />
                  <Text style={{ marginTop: 3 }}>
                    {[d.odberatel.ico && `IČO ${d.odberatel.ico}`, d.odberatel.dic && `DIČ ${d.odberatel.dic}`].filter(Boolean).join(" · ")}
                  </Text>
                </>
              ) : null}
            </View>
          </View>

          <View style={v.pruh}>
            <View style={s.pul}>
              <Text style={v.stitek}>DATUM UPOMÍNKY</Text>
              <Text>{datumCz(datum)}</Text>
            </View>
            <View style={s.pul}>
              <Text style={v.stitek}>FAKTURA Č.</Text>
              <Text>{d.cislo}</Text>
            </View>
            <View style={s.pul}>
              <Text style={v.stitek}>PŮVODNÍ SPLATNOST</Text>
              <Text>{datumCz(d.splatnost)}</Text>
            </View>
            <View style={s.pul}>
              <Text style={v.stitek}>PO SPLATNOSTI</Text>
              <Text style={{ fontWeight: 700, color: B.red }}>
                {poSplatnosti} {poSplatnosti === 1 ? "den" : poSplatnosti >= 2 && poSplatnosti <= 4 ? "dny" : "dní"}
              </Text>
            </View>
          </View>

          <View style={{ gap: 8, fontSize: 9.75, lineHeight: 1.6 }}>
            <Text>Vážení,</Text>
            <Text>{text}</Text>
            {u.level >= 2 ? <Text>Upozorňujeme, že za dobu prodlení jsme oprávněni účtovat úrok z prodlení podle platných právních předpisů.</Text> : null}
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 18 }} wrap={false}>
            <View style={{ fontSize: 8.6, gap: 1 }}>
              {d.dodavatel.bank_account ? (
                <View style={s.radek}>
                  <Text style={[s.muted, { width: 82 }]}>Číslo účtu</Text>
                  <Text style={{ fontWeight: 600, color: B.navy }}>{d.dodavatel.bank_account}</Text>
                </View>
              ) : null}
              {iban ? (
                <View style={s.radek}>
                  <Text style={[s.muted, { width: 82 }]}>IBAN</Text>
                  <Text>{iban}</Text>
                </View>
              ) : null}
              <View style={s.radek}>
                <Text style={[s.muted, { width: 82 }]}>Variabilní symbol</Text>
                <Text style={{ fontWeight: 600, color: B.navy }}>{d.vs}</Text>
              </View>
              <View style={s.radek}>
                <Text style={[s.muted, { width: 82 }]}>Uhraďte do</Text>
                <Text style={{ fontWeight: 700, color: B.navy }}>{datumCz(u.new_due_date)}</Text>
              </View>
            </View>
            <View style={v.celkem}>
              <Text style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: 0.6, opacity: 0.75 }}>DLUŽNÁ ČÁSTKA</Text>
              <Text style={{ fontFamily: "Jakarta", fontWeight: 800, fontSize: 19.5, lineHeight: 1.2 }}>{castka(u.amount)}</Text>
            </View>
          </View>

          <View style={{ gap: 2, fontSize: 9.75 }}>
            <Text>S pozdravem</Text>
            <Text style={s.bold}>{d.dodavatel.name}</Text>
            {d.dodavatel.email || d.dodavatel.phone ? (
              <Text style={{ fontSize: 8.25, color: B.slate600 }}>{[d.dodavatel.email, d.dodavatel.phone].filter(Boolean).join(" · ")}</Text>
            ) : null}
          </View>

          <View style={{ marginTop: "auto", flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 18 }} wrap={false}>
            {qr ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
                <Qr text={qr} velikost={78} />
                <View style={{ fontSize: 7.9, color: B.slate600 }}>
                  <Text style={{ fontWeight: 700, color: B.navy }}>QR platba</Text>
                  <Text>Naskenujte v aplikaci své banky.</Text>
                </View>
              </View>
            ) : (
              <View />
            )}
            {logo === "dole" && <Logo src={d.logo!} vyska={36} />}
          </View>
        </View>

        <Text style={s.paticka} fixed>
          {[d.dodavatel.registry_note, "Vystaveno v systému čistásložka.cz."].filter(Boolean).map((t) => String(t).trim().replace(/[.\s]*$/, ".")).join(" ")}
        </Text>
      </Page>
    </Document>
  );
}

/** Vytvoří PDF upomínky k faktuře. */
export async function pdfUpominky(d: DataFaktury, u: DataUpominky): Promise<Buffer> {
  return vykreslit((x) => <UpominkaDokument d={x} u={u} />, d);
}
