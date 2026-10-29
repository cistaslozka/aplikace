import type { Metadata } from "next";
import { StrankaSmluv } from "../smlouvy/StrankaSmluv";

export const metadata: Metadata = { title: "HR a zaměstnanci" };

// HR dokumenty jsou vzory smluv s příznakem `hr` (src/lib/smlouvy/hr.ts), ukládají se mezi smlouvy.
export default function HrPage() {
  return <StrankaSmluv hr />;
}
