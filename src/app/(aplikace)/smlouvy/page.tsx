import type { Metadata } from "next";
import { Pripravujeme } from "@/components/Pripravujeme";

export const metadata: Metadata = { title: "Smlouvy" };

export default function Page() {
  return <Pripravujeme title="Smlouvy" krok={7} popis="Smlouva o dílo, smlouva o poskytování služeb, licenční smlouva a NDA. Přijdou na řadu po fakturaci." />;
}
