import { cislo, datum, kc, text, veta, vycistit, type Clanek, type DataSmlouvy, type SekceFormulare } from "./index";

/*
  Kupní smlouva podle § 2079 a násl. zákona č. 89/2012 Sb., občanský zákoník (mezi podnikateli).
  Podstatné náležitosti: předmět koupě a kupní cena.
  ⚠️ Text je obecný vzor. Před spuštěním pro zákazníky ho musí zkontrolovat právník.
*/

export function vychoziKupni(platce: boolean) {
  return {
    predmet: "",
    stav: "nova",
    cena: "",
    cena_typ: platce ? "bez_dph" : "neplatce",
    platba: "faktura",
    splatnost: "14",
    predani: "",
    misto_predani: "",
    vlastnictvi: "zaplacenim",
    zaruka: "",
    ostatni: "",
    vyhotoveni: "dva",
  };
}

export function chybyKupni(p: Record<string, unknown>): string | null {
  if (!text(p, "predmet")) return "Popište, co se prodává.";
  if ((cislo(p, "cena") ?? 0) <= 0) return "Zadejte kupní cenu.";
  return null;
}

export function clankyKupni(d: DataSmlouvy): Clanek[] {
  const p = d.pole;
  const cena = cislo(p, "cena");
  const typ = text(p, "cena_typ");
  const cenaText =
    cena === null
      ? "…"
      : typ === "bez_dph"
        ? `${kc(cena)} bez DPH. K ceně bude připočtena daň z přidané hodnoty v sazbě platné ke dni uskutečnění zdanitelného plnění`
        : typ === "vcetne_dph"
          ? `${kc(cena)} včetně daně z přidané hodnoty`
          : `${kc(cena)}. Prodávající není plátcem daně z přidané hodnoty`;
  const zaruka = cislo(p, "zaruka");
  const platba = text(p, "platba");

  return vycistit([
    {
      nadpis: "Předmět smlouvy",
      odstavce: [
        `Prodávající se zavazuje odevzdat kupujícímu ${text(p, "stav") === "pouzita" ? "použitou " : ""}věc: ${text(p, "predmet") || "…"} (dále jen „předmět koupě“) a umožnit mu nabýt k ní vlastnické právo.`,
        "Kupující se zavazuje předmět koupě převzít a zaplatit prodávajícímu kupní cenu.",
        text(p, "stav") === "pouzita"
          ? "Kupující prohlašuje, že se se stavem použitého předmětu koupě seznámil a v tomto stavu jej kupuje. Prodávající neodpovídá za vady odpovídající míře používání nebo opotřebení, které měla věc při převzetí kupujícím."
          : "",
      ],
    },
    {
      nadpis: "Kupní cena a platební podmínky",
      odstavce: [
        `Kupní cena je stanovena dohodou smluvních stran ve výši ${cenaText}.`,
        platba === "hotove"
          ? "Kupující zaplatí kupní cenu v hotovosti při převzetí předmětu koupě. Prodávající mu o tom vystaví doklad."
          : `Kupující zaplatí kupní cenu na základě faktury vystavené prodávajícím, se splatností ${cislo(p, "splatnost") ?? 14} dnů ode dne jejího vystavení.`,
        "V případě prodlení s úhradou je kupující povinen zaplatit prodávajícímu úrok z prodlení ve výši stanovené právními předpisy.",
      ],
    },
    {
      nadpis: "Předání předmětu koupě",
      odstavce: [
        datum(p, "predani")
          ? `Prodávající předá kupujícímu předmět koupě nejpozději dne ${datum(p, "predani")}.`
          : "Prodávající předá kupujícímu předmět koupě bez zbytečného odkladu po uzavření této smlouvy.",
        text(p, "misto_predani") ? `Místem předání je ${veta(text(p, "misto_predani"))}` : "",
        "Spolu s předmětem koupě předá prodávající kupujícímu doklady, které se k němu vztahují (zejména návody a záruční listy). O předání sepíší smluvní strany předávací protokol.",
        "Nebezpečí škody na předmětu koupě přechází na kupujícího jeho převzetím.",
      ],
    },
    {
      nadpis: "Vlastnické právo",
      odstavce: [
        text(p, "vlastnictvi") === "predanim"
          ? "Kupující nabývá vlastnické právo k předmětu koupě jeho převzetím."
          : "Kupující nabývá vlastnické právo k předmětu koupě až úplným zaplacením kupní ceny (výhrada vlastnického práva podle § 2132 občanského zákoníku).",
        "Prodávající prohlašuje, že je výlučným vlastníkem předmětu koupě a že na něm neváznou žádná práva třetích osob.",
      ],
    },
    {
      nadpis: "Vady a záruka",
      odstavce: [
        "Práva kupujícího z vadného plnění se řídí ustanoveními § 2099 a násl. občanského zákoníku.",
        zaruka ? `Prodávající poskytuje na předmět koupě záruku za jakost v délce ${zaruka} měsíců ode dne převzetí.` : "",
      ],
    },
    text(p, "ostatni") ? { nadpis: "Další ujednání", odstavce: text(p, "ostatni").split(/\n+/) } : null,
    {
      nadpis: "Závěrečná ustanovení",
      odstavce: [
        "Tato smlouva se řídí zákonem č. 89/2012 Sb., občanský zákoník, zejména ustanoveními § 2079 a násl.",
        "Smlouvu lze měnit nebo doplňovat pouze písemnými dodatky podepsanými oběma smluvními stranami.",
        "Smlouva nabývá platnosti a účinnosti dnem jejího podpisu oběma smluvními stranami.",
        text(p, "vyhotoveni") === "elektronicky"
          ? "Smlouva je uzavřena v elektronické podobě a každá smluvní strana obdrží její elektronické vyhotovení."
          : "Smlouva je vyhotovena ve dvou stejnopisech, z nichž každá smluvní strana obdrží po jednom.",
        "Smluvní strany prohlašují, že si smlouvu přečetly, s jejím obsahem souhlasí a na důkaz toho připojují své podpisy.",
      ],
    },
  ]);
}

export const FORMULAR_KUPNI: SekceFormulare[] = [
  {
    nadpis: "Co se prodává",
    pole: [
      {
        k: "predmet",
        label: "Předmět koupě",
        typ: "textarea",
        placeholder: "Např. notebook Lenovo ThinkPad T14, výrobní číslo …",
        sirka: "cela",
      },
      {
        k: "stav",
        label: "Stav",
        typ: "select",
        moznosti: [
          ["nova", "nová věc"],
          ["pouzita", "použitá věc"],
        ],
        sirka: "pul",
      },
      { k: "zaruka", label: "Záruka (měsíců, nepovinné)", typ: "cislo", placeholder: "Např. 24", sirka: "pul" },
    ],
  },
  {
    nadpis: "Cena a platba",
    pole: [
      { k: "cena", label: "Kupní cena", typ: "kc", placeholder: "0", sirka: "tretina" },
      {
        k: "cena_typ",
        label: "Cena je",
        typ: "select",
        moznosti: [
          ["bez_dph", "bez DPH"],
          ["vcetne_dph", "včetně DPH"],
          ["neplatce", "prodávající není plátce DPH"],
        ],
        sirka: "tretina",
      },
      {
        k: "platba",
        label: "Platba",
        typ: "select",
        moznosti: [
          ["faktura", "fakturou"],
          ["hotove", "hotově při předání"],
        ],
        sirka: "tretina",
      },
      { k: "splatnost", label: "Splatnost faktury (dní)", typ: "cislo", sirka: "tretina" },
      {
        k: "vlastnictvi",
        label: "Kupující je vlastníkem",
        typ: "select",
        moznosti: [
          ["zaplacenim", "až po zaplacení"],
          ["predanim", "hned po převzetí"],
        ],
        sirka: "tretina",
      },
    ],
  },
  {
    nadpis: "Předání",
    pole: [
      { k: "predani", label: "Předat nejpozději (nepovinné)", typ: "date", sirka: "pul" },
      { k: "misto_predani", label: "Místo předání (nepovinné)", typ: "text", placeholder: "Např. sídlo prodávajícího", sirka: "pul" },
    ],
  },
  {
    nadpis: "Další údaje",
    pole: [
      { k: "ostatni", label: "Další ujednání (nepovinné)", typ: "textarea", placeholder: "Každý odstavec na nový řádek", sirka: "cela" },
      {
        k: "vyhotoveni",
        label: "Vyhotovení",
        typ: "select",
        moznosti: [
          ["dva", "dva papírové stejnopisy"],
          ["elektronicky", "elektronicky"],
        ],
        sirka: "pul",
      },
    ],
  },
];
