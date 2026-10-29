import { cislo, datum, kc, text, veta, vycistit, type Clanek, type DataSmlouvy, type SekceFormulare } from "./index";

/*
  Nájemní smlouva: nájem prostoru sloužícího podnikání (§ 2302 a násl.) nebo movité věci
  (§ 2201 a násl. zákona č. 89/2012 Sb., občanský zákoník). Nájem bytu sem nepatří (jiná ochrana nájemce).
  ⚠️ Text je obecný vzor. Před spuštěním pro zákazníky ho musí zkontrolovat právník.
*/

export function vychoziNajem(platce: boolean) {
  return {
    typ: "prostor",
    predmet: "",
    adresa: "",
    ucel: "",
    zahajeni: "",
    doba: "neurcita",
    doba_do: "",
    vypoved: "3",
    najemne: "",
    najemne_typ: platce ? "bez_dph" : "neplatce",
    splatnost_den: "15",
    sluzby: "",
    jistota: "",
    ostatni: "",
    vyhotoveni: "dva",
  };
}

export function chybyNajem(p: Record<string, unknown>): string | null {
  if (!text(p, "predmet")) return "Popište, co se pronajímá.";
  if (text(p, "typ") === "prostor" && !text(p, "adresa")) return "Zadejte adresu prostoru.";
  if ((cislo(p, "najemne") ?? 0) <= 0) return "Zadejte nájemné.";
  if (text(p, "doba") === "urcita" && !datum(p, "doba_do")) return "Zadejte, do kdy nájem trvá.";
  return null;
}

export function clankyNajem(d: DataSmlouvy): Clanek[] {
  const p = d.pole;
  const prostor = text(p, "typ") === "prostor";
  const najemne = cislo(p, "najemne");
  const typ = text(p, "najemne_typ");
  const dph =
    typ === "bez_dph"
      ? " bez DPH. K nájemnému bude připočtena daň z přidané hodnoty v zákonné sazbě"
      : typ === "vcetne_dph"
        ? " včetně daně z přidané hodnoty"
        : ". Pronajímatel není plátcem daně z přidané hodnoty";
  const sluzby = cislo(p, "sluzby");
  const jistota = cislo(p, "jistota");
  const vypoved = cislo(p, "vypoved") ?? 3;
  const mesicu = vypoved === 1 ? "měsíc" : vypoved >= 2 && vypoved <= 4 ? "měsíce" : "měsíců";

  return vycistit([
    {
      nadpis: "Předmět nájmu",
      odstavce: [
        prostor
          ? `Pronajímatel přenechává nájemci k dočasnému užívání prostor sloužící podnikání: ${text(p, "predmet") || "…"}, na adrese ${text(p, "adresa") || "…"} (dále jen „předmět nájmu“).`
          : `Pronajímatel přenechává nájemci k dočasnému užívání věc: ${text(p, "predmet") || "…"} (dále jen „předmět nájmu“).`,
        text(p, "ucel") ? `Nájemce bude předmět nájmu užívat k tomuto účelu: ${veta(text(p, "ucel"))}` : "",
        "Pronajímatel prohlašuje, že je oprávněn předmět nájmu pronajmout a že je ve stavu způsobilém k ujednanému užívání.",
      ],
    },
    {
      nadpis: "Doba nájmu",
      odstavce: [
        datum(p, "zahajeni") ? `Nájem začíná dnem ${datum(p, "zahajeni")}, kdy pronajímatel předá předmět nájmu nájemci.` : "",
        text(p, "doba") === "urcita"
          ? `Nájem se sjednává na dobu určitou do ${datum(p, "doba_do") || "…"}.`
          : "Nájem se sjednává na dobu neurčitou.",
        prostor && text(p, "doba") === "urcita"
          ? "Nájem na dobu určitou lze vypovědět z důvodů uvedených v § 2308 a 2309 občanského zákoníku, s tříměsíční výpovědní dobou."
          : prostor
            ? `Kterákoli strana může nájem vypovědět s výpovědní dobou ${vypoved} ${mesicu}; výpověď musí být písemná a doručená druhé straně.`
            : `Kterákoli strana může nájem vypovědět s výpovědní dobou ${vypoved} ${mesicu}, která začíná běžet dnem doručení písemné výpovědi.`,
      ],
    },
    {
      nadpis: "Nájemné a platby",
      odstavce: [
        `Nájemce platí pronajímateli nájemné ve výši ${najemne ? kc(najemne) : "…"} měsíčně${dph}.`,
        `Nájemné je splatné vždy do ${cislo(p, "splatnost_den") ?? 15}. dne kalendářního měsíce, za který se platí, na účet pronajímatele.`,
        sluzby
          ? `Vedle nájemného platí nájemce měsíční zálohy na služby spojené s užíváním (zejména energie, voda, odvoz odpadu) ve výši ${kc(sluzby)}. Zálohy pronajímatel jednou ročně vyúčtuje podle skutečných nákladů.`
          : "",
        jistota
          ? `Nájemce složí pronajímateli před předáním předmětu nájmu jistotu ve výši ${kc(jistota)}. Pronajímatel ji po skončení nájmu vrátí, po započtení případných dluhů nájemce.`
          : "",
        "V případě prodlení s placením je nájemce povinen zaplatit úrok z prodlení ve výši stanovené právními předpisy.",
      ],
    },
    {
      nadpis: "Práva a povinnosti smluvních stran",
      odstavce: [
        "Nájemce bude předmět nájmu užívat řádně a k ujednanému účelu, udržovat jej a hradit běžnou údržbu a drobné opravy.",
        "Nájemce nesmí bez předchozího písemného souhlasu pronajímatele předmět nájmu měnit ani jej přenechat k užívání třetí osobě.",
        "Pronajímatel zajistí nájemci nerušené užívání předmětu nájmu po dobu nájmu a provádí opravy, které nejsou povinností nájemce.",
        "Po skončení nájmu nájemce předmět nájmu vrátí ve stavu, v jakém jej převzal, s přihlédnutím k obvyklému opotřebení. O předání a vrácení sepíší strany předávací protokol.",
      ],
    },
    text(p, "ostatni") ? { nadpis: "Další ujednání", odstavce: text(p, "ostatni").split(/\n+/) } : null,
    {
      nadpis: "Závěrečná ustanovení",
      odstavce: [
        `Tato smlouva se řídí zákonem č. 89/2012 Sb., občanský zákoník, zejména ustanoveními § 2201 a násl.${prostor ? " a § 2302 a násl." : ""}`,
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

export const FORMULAR_NAJEM: SekceFormulare[] = [
  {
    nadpis: "Co se pronajímá",
    pole: [
      {
        k: "typ",
        label: "Předmět nájmu",
        typ: "select",
        moznosti: [
          ["prostor", "prostor pro podnikání (kancelář, sklad, provozovna)"],
          ["vec", "věc (stroj, auto, vybavení)"],
        ],
        sirka: "cela",
      },
      { k: "predmet", label: "Popis", typ: "textarea", placeholder: "Např. kancelář č. 12 o výměře 24 m² ve 2. patře", sirka: "cela" },
      { k: "adresa", label: "Adresa (u prostoru)", typ: "text", placeholder: "Ulice, číslo, obec", sirka: "pul" },
      { k: "ucel", label: "Účel užívání (nepovinné)", typ: "text", placeholder: "Např. kancelář pro grafické studio", sirka: "pul" },
    ],
  },
  {
    nadpis: "Doba nájmu",
    pole: [
      { k: "zahajeni", label: "Začátek nájmu (nepovinné)", typ: "date", sirka: "pul" },
      {
        k: "doba",
        label: "Nájem je",
        typ: "select",
        moznosti: [
          ["neurcita", "na dobu neurčitou"],
          ["urcita", "na dobu určitou"],
        ],
        sirka: "pul",
      },
      { k: "doba_do", label: "Do (u doby určité)", typ: "date", sirka: "pul" },
      { k: "vypoved", label: "Výpovědní doba (měsíců)", typ: "cislo", sirka: "pul" },
    ],
  },
  {
    nadpis: "Nájemné",
    pole: [
      { k: "najemne", label: "Nájemné za měsíc", typ: "kc", placeholder: "0", sirka: "tretina" },
      {
        k: "najemne_typ",
        label: "Nájemné je",
        typ: "select",
        moznosti: [
          ["bez_dph", "bez DPH"],
          ["vcetne_dph", "včetně DPH"],
          ["neplatce", "pronajímatel není plátce DPH"],
        ],
        sirka: "tretina",
      },
      { k: "splatnost_den", label: "Splatné do (den v měsíci)", typ: "cislo", sirka: "tretina" },
      { k: "sluzby", label: "Zálohy na služby měsíčně (nepovinné)", typ: "kc", placeholder: "0", sirka: "pul" },
      { k: "jistota", label: "Jistota / kauce (nepovinné)", typ: "kc", placeholder: "0", sirka: "pul" },
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
