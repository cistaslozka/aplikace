import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Hlaska } from "@/components/Formular";
import { aktivniFirma } from "@/lib/firma";
import { SLOUPCE_KLIENTA, type Klient } from "@/lib/klienti";
import { createClient } from "@/lib/supabase/server";
import { KlientFormular } from "../KlientFormular";

export const metadata: Metadata = { title: "Klient" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ novy?: string }> };

export default async function KlientPage({ params, searchParams }: Props) {
  const firma = await aktivniFirma();
  if (!firma) redirect("/nastaveni");
  const { id } = await params;
  const p = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const { data } = await supabase.from("clients").select(SLOUPCE_KLIENTA).eq("id", id).eq("organization_id", firma.id).maybeSingle();
  if (!data) notFound();
  const k = data as Klient;

  return (
    <>
      <section>
        <h1 className="text-3xl font-extrabold tracking-tight">{k.name}</h1>
        <p className="mt-1 text-[15px] text-muted">
          {k.from_ares ? "Načteno z ARES" : "Přidáno ručně"}
          {k.ico ? ` · IČO ${k.ico}` : ""}
        </p>
      </section>
      {p.novy === "1" && <Hlaska typ="info">Klient je načtený z ARES a uložený v adresáři. Příště ho najdete podle jména.</Hlaska>}
      <KlientFormular
        novy={false}
        vychozi={{
          id: k.id,
          name: k.name,
          ico: k.ico ?? "",
          dic: k.dic ?? "",
          street: k.street ?? "",
          city: k.city ?? "",
          zip: k.zip ?? "",
          country: k.country,
          email: k.email ?? "",
          phone: k.phone ?? "",
          note: k.note ?? "",
        }}
      />
    </>
  );
}
