import { cislo, kc, text, vycistit, type Clanek, type DataSmlouvy, type SekceFormulare } from "./index";

/*
  Dohoda o mlčenlivosti (NDA) – nepojmenovaná smlouva podle § 1746 odst. 2 občanského zákoníku,
  ochrana obchodního tajemství podle § 504 občanského zákoníku.
  ⚠️ Text je obecný vzor. Před spuštěním pro zákazníky ho musí zkontrolovat právník.
*/

export function vychoziNda() {
  return {
    smer: "vzajemna",
    ucel: "",
    informace: "",
    doba: "5",
    pokuta: "",
    ostatni: "",
    zastupce_my: "",
    zastupce_oni: "",
    vyhotoveni: "dva",
  };
}

export function chybyNda(p: Record<string, unknown>): string | null {
  if (!text(p, "ucel")) return "Napište, proč si budete informace sdělovat (účel spolupráce).";
  if ((cislo(p, "doba") ?? 0) <= 0) return "Zadejte, na kolik let platí mlčenlivost.";
  return null;
}

export function clankyNda(d: DataSmlouvy): Clanek[] {
  const p = d.pole;
  const smer = text(p, "smer");
  // kdo informace poskytuje a kdo je chrání
  const kdo =
    smer === "my"
      ? { pos: "Strana A", prij: "Strana B" }
      : smer === "oni"
        ? { pos: "Strana B", prij: "Strana A" }
        : null;
  // Strana A = ta, kdo je ve smlouvě první (podle volby „Jsem strana A“)
  const roky = cislo(p, "doba") ?? 5;
  const pokuta = cislo(p, "pokuta");

  return vycistit([
    {
      nadpis: "Účel dohody",
      odstavce: [
        `Smluvní strany spolu jednají o spolupráci v této oblasti: ${text(p, "ucel") || "…"} (dále jen „spolupráce“).`,
        kdo
          ? `V souvislosti se spoluprací poskytne ${kdo.pos} straně ${kdo.prij.replace("Strana ", "")} důvěrné informace. ${kdo.prij} se zavazuje je chránit podle této dohody.`
          : "V souvislosti se spoluprací si smluvní strany navzájem poskytnou důvěrné informace a obě se zavazují je chránit podle této dohody.",
      ],
    },
    {
      nadpis: "Důvěrné informace",
      odstavce: [
        "Důvěrnými informacemi se rozumí veškeré informace obchodní, technické, finanční či jiné povahy, které smluvní strana druhé straně zpřístupní v souvislosti se spoluprací, bez ohledu na formu, a to včetně obchodního tajemství ve smyslu § 504 občanského zákoníku.",
        text(p, "informace") ? `Za důvěrné se považují zejména: ${text(p, "informace")}` : "",
        "Důvěrnými informacemi nejsou informace, které jsou nebo se stanou veřejně známými jinak než porušením této dohody, které přijímající strana prokazatelně znala před jejich zpřístupněním, nebo které je povinna sdělit na základě zákona či rozhodnutí orgánu veřejné moci.",
      ],
    },
    {
      nadpis: "Povinnosti smluvních stran",
      odstavce: [
        "Přijímající strana nesdělí důvěrné informace třetí osobě a nepoužije je k jinému účelu než ke spolupráci.",
        "Přijímající strana zpřístupní důvěrné informace jen svým zaměstnancům a spolupracovníkům, kteří je nezbytně potřebují znát a jsou vázáni povinností mlčenlivosti alespoň ve stejném rozsahu.",
        "Na výzvu poskytující strany přijímající strana důvěrné informace vrátí nebo zničí, včetně jejich kopií, a na požádání to písemně potvrdí.",
      ],
    },
    {
      nadpis: "Doba trvání",
      odstavce: [
        `Povinnost mlčenlivosti trvá po dobu ${roky} ${roky === 1 ? "roku" : "let"} ode dne uzavření této dohody, a to i v případě, že ke spolupráci nedojde nebo skončí dříve.`,
      ],
    },
    pokuta
      ? {
          nadpis: "Smluvní pokuta",
          odstavce: [
            `Poruší-li smluvní strana povinnost mlčenlivosti podle této dohody, je povinna zaplatit druhé straně smluvní pokutu ve výši ${kc(pokuta)} za každé jednotlivé porušení. Zaplacením smluvní pokuty není dotčeno právo na náhradu škody.`,
          ],
        }
      : null,
    text(p, "ostatni") ? { nadpis: "Další ujednání", odstavce: text(p, "ostatni").split(/\n+/) } : null,
    {
      nadpis: "Závěrečná ustanovení",
      odstavce: [
        "Tato dohoda se řídí zákonem č. 89/2012 Sb., občanský zákoník. Jde o smlouvu nepojmenovanou ve smyslu § 1746 odst. 2 občanského zákoníku.",
        "Dohodu lze měnit nebo doplňovat pouze písemnými dodatky podepsanými oběma smluvními stranami.",
        "Dohoda nabývá platnosti a účinnosti dnem jejího podpisu oběma smluvními stranami.",
        text(p, "vyhotoveni") === "elektronicky"
          ? "Dohoda je uzavřena v elektronické podobě a každá smluvní strana obdrží její elektronické vyhotovení."
          : "Dohoda je vyhotovena ve dvou stejnopisech, z nichž každá smluvní strana obdrží po jednom.",
        "Smluvní strany prohlašují, že si dohodu přečetly, s jejím obsahem souhlasí a na důkaz toho připojují své podpisy.",
      ],
    },
  ]);
}

export const FORMULAR_NDA: SekceFormulare[] = [
  {
    nadpis: "O čem je dohoda",
    pole: [
      {
        k: "smer",
        label: "Kdo informace poskytuje",
        typ: "select",
        moznosti: [
          ["vzajemna", "obě strany navzájem"],
          ["my", "jen strana A"],
          ["oni", "jen strana B"],
        ],
        sirka: "cela",
      },
      { k: "ucel", label: "Účel spolupráce", typ: "textarea", placeholder: "Např. příprava společného e-shopu a cenové nabídky", sirka: "cela" },
      { k: "informace", label: "Co hlavně chránit (nepovinné)", typ: "textarea", placeholder: "Např. ceníky, seznam zákazníků, zdrojové kódy", sirka: "cela" },
    ],
  },
  {
    nadpis: "Doba a sankce",
    pole: [
      { k: "doba", label: "Mlčenlivost platí (let)", typ: "cislo", sirka: "pul" },
      { k: "pokuta", label: "Smluvní pokuta za porušení (nepovinné)", typ: "kc", placeholder: "Např. 100000", sirka: "pul" },
    ],
  },
  {
    nadpis: "Další údaje",
    pole: [
      { k: "ostatni", label: "Další ujednání (nepovinné)", typ: "textarea", placeholder: "Každý odstavec na nový řádek", sirka: "cela" },
      { k: "zastupce_my", label: "Za nás jedná (nepovinné)", typ: "text", sirka: "pul" },
      { k: "zastupce_oni", label: "Za druhou stranu jedná (nepovinné)", typ: "text", sirka: "pul" },
      { k: "vyhotoveni", label: "Vyhotovení", typ: "select", moznosti: [["dva", "dva papírové stejnopisy"], ["elektronicky", "elektronicky"]], sirka: "pul" },
    ],
  },
];
