import "server-only";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { B, registrovatPisma } from "@/components/faktura/FakturaPdf";
import { castka, datumCz, mnozstvi } from "@/lib/faktura";
import { DOPRAVA, PALIVA, PASMA, vyuctovat } from "@/lib/cestovni";
import { casCz, type DataCesty } from "./CestovniPrikazA4";

/* Cestovní příkaz jako PDF (A4). Rozvržení odpovídá CestovniPrikazA4 (× 0,75). */

const s = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 9,
    lineHeight: 1.5,
    color: B.slate800,
    backgroundColor: B.white,
    paddingHorizontal: 33,
    paddingVertical: 30,
  },
  stitek: { fontSize: 7.1, fontWeight: 700, letterSpacing: 0.6, color: B.muted, marginBottom: 2 },
  jmeno: { fontSize: 9.75, fontWeight: 700, color: B.navy },
  radek: { flexDirection: "row" },
  bunka: { paddingVertical: 4, paddingHorizontal: 4 },
});

const SLOUPCE = ["22%", "10%", "13%", "13%", "12%", "14%", "16%"];

function Dokument({ d }: { d: DataCesty }) {
  const v = vyuctovat(d.vstup);
  const vlastni = d.vstup.doprava === "auto" || d.vstup.doprava === "motocykl";
  const palivo = PALIVA[d.vstup.palivo];
  const vozidlo = [d.vozidlo.model, d.vozidlo.spz && `SPZ ${d.vozidlo.spz}`].filter(Boolean).join(", ");
  const radky: [string, number][] = [["Stravné celkem", v.stravne]];
  if (vlastni) {
    radky.push([`Jízdné: ${mnozstvi(d.vstup.km)} km × ${castka(v.jizdne.sazbaKm)} (základní náhrada)`, v.jizdne.zakladni]);
    radky.push([
      `Pohonné hmoty: ${mnozstvi(d.vstup.km)} km × ${mnozstvi(d.vstup.spotreba)} ${palivo.jednotka}/100 km × ${castka(d.vstup.cenaPaliva)}/${palivo.jednotka}`,
      v.jizdne.palivo,
    ]);
  }
  for (const x of d.vstup.vydaje) if (x.popis || x.castka) radky.push([x.popis || "Výdaj", x.castka || 0]);

  const Pole = ({ nazev, hodnota, sirka = "50%" }: { nazev: string; hodnota: string; sirka?: string }) => (
    <View style={{ width: sirka, paddingRight: 12, marginBottom: 8 }}>
      <Text style={s.stitek}>{nazev.toUpperCase()}</Text>
      <Text>{hodnota}</Text>
    </View>
  );

  return (
    <Document title={`Cestovní příkaz ${d.cislo}`} author={d.firma.name} creator="čistásložka.cz" producer="čistásložka.cz" language="cs">
      <Page size="A4" style={s.page}>
        {d.storno ? (
          <View fixed style={{ position: "absolute", top: 360, left: 0, right: 0, alignItems: "center" }}>
            <Text
              style={{
                transform: "rotate(-24deg)",
                fontFamily: "Jakarta",
                fontWeight: 800,
                fontSize: 66,
                letterSpacing: 6,
                color: B.red,
                opacity: 0.4,
                borderWidth: 4.5,
                borderColor: B.red,
                borderRadius: 9,
                paddingHorizontal: 30,
                paddingVertical: 6,
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
            <Text style={{ fontFamily: "Jakarta", fontWeight: 800, fontSize: 22.5, lineHeight: 1.2, color: B.navy }}>Cestovní příkaz</Text>
            <Text style={{ fontSize: 9.75, color: B.muted }}>č. {d.cislo} · s vyúčtováním tuzemské pracovní cesty</Text>
          </View>
          <View style={{ alignItems: "flex-end", fontSize: 8.6 }}>
            <Text style={s.stitek}>ZAMĚSTNAVATEL / PODNIKATEL</Text>
            <Text style={s.jmeno}>{d.firma.name}</Text>
            <Text>{[d.firma.street, [d.firma.zip, d.firma.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</Text>
            {d.firma.ico ? <Text>IČO {d.firma.ico}</Text> : null}
          </View>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", paddingTop: 12 }}>
          <View style={{ width: "50%", paddingRight: 12, marginBottom: 8 }}>
            <Text style={s.stitek}>CESTOVATEL</Text>
            <Text style={s.jmeno}>{d.cestovatel.name}</Text>
            {d.cestovatel.address ? <Text>{d.cestovatel.address}</Text> : null}
          </View>
          <Pole nazev="Místo jednání" hodnota={d.misto} />
          <Pole nazev="Účel cesty" hodnota={d.ucel} sirka="100%" />
          <Pole nazev="Začátek cesty" hodnota={casCz(d.vstup.odjezd)} />
          <Pole nazev="Konec cesty" hodnota={casCz(d.vstup.prijezd)} />
          <Pole
            nazev="Způsob dopravy"
            sirka="100%"
            hodnota={
              DOPRAVA[d.vstup.doprava] +
              (vlastni
                ? ` · ${vozidlo ? `${vozidlo} · ` : ""}${palivo.nazev}, spotřeba ${mnozstvi(d.vstup.spotreba)} ${palivo.jednotka}/100 km`
                : "")
            }
          />
        </View>

        <Text
          style={{
            marginTop: 6,
            borderBottomWidth: 0.75,
            borderBottomColor: B.line,
            paddingBottom: 2,
            fontSize: 9.75,
            fontWeight: 700,
            color: B.navy,
          }}
        >
          Vyúčtování
        </Text>

        <View style={{ marginTop: 6, fontSize: 8.6 }}>
          <View style={[s.radek, { borderBottomWidth: 1.1, borderBottomColor: B.navy, color: B.navy, fontWeight: 600 }]}>
            {["Stravné – den", "Hodin", "Pásmo", "Sazba", "Jídla zdarma", "Krácení", "Náhrada"].map((t, i) => (
              <Text key={t} style={[s.bunka, { width: SLOUPCE[i], textAlign: i ? "right" : "left" }]}>
                {t}
              </Text>
            ))}
          </View>
          {v.dny.map((x) => (
            <View key={x.datum} style={[s.radek, { borderBottomWidth: 0.75, borderBottomColor: B.line }]} wrap={false}>
              {[
                datumCz(x.datum),
                mnozstvi(x.hodin),
                x.pasmo === null ? "pod 5 h" : PASMA[x.pasmo],
                castka(x.zakladni),
                String(x.jidel),
                x.kraceni ? `−${castka(x.kraceni)}` : "–",
                castka(x.stravne),
              ].map((t, i) => (
                <Text key={i} style={[s.bunka, { width: SLOUPCE[i], textAlign: i ? "right" : "left" }, i === 6 ? { fontWeight: 600 } : {}]}>
                  {t}
                </Text>
              ))}
            </View>
          ))}
        </View>

        <View style={{ marginTop: 9, gap: 2 }}>
          {radky.map(([t, c], i) => (
            <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", gap: 18 }}>
              <Text style={{ flexShrink: 1 }}>{t}</Text>
              <Text style={i === 0 ? { fontWeight: 600 } : {}}>{castka(c)}</Text>
            </View>
          ))}
        </View>

        <View
          style={{
            marginTop: 9,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-end",
            backgroundColor: B.slate50,
            borderRadius: 6,
            paddingHorizontal: 12,
            paddingVertical: 9,
          }}
          wrap={false}
        >
          <View style={{ fontSize: 8.6, color: B.muted }}>
            <Text>Náhrady celkem {castka(v.celkem)}</Text>
            {v.zaloha > 0 ? <Text>Vyplacená záloha −{castka(v.zaloha)}</Text> : null}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.stitek}>{v.doplatek >= 0 ? "K VÝPLATĚ CESTOVATELI" : "CESTOVATEL VRÁTÍ"}</Text>
            <Text style={{ fontFamily: "Jakarta", fontWeight: 800, fontSize: 19.5, lineHeight: 1.2, color: B.navy }}>
              {castka(Math.abs(v.doplatek))}
            </Text>
          </View>
        </View>

        {d.poznamka ? <Text style={{ marginTop: 9, fontSize: 8.6 }}>{d.poznamka}</Text> : null}

        <View style={{ marginTop: "auto", flexDirection: "row", gap: 18, paddingTop: 18 }} wrap={false}>
          {["Cestovatel", "Cestu povolil", "Vyúčtování schválil"].map((p) => (
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
        <Text style={{ paddingTop: 9, fontSize: 6.75, color: B.muted }}>
          Sazby stravného a náhrad: zákoník práce, {v.sazby.predpis} Vystaveno v systému čistásložka.cz.
        </Text>
      </Page>
    </Document>
  );
}

export async function pdfCestovnihoPrikazu(d: DataCesty): Promise<Buffer> {
  registrovatPisma();
  return renderToBuffer(<Dokument d={d} />);
}
