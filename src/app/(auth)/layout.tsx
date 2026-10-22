import Link from "next/link";

// Rozvržení přihlašovacích stránek: tmavý pruh s logem nahoře, pod ním karta.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-navy">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-8">
          <Link href="/" className="flex items-center gap-2.5 font-display text-xl font-extrabold tracking-tight text-white">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green" aria-hidden="true">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <span>
              čistásložka<span className="text-green">.cz</span>
            </span>
          </Link>
          <Link href="/" className="text-sm font-semibold text-slate-300 hover:text-white">
            Ceník a tarify
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-10 md:py-16">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
