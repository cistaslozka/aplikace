// Dočasná stránka pro části, které ještě nejsou hotové.
// Číslo kroku odpovídá plánu v ZADANI.md.
export function Pripravujeme({ title, krok, popis }: { title: string; krok: number; popis: string }) {
  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
      <section className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-line bg-surface p-8">
        <span className="rounded-full bg-amber-tint px-3 py-1 text-xs font-semibold text-amber">Připravujeme · krok {krok}</span>
        <p className="max-w-prose text-[15px] text-muted">{popis}</p>
      </section>
    </>
  );
}
