import type { Metadata } from "next";
import { zprava } from "@/lib/auth";
import { PrihlaseniFormular } from "./PrihlaseniFormular";

export const metadata: Metadata = { title: "Přihlášení" };

type Props = { searchParams: Promise<{ chyba?: string; email?: string; dalsi?: string; odhlaseno?: string }> };

export default async function PrihlaseniPage({ searchParams }: Props) {
  const p = await searchParams;
  return <PrihlaseniFormular chybaZAdresy={zprava(p.chyba)} email={p.email} dalsi={p.dalsi} odhlaseno={p.odhlaseno === "1"} />;
}
