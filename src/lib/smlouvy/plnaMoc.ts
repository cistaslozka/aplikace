import { datum, text, veta, vycistit, type Clanek, type DataSmlouvy, type SekceFormulare } from "./index";

/*
  Plná moc podle § 441 a násl. zákona č. 89/2012 Sb., občanský zákoník.
  Zmocnitel uděluje zmocněnci oprávnění jednat jeho jménem; zmocněnec plnou moc přijímá podpisem.
  ⚠️ Pro úkony vyžadující úředně ověřený podpis (např. katastr, některé úřady) musí podpis zmocnitele ověřit notář nebo Czech POINT.
  ⚠️ Text je obecný vzor. Před spuštěním pro zákazníky ho musí zkontrolovat právník.
*/

export function vychoziPlnaMoc() {
  return { rozsah: "", druh: "jednotlive", platnost_do: "", substituce: "ne", ostatni: "" };
}

export function chybyPlnaMoc(p: Record<string, unknown>): string | null {
  if (!text(p, "rozsah")) return "Napište, k čemu plná moc opravňuje.";
  return null;
}

export function clankyPlnaMoc(d: DataSmlouvy): Clanek[] {
  const p = d.pole;
  return vycistit([
    {
      nadpis: "Zmocnění",
      odstavce: [
        (text(p, "druh") === "generalni"
          ? "Zmocnitel tímto zmocňuje zmocněnce, aby jej zastupoval ve všech záležitostech a činil jeho jménem veškeré právní jednání, k nimž není podle zákona třeba zvláštní plné moci, a to zejména v této oblasti: "
          : "Zmocnitel tímto zmocňuje zmocněnce, aby jej zastupoval a jednal jeho jménem v této záležitosti: ") +
          veta(text(p, "rozsah") || "…"),
        "Zmocněnec je oprávněn zejména podávat a přijímat písemnosti, činit návrhy, vzdávat se jich, uzavírat dohody a přijímat plnění, vše v rozsahu tohoto zmocnění.",
      ],
    },
    {
      nadpis: "Podmínky zmocnění",
      odstavce: [
        datum(p, "platnost_do")
          ? `Plná moc se uděluje na dobu do ${datum(p, "platnost_do")}.`
          : "Plná moc se uděluje na dobu neurčitou. Zmocnitel ji může kdykoli odvolat.",
        text(p, "substituce") === "ano"
          ? "Zmocněnec je oprávněn udělit k jednotlivým úkonům plnou moc další osobě (substituce)."
          : "Zmocněnec není oprávněn zmocnit další osobu.",
        "Zmocněnec jedná podle pokynů zmocnitele, s potřebnou pečlivostí, a zmocnitele průběžně informuje o tom, co jeho jménem učinil.",
      ],
    },
    text(p, "ostatni") ? { nadpis: "Další ujednání", odstavce: text(p, "ostatni").split(/\n+/) } : null,
    {
      nadpis: "Přijetí plné moci",
      odstavce: [
        "Tato plná moc se řídí ustanoveními § 441 a násl. zákona č. 89/2012 Sb., občanský zákoník.",
        "Zmocněnec svým podpisem potvrzuje, že plnou moc v uvedeném rozsahu přijímá.",
      ],
    },
  ]);
}

export const FORMULAR_PLNA_MOC: SekceFormulare[] = [
  {
    nadpis: "Rozsah zmocnění",
    pole: [
      {
        k: "druh",
        label: "Plná moc je",
        typ: "select",
        moznosti: [
          ["jednotlive", "k jedné záležitosti"],
          ["generalni", "obecná (ke všem běžným záležitostem)"],
        ],
        sirka: "cela",
      },
      {
        k: "rozsah",
        label: "K čemu opravňuje",
        typ: "textarea",
        placeholder: "Např. k převzetí zásilek na poště, k jednání s finančním úřadem ve věci daňového přiznání za rok 2026",
        sirka: "cela",
      },
    ],
  },
  {
    nadpis: "Podmínky",
    pole: [
      { k: "platnost_do", label: "Platí do (nepovinné)", typ: "date", napoveda: "Bez data platí, dokud ji neodvoláte.", sirka: "pul" },
      {
        k: "substituce",
        label: "Může zmocnit další osobu",
        typ: "select",
        moznosti: [
          ["ne", "ne"],
          ["ano", "ano"],
        ],
        sirka: "pul",
      },
      { k: "ostatni", label: "Další ujednání (nepovinné)", typ: "textarea", sirka: "cela" },
    ],
  },
];
