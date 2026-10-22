import type { Metadata } from "next";
import { Pripravujeme } from "@/components/Pripravujeme";

export const metadata: Metadata = { title: "HR a zaměstnanci" };

export default function Page() {
  return <Pripravujeme title="HR a zaměstnanci" krok={8} popis="Pracovní smlouvy, DPP, DPČ a další HR dokumenty v tarifu PRO. Před spuštěním je zkontroluje právník." />;
}
