import type { Metadata } from "next";
import { Pripravujeme } from "@/components/Pripravujeme";

export const metadata: Metadata = { title: "Faktury" };

export default function Page() {
  return <Pripravujeme title="Faktury" krok={4} popis="Seznam vystavených faktur s filtrem podle stavu, upomínkami a stažením PDF." />;
}
