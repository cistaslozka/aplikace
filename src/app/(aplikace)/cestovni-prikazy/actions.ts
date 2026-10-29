"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DOPRAVA, PALIVA, vyuctovat, type VstupCesty } from "@/lib/cestovni";
import { aktivniFirma } from "@/lib/firma";
import { createClient } from "@/lib/supabase/server";

export type NovaCesta = {
  id?: string;
  cestovatel: { name: string; address: string };
  ucel: string;
  misto: string;
  vozidlo: { spz: string; model: string };
  vstup: VstupCesty;
  poznamka: string;
};

const CAS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const cislo = (x: unknown, max: number) => (typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= max ? x : 0);

export async function ulozitCestuAkce(c: NovaCesta): Promise<{ ok: false; chyba: string } | undefined> {
  const firma = await aktivniFirma();
  if (!firma) return { ok: false, chyba: "Nejdřív vyplňte údaje o své firmě v Nastavení." };
  if (!c.cestovatel.name.trim()) return { ok: false, chyba: "Napište jméno cestovatele." };
  if (!c.ucel.trim()) return { ok: false, chyba: "Napište účel cesty." };
  if (!c.misto.trim()) return { ok: false, chyba: "Napište, kam cesta vede." };
  const v = c.vstup;
  if (!CAS.test(v.odjezd) || !CAS.test(v.prijezd)) return { ok: false, chyba: "Zadejte začátek a konec cesty." };
  if (v.prijezd <= v.odjezd) return { ok: false, chyba: "Konec cesty musí být po začátku." };
  if (!(v.doprava in DOPRAVA) || !(v.palivo in PALIVA)) return { ok: false, chyba: "Vyberte způsob dopravy." };

  // Vstupy očistíme a součty spočítáme znovu na serveru (stejnou funkcí jako náhled)
  const vstup: VstupCesty = {
    odjezd: v.odjezd,
    prijezd: v.prijezd,
    doprava: v.doprava,
    km: cislo(v.km, 100000),
    spotreba: cislo(v.spotreba, 100),
    palivo: v.palivo,
    cenaPaliva: cislo(v.cenaPaliva, 1000),
    jidla: Object.fromEntries(
      Object.entries(v.jidla ?? {})
        .filter(([d]) => /^\d{4}-\d{2}-\d{2}$/.test(d))
        .map(([d, n]) => [d, Math.min(3, Math.floor(cislo(n, 3)))]),
    ),
    vydaje: (v.vydaje ?? [])
      .map((x) => ({
        popis: String(x.popis ?? "")
          .trim()
          .slice(0, 200),
        castka: cislo(x.castka, 10_000_000),
      }))
      .filter((x) => x.popis || x.castka)
      .slice(0, 50),
    zaloha: cislo(v.zaloha, 10_000_000),
  };
  const r = vyuctovat(vstup);
  if (!r.dny.length) return { ok: false, chyba: "Zkontrolujte začátek a konec cesty." };

  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("ulozit_cestovni_prikaz", {
    p: {
      id: c.id ?? null,
      organization_id: firma.id,
      traveler: { name: c.cestovatel.name.trim().slice(0, 200), address: c.cestovatel.address.trim().slice(0, 300) || null },
      purpose: c.ucel.trim().slice(0, 500),
      destination: c.misto.trim().slice(0, 300),
      departure_at: vstup.odjezd,
      arrival_at: vstup.prijezd,
      trip: { vstup, vozidlo: { spz: c.vozidlo.spz.trim().slice(0, 20) || null, model: c.vozidlo.model.trim().slice(0, 100) || null } },
      meal_allowance: r.stravne,
      vehicle_allowance: r.jizdne.celkem,
      expenses: r.vydaje,
      advance: r.zaloha,
      total: r.celkem,
      note: c.poznamka.trim().slice(0, 1000),
    },
  });
  if (error || !id) {
    console.error("Uložení cestovního příkazu selhalo:", error?.code, error?.message);
    if (error?.code === "P0001") return { ok: false, chyba: error.message };
    if (error?.code === "23514") return { ok: false, chyba: "Některý údaj nesedí. Zkontrolujte časy a částky." };
    return { ok: false, chyba: "Cestovní příkaz se nepodařilo uložit. Zkuste to prosím znovu." };
  }
  revalidatePath("/cestovni-prikazy");
  redirect(`/cestovni-prikazy/${id}${c.id ? "?upraveno=1" : "?vystaveno=1"}`);
}

export async function stornovatCestuAkce(form: FormData) {
  const firma = await aktivniFirma();
  const id = String(form.get("id") ?? "");
  if (!firma || !/^[0-9a-f-]{36}$/i.test(id)) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("stornovat_cestovni_prikaz", { p_id: id });
  revalidatePath("/cestovni-prikazy");
  revalidatePath(`/cestovni-prikazy/${id}`);
  if (error) {
    console.error("Storno cestovního příkazu selhalo:", error.code, error.message);
    redirect(`/cestovni-prikazy/${id}?chyba=${encodeURIComponent("Cestovní příkaz se nepodařilo stornovat.")}`);
  }
  redirect(`/cestovni-prikazy/${id}`);
}
