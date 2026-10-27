// Dlaždice přehledu a jejich výchozí pořadí. Nová dlaždice se přidá sem a uživatelům se objeví na konci.
export const DLAZDICE = [
  { id: "neuhrazeno", nazev: "Neuhrazené doklady", siroka: false },
  { id: "po_splatnosti", nazev: "Po splatnosti", siroka: false },
  { id: "dph", nazev: "DPH / limit pro DPH", siroka: false },
  { id: "prijmy", nazev: "Graf příjmů", siroka: true },
  { id: "akce", nazev: "Rychlé akce", siroka: false },
  { id: "posledni", nazev: "Poslední doklady", siroka: true },
  { id: "smlouvy", nazev: "Končící smlouvy", siroka: false },
] as const;

export type IdDlazdice = (typeof DLAZDICE)[number]["id"];
export type PolozkaRozlozeni = { id: IdDlazdice; zapnuto: boolean };

export const VYCHOZI_ROZLOZENI: PolozkaRozlozeni[] = DLAZDICE.map((d) => ({ id: d.id, zapnuto: true }));

/** Uložené rozložení doplní o nové dlaždice a vyhodí neznámé nebo zdvojené. */
export function slozRozlozeni(ulozene: unknown): PolozkaRozlozeni[] {
  if (!Array.isArray(ulozene)) return VYCHOZI_ROZLOZENI;
  const zname = new Set<string>(DLAZDICE.map((d) => d.id));
  const videno = new Set<string>();
  const vysledek: PolozkaRozlozeni[] = [];
  for (const x of ulozene) {
    const id = (x as { id?: unknown })?.id;
    if (typeof id !== "string" || !zname.has(id) || videno.has(id)) continue;
    videno.add(id);
    vysledek.push({ id: id as IdDlazdice, zapnuto: (x as { zapnuto?: unknown }).zapnuto !== false });
  }
  for (const d of DLAZDICE) if (!videno.has(d.id)) vysledek.push({ id: d.id, zapnuto: true });
  return vysledek;
}
