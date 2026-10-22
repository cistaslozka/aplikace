import type { Metadata } from "next";
import { ZapomenuteHesloFormular } from "./ZapomenuteHesloFormular";

export const metadata: Metadata = { title: "Zapomenuté heslo" };

export default function ZapomenuteHesloPage() {
  return <ZapomenuteHesloFormular />;
}
