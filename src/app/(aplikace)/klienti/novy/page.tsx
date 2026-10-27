import type { Metadata } from "next";
import { KlientFormular } from "../KlientFormular";

export const metadata: Metadata = { title: "Nový klient" };

export default function NovyKlientPage() {
  return (
    <>
      <section>
        <h1 className="text-3xl font-extrabold tracking-tight">Nový klient</h1>
        <p className="mt-1 text-[15px] text-muted">Zadejte IČO a načtěte údaje z ARES, nebo vše vyplňte ručně (třeba pro klienta ze zahraničí).</p>
      </section>
      <KlientFormular
        novy
        vychozi={{ id: "", name: "", ico: "", dic: "", street: "", city: "", zip: "", country: "CZ", email: "", phone: "", note: "" }}
      />
    </>
  );
}
