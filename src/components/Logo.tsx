import Link from "next/link";

export function Logo({ href = "/prehled" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-2 font-display text-xl font-extrabold tracking-tight text-white"
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green" aria-hidden="true">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
      <span>
        čistásložka<span className="text-green">.cz</span>
      </span>
    </Link>
  );
}
