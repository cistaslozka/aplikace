import type { Metadata } from "next";
import { Pripravujeme } from "@/components/Pripravujeme";

export const metadata: Metadata = { title: "Nová faktura" };

export default function Page() {
  return <Pripravujeme title="Nová faktura" krok={4} popis="Formulář faktury s načtením odběratele z ARES, položkami, QR platbou a živým náhledem A4 ve třech vzhledech." />;
}
