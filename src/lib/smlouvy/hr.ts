import { cislo, datum, kc, text, veta, vycistit, type Clanek, type DataSmlouvy, type PoleFormulare, type SekceFormulare } from "./index";

/*
  HR dokumenty podle zákona č. 262/2006 Sb., zákoník práce, ve znění tzv. flexinovely (zák. č. 120/2025 Sb.,
  účinné od 1. 6. 2025): výpovědní doba běží ode dne doručení výpovědi, zkušební doba nejvýš 4 měsíce
  (u vedoucích 8 měsíců).
  Zaměstnanec se zadává přímo ve formuláři (pole zam_jmeno, narozeni, bydliste), ne z adresáře klientů.
  ⚠️ Texty jsou obecné vzory. Před spuštěním pro zákazníky je musí zkontrolovat právník.
*/

/** Minimální mzda pro rok 2026 (nařízení vlády): 22 400 Kč měsíčně, 134,40 Kč za hodinu. */
export const MINIMALNI_MZDA = { rok: 2026, mesicni: 22400, hodinova: 134.4 };

const ZAMESTNANEC: SekceFormulare = {
  nadpis: "Zaměstnanec",
  pole: [
    { k: "zam_jmeno", label: "Jméno a příjmení", typ: "text", sirka: "pul" },
    { k: "narozeni", label: "Datum narození", typ: "date", sirka: "pul" },
    { k: "bydliste", label: "Bydliště", typ: "text", placeholder: "Ulice a číslo, PSČ a obec", sirka: "cela" },
  ],
};
const VYHOTOVENI: PoleFormulare = {
  k: "vyhotoveni",
  label: "Vyhotovení",
  typ: "select",
  moznosti: [
    ["dva", "dva papírové stejnopisy"],
    ["elektronicky", "elektronicky"],
  ],
  sirka: "pul",
};
const OSTATNI: PoleFormulare = {
  k: "ostatni",
  label: "Další ujednání (nepovinné)",
  typ: "textarea",
  placeholder: "Každý odstavec na nový řádek",
  sirka: "cela",
};
const zakladZamestnance = { zam_jmeno: "", narozeni: "", bydliste: "", ostatni: "", vyhotoveni: "dva" };

function chybaZamestnance(p: Record<string, unknown>): string | null {
  if (!text(p, "zam_jmeno")) return "Napište jméno zaměstnance.";
  if (!datum(p, "narozeni")) return "Zadejte datum narození zaměstnance.";
  return null;
}

const mesice = (n: number) => (n === 1 ? "měsíc" : n >= 2 && n <= 4 ? "měsíce" : "měsíců");

function zaver(p: Record<string, unknown>, dokument: string, zakon = "zákonem č. 262/2006 Sb., zákoník práce"): Clanek {
  return {
    nadpis: "Závěrečná ustanovení",
    odstavce: [
      `Práva a povinnosti neupravené v této ${dokument} se řídí ${zakon}, ve znění pozdějších předpisů.`,
      `Tuto ${dokument === "smlouvě" ? "smlouvu" : "dohodu"} lze měnit pouze písemně.`,
      text(p, "vyhotoveni") === "elektronicky"
        ? "Dokument je vyhotoven v elektronické podobě a každá strana obdrží jeho elektronické vyhotovení."
        : "Dokument je vyhotoven ve dvou stejnopisech, z nichž každá strana obdrží po jednom.",
      "Strany prohlašují, že si dokument přečetly, s jeho obsahem souhlasí a na důkaz toho připojují své podpisy.",
    ],
  };
}

const ostatni = (p: Record<string, unknown>): Clanek | null =>
  text(p, "ostatni") ? { nadpis: "Další ujednání", odstavce: text(p, "ostatni").split(/\n+/) } : null;

// ——— Pracovní smlouva (§ 34 ZP) ———

export const vychoziHpp = () => ({
  ...zakladZamestnance,
  druh_prace: "",
  popis_prace: "",
  misto: "",
  nastup: "",
  doba: "neurcita",
  doba_do: "",
  zkusebni: "3",
  uvazek: "40",
  mzda: "",
  mzda_typ: "mesicni",
  dovolena: "4",
  vypoved: "2",
});

export function chybyHpp(p: Record<string, unknown>): string | null {
  const z = chybaZamestnance(p);
  if (z) return z;
  if (!text(p, "druh_prace")) return "Napište druh práce (pozici).";
  if (!text(p, "misto")) return "Napište místo výkonu práce.";
  if (!datum(p, "nastup")) return "Zadejte den nástupu do práce.";
  if (text(p, "doba") === "urcita" && !datum(p, "doba_do")) return "Zadejte, do kdy pracovní poměr trvá.";
  const zk = cislo(p, "zkusebni") ?? 0;
  if (zk < 0 || zk > 4) return "Zkušební doba může být nejvýš 4 měsíce (u vedoucích zaměstnanců 8).";
  return null;
}

export function clankyHpp(d: DataSmlouvy): Clanek[] {
  const p = d.pole;
  const zk = cislo(p, "zkusebni") ?? 0;
  const uvazek = cislo(p, "uvazek") ?? 40;
  const mzda = cislo(p, "mzda");
  const vyp = cislo(p, "vypoved") ?? 2;
  return vycistit([
    {
      nadpis: "Druh práce, místo výkonu práce a den nástupu",
      odstavce: [
        `Zaměstnanec bude u zaměstnavatele vykonávat práci na pozici: ${text(p, "druh_prace") || "…"}.`,
        text(p, "popis_prace") ? `Náplň práce: ${veta(text(p, "popis_prace"))}` : "",
        `Místem výkonu práce je ${text(p, "misto") ? veta(text(p, "misto")) : "…"}`,
        `Dnem nástupu do práce je ${datum(p, "nastup") || "…"}.`,
      ],
    },
    {
      nadpis: "Doba trvání a zkušební doba",
      odstavce: [
        text(p, "doba") === "urcita"
          ? `Pracovní poměr se sjednává na dobu určitou do ${datum(p, "doba_do") || "…"}.`
          : "Pracovní poměr se sjednává na dobu neurčitou.",
        zk > 0
          ? `Sjednává se zkušební doba v délce ${zk} ${mesice(zk)} ode dne vzniku pracovního poměru. Zkušební doba se prodlužuje o dny celodenních překážek v práci a celodenní dovolené (§ 35 zákoníku práce).`
          : "Zkušební doba se nesjednává.",
      ],
    },
    {
      nadpis: "Pracovní doba a dovolená",
      odstavce: [
        uvazek >= 37.5
          ? `Stanovená týdenní pracovní doba činí ${String(uvazek).replace(".", ",")} hodin.`
          : `Sjednává se kratší pracovní doba v rozsahu ${String(uvazek).replace(".", ",")} hodin týdně.`,
        `Zaměstnanci přísluší dovolená v délce ${cislo(p, "dovolena") ?? 4} týdnů za kalendářní rok, za podmínek stanovených zákoníkem práce.`,
      ],
    },
    {
      nadpis: "Mzda",
      odstavce: [
        mzda
          ? `Za vykonanou práci přísluší zaměstnanci mzda ve výši ${kc(mzda)} ${text(p, "mzda_typ") === "hodinova" ? "za hodinu" : "měsíčně"}. Podrobnosti může upravit mzdový výměr.`
          : "Mzda je stanovena mzdovým výměrem, který zaměstnavatel zaměstnanci vydá nejpozději v den nástupu do práce.",
        "Mzda je splatná pozadu za měsíční období, nejpozději v kalendářním měsíci následujícím po měsíci, ve kterém vzniklo právo na mzdu, a vyplácí se na platební účet zaměstnance.",
      ],
    },
    {
      nadpis: "Skončení pracovního poměru",
      odstavce: [
        `Výpovědní doba činí ${vyp} ${mesice(vyp)}, nestanoví-li zákoník práce jinak. Výpovědní doba začíná dnem doručení výpovědi druhé straně a končí uplynutím dne, který se číslem shoduje se dnem doručení (§ 51 zákoníku práce).`,
        "Pracovní poměr lze dále skončit dohodou, okamžitým zrušením nebo zrušením ve zkušební době za podmínek zákoníku práce.",
      ],
    },
    {
      nadpis: "Další ujednání a informace",
      odstavce: [
        "Zaměstnanec se zavazuje vykonávat práci osobně, podle pokynů zaměstnavatele a dodržovat povinnosti vyplývající z jeho pracovního poměru, zejména předpisy o bezpečnosti a ochraně zdraví při práci.",
        "Zaměstnavatel se zavazuje přidělovat zaměstnanci práci podle této smlouvy, platit mu mzdu a vytvářet podmínky pro plnění jeho pracovních úkolů.",
        "Tato smlouva obsahuje i informace o obsahu pracovního poměru podle § 37 zákoníku práce; další informace (např. o rozvržení pracovní doby a o školení) poskytne zaměstnavatel písemně.",
      ],
    },
    ostatni(p),
    zaver(p, "smlouvě"),
  ]);
}

export const FORMULAR_HPP: SekceFormulare[] = [
  ZAMESTNANEC,
  {
    nadpis: "Práce",
    pole: [
      { k: "druh_prace", label: "Druh práce (pozice)", typ: "text", placeholder: "Např. grafik", sirka: "pul" },
      { k: "misto", label: "Místo výkonu práce", typ: "text", placeholder: "Např. Brno, sídlo zaměstnavatele", sirka: "pul" },
      { k: "popis_prace", label: "Náplň práce (nepovinné)", typ: "textarea", sirka: "cela" },
      { k: "nastup", label: "Den nástupu", typ: "date", sirka: "tretina" },
      {
        k: "doba",
        label: "Pracovní poměr",
        typ: "select",
        moznosti: [
          ["neurcita", "na dobu neurčitou"],
          ["urcita", "na dobu určitou"],
        ],
        sirka: "tretina",
      },
      { k: "doba_do", label: "Do (u doby určité)", typ: "date", sirka: "tretina" },
    ],
  },
  {
    nadpis: "Podmínky",
    pole: [
      { k: "zkusebni", label: "Zkušební doba (měsíců)", typ: "cislo", napoveda: "0–4 měsíce. Nula = bez zkušební doby.", sirka: "tretina" },
      { k: "uvazek", label: "Hodin týdně", typ: "cislo", napoveda: "Plný úvazek 40 h.", sirka: "tretina" },
      { k: "dovolena", label: "Dovolená (týdnů)", typ: "cislo", napoveda: "Nejméně 4 týdny.", sirka: "tretina" },
      {
        k: "mzda",
        label: "Mzda (nepovinné)",
        typ: "kc",
        napoveda: `Minimální mzda ${MINIMALNI_MZDA.rok}: ${kc(MINIMALNI_MZDA.mesicni)} měsíčně.`,
        sirka: "tretina",
      },
      {
        k: "mzda_typ",
        label: "Mzda je",
        typ: "select",
        moznosti: [
          ["mesicni", "měsíční"],
          ["hodinova", "hodinová"],
        ],
        sirka: "tretina",
      },
      { k: "vypoved", label: "Výpovědní doba (měsíců)", typ: "cislo", sirka: "tretina" },
    ],
  },
  { nadpis: "Další údaje", pole: [OSTATNI, VYHOTOVENI] },
];

// ——— Dohoda o provedení práce (§ 75 ZP) a o pracovní činnosti (§ 76 ZP) ———

export const vychoziDpp = () => ({
  ...zakladZamestnance,
  prace: "",
  rozsah: "",
  od: "",
  do: "",
  odmena: "",
  odmena_typ: "hodinova",
  misto: "",
});
export const vychoziDpc = () => ({
  ...zakladZamestnance,
  prace: "",
  rozsah: "",
  od: "",
  do: "",
  odmena: "",
  odmena_typ: "hodinova",
  misto: "",
});

export function chybyDpp(p: Record<string, unknown>): string | null {
  const z = chybaZamestnance(p);
  if (z) return z;
  if (!text(p, "prace")) return "Popište, jakou práci bude vykonávat.";
  const r = cislo(p, "rozsah") ?? 0;
  if (r <= 0 || r > 300) return "Rozsah práce na DPP může být nejvýš 300 hodin v kalendářním roce.";
  if ((cislo(p, "odmena") ?? 0) <= 0) return "Zadejte odměnu.";
  return null;
}
export function chybyDpc(p: Record<string, unknown>): string | null {
  const z = chybaZamestnance(p);
  if (z) return z;
  if (!text(p, "prace")) return "Popište, jakou práci bude vykonávat.";
  const r = cislo(p, "rozsah") ?? 0;
  if (r <= 0 || r > 20) return "Rozsah práce na DPČ může být v průměru nejvýš 20 hodin týdně.";
  if ((cislo(p, "odmena") ?? 0) <= 0) return "Zadejte odměnu.";
  return null;
}

function clankyDohody(d: DataSmlouvy, dpp: boolean): Clanek[] {
  const p = d.pole;
  const odmena = cislo(p, "odmena");
  const za =
    text(p, "odmena_typ") === "celkem"
      ? "za celý sjednaný úkol"
      : text(p, "odmena_typ") === "mesicni"
        ? "měsíčně"
        : "za každou odpracovanou hodinu";
  return vycistit([
    {
      nadpis: "Předmět dohody",
      odstavce: [
        `Zaměstnanec se zavazuje pro zaměstnavatele vykonávat tuto práci: ${text(p, "prace") ? veta(text(p, "prace")) : "…"}`,
        text(p, "misto") ? `Místem výkonu práce je ${veta(text(p, "misto"))}` : "",
        dpp
          ? `Předpokládaný rozsah práce je ${cislo(p, "rozsah") ?? "…"} hodin. Rozsah práce u zaměstnavatele nesmí v kalendářním roce překročit 300 hodin (§ 75 zákoníku práce).`
          : `Rozsah práce je v průměru ${cislo(p, "rozsah") ?? "…"} hodin týdně a nesmí překročit polovinu stanovené týdenní pracovní doby, posuzováno za celou dobu, na kterou je dohoda uzavřena, nejdéle za 52 týdnů (§ 76 zákoníku práce).`,
      ],
    },
    {
      nadpis: "Doba trvání",
      odstavce: [
        datum(p, "od") ? `Dohoda se uzavírá s účinností od ${datum(p, "od")}.` : "Dohoda nabývá účinnosti dnem podpisu.",
        datum(p, "do") ? `Dohoda se uzavírá na dobu určitou do ${datum(p, "do")}.` : "Dohoda se uzavírá na dobu neurčitou.",
        "Dohodu lze zrušit dohodou stran ke sjednanému dni nebo výpovědí z jakéhokoli důvodu i bez uvedení důvodu s patnáctidenní výpovědní dobou, která začíná dnem doručení výpovědi (§ 77 odst. 4 zákoníku práce).",
      ],
    },
    {
      nadpis: "Odměna",
      odstavce: [
        `Za vykonanou práci přísluší zaměstnanci odměna ${odmena ? kc(odmena) : "…"} ${za}.`,
        "Odměna je splatná pozadu, nejpozději v kalendářním měsíci následujícím po měsíci, v němž byla práce vykonána, a vyplácí se na platební účet zaměstnance.",
      ],
    },
    {
      nadpis: "Práva a povinnosti",
      odstavce: [
        "Zaměstnanec bude práci vykonávat osobně, svědomitě a podle pokynů zaměstnavatele a dodržovat předpisy o bezpečnosti a ochraně zdraví při práci.",
        "Zaměstnavatel seznámí zaměstnance s rozvržením pracovní doby písemně nejpozději 3 dny před začátkem směny, nedohodnou-li se strany jinak (§ 74 odst. 2 zákoníku práce).",
        "Zaměstnanci přísluší dovolená, příplatky a další práva za podmínek, které pro práci konanou mimo pracovní poměr stanoví zákoník práce.",
      ],
    },
    ostatni(p),
    zaver(p, "dohodě"),
  ]);
}
export const clankyDpp = (d: DataSmlouvy) => clankyDohody(d, true);
export const clankyDpc = (d: DataSmlouvy) => clankyDohody(d, false);

const formularDohody = (dpp: boolean): SekceFormulare[] => [
  ZAMESTNANEC,
  {
    nadpis: "Práce",
    pole: [
      {
        k: "prace",
        label: "Jaká práce",
        typ: "textarea",
        placeholder: dpp ? "Např. výpomoc s balením zásilek" : "Např. správa sociálních sítí",
        sirka: "cela",
      },
      { k: "misto", label: "Místo (nepovinné)", typ: "text", sirka: "pul" },
      {
        k: "rozsah",
        label: dpp ? "Rozsah (hodin celkem)" : "Rozsah (hodin týdně v průměru)",
        typ: "cislo",
        napoveda: dpp ? "Nejvýš 300 hodin za rok." : "Nejvýš 20 hodin týdně.",
        sirka: "pul",
      },
      { k: "od", label: "Od (nepovinné)", typ: "date", sirka: "pul" },
      { k: "do", label: "Do (nepovinné)", typ: "date", sirka: "pul" },
    ],
  },
  {
    nadpis: "Odměna",
    pole: [
      {
        k: "odmena",
        label: "Odměna",
        typ: "kc",
        napoveda: `Nejméně minimální mzda ${kc(MINIMALNI_MZDA.hodinova)} za hodinu.`,
        sirka: "pul",
      },
      {
        k: "odmena_typ",
        label: "Odměna je",
        typ: "select",
        moznosti: [
          ["hodinova", "za hodinu"],
          ["mesicni", "měsíčně"],
          ["celkem", "za celý úkol"],
        ],
        sirka: "pul",
      },
    ],
  },
  { nadpis: "Další údaje", pole: [OSTATNI, VYHOTOVENI] },
];
export const FORMULAR_DPP = formularDohody(true);
export const FORMULAR_DPC = formularDohody(false);

// ——— Mzdový výměr (§ 113 odst. 4 ZP) ———

export const vychoziVymer = () => ({
  ...zakladZamestnance,
  pozice: "",
  od: "",
  zakladni: "",
  typ: "mesicni",
  osobni: "",
  priplatky: "",
  termin: "15",
});

export function chybyVymer(p: Record<string, unknown>): string | null {
  const z = chybaZamestnance(p);
  if (z) return z;
  if (!datum(p, "od")) return "Zadejte, od kdy výměr platí.";
  if ((cislo(p, "zakladni") ?? 0) <= 0) return "Zadejte základní mzdu.";
  return null;
}

export function clankyVymer(d: DataSmlouvy): Clanek[] {
  const p = d.pole;
  const z = cislo(p, "zakladni");
  const os = cislo(p, "osobni");
  return vycistit([
    {
      nadpis: "Mzda",
      odstavce: [
        `Zaměstnavatel tímto mzdovým výměrem stanoví zaměstnanci${text(p, "pozice") ? ` na pozici ${text(p, "pozice")}` : ""} mzdu s účinností od ${datum(p, "od") || "…"}.`,
        `Základní mzda činí ${z ? kc(z) : "…"} ${text(p, "typ") === "hodinova" ? "za hodinu" : "měsíčně"}.`,
        os ? `Osobní ohodnocení činí ${kc(os)} měsíčně. Zaměstnavatel je může podle pracovních výsledků zaměstnance změnit.` : "",
        text(p, "priplatky") ? `Další složky mzdy a příplatky: ${veta(text(p, "priplatky"))}` : "",
        "Za práci přesčas, ve svátek, v noci, ve ztíženém pracovním prostředí a v sobotu a v neděli přísluší zaměstnanci mzda a příplatky podle zákoníku práce.",
      ],
    },
    {
      nadpis: "Splatnost a výplata",
      odstavce: [
        `Mzda je splatná pozadu za měsíční období, vždy do ${cislo(p, "termin") ?? 15}. dne následujícího kalendářního měsíce.`,
        "Mzda se vyplácí na platební účet zaměstnance, nedohodnou-li se strany jinak.",
        "Tento mzdový výměr nahrazuje všechny předchozí mzdové výměry.",
      ],
    },
    ostatni(p),
  ]);
}

export const FORMULAR_VYMER: SekceFormulare[] = [
  ZAMESTNANEC,
  {
    nadpis: "Mzda",
    pole: [
      { k: "pozice", label: "Pozice (nepovinné)", typ: "text", sirka: "pul" },
      { k: "od", label: "Platí od", typ: "date", sirka: "pul" },
      {
        k: "zakladni",
        label: "Základní mzda",
        typ: "kc",
        napoveda: `Minimální mzda ${MINIMALNI_MZDA.rok}: ${kc(MINIMALNI_MZDA.mesicni)} měsíčně.`,
        sirka: "tretina",
      },
      {
        k: "typ",
        label: "Mzda je",
        typ: "select",
        moznosti: [
          ["mesicni", "měsíční"],
          ["hodinova", "hodinová"],
        ],
        sirka: "tretina",
      },
      { k: "osobni", label: "Osobní ohodnocení (nepovinné)", typ: "kc", sirka: "tretina" },
      {
        k: "priplatky",
        label: "Další složky a příplatky (nepovinné)",
        typ: "textarea",
        placeholder: "Např. roční odměna podle výsledků",
        sirka: "cela",
      },
      { k: "termin", label: "Výplata do (den v měsíci)", typ: "cislo", sirka: "pul" },
    ],
  },
  { nadpis: "Další údaje", pole: [OSTATNI, VYHOTOVENI] },
];

// ——— Dohoda o rozvázání pracovního poměru (§ 49 ZP) ———

const DUVODY_ODSTUPNE: Record<string, string> = {
  bez: "",
  c: "z organizačních důvodů, neboť se zaměstnanec stal nadbytečným vzhledem k rozhodnutí zaměstnavatele o změně úkolů, technického vybavení nebo o snížení stavu zaměstnanců (§ 52 písm. c) zákoníku práce)",
  ab: "z důvodu zrušení nebo přemístění zaměstnavatele nebo jeho části (§ 52 písm. a) nebo b) zákoníku práce)",
};

export const vychoziDohodaSkonceni = () => ({
  ...zakladZamestnance,
  nastup_puvodni: "",
  skonceni: "",
  duvod: "bez",
  odstupne: "",
  vyrovnani: "ano",
});

export function chybyDohodaSkonceni(p: Record<string, unknown>): string | null {
  const z = chybaZamestnance(p);
  if (z) return z;
  if (!datum(p, "skonceni")) return "Zadejte den, kdy pracovní poměr skončí.";
  return null;
}

export function clankyDohodaSkonceni(d: DataSmlouvy): Clanek[] {
  const p = d.pole;
  const duvod = DUVODY_ODSTUPNE[text(p, "duvod")] ?? "";
  const odstupne = cislo(p, "odstupne");
  return vycistit([
    {
      nadpis: "Skončení pracovního poměru",
      odstavce: [
        `Strany se dohodly, že pracovní poměr zaměstnance${datum(p, "nastup_puvodni") ? ` založený pracovní smlouvou ode dne ${datum(p, "nastup_puvodni")}` : ""} skončí dnem ${datum(p, "skonceni") || "…"}.`,
        duvod ? `Pracovní poměr končí ${duvod}.` : "",
      ],
    },
    duvod
      ? {
          nadpis: "Odstupné",
          odstavce: [
            `Zaměstnanci přísluší odstupné podle § 67 zákoníku práce${odstupne ? ` ve výši ${kc(odstupne)}` : ""}, splatné v nejbližším výplatním termínu po skončení pracovního poměru, nedohodnou-li se strany na pozdějším termínu.`,
          ],
        }
      : null,
    {
      nadpis: "Vypořádání",
      odstavce: [
        "Zaměstnanec do dne skončení pracovního poměru vrátí zaměstnavateli všechny svěřené předměty a dokumenty.",
        "Zaměstnavatel vydá zaměstnanci potvrzení o zaměstnání (zápočtový list) a vyplatí mzdu a náhradu za nevyčerpanou dovolenou podle zákoníku práce.",
        text(p, "vyrovnani") === "ano"
          ? "Strany prohlašují, že dnem skončení pracovního poměru nebudou mít vůči sobě z pracovního poměru jiné nároky než ty, které jsou uvedeny v této dohodě nebo vyplývají ze zákona."
          : "",
      ],
    },
    ostatni(p),
    zaver(p, "dohodě"),
  ]);
}

export const FORMULAR_DOHODA_SKONCENI: SekceFormulare[] = [
  ZAMESTNANEC,
  {
    nadpis: "Skončení",
    pole: [
      { k: "nastup_puvodni", label: "Pracovní poměr od (nepovinné)", typ: "date", sirka: "pul" },
      { k: "skonceni", label: "Pracovní poměr skončí dne", typ: "date", sirka: "pul" },
      {
        k: "duvod",
        label: "Důvod (kvůli odstupnému)",
        typ: "select",
        moznosti: [
          ["bez", "bez uvedení důvodu"],
          ["c", "nadbytečnost (§ 52 c)"],
          ["ab", "zrušení nebo přemístění zaměstnavatele (§ 52 a, b)"],
        ],
        napoveda: "Odstupné přísluší jen při organizačních důvodech.",
        sirka: "pul",
      },
      {
        k: "odstupne",
        label: "Odstupné (nepovinné)",
        typ: "kc",
        napoveda: "Nejméně 1–3 průměrné výdělky podle délky poměru.",
        sirka: "pul",
      },
      {
        k: "vyrovnani",
        label: "Vzájemné vyrovnání",
        typ: "select",
        moznosti: [
          ["ano", "ano, zahrnout"],
          ["ne", "ne"],
        ],
        sirka: "pul",
      },
    ],
  },
  { nadpis: "Další údaje", pole: [OSTATNI, VYHOTOVENI] },
];

// ——— Výpověď (§ 50 a násl. ZP) a zrušení ve zkušební době (§ 66 ZP) ———

export const vychoziVypoved = () => ({ ...zakladZamestnance, kdo: "zamestnanec", nastup_puvodni: "", popis: "", vyrovnani: "ne" });

export function chybyVypoved(p: Record<string, unknown>): string | null {
  const z = chybaZamestnance(p);
  if (z) return z;
  if (text(p, "kdo") === "zamestnavatel_c" && !text(p, "popis")) return "Popište organizační změnu, kvůli které je zaměstnanec nadbytečný.";
  return null;
}

export function clankyVypoved(d: DataSmlouvy): Clanek[] {
  const p = d.pole;
  const kdo = text(p, "kdo");
  const od = datum(p, "nastup_puvodni");
  const pomer = `pracovní poměr${od ? ` založený ode dne ${od}` : ""}`;
  const pomeru = `pracovního poměru${od ? ` založeného ode dne ${od}` : ""}`;
  if (kdo === "zkusebni") {
    return vycistit([
      {
        nadpis: "Zrušení pracovního poměru ve zkušební době",
        odstavce: [
          `Zaměstnavatel tímto ruší ${pomer} ve zkušební době podle § 66 zákoníku práce, a to bez uvedení důvodu.`,
          "Pracovní poměr skončí dnem doručení tohoto zrušení zaměstnanci, není-li v něm uveden den pozdější.",
        ],
      },
      ostatni(p),
    ]);
  }
  return vycistit([
    {
      nadpis: "Výpověď",
      odstavce: [
        kdo === "zamestnavatel_c"
          ? `Zaměstnavatel tímto dává zaměstnanci výpověď z pracovního poměru podle § 52 písm. c) zákoníku práce, neboť se zaměstnanec stal nadbytečným vzhledem k rozhodnutí zaměstnavatele o organizační změně: ${text(p, "popis") ? veta(text(p, "popis")) : "…"}`
          : `Zaměstnanec tímto dává zaměstnavateli výpověď z ${pomeru}, a to bez uvedení důvodu (§ 50 odst. 1 zákoníku práce).`,
        "Výpovědní doba činí 2 měsíce, nebyla-li v pracovní smlouvě sjednána delší. Začíná dnem doručení výpovědi a končí uplynutím dne, který se číslem shoduje se dnem doručení (§ 51 zákoníku práce).",
        kdo === "zamestnavatel_c"
          ? "Zaměstnanci přísluší odstupné podle § 67 zákoníku práce. Zaměstnavatel zaměstnanci nabízí, že pracovní poměr může skončit i dříve dohodou."
          : "",
      ],
    },
    ostatni(p),
    {
      nadpis: "Převzetí",
      odstavce: ["Druhá strana svým podpisem potvrzuje převzetí této výpovědi v den uvedený u podpisu."],
    },
  ]);
}

export const FORMULAR_VYPOVED: SekceFormulare[] = [
  ZAMESTNANEC,
  {
    nadpis: "Výpověď",
    pole: [
      {
        k: "kdo",
        label: "Kdo končí pracovní poměr",
        typ: "select",
        moznosti: [
          ["zamestnanec", "zaměstnanec dává výpověď"],
          ["zamestnavatel_c", "zaměstnavatel – nadbytečnost (§ 52 c)"],
          ["zkusebni", "zaměstnavatel – zrušení ve zkušební době"],
        ],
        sirka: "cela",
      },
      { k: "nastup_puvodni", label: "Pracovní poměr od (nepovinné)", typ: "date", sirka: "pul" },
      {
        k: "popis",
        label: "Organizační změna (u nadbytečnosti)",
        typ: "textarea",
        placeholder: "Např. zrušení pozice grafika k 31. 12. 2026",
        sirka: "cela",
      },
    ],
  },
  { nadpis: "Další údaje", pole: [OSTATNI, VYHOTOVENI] },
];

// ——— Upozornění na porušení povinností (tzv. vytýkací dopis) ———

export const vychoziVytka = () => ({ ...zakladZamestnance, kdy: "", poruseni: "", napraveni: "", vyhotoveni: "dva" });

export function chybyVytka(p: Record<string, unknown>): string | null {
  const z = chybaZamestnance(p);
  if (z) return z;
  if (!text(p, "poruseni")) return "Popište, jakou povinnost zaměstnanec porušil.";
  return null;
}

export function clankyVytka(d: DataSmlouvy): Clanek[] {
  const p = d.pole;
  return vycistit([
    {
      nadpis: "Porušení povinností",
      odstavce: [
        `Zaměstnavatel zaměstnance upozorňuje, že${datum(p, "kdy") ? ` dne ${datum(p, "kdy")}` : ""} porušil povinnosti vyplývající z právních předpisů vztahujících se k jím vykonávané práci, a to tím, že: ${text(p, "poruseni") ? veta(text(p, "poruseni")) : "…"}`,
        text(p, "napraveni")
          ? `Zaměstnavatel zaměstnance vyzývá: ${veta(text(p, "napraveni"))}`
          : "Zaměstnavatel zaměstnance vyzývá, aby se dalšího porušování povinností vyvaroval.",
      ],
    },
    {
      nadpis: "Upozornění na možnost výpovědi",
      odstavce: [
        "Zaměstnavatel zaměstnance upozorňuje, že v případě dalšího porušení povinností může dát zaměstnanci výpověď podle § 52 písm. g) zákoníku práce.",
        "Zaměstnanec svým podpisem potvrzuje převzetí tohoto upozornění. Podpis neznamená souhlas s jeho obsahem; zaměstnanec se může k upozornění písemně vyjádřit.",
      ],
    },
    ostatni(p),
  ]);
}

export const FORMULAR_VYTKA: SekceFormulare[] = [
  ZAMESTNANEC,
  {
    nadpis: "Co se stalo",
    pole: [
      { k: "kdy", label: "Kdy (nepovinné)", typ: "date", sirka: "pul" },
      {
        k: "poruseni",
        label: "Porušení povinnosti",
        typ: "textarea",
        placeholder: "Např. opakovaně přišel do práce o více než 30 minut později bez omluvy",
        sirka: "cela",
      },
      { k: "napraveni", label: "Výzva k nápravě (nepovinné)", typ: "textarea", sirka: "cela" },
    ],
  },
  { nadpis: "Další údaje", pole: [OSTATNI, VYHOTOVENI] },
];

// ——— Potvrzení o svěření předmětů (§ 255 ZP) ———

export const vychoziSvereni = () => ({ ...zakladZamestnance, predmety: "", hodnota: "", prevzato: "" });

export function chybySvereni(p: Record<string, unknown>): string | null {
  const z = chybaZamestnance(p);
  if (z) return z;
  if (!text(p, "predmety")) return "Vypište svěřené předměty.";
  return null;
}

export function clankySvereni(d: DataSmlouvy): Clanek[] {
  const p = d.pole;
  const hodnota = cislo(p, "hodnota");
  return vycistit([
    {
      nadpis: "Svěřené předměty",
      odstavce: [
        `Zaměstnavatel svěřuje zaměstnanci${datum(p, "prevzato") ? ` dne ${datum(p, "prevzato")}` : ""} k plnění pracovních úkolů tyto pracovní prostředky a předměty:`,
        ...text(p, "predmety")
          .split(/\n+/)
          .filter(Boolean)
          .map((x, i) => `${i + 1}) ${x}`),
        hodnota ? `Celková hodnota svěřených předmětů činí ${kc(hodnota)}.` : "",
      ],
    },
    {
      nadpis: "Odpovědnost zaměstnance",
      odstavce: [
        "Zaměstnanec potvrzuje, že předměty převzal v pořádku a bude je užívat jen k plnění pracovních úkolů, pokud zaměstnavatel nepovolí jinak.",
        "Zaměstnanec odpovídá za ztrátu předmětů, které mu zaměstnavatel svěřil na písemné potvrzení, podle § 255 zákoníku práce. Odpovědnosti se zprostí, prokáže-li, že ztráta vznikla zcela nebo zčásti bez jeho zavinění.",
        "Při skončení pracovního poměru nebo na výzvu zaměstnavatele zaměstnanec předměty bez zbytečného odkladu vrátí.",
      ],
    },
    ostatni(p),
  ]);
}

export const FORMULAR_SVERENI: SekceFormulare[] = [
  ZAMESTNANEC,
  {
    nadpis: "Předměty",
    pole: [
      {
        k: "predmety",
        label: "Co zaměstnanec přebírá",
        typ: "textarea",
        placeholder: "Každý předmět na nový řádek, např. Notebook Dell, v. č. 5CD1234",
        sirka: "cela",
      },
      { k: "hodnota", label: "Celková hodnota (nepovinné)", typ: "kc", sirka: "pul" },
      { k: "prevzato", label: "Datum převzetí (nepovinné)", typ: "date", sirka: "pul" },
    ],
  },
  { nadpis: "Další údaje", pole: [OSTATNI] },
];
