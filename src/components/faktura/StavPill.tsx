import { stavFaktury, type StavFaktury } from "@/lib/faktura";

const BARVY = {
  zelena: "bg-green-tint text-green-ink",
  seda: "bg-slate-100 text-slate-600",
  cervena: "bg-red-tint text-red",
  oranzova: "bg-amber-tint text-amber",
} as const;

export function StavPill({ status, splatnost, dnes }: { status: StavFaktury; splatnost: string; dnes?: string }) {
  const s = stavFaktury(status, splatnost, dnes);
  return <span className={"inline-flex rounded-full px-2.5 py-1 text-[12.5px] font-semibold whitespace-nowrap " + BARVY[s.typ]}>{s.text}</span>;
}
