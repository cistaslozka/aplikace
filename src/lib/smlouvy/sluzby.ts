import { cislo, datum, kc, text, veta, vycistit, type Clanek, type DataSmlouvy, type SekceFormulare } from "./index";

/*
  Smlouva o poskytování služeb – nepojmenovaná smlouva podle § 1746 odst. 2 občanského zákoníku.
  Pro opakované služby (správa webu, marketing, účetnictví, úklid…).
  ⚠️ Text je obecný vzor. Před spuštěním pro zákazníky ho musí zkontrolovat právník.
*/

export function vychoziSluzby(platce: boolean) {
  return {
    predmet: "",
    rozsah: "",
    zahajeni: "",
    doba: "neurcita",
    doba_do: "",
    odmena: "",
    odmena_typ: "mesicne",
    cena_typ: platce ? "bez_dph" : "neplatce",
    splatnost: "14",
    vypoved: "1",
    misto_plneni: "",
    ostatni: "",
    zastupce_my: "",
    zastupce_oni: "",
    vyhotoveni: "dva",
  };
}

export function chybySluzby(p: Record<string, unknown>): string | null {
  if (!text(p, "predmet")) return "Popište, jaké služby se budou poskytovat.";
  if ((cislo(p, "odmena") ?? 0) <= 0) return "Zadejte odměnu za služby.";
  if (text(p, "doba") === "urcita" && !datum(p, "doba_do")) return "Zadejte, do kdy smlouva platí.";
  return null;
}

const ODMENA_TYP: Record<string, string> = {
  mesicne: "za každý kalendářní měsíc",
  hodinove: "za každou započatou hodinu poskytování služeb",
  jednorazove: "jednorázově",
};

export function clankySluzby(d: DataSmlouvy): Clanek[] {
  const p = d.pole;
  const odmena = cislo(p, "odmena");
  const typ = text(p, "odmena_typ") || "mesicne";
  const dph = text(p, "cena_typ");
  const dphText =
    dph === "bez_dph"
      ? " bez DPH. K odměně bude připočtena daň z přidané hodnoty v sazbě platné ke dni uskutečnění zdanitelného plnění"
      : dph === "vcetne_dph"
        ? " včetně daně z přidané hodnoty"
        : ". Poskytovatel není plátcem daně z přidané hodnoty";
  const vypoved = cislo(p, "vypoved") ?? 1;
  const urcita = text(p, "doba") === "urcita";

  return vycistit([
    {
      nadpis: "Předmět smlouvy",
      odstavce: [
        `Poskytovatel se zavazuje poskytovat objednateli tyto služby: ${text(p, "predmet") || "…"} (dále jen „služby“).`,
        text(p, "rozsah") ? `Rozsah a podrobnosti služeb: ${veta(text(p, "rozsah"))}` : "",
        text(p, "misto_plneni") ? `Místem poskytování služeb je ${text(p, "misto_plneni")}.` : "",
        "Objednatel se zavazuje poskytovateli platit za služby odměnu podle této smlouvy a poskytovat mu součinnost potřebnou k jejich řádnému poskytování.",
      ],
    },
    {
      nadpis: "Doba trvání",
      odstavce: [
        datum(p, "zahajeni") ? `Poskytovatel zahájí poskytování služeb dne ${datum(p, "zahajeni")}.` : "",
        urcita ? `Smlouva se uzavírá na dobu určitou do ${datum(p, "doba_do") || "…"}.` : "Smlouva se uzavírá na dobu neurčitou.",
      ],
    },
    {
      nadpis: "Odměna a platební podmínky",
      odstavce: [
        `Objednatel zaplatí poskytovateli odměnu ve výši ${odmena ? kc(odmena) : "…"} ${ODMENA_TYP[typ] ?? ""}${dphText}.`,
        typ === "mesicne"
          ? `Odměnu fakturuje poskytovatel vždy po skončení kalendářního měsíce se splatností ${cislo(p, "splatnost") ?? 14} dnů ode dne vystavení faktury.`
          : typ === "hodinove"
            ? `Poskytovatel vyúčtuje odměnu podle skutečně odpracovaných hodin vždy po skončení kalendářního měsíce se splatností ${cislo(p, "splatnost") ?? 14} dnů ode dne vystavení faktury. Na vyžádání doloží výkaz hodin.`
            : `Odměnu uhradí objednatel na základě faktury se splatností ${cislo(p, "splatnost") ?? 14} dnů ode dne jejího vystavení.`,
        "V případě prodlení s úhradou je objednatel povinen zaplatit poskytovateli úrok z prodlení ve výši stanovené právními předpisy.",
      ],
    },
    {
      nadpis: "Práva a povinnosti smluvních stran",
      odstavce: [
        "Poskytovatel bude služby poskytovat s odbornou péčí, v souladu se zájmy objednatele a jeho pokyny.",
        "Objednatel předá poskytovateli včas podklady a informace potřebné k poskytování služeb.",
        "Smluvní strany zachovají mlčenlivost o důvěrných informacích, které se při plnění smlouvy dozví, a to i po skončení smlouvy.",
      ],
    },
    {
      nadpis: "Ukončení smlouvy",
      odstavce: [
        `Každá ze smluvních stran může smlouvu vypovědět i bez udání důvodu. Výpovědní doba činí ${vypoved} ${vypoved === 1 ? "měsíc" : vypoved >= 2 && vypoved <= 4 ? "měsíce" : "měsíců"} a začíná běžet prvním dnem kalendářního měsíce následujícího po doručení výpovědi druhé straně.`,
        "Smluvní strana může od smlouvy odstoupit, poruší-li druhá strana smlouvu podstatným způsobem a nezjedná nápravu ani v přiměřené lhůtě po písemném upozornění.",
        "Smlouvu lze kdykoli ukončit písemnou dohodou smluvních stran.",
      ],
    },
    text(p, "ostatni") ? { nadpis: "Další ujednání", odstavce: text(p, "ostatni").split(/\n+/) } : null,
    {
      nadpis: "Závěrečná ustanovení",
      odstavce: [
        "Tato smlouva se řídí zákonem č. 89/2012 Sb., občanský zákoník. Jde o smlouvu nepojmenovanou ve smyslu § 1746 odst. 2 občanského zákoníku.",
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

export const FORMULAR_SLUZBY: SekceFormulare[] = [
  {
    nadpis: "Služby",
    pole: [
      {
        k: "predmet",
        label: "Jaké služby",
        typ: "textarea",
        placeholder: "Např. správa a aktualizace webu, správa sociálních sítí",
        sirka: "cela",
      },
      {
        k: "rozsah",
        label: "Rozsah a podrobnosti (nepovinné)",
        typ: "textarea",
        placeholder: "Např. do 10 hodin měsíčně, reakce do 2 pracovních dnů",
        sirka: "cela",
      },
      { k: "misto_plneni", label: "Místo (nepovinné)", typ: "text", placeholder: "Např. na dálku", sirka: "cela" },
    ],
  },
  {
    nadpis: "Doba trvání",
    pole: [
      { k: "zahajeni", label: "Zahájení (nepovinné)", typ: "date", sirka: "tretina" },
      {
        k: "doba",
        label: "Smlouva je",
        typ: "select",
        moznosti: [
          ["neurcita", "na dobu neurčitou"],
          ["urcita", "na dobu určitou"],
        ],
        sirka: "tretina",
      },
      { k: "doba_do", label: "Platí do (u doby určité)", typ: "date", sirka: "tretina" },
      { k: "vypoved", label: "Výpovědní doba (měsíců)", typ: "cislo", sirka: "tretina" },
    ],
  },
  {
    nadpis: "Odměna",
    pole: [
      { k: "odmena", label: "Odměna", typ: "kc", placeholder: "0", sirka: "tretina" },
      {
        k: "odmena_typ",
        label: "Účtuje se",
        typ: "select",
        moznosti: [
          ["mesicne", "měsíčně"],
          ["hodinove", "za hodinu"],
          ["jednorazove", "jednorázově"],
        ],
        sirka: "tretina",
      },
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
      { k: "splatnost", label: "Splatnost faktury (dní)", typ: "cislo", sirka: "tretina" },
    ],
  },
  {
    nadpis: "Další údaje",
    pole: [
      { k: "ostatni", label: "Další ujednání (nepovinné)", typ: "textarea", placeholder: "Každý odstavec na nový řádek", sirka: "cela" },
      { k: "zastupce_my", label: "Za nás jedná (nepovinné)", typ: "text", placeholder: "Jméno a funkce", sirka: "pul" },
      { k: "zastupce_oni", label: "Za druhou stranu jedná (nepovinné)", typ: "text", placeholder: "Jméno a funkce", sirka: "pul" },
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
