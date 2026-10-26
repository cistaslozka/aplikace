import type { Metadata } from "next";
import { aktivniFirma } from "@/lib/firma";
import { formatujIban } from "@/lib/validace";
import { FirmaFormular, type HodnotyFirmy } from "./FirmaFormular";

export const metadata: Metadata = { title: "Nastavení firmy" };

export default async function NastaveniPage() {
  const firma = await aktivniFirma();

  const vychozi: HodnotyFirmy = {
    name: firma?.name ?? "",
    legal_form: firma?.legal_form ?? "osvc",
    ico: firma?.ico ?? "",
    dic: firma?.dic ?? "",
    vat_payer: firma?.vat_payer ?? false,
    street: firma?.street ?? "",
    city: firma?.city ?? "",
    zip: firma?.zip ?? "",
    registry_note: firma?.registry_note ?? "",
    bank_account: firma?.bank_account ?? "",
    iban: firma?.iban ? formatujIban(firma.iban) : "",
    email: firma?.email ?? "",
    phone: firma?.phone ?? "",
    web: firma?.web ?? "",
  };

  return (
    <>
      <section>
        {firma ? (
          <>
            <h1 className="text-3xl font-extrabold tracking-tight">Nastavení firmy</h1>
            <p className="mt-1 text-[15px] text-muted">Tyto údaje se použijí na všech nových fakturách a smlouvách.</p>
          </>
        ) : (
          <>
            <span className="rounded-full bg-green-tint px-3 py-1 text-xs font-semibold text-green-ink">První krok</span>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Za koho budete vystavovat doklady?</h1>
            <p className="mt-1 max-w-prose text-[15px] text-muted">
              Zadejte své IČO a údaje načteme z ARES. Doplníte jen bankovní účet a můžete vystavit první fakturu.
            </p>
          </>
        )}
      </section>
      <FirmaFormular vychozi={vychozi} nova={!firma} />
    </>
  );
}
