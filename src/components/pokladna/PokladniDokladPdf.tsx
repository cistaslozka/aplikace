import "server-only";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { B, registrovatPisma } from "@/components/faktura/FakturaPdf";
import { castka, datumCz, type Strana } from "@/lib/faktura";
import { castkaSlovy, NAZVY_POKLADNY } from "@/lib/pokladna";
import type { DataPokladny } from "./PokladniDokladList";

/* Pokladní doklad jako PDF, A5 na šířku. Rozvržení odpovídá PokladniDokladList (× 0,75). */

const s = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 9,
    lineHeight: 1.5,
    color: B.slate800,
    backgroundColor: B.white,
    paddingHorizontal: 30,
    paddingVertical: 24,
  },
  stitek: { fontSize: 7.1, fontWeight: 700, letterSpacing: 0.6, color: B.muted, marginBottom: 2 },
  jmeno: { fontSize: 9.75, fontWeight: 700, color: B.navy },
});

const adresa = (x: Strana) => [x.street, [x.zip, x.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");

function Dokument({ d }: { d: DataPokladny }) {
  const prijem = d.druh === "prijem";
  const podpisy = prijem ? ["Vystavil", "Přijal (pokladník)", "Zaplatil"] : ["Vystavil", "Schválil", "Přijal"];
  const slovy = castkaSlovy(d.castka);
  const paticka = [d.firma.registry_note, d.platce ? null : "Nejsem plátce DPH.", "Vystaveno v systému čistásložka.cz."]
    .filter(Boolean)
    .map((t) =>
      String(t)
        .trim()
        .replace(/[.\s]*$/, "."),
    )
    .join(" ");

  return (
    <Document
      title={`${NAZVY_POKLADNY[d.druh]} ${d.cislo}`}
      author={d.firma.name}
      creator="čistásložka.cz"
      producer="čistásložka.cz"
      language="cs"
    >
      <Page size="A5" orientation="landscape" style={s.page}>
        {d.storno ? (
          <View fixed style={{ position: "absolute", top: 140, left: 0, right: 0, alignItems: "center" }}>
            <Text
              style={{
                transform: "rotate(-18deg)",
                fontFamily: "Jakarta",
                fontWeight: 800,
                fontSize: 40,
                letterSpacing: 4,
                color: B.red,
                opacity: 0.4,
                borderWidth: 4.5,
                borderColor: B.red,
                borderRadius: 9,
                paddingHorizontal: 24,
                paddingVertical: 4,
              }}
            >
              STORNO
            </Text>
          </View>
        ) : null}

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            borderBottomWidth: 1.1,
            borderBottomColor: B.navy,
            paddingBottom: 9,
          }}
        >
          <View>
            <Text style={{ fontFamily: "Jakarta", fontWeight: 800, fontSize: 18, lineHeight: 1.2, color: B.navy }}>
              {NAZVY_POKLADNY[d.druh]}
            </Text>
            <Text style={{ fontSize: 9.75, color: B.muted }}>č. {d.cislo}</Text>
          </View>
          <View style={{ alignItems: "flex-end", fontSize: 8.6 }}>
            <Text style={s.stitek}>ÚČETNÍ JEDNOTKA</Text>
            <Text style={s.jmeno}>{d.firma.name}</Text>
            <Text>{adresa(d.firma)}</Text>
            <Text>{[d.firma.ico && `IČO ${d.firma.ico}`, d.firma.dic && `DIČ ${d.firma.dic}`].filter(Boolean).join(" · ")}</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 12 }}>
          <View>
            <Text style={s.stitek}>{prijem ? "PŘIJATO OD" : "VYPLACENO KOMU"}</Text>
            <Text style={s.jmeno}>{d.partner?.name ?? ""}</Text>
            {d.partner && (d.partner.street || d.partner.city) ? <Text>{adresa(d.partner)}</Text> : null}
            {d.partner?.ico ? <Text>IČO {d.partner.ico}</Text> : null}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.stitek}>DATUM</Text>
            <Text style={{ fontSize: 9.75, fontWeight: 600, color: B.navy }}>{datumCz(d.datum)}</Text>
          </View>
        </View>

        <View style={{ paddingTop: 12 }}>
          <Text style={s.stitek}>ÚČEL PLATBY</Text>
          <Text style={{ fontSize: 9.75 }}>{d.ucel}</Text>
          {d.faktura && !d.ucel.includes(d.faktura) ? (
            <Text style={{ fontSize: 8.6, color: B.muted }}>Úhrada faktury č. {d.faktura}</Text>
          ) : null}
        </View>

        <View
          style={{
            marginTop: 12,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-end",
            backgroundColor: B.slate50,
            borderRadius: 6,
            paddingHorizontal: 12,
            paddingVertical: 9,
            gap: 18,
          }}
        >
          <View style={{ flexShrink: 1 }}>
            <Text style={s.stitek}>SLOVY</Text>
            <Text>{slovy.charAt(0).toUpperCase() + slovy.slice(1)}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.stitek}>{prijem ? "PŘIJATÁ ČÁSTKA" : "VYPLACENÁ ČÁSTKA"}</Text>
            <Text style={{ fontFamily: "Jakarta", fontWeight: 800, fontSize: 19.5, lineHeight: 1.2, color: B.navy }}>
              {castka(d.castka)}
            </Text>
          </View>
        </View>

        {d.platce && d.sazba !== null && d.zaklad !== null && d.dph !== null ? (
          <Text style={{ marginTop: 4, fontSize: 8.25, color: B.muted, textAlign: "right" }}>
            Základ {castka(d.zaklad)} · DPH {d.sazba} % {castka(d.dph)} · celkem {castka(d.castka)}
          </Text>
        ) : null}
        {d.poznamka ? <Text style={{ marginTop: 4, fontSize: 8.6 }}>{d.poznamka}</Text> : null}

        <View style={{ marginTop: "auto", flexDirection: "row", gap: 18, paddingTop: 12 }}>
          {podpisy.map((p) => (
            <Text
              key={p}
              style={{
                flex: 1,
                borderTopWidth: 0.75,
                borderTopColor: B.slate600,
                paddingTop: 3,
                textAlign: "center",
                fontSize: 7.9,
                color: B.muted,
              }}
            >
              {p}
            </Text>
          ))}
        </View>
        <Text style={{ paddingTop: 9, fontSize: 6.75, color: B.muted }}>{paticka}</Text>
      </Page>
    </Document>
  );
}

export async function pdfPokladnihoDokladu(d: DataPokladny): Promise<Buffer> {
  registrovatPisma();
  return renderToBuffer(<Dokument d={d} />);
}
