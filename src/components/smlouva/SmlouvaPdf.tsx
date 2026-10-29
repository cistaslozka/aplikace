import "server-only";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { B, registrovatPisma } from "@/components/faktura/FakturaPdf";
import { datumCz } from "@/lib/faktura";
import { datum as datumPole, DRUHY_SMLUV, malym, popisStrany, role, type Clanek, type DataSmlouvy } from "@/lib/smlouvy";
import { VZORY } from "@/lib/smlouvy/vzory";

// Dokumenty, které nejsou dvoustranná smlouva: v záhlaví „Strany“ místo „Smluvní strany“
const JEN_STRANY = new Set(["predavaci", "plna_moc", "mzdovy_vymer", "vypoved", "vytka", "svereni"]);

// PDF smlouvy (víc stran). Rozvržení odpovídá SmlouvaA4.tsx – když měníš jedno, uprav i druhé.

const RIMSKA = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

const s = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 9.4,
    lineHeight: 1.6,
    color: B.slate800,
    paddingHorizontal: 42,
    paddingTop: 42,
    paddingBottom: 54,
  },
  stitek: { fontSize: 8, fontWeight: 700, letterSpacing: 0.6, marginBottom: 6 },
  clanekNadpis: { textAlign: "center", fontSize: 9.8, fontWeight: 700, marginTop: 16, marginBottom: 5 },
  paticka: {
    position: "absolute",
    left: 42,
    right: 42,
    bottom: 22,
    fontSize: 7.1,
    color: B.muted,
    borderTopWidth: 0.75,
    borderTopColor: B.line,
    paddingTop: 6,
  },
});

const HLAVA = {
  minimal: {
    box: { borderBottomWidth: 0.75, borderBottomColor: B.line, paddingBottom: 14 },
    nadpis: { fontFamily: "Jakarta", fontWeight: 800, fontSize: 22.5, lineHeight: 1.2, color: B.navy },
    pod: { color: B.muted },
    akcent: B.navy,
  },
  corporate: {
    box: { backgroundColor: B.navy, marginHorizontal: -42, marginTop: -42, paddingHorizontal: 42, paddingTop: 33, paddingBottom: 22 },
    nadpis: { fontWeight: 700, fontSize: 16.5, lineHeight: 1.2, letterSpacing: 2, color: B.white },
    pod: { color: B.slate300 },
    akcent: B.navy,
  },
  creative: {
    box: {
      backgroundColor: B.greenTint,
      borderBottomWidth: 4.5,
      borderBottomColor: B.green,
      marginHorizontal: -42,
      marginTop: -42,
      paddingHorizontal: 42,
      paddingTop: 36,
      paddingBottom: 21,
    },
    nadpis: { fontFamily: "Jakarta", fontWeight: 800, fontSize: 25.5, lineHeight: 1.2, color: B.greenInk },
    pod: { color: B.navy },
    akcent: B.greenInk,
  },
} as const;

function SmlouvaDokument({ d, clanky }: { d: DataSmlouvy; clanky: Clanek[] }) {
  const h = HLAVA[d.vzhled];
  const r = role(d);
  const hr = !!DRUHY_SMLUV[d.druh].hr;
  const z = (k: string) => (typeof d.pole[k] === "string" ? (d.pole[k] as string).trim() : "");
  const strany = d.myDodavame
    ? [
        { s: d.my, r: r.my, z: z("zastupce_my"), p: d.podpisy?.my },
        { s: d.oni, r: r.oni, z: z("zastupce_oni"), p: d.podpisy?.oni },
      ]
    : [
        { s: d.oni, r: r.oni, z: z("zastupce_oni"), p: d.podpisy?.oni },
        { s: d.my, r: r.my, z: z("zastupce_my"), p: d.podpisy?.my },
      ];

  return (
    <Document title={`${d.nazev} ${d.cislo}`} author={d.my.name} creator="čistásložka.cz" producer="čistásložka.cz" language="cs">
      <Page size="A4" style={s.page}>
        <View style={h.box}>
          <Text style={h.nadpis}>{d.vzhled === "corporate" ? d.nazev.toUpperCase() : d.nazev}</Text>
          <Text style={[{ marginTop: 4, fontSize: 9 }, h.pod]}>
            č. {d.cislo}
            {VZORY[d.druh]?.podtitul ? ` · ${VZORY[d.druh]!.podtitul}` : ""}
          </Text>
        </View>

        <View style={{ marginTop: 18 }}>
          <Text style={[s.stitek, { color: h.akcent }]}>{JEN_STRANY.has(d.druh) ? "STRANY" : "SMLUVNÍ STRANY"}</Text>
          {strany.map((x, i) => (
            <View key={i} style={{ flexDirection: "row", marginBottom: 8 }} wrap={false}>
              <Text style={{ width: 84, fontWeight: 600, color: B.navy }}>{x.r}</Text>
              <View style={{ flex: 1 }}>
                {(x.s ? popisStrany(x.s, hr && x.s === d.oni ? { narozeni: datumPole(d.pole, "narozeni") } : undefined) : ["…"]).map(
                  (radek, j) => (
                    <Text key={j} style={j === 0 ? { fontWeight: 700, color: B.navy, fontSize: 9.8 } : {}}>
                      {radek}
                    </Text>
                  ),
                )}
                {x.z ? <Text>zastoupen(a): {x.z}</Text> : null}
                <Text style={{ color: B.muted }}>(dále jen „{malym(x.r)}“)</Text>
              </View>
            </View>
          ))}
          {VZORY[d.druh]?.uvod !== "" ? <Text>{VZORY[d.druh]?.uvod ?? "uzavírají tuto smlouvu:"}</Text> : null}
        </View>

        {clanky.map((c, i) => (
          <View key={i}>
            {c.odstavce.map((o, j) => (
              // nadpis článku drží s prvním odstavcem, aby nezůstal sám na konci strany
              <View key={j} wrap={false}>
                {j === 0 && (
                  <Text style={[s.clanekNadpis, { color: h.akcent }]}>
                    Článek {RIMSKA[i] ?? i + 1}.{"\n"}
                    {c.nadpis}
                  </Text>
                )}
                <View style={{ flexDirection: "row", marginBottom: 3 }}>
                  <Text style={{ width: 18, color: B.muted }}>{j + 1}.</Text>
                  <Text style={{ flex: 1 }}>{o}</Text>
                </View>
              </View>
            ))}
          </View>
        ))}

        <View style={{ flexDirection: "row", gap: 30, marginTop: 30 }} wrap={false}>
          {strany.map((x, i) => (
            <View key={i} style={{ flex: 1 }}>
              <Text>
                V {d.misto || "…………………"} dne {d.datum ? datumCz(d.datum) : "…………………"}
              </Text>
              <View style={{ height: 42, justifyContent: "flex-end" }}>
                {/* eslint-disable-next-line jsx-a11y/alt-text -- obrázek v PDF nemá alt */}
                {x.p ? <Image src={x.p.obrazek} style={{ maxHeight: 40, maxWidth: 165, objectFit: "contain" }} /> : null}
              </View>
              <View style={{ borderTopWidth: 0.75, borderTopColor: B.slate300, paddingTop: 4 }}>
                <Text style={{ fontWeight: 600, color: B.navy }}>{x.r}</Text>
                <Text style={{ color: B.muted }}>{x.s?.name ?? ""}</Text>
                {x.z ? <Text style={{ color: B.muted }}>{x.z}</Text> : null}
                {x.p ? (
                  <Text style={{ color: B.muted, fontSize: 7.9 }}>
                    Podepsal(a) {x.p.jmeno} na obrazovce{" "}
                    {new Date(x.p.kdy).toLocaleString("cs-CZ", { timeZone: "Europe/Prague", dateStyle: "medium", timeStyle: "short" })}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>

        <Text style={s.paticka} fixed>
          {DRUHY_SMLUV[d.druh].nazev} č. {d.cislo} · Vytvořeno v systému čistásložka.cz
        </Text>
      </Page>
    </Document>
  );
}

export async function pdfSmlouvy(d: DataSmlouvy, clanky: Clanek[]): Promise<Buffer> {
  registrovatPisma();
  return renderToBuffer(<SmlouvaDokument d={d} clanky={clanky} />);
}
