import type { Metadata } from "next";
import { StrankaSmluv } from "./StrankaSmluv";

export const metadata: Metadata = { title: "Smlouvy" };

export default function SmlouvyPage() {
  return <StrankaSmluv hr={false} />;
}
