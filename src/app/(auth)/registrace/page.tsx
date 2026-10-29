import type { Metadata } from "next";
import { zprava } from "@/lib/auth";
import { RegistraceFormular } from "./RegistraceFormular";

export const metadata: Metadata = { title: "Registrace" };

type Props = { searchParams: Promise<{ chyba?: string; email?: string; odeslano?: string; dalsi?: string }> };

export default async function RegistracePage({ searchParams }: Props) {
  const p = await searchParams;
  return <RegistraceFormular chybaZAdresy={zprava(p.chyba)} email={p.email} odeslano={p.odeslano === "1"} dalsi={p.dalsi} />;
}
