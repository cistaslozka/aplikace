import { cislo, datum, kc, text, veta, vycistit, type Clanek, type DataSmlouvy, type SekceFormulare } from "./index";

/*
  Licenční smlouva podle § 2358 a násl. občanského zákoníku a zákona č. 121/2000 Sb., autorský zákon.
  Poskytovatel (autor nebo vykonavatel práv) dává nabyvateli svolení k užití díla.
  Výhradní licence musí být písemná (§ 2360) – smlouva z aplikace je písemná.
  ⚠️ Text je obecný vzor. Před spuštěním pro zákazníky ho musí zkontrolovat právník.
*/

export function vychoziLicence(platce: boolean) {
  return {
    dilo: "",
    autor: "",
    zpusob: "",
    vyhrada: "nevyhradni",
    uzemi: "území celého světa",
    doba: "po_celou",
    doba_do: "",
    odmena: "",
    cena_typ: platce ? "bez_dph" : "neplatce",
    splatnost: "14",
    upravy: "ano",
    podlicence: "ne",
    ostatni: "",
    zastupce_my: "",
    zastupce_oni: "",
    vyhotoveni: "dva",
  };
}

export function chybyLicence(p: Record<string, unknown>): string | null {
  if (!text(p, "dilo")) return "Popište dílo, ke kterému se licence poskytuje.";
  if (text(p, "doba") === "do" && !datum(p, "doba_do")) return "Zadejte, do kdy licence platí.";
  return null;
}

export function clankyLicence(d: DataSmlouvy): Clanek[] {
  const p = d.pole;
  const odmena = cislo(p, "odmena");
  const dph = text(p, "cena_typ");
  const dphText =
    dph === "bez_dph"
      ? " bez DPH. K odměně bude připočtena daň z přidané hodnoty v zákonné sazbě"
      : dph === "vcetne_dph"
        ? " včetně DPH"
        : "";
  const vyhradni = text(p, "vyhrada") === "vyhradni";

  return vycistit([
    {
      nadpis: "Předmět smlouvy",
      odstavce: [
        `Předmětem smlouvy je poskytnutí oprávnění k výkonu práva dílo užít (dále jen „licence“) k tomuto dílu: ${text(p, "dilo") || "…"} (dále jen „dílo“).`,
        text(p, "autor") ? `Autorem díla je ${veta(text(p, "autor"))}` : "",
        "Poskytovatel poskytuje nabyvateli licenci v rozsahu podle této smlouvy a nabyvatel licenci přijímá.",
      ],
    },
    {
      nadpis: "Rozsah licence",
      odstavce: [
        `Licence je ${vyhradni ? "výhradní. Poskytovatel nesmí po dobu trvání licence poskytnout licenci třetí osobě a sám je povinen se výkonu práva užít dílo způsobem, ke kterému licenci udělil, zdržet" : "nevýhradní. Poskytovatel je oprávněn poskytnout licenci i třetím osobám a dílo sám užívat"}.`,
        `Nabyvatel je oprávněn dílo užít ${text(p, "zpusob") ? `těmito způsoby: ${text(p, "zpusob")}` : "všemi způsoby užití známými v době uzavření smlouvy"}.`,
        `Licence se poskytuje pro ${text(p, "uzemi") || "území celého světa"}, ${text(p, "doba") === "do" ? `na dobu do ${datum(p, "doba_do") || "…"}` : "na dobu trvání majetkových práv autora k dílu"} a v neomezeném množstevním rozsahu.`,
        text(p, "upravy") === "ano"
          ? "Nabyvatel je oprávněn dílo upravovat, zpracovávat, spojovat s jinými díly a zařadit je do díla souborného."
          : "Nabyvatel není oprávněn dílo upravovat ani jinak měnit bez předchozího písemného souhlasu poskytovatele.",
        text(p, "podlicence") === "ano"
          ? "Nabyvatel je oprávněn udělit podlicenci nebo licenci postoupit třetí osobě."
          : "Nabyvatel není oprávněn udělit podlicenci ani licenci postoupit třetí osobě bez písemného souhlasu poskytovatele.",
      ],
    },
    {
      nadpis: "Odměna",
      odstavce: odmena
        ? [
            `Nabyvatel zaplatí poskytovateli za poskytnutí licence jednorázovou odměnu ve výši ${kc(odmena)}${dphText}.`,
            `Odměnu uhradí nabyvatel na základě faktury se splatností ${cislo(p, "splatnost") ?? 14} dnů ode dne jejího vystavení.`,
          ]
        : ["Licence se poskytuje bezúplatně."],
    },
    {
      nadpis: "Prohlášení poskytovatele",
      odstavce: [
        "Poskytovatel prohlašuje, že je oprávněn licenci v rozsahu této smlouvy poskytnout a že užitím díla podle této smlouvy nebudou porušena práva třetích osob.",
        "Pokud by třetí osoba uplatnila vůči nabyvateli nárok z porušení jejích práv k dílu, poskytovatel poskytne nabyvateli potřebnou součinnost.",
      ],
    },
    text(p, "ostatni") ? { nadpis: "Další ujednání", odstavce: text(p, "ostatni").split(/\n+/) } : null,
    {
      nadpis: "Závěrečná ustanovení",
      odstavce: [
        "Tato smlouva se řídí zákonem č. 89/2012 Sb., občanský zákoník, zejména ustanoveními § 2358 a násl., a zákonem č. 121/2000 Sb., autorský zákon.",
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

const ANO_NE: [string, string][] = [
  ["ano", "ano"],
  ["ne", "ne"],
];

export const FORMULAR_LICENCE: SekceFormulare[] = [
  {
    nadpis: "Dílo",
    pole: [
      {
        k: "dilo",
        label: "Jaké dílo",
        typ: "textarea",
        placeholder: "Např. sada 20 fotografií produktů z focení dne 15. 10. 2026",
        sirka: "cela",
      },
      { k: "autor", label: "Autor (nepovinné)", typ: "text", placeholder: "Jméno autora, pokud to není poskytovatel", sirka: "cela" },
    ],
  },
  {
    nadpis: "Rozsah licence",
    pole: [
      {
        k: "vyhrada",
        label: "Licence je",
        typ: "select",
        moznosti: [
          ["nevyhradni", "nevýhradní"],
          ["vyhradni", "výhradní"],
        ],
        sirka: "tretina",
      },
      {
        k: "doba",
        label: "Na dobu",
        typ: "select",
        moznosti: [
          ["po_celou", "trvání autorských práv"],
          ["do", "do určitého data"],
        ],
        sirka: "tretina",
      },
      { k: "doba_do", label: "Platí do (nepovinné)", typ: "date", sirka: "tretina" },
      {
        k: "zpusob",
        label: "Způsoby užití (nepovinné)",
        typ: "text",
        placeholder: "Prázdné = všechny způsoby. Např. na webu a v tištěných materiálech",
        sirka: "cela",
      },
      { k: "uzemi", label: "Území", typ: "text", sirka: "tretina" },
      { k: "upravy", label: "Smí dílo upravovat", typ: "select", moznosti: ANO_NE, sirka: "tretina" },
      { k: "podlicence", label: "Smí dát podlicenci", typ: "select", moznosti: ANO_NE, sirka: "tretina" },
    ],
  },
  {
    nadpis: "Odměna",
    pole: [
      { k: "odmena", label: "Odměna (prázdné = zdarma)", typ: "kc", placeholder: "0", sirka: "tretina" },
      {
        k: "cena_typ",
        label: "Odměna je",
        typ: "select",
        moznosti: [
          ["bez_dph", "bez DPH"],
          ["vcetne_dph", "včetně DPH"],
          ["neplatce", "poskytovatel není plátce DPH"],
        ],
        sirka: "tretina",
      },
      { k: "splatnost", label: "Splatnost (dní)", typ: "cislo", sirka: "tretina" },
    ],
  },
  {
    nadpis: "Další údaje",
    pole: [
      { k: "ostatni", label: "Další ujednání (nepovinné)", typ: "textarea", placeholder: "Každý odstavec na nový řádek", sirka: "cela" },
      { k: "zastupce_my", label: "Za nás jedná (nepovinné)", typ: "text", sirka: "pul" },
      { k: "zastupce_oni", label: "Za druhou stranu jedná (nepovinné)", typ: "text", sirka: "pul" },
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
