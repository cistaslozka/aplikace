import type { Metadata } from "next";
import { NoveHesloFormular } from "./NoveHesloFormular";

export const metadata: Metadata = { title: "Nové heslo" };

// Sem vede odkaz z e-mailu „Zapomenuté heslo". Uživatel už je díky odkazu přihlášený,
// takže stránku chrání middleware stejně jako zbytek aplikace.
export default function NoveHesloPage() {
  return <NoveHesloFormular />;
}
