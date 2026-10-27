"use client";

export function TlacitkoTisk() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="min-h-11 rounded-xl bg-green px-5 text-sm font-bold text-navy transition hover:brightness-95"
    >
      Tisk / uložit PDF
    </button>
  );
}
