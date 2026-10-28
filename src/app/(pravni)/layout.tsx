import Link from "next/link";
import { PROVOZOVATEL } from "@/lib/provozovatel";

// Veřejné právní stránky (obchodní podmínky, ochrana osobních údajů, cookies).
const ODKAZY = [
  ["/obchodni-podminky", "Obchodní podmínky"],
  ["/ochrana-osobnich-udaju", "Ochrana osobních údajů"],
  ["/cookies", "Cookies"],
  ["/vylouceni-odpovednosti", "Vyloučení odpovědnosti"],
] as const;

export default function PravniLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-navy">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 md:px-8">
          <Link href="/" className="flex items-center gap-2.5 font-display text-xl font-extrabold tracking-tight text-white">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green" aria-hidden="true">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <span>
              čistásložka<span className="text-green">.cz</span>
            </span>
          </Link>
          <Link href="/" className="text-sm font-semibold text-slate-300 hover:text-white">
            ← Zpět
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 md:px-8">
        {!PROVOZOVATEL.doplneno && (
          <p role="note" className="mb-6 rounded-xl bg-amber-tint px-4 py-3 text-sm font-medium text-amber">
            Pracovní verze. Údaje provozovatele doplníme po založení společnosti. Text zkontroluje právník.
          </p>
        )}
        <article className="pravni-text flex flex-col gap-4 text-[15px] leading-relaxed text-ink">{children}</article>
      </main>
      <footer className="border-t border-line bg-surface">
        <nav aria-label="Právní informace" className="mx-auto flex max-w-4xl flex-wrap gap-x-5 gap-y-2 px-4 py-5 text-sm md:px-8">
          {ODKAZY.map(([href, text]) => (
            <Link key={href} href={href} className="font-semibold text-muted hover:text-navy">
              {text}
            </Link>
          ))}
        </nav>
      </footer>
    </div>
  );
}
