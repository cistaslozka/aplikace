"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { hledatKlientyAkce, klientPodleIcoAkce } from "@/app/(aplikace)/klienti/actions";
import type { KlientNavrh } from "@/lib/klienti";
import { jePlatneIco, normalizujIco } from "@/lib/validace";

type Moznost = { typ: "klient"; klient: KlientNavrh } | { typ: "ares"; ico: string };

/**
 * Našeptávač klienta: píšete jméno nebo IČO a nabízí klienty z adresáře.
 * Když zadáte IČO, které v adresáři není, načte ho z ARES a rovnou uloží.
 */
export function VyberKlienta({
  onVyber,
  label = "Odběratel",
  placeholder = "Začněte psát jméno, název firmy nebo IČO",
}: {
  onVyber: (klient: KlientNavrh, novy: boolean) => void;
  label?: string;
  placeholder?: string;
}) {
  const id = useId();
  const [dotaz, setDotaz] = useState("");
  const [otevreno, setOtevreno] = useState(false);
  const [vysledky, setVysledky] = useState<KlientNavrh[]>([]);
  const [hledam, setHledam] = useState(false);
  const [aktivni, setAktivni] = useState(0);
  const [chyba, setChyba] = useState<string | null>(null);
  const [nacitam, startNacitani] = useTransition();
  const posledni = useRef(0);
  const obal = useRef<HTMLDivElement>(null);

  // Hledání s malou prodlevou, ať se neposílá dotaz po každém písmenu.
  useEffect(() => {
    if (!otevreno) return;
    const cislo = ++posledni.current;
    setHledam(true);
    const t = setTimeout(async () => {
      const r = await hledatKlientyAkce(dotaz);
      if (cislo === posledni.current) {
        setVysledky(r);
        setAktivni(0);
        setHledam(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [dotaz, otevreno]);

  // Zavřít po kliknutí mimo.
  useEffect(() => {
    const klik = (e: MouseEvent) => {
      if (obal.current && !obal.current.contains(e.target as Node)) setOtevreno(false);
    };
    document.addEventListener("mousedown", klik);
    return () => document.removeEventListener("mousedown", klik);
  }, []);

  const ico = normalizujIco(dotaz);
  const jeIco = /^\d{8}$/.test(ico) && jePlatneIco(ico);
  const moznosti: Moznost[] = [
    ...vysledky.map((k) => ({ typ: "klient" as const, klient: k })),
    ...(jeIco && !vysledky.some((k) => k.ico === ico) ? [{ typ: "ares" as const, ico }] : []),
  ];

  function vyber(m: Moznost) {
    setChyba(null);
    if (m.typ === "klient") {
      onVyber(m.klient, false);
      setDotaz("");
      setOtevreno(false);
      return;
    }
    startNacitani(async () => {
      const r = await klientPodleIcoAkce(m.ico);
      if (!r.ok) {
        setChyba(r.chyba);
        return;
      }
      onVyber(r.klient, r.novy);
      setDotaz("");
      setOtevreno(false);
    });
  }

  function klavesa(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOtevreno(true);
      setAktivni((a) => Math.min(a + 1, Math.max(moznosti.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAktivni((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      if (otevreno && moznosti[aktivni]) {
        e.preventDefault();
        vyber(moznosti[aktivni]);
      }
    } else if (e.key === "Escape") {
      setOtevreno(false);
    }
  }

  const seznamId = `${id}-seznam`;
  const vstupId = `${id}-vstup`;

  return (
    <div ref={obal} className="relative flex flex-col gap-1.5">
      <label htmlFor={vstupId} className="text-sm font-bold text-navy">
        {label}
      </label>
      <div className="relative">
        <svg className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.6" y2="16.6" />
        </svg>
        <input
          id={vstupId}
          type="text"
          role="combobox"
          aria-expanded={otevreno}
          aria-controls={seznamId}
          aria-autocomplete="list"
          aria-activedescendant={otevreno && moznosti[aktivni] ? `${id}-m${aktivni}` : undefined}
          autoComplete="off"
          value={dotaz}
          placeholder={placeholder}
          onChange={(e) => {
            setDotaz(e.target.value);
            setOtevreno(true);
            setChyba(null);
          }}
          onFocus={() => setOtevreno(true)}
          onKeyDown={klavesa}
          className="w-full rounded-xl border-[1.5px] border-line bg-slate-50 py-3 pr-4 pl-11 text-[15px] text-navy outline-none transition focus:border-green focus:bg-white focus:ring-4 focus:ring-green/10"
        />
      </div>

      {chyba && (
        <p role="alert" className="rounded-xl bg-red-tint px-4 py-3 text-sm font-medium text-red">
          {chyba}
        </p>
      )}

      {otevreno && (
        <div className="absolute top-full right-0 left-0 z-20 mt-1.5 overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_20px_40px_-15px_rgba(15,37,55,0.25)]">
          <ul id={seznamId} role="listbox" aria-label="Nalezení klienti" className="max-h-80 overflow-y-auto py-1.5">
            {moznosti.map((m, i) => (
              <li
                key={m.typ === "klient" ? m.klient.id : `ares-${m.ico}`}
                id={`${id}-m${i}`}
                role="option"
                aria-selected={i === aktivni}
                onMouseEnter={() => setAktivni(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  vyber(m);
                }}
                className={"flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5 " + (i === aktivni ? "bg-green-tint" : "")}
              >
                {m.typ === "klient" ? (
                  <>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-navy">{m.klient.name}</span>
                      <span className="block truncate text-[12px] text-muted">
                        {[m.klient.ico && `IČO ${m.klient.ico}`, m.klient.city].filter(Boolean).join(" · ") || "Bez IČO"}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-page px-2 py-0.5 text-[11px] font-semibold text-muted">z adresáře</span>
                  </>
                ) : (
                  <>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-navy">
                        {nacitam ? "Načítám z ARES…" : `Načíst IČO ${m.ico} z ARES`}
                      </span>
                      <span className="block text-[12px] text-muted">Klient se rovnou uloží do adresáře</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-navy px-2 py-0.5 text-[11px] font-semibold text-white">ARES</span>
                  </>
                )}
              </li>
            ))}
          </ul>
          {!hledam && moznosti.length === 0 && (
            <div className="px-4 py-3 text-sm text-muted">
              {dotaz.trim()
                ? "Nikoho takového v adresáři nemáte. Zadejte IČO a načteme ho z ARES, nebo "
                : "Adresář je zatím prázdný. Zadejte IČO klienta a načteme ho z ARES, nebo "}
              <Link href="/klienti/novy" className="font-semibold text-green-ink hover:underline">
                přidejte klienta ručně
              </Link>
              .
            </div>
          )}
          {hledam && moznosti.length === 0 && <div className="px-4 py-3 text-sm text-muted">Hledám…</div>}
        </div>
      )}
    </div>
  );
}
