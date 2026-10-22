import type { Metadata } from "next";
import { Pripravujeme } from "@/components/Pripravujeme";

export const metadata: Metadata = { title: "Adresář klientů" };

export default function Page() {
  return <Pripravujeme title="Adresář klientů" krok={3} popis="Klienti uložení z ARES, aby se na faktury a smlouvy doplňovali jedním klikem." />;
}
