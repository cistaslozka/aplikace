import { cislo, datum, kc, text, vycistit, type Clanek, type DataSmlouvy } from "./index";

/*
  Smlouva o dílo podle § 2586 a násl. zákona č. 89/2012 Sb., občanský zákoník.
  Podstatné náležitosti: smluvní strany, vymezení díla a cena (nebo způsob jejího určení).
  ⚠️ Text je obecný vzor. Před spuštěním pro zákazníky ho musí zkontrolovat právník.
*/

export type PoleDilo = {
  predmet: string; // popis díla
  specifikace: string;
  misto_plneni: string;
  zahajeni: string; // YYYY-MM-DD
  dokonceni: string; // YYYY-MM-DD
  cena: string; // text kvůli psaní s čárkou
  cena_typ: "bez_dph" | "vcetne_dph" | "neplatce";
  zaloha: string;
  splatnost: string; // dní
  zaruka: string; // měsíců
  pokuta: string; // % z ceny za den prodlení zhotovitele
  ostatni: string;
  zastupce_my: string;
  zastupce_oni: string;
  vyhotoveni: "dva" | "elektronicky";
};

export function vychoziDilo(platce: boolean): PoleDilo {
  return {
    predmet: "",
    specifikace: "",
    misto_plneni: "",
    zahajeni: "",
    dokonceni: "",
    cena: "",
    cena_typ: platce ? "bez_dph" : "neplatce",
    zaloha: "",
    splatnost: "14",
    zaruka: "",
    pokuta: "",
    ostatni: "",
    zastupce_my: "",
    zastupce_oni: "",
    vyhotoveni: "dva",
  };
}

/** Chyby, kvůli kterým smlouvu nejde uložit (podstatné náležitosti). */
export function chybyDilo(p: Record<string, unknown>): string | null {
  if (!text(p, "predmet")) return "Popište, jaké dílo se má provést.";
  if (cislo(p, "cena") === null || (cislo(p, "cena") ?? 0) <= 0) return "Zadejte cenu díla.";
  if (!datum(p, "dokonceni")) return "Zadejte termín dokončení díla.";
  const zaloha = cislo(p, "zaloha");
  if (zaloha !== null && zaloha >= (cislo(p, "cena") ?? 0)) return "Záloha musí být nižší než cena díla.";
  return null;
}

export function clankyDilo(d: DataSmlouvy): Clanek[] {
  const p = d.pole;
  const cena = cislo(p, "cena");
  const zaloha = cislo(p, "zaloha");
  const splatnost = cislo(p, "splatnost") ?? 14;
  const zaruka = cislo(p, "zaruka");
  const pokuta = cislo(p, "pokuta");
  const typ = text(p, "cena_typ");
  const cenaText =
    cena === null
      ? "…"
      : typ === "bez_dph"
        ? `${kc(cena)} bez DPH. K ceně bude připočtena daň z přidané hodnoty v sazbě platné ke dni uskutečnění zdanitelného plnění`
        : typ === "vcetne_dph"
          ? `${kc(cena)} včetně daně z přidané hodnoty`
          : `${kc(cena)}. Zhotovitel není plátcem daně z přidané hodnoty`;

  return vycistit([
    {
      nadpis: "Předmět smlouvy",
      odstavce: [
        `Zhotovitel se zavazuje provést na svůj náklad a nebezpečí pro objednatele dílo: ${text(p, "predmet") || "…"} (dále jen „dílo“).`,
        text(p, "specifikace") ? `Bližší specifikace díla: ${text(p, "specifikace")}` : "",
        "Objednatel se zavazuje dílo převzít a zaplatit zhotoviteli cenu podle článku o ceně díla.",
      ],
    },
    {
      nadpis: "Doba a místo plnění",
      odstavce: [
        datum(p, "zahajeni") ? `Zhotovitel zahájí provádění díla dne ${datum(p, "zahajeni")}.` : "",
        `Zhotovitel dílo dokončí a předá objednateli nejpozději dne ${datum(p, "dokonceni") || "…"}.`,
        text(p, "misto_plneni") ? `Místem plnění je ${text(p, "misto_plneni")}.` : "",
        "Zhotovitel je oprávněn dokončit a předat dílo i před sjednaným termínem.",
      ],
    },
    {
      nadpis: "Cena díla a platební podmínky",
      odstavce: [
        `Cena díla je stanovena dohodou smluvních stran ve výši ${cenaText}.`,
        zaloha
          ? `Objednatel uhradí zálohu ve výši ${kc(zaloha)} do 7 dnů od uzavření této smlouvy na základě zálohové faktury vystavené zhotovitelem. Záloha bude odečtena v konečném vyúčtování.`
          : "",
        `${zaloha ? "Zbývající část ceny" : "Cenu díla"} uhradí objednatel na základě faktury vystavené zhotovitelem po předání díla, se splatností ${splatnost} dnů ode dne jejího vystavení.`,
        "V případě prodlení s úhradou je objednatel povinen zaplatit zhotoviteli úrok z prodlení ve výši stanovené právními předpisy.",
      ],
    },
    {
      nadpis: "Předání a převzetí díla",
      odstavce: [
        "Dílo je dokončeno, je-li předvedena jeho způsobilost sloužit svému účelu. O předání a převzetí díla sepíší smluvní strany předávací protokol.",
        "Objednatel převezme dílo bez výhrad, nebo s výhradami uvedenými v předávacím protokolu. Má-li dílo vady bránící jeho užívání, objednatel není povinen je převzít.",
      ],
    },
    {
      nadpis: "Vady díla a záruka",
      odstavce: [
        "Práva objednatele z vadného plnění se řídí ustanoveními § 2615 a násl. občanského zákoníku.",
        zaruka ? `Zhotovitel poskytuje na dílo záruku za jakost v délce ${zaruka} měsíců ode dne převzetí díla objednatelem.` : "",
      ],
    },
    pokuta
      ? {
          nadpis: "Smluvní pokuta",
          odstavce: [
            `Je-li zhotovitel v prodlení s dokončením a předáním díla, je objednatel oprávněn požadovat smluvní pokutu ve výši ${String(pokuta).replace(".", ",")} % z ceny díla za každý započatý den prodlení. Zaplacením smluvní pokuty není dotčeno právo na náhradu škody.`,
          ],
        }
      : null,
    text(p, "ostatni") ? { nadpis: "Další ujednání", odstavce: text(p, "ostatni").split(/\n+/) } : null,
    {
      nadpis: "Závěrečná ustanovení",
      odstavce: [
        "Tato smlouva se řídí zákonem č. 89/2012 Sb., občanský zákoník, zejména ustanoveními § 2586 a násl.",
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
