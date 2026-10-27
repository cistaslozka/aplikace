import { chybyDilo, clankyDilo, FORMULAR_DILO, vychoziDilo } from "./dilo";
import type { Clanek, DataSmlouvy, DruhSmlouvy, SekceFormulare } from "./index";

// Rozcestník vzorů smluv. Další vzory (služby, licence, NDA…) se přidají sem.
type Vzor = {
  clanky: (d: DataSmlouvy) => Clanek[];
  chyby: (pole: Record<string, unknown>) => string | null;
  vychozi: (platce: boolean) => Record<string, unknown>;
  formular: SekceFormulare[];
  /** pole s datem konce smlouvy (pro hlídání končících smluv) */
  konec?: string;
};

export const VZORY: Partial<Record<DruhSmlouvy, Vzor>> = {
  dilo: { clanky: clankyDilo, chyby: chybyDilo, vychozi: vychoziDilo, formular: FORMULAR_DILO, konec: "dokonceni" },
};

export const DOSTUPNE_DRUHY = Object.keys(VZORY) as DruhSmlouvy[];
