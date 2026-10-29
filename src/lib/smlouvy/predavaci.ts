import { datum, text, veta, vycistit, type Clanek, type DataSmlouvy, type SekceFormulare } from "./index";

/*
  Předávací protokol – potvrzení o předání a převzetí díla, služby nebo věci (např. ke smlouvě o dílo,
  § 2604 a násl. občanského zákoníku). Není to smlouva, ale záznam, který podepisují obě strany.
*/

export function vychoziPredavaci() {
  return {
    souvisi: "",
    predmet: "",
    datum_predani: "",
    stav: "bez_vad",
    vady: "",
    odstraneni: "",
    prilohy: "",
    poznamky: "",
    zastupce_my: "",
    zastupce_oni: "",
  };
}

export function chybyPredavaci(p: Record<string, unknown>): string | null {
  if (!text(p, "predmet")) return "Popište, co se předává.";
  if (!datum(p, "datum_predani")) return "Zadejte datum předání.";
  if (text(p, "stav") === "s_vadami" && !text(p, "vady")) return "Popište zjištěné vady.";
  return null;
}

export function clankyPredavaci(d: DataSmlouvy): Clanek[] {
  const p = d.pole;
  const sVadami = text(p, "stav") === "s_vadami";
  return vycistit([
    {
      nadpis: "Předmět předání",
      odstavce: [
        text(p, "souvisi") ? `Předání se uskutečňuje na základě: ${veta(text(p, "souvisi"))}` : "",
        `Předávající předává a přebírající přebírá: ${veta(text(p, "predmet") || "…")}`,
        `Datum předání: ${datum(p, "datum_predani") || "…"}.`,
        text(p, "prilohy") ? `Spolu s předmětem předání byly předány: ${veta(text(p, "prilohy"))}` : "",
      ],
    },
    {
      nadpis: "Stav při předání",
      odstavce: sVadami
        ? [
            `Přebírající přebírá předmět předání s výhradami. Zjištěné vady: ${veta(text(p, "vady"))}`,
            datum(p, "odstraneni")
              ? `Předávající zjištěné vady odstraní nejpozději do ${datum(p, "odstraneni")}.`
              : "Termín odstranění vad si strany dohodnou.",
          ]
        : ["Přebírající přebírá předmět předání bez výhrad. Při předání nebyly zjištěny žádné vady."],
    },
    text(p, "poznamky") ? { nadpis: "Poznámky", odstavce: text(p, "poznamky").split(/\n+/) } : null,
    {
      nadpis: "Závěr",
      odstavce: [
        "Svým podpisem předávající potvrzuje předání a přebírající převzetí předmětu předání v uvedeném stavu.",
        "Protokol je vyhotoven ve dvou stejnopisech, z nichž každá strana obdrží po jednom.",
      ],
    },
  ]);
}

export const FORMULAR_PREDAVACI: SekceFormulare[] = [
  {
    nadpis: "Co se předává",
    pole: [
      {
        k: "souvisi",
        label: "Ke smlouvě nebo objednávce (nepovinné)",
        typ: "text",
        placeholder: "Např. smlouva o dílo č. S20260001",
        sirka: "cela",
      },
      {
        k: "predmet",
        label: "Předmět předání",
        typ: "textarea",
        placeholder: "Např. hotové webové stránky včetně přístupů do administrace",
        sirka: "cela",
      },
      { k: "datum_predani", label: "Datum předání", typ: "date", sirka: "pul" },
      {
        k: "prilohy",
        label: "Předané doklady a přílohy (nepovinné)",
        typ: "text",
        placeholder: "Např. návod, záruční list, klíče 2×",
        sirka: "pul",
      },
    ],
  },
  {
    nadpis: "Stav",
    pole: [
      {
        k: "stav",
        label: "Předáno",
        typ: "select",
        moznosti: [
          ["bez_vad", "bez vad"],
          ["s_vadami", "s vadami (výhradami)"],
        ],
        sirka: "pul",
      },
      { k: "odstraneni", label: "Vady odstranit do (nepovinné)", typ: "date", sirka: "pul" },
      { k: "vady", label: "Zjištěné vady", typ: "textarea", placeholder: "Vyplňte jen při předání s vadami", sirka: "cela" },
      { k: "poznamky", label: "Poznámky (nepovinné)", typ: "textarea", sirka: "cela" },
    ],
  },
  {
    nadpis: "Kdo předává a přebírá",
    pole: [
      { k: "zastupce_my", label: "Za nás (nepovinné)", typ: "text", placeholder: "Jméno a funkce", sirka: "pul" },
      { k: "zastupce_oni", label: "Za druhou stranu (nepovinné)", typ: "text", placeholder: "Jméno a funkce", sirka: "pul" },
    ],
  },
];
