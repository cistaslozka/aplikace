import { cislo, datum, text, veta, vycistit, type Clanek, type DataSmlouvy, type SekceFormulare } from "./index";

/*
  Rámcová smlouva o spolupráci (B2B) – nepojmenovaná smlouva podle § 1746 odst. 2 občanského zákoníku.
  Upravuje obecné podmínky; jednotlivé dodávky se sjednávají objednávkami.
  ⚠️ Text je obecný vzor. Před spuštěním pro zákazníky ho musí zkontrolovat právník.
*/

export function vychoziRamcova() {
  return {
    predmet: "",
    objednavky: "e-mailem",
    potvrzeni: "3",
    ceny: "nabidka",
    splatnost: "14",
    doba: "neurcita",
    doba_do: "",
    vypoved: "3",
    mlcenlivost: "ano",
    ostatni: "",
    vyhotoveni: "dva",
  };
}

export function chybyRamcova(p: Record<string, unknown>): string | null {
  if (!text(p, "predmet")) return "Popište, v čem budete spolupracovat.";
  if (text(p, "doba") === "urcita" && !datum(p, "doba_do")) return "Zadejte, do kdy smlouva platí.";
  return null;
}

const CENY: Record<string, string> = {
  nabidka: "podle cenové nabídky dodavatele platné ke dni potvrzení objednávky",
  cenik: "podle aktuálního ceníku dodavatele, který dodavatel odběrateli poskytne na vyžádání",
  objednavka: "dohodou v každé jednotlivé objednávce",
};

export function clankyRamcova(d: DataSmlouvy): Clanek[] {
  const p = d.pole;
  const vypoved = cislo(p, "vypoved") ?? 3;
  const mesicu = vypoved === 1 ? "měsíc" : vypoved >= 2 && vypoved <= 4 ? "měsíce" : "měsíců";
  return vycistit([
    {
      nadpis: "Předmět smlouvy",
      odstavce: [
        `Předmětem této smlouvy je úprava podmínek dlouhodobé spolupráce smluvních stran v této oblasti: ${text(p, "predmet") ? veta(text(p, "predmet")) : "…"}`,
        "Jednotlivá plnění (dodávky zboží, služeb nebo děl) budou sjednávána samostatnými objednávkami odběratele a jejich potvrzením dodavatelem. Pro každé takové plnění platí tato smlouva, pokud se strany v objednávce výslovně nedohodnou jinak.",
        "Tato smlouva nezakládá povinnost odběratele objednávat ani povinnost dodavatele každou objednávku přijmout.",
      ],
    },
    {
      nadpis: "Objednávky",
      odstavce: [
        `Odběratel zasílá objednávky ${text(p, "objednavky") || "písemně"}. Objednávka obsahuje alespoň druh a rozsah plnění, požadovaný termín a místo plnění.`,
        `Dodavatel objednávku potvrdí nebo odmítne do ${cislo(p, "potvrzeni") ?? 3} pracovních dnů od jejího doručení. Potvrzením objednávky vzniká mezi stranami dílčí smlouva.`,
      ],
    },
    {
      nadpis: "Cena a platební podmínky",
      odstavce: [
        `Cena jednotlivých plnění je stanovena ${CENY[text(p, "ceny")] ?? CENY.nabidka}.`,
        `Dodavatel vyúčtuje každé plnění fakturou se splatností ${cislo(p, "splatnost") ?? 14} dnů ode dne jejího vystavení.`,
        "V případě prodlení s úhradou je odběratel povinen zaplatit dodavateli úrok z prodlení ve výši stanovené právními předpisy.",
      ],
    },
    {
      nadpis: "Práva a povinnosti smluvních stran",
      odstavce: [
        "Dodavatel bude plnit s odbornou péčí, v dohodnuté kvalitě a termínech.",
        "Odběratel poskytne dodavateli včas informace a součinnost potřebnou k řádnému plnění.",
        "Práva z vadného plnění se řídí ustanoveními občanského zákoníku pro příslušný druh plnění.",
        text(p, "mlcenlivost") === "ano"
          ? "Smluvní strany zachovají mlčenlivost o důvěrných informacích, které se dozví v souvislosti se spoluprací, a to i po skončení této smlouvy."
          : "",
      ],
    },
    {
      nadpis: "Doba trvání a ukončení",
      odstavce: [
        text(p, "doba") === "urcita"
          ? `Smlouva se uzavírá na dobu určitou do ${datum(p, "doba_do") || "…"}.`
          : "Smlouva se uzavírá na dobu neurčitou.",
        `Každá ze smluvních stran může smlouvu vypovědět i bez udání důvodu. Výpovědní doba činí ${vypoved} ${mesicu} a začíná běžet prvním dnem kalendářního měsíce následujícího po doručení výpovědi.`,
        "Ukončením této smlouvy nejsou dotčena práva a povinnosti z objednávek potvrzených před jejím ukončením.",
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

export const FORMULAR_RAMCOVA: SekceFormulare[] = [
  {
    nadpis: "Spolupráce",
    pole: [
      {
        k: "predmet",
        label: "V čem spolupracujete",
        typ: "textarea",
        placeholder: "Např. opakované dodávky tiskovin a grafických prací",
        sirka: "cela",
      },
      { k: "objednavky", label: "Jak se objednává", typ: "text", placeholder: "Např. e-mailem na adresu …", sirka: "pul" },
      { k: "potvrzeni", label: "Potvrzení objednávky do (prac. dnů)", typ: "cislo", sirka: "pul" },
    ],
  },
  {
    nadpis: "Ceny a platba",
    pole: [
      {
        k: "ceny",
        label: "Ceny se určí",
        typ: "select",
        moznosti: [
          ["nabidka", "podle cenové nabídky"],
          ["cenik", "podle ceníku"],
          ["objednavka", "v každé objednávce"],
        ],
        sirka: "pul",
      },
      { k: "splatnost", label: "Splatnost faktur (dní)", typ: "cislo", sirka: "pul" },
    ],
  },
  {
    nadpis: "Doba trvání",
    pole: [
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
    nadpis: "Další údaje",
    pole: [
      {
        k: "mlcenlivost",
        label: "Mlčenlivost",
        typ: "select",
        moznosti: [
          ["ano", "ano, zahrnout"],
          ["ne", "ne"],
        ],
        sirka: "pul",
      },
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
      { k: "ostatni", label: "Další ujednání (nepovinné)", typ: "textarea", placeholder: "Každý odstavec na nový řádek", sirka: "cela" },
    ],
  },
];
