import { chybyDilo, clankyDilo, FORMULAR_DILO, vychoziDilo } from "./dilo";
import type { Clanek, DataSmlouvy, DruhSmlouvy, SekceFormulare } from "./index";
import { chybyKupni, clankyKupni, FORMULAR_KUPNI, vychoziKupni } from "./kupni";
import { chybyNajem, clankyNajem, FORMULAR_NAJEM, vychoziNajem } from "./najem";
import { chybyPlnaMoc, clankyPlnaMoc, FORMULAR_PLNA_MOC, vychoziPlnaMoc } from "./plnaMoc";
import { chybyRamcova, clankyRamcova, FORMULAR_RAMCOVA, vychoziRamcova } from "./ramcova";
import { chybyLicence, clankyLicence, FORMULAR_LICENCE, vychoziLicence } from "./licence";
import { chybyNda, clankyNda, FORMULAR_NDA, vychoziNda } from "./nda";
import { chybyPredavaci, clankyPredavaci, FORMULAR_PREDAVACI, vychoziPredavaci } from "./predavaci";
import { chybySluzby, clankySluzby, FORMULAR_SLUZBY, vychoziSluzby } from "./sluzby";

// Rozcestník vzorů smluv. Nový vzor = nový soubor v této složce a řádek sem.
export type Vzor = {
  clanky: (d: DataSmlouvy) => Clanek[];
  chyby: (pole: Record<string, unknown>) => string | null;
  vychozi: (platce: boolean) => Record<string, unknown>;
  formular: SekceFormulare[];
  /** pole s datem konce (pro hlídání končících smluv) */
  konec?: string;
  /** řádek pod nadpisem (podle jakého zákona) */
  podtitul?: string;
  /** věta před články */
  uvod?: string;
};

const UVOD_SMLOUVY = "uzavírají níže uvedeného dne, měsíce a roku tuto smlouvu:";

export const VZORY: Partial<Record<DruhSmlouvy, Vzor>> = {
  dilo: {
    clanky: clankyDilo,
    chyby: chybyDilo,
    vychozi: vychoziDilo,
    formular: FORMULAR_DILO,
    konec: "dokonceni",
    podtitul: "uzavřená podle § 2586 a násl. zákona č. 89/2012 Sb., občanský zákoník",
    uvod: UVOD_SMLOUVY,
  },
  sluzby: {
    clanky: clankySluzby,
    chyby: chybySluzby,
    vychozi: vychoziSluzby,
    formular: FORMULAR_SLUZBY,
    konec: "doba_do",
    podtitul: "uzavřená podle § 1746 odst. 2 zákona č. 89/2012 Sb., občanský zákoník",
    uvod: UVOD_SMLOUVY,
  },
  licence: {
    clanky: clankyLicence,
    chyby: chybyLicence,
    vychozi: vychoziLicence,
    formular: FORMULAR_LICENCE,
    konec: "doba_do",
    podtitul: "uzavřená podle § 2358 a násl. zákona č. 89/2012 Sb., občanský zákoník, a zákona č. 121/2000 Sb., autorský zákon",
    uvod: UVOD_SMLOUVY,
  },
  nda: {
    clanky: clankyNda,
    chyby: chybyNda,
    vychozi: vychoziNda,
    formular: FORMULAR_NDA,
    podtitul: "uzavřená podle § 1746 odst. 2 zákona č. 89/2012 Sb., občanský zákoník",
    uvod: "uzavírají níže uvedeného dne, měsíce a roku tuto dohodu:",
  },
  predavaci: {
    clanky: clankyPredavaci,
    chyby: chybyPredavaci,
    vychozi: vychoziPredavaci,
    formular: FORMULAR_PREDAVACI,
    uvod: "sepisují tento protokol o předání a převzetí:",
  },
  kupni: {
    clanky: clankyKupni,
    chyby: chybyKupni,
    vychozi: vychoziKupni,
    formular: FORMULAR_KUPNI,
    podtitul: "uzavřená podle § 2079 a násl. zákona č. 89/2012 Sb., občanský zákoník",
    uvod: UVOD_SMLOUVY,
  },
  ramcova: {
    clanky: clankyRamcova,
    chyby: chybyRamcova,
    vychozi: vychoziRamcova,
    formular: FORMULAR_RAMCOVA,
    konec: "doba_do",
    podtitul: "uzavřená podle § 1746 odst. 2 zákona č. 89/2012 Sb., občanský zákoník",
    uvod: UVOD_SMLOUVY,
  },
  najem: {
    clanky: clankyNajem,
    chyby: chybyNajem,
    vychozi: vychoziNajem,
    formular: FORMULAR_NAJEM,
    konec: "doba_do",
    podtitul: "uzavřená podle § 2201 a násl. zákona č. 89/2012 Sb., občanský zákoník",
    uvod: UVOD_SMLOUVY,
  },
  plna_moc: {
    clanky: clankyPlnaMoc,
    chyby: chybyPlnaMoc,
    vychozi: () => vychoziPlnaMoc(),
    formular: FORMULAR_PLNA_MOC,
    konec: "platnost_do",
    podtitul: "udělená podle § 441 a násl. zákona č. 89/2012 Sb., občanský zákoník",
    uvod: "Zmocnitel uděluje zmocněnci níže uvedeného dne tuto plnou moc:",
  },
};

export const DOSTUPNE_DRUHY = Object.keys(VZORY) as DruhSmlouvy[];
