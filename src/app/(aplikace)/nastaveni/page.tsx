import type { Metadata } from "next";
import { Pripravujeme } from "@/components/Pripravujeme";

export const metadata: Metadata = { title: "Nastavení firmy" };

export default function Page() {
  return <Pripravujeme title="Nastavení firmy" krok={2} popis="Vaše IČO, adresa, bankovní účet a plátcovství DPH. Údaje se načtou z ARES a použijí na všech dokladech." />;
}
