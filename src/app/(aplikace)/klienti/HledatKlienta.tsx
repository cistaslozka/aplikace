"use client";

import { useRouter } from "next/navigation";
import { VyberKlienta } from "@/components/VyberKlienta";

// Vyhledávání nahoře v adresáři: vybraný klient se otevře, nové IČO se načte z ARES a uloží.
export function HledatKlienta() {
  const router = useRouter();
  return (
    <VyberKlienta
      label="Najít nebo přidat klienta"
      placeholder="Jméno, název firmy nebo IČO (nové IČO načteme z ARES)"
      onVyber={(k, novy) => router.push(`/klienti/${k.id}${novy ? "?novy=1" : ""}`)}
    />
  );
}
