"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";

export function Karta({ nadpis, popis, children }: { nadpis: string; popis: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-6 rounded-3xl border border-line bg-surface p-6 shadow-[0_20px_40px_-15px_rgba(15,37,55,0.12)] md:p-10">
      <div className="text-center">
        <h1 className="text-[26px] font-extrabold tracking-tight">{nadpis}</h1>
        <p className="mt-2 text-[15px] text-muted">{popis}</p>
      </div>
      {children}
    </section>
  );
}

export function Pole({
  id,
  label,
  type = "text",
  autoComplete,
  defaultValue,
  placeholder,
  vedle,
  minLength,
}: {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  defaultValue?: string;
  placeholder?: string;
  vedle?: React.ReactNode;
  minLength?: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-bold text-navy">
          {label}
        </label>
        {vedle}
      </div>
      <input
        id={id}
        name={id}
        type={type}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-xl border-[1.5px] border-line bg-slate-50 px-4 py-3.5 text-base text-navy outline-none transition focus:border-green focus:bg-white focus:ring-4 focus:ring-green/10"
      />
    </div>
  );
}

export function Odeslat({ children, odesilam }: { children: React.ReactNode; odesilam: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex min-h-12 w-full items-center justify-center rounded-xl bg-navy px-6 text-base font-semibold text-white transition hover:bg-navy-2 disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? odesilam : children}
    </button>
  );
}

export function Hlaska({ typ, children }: { typ: "chyba" | "info"; children: React.ReactNode }) {
  return (
    <p
      role={typ === "chyba" ? "alert" : "status"}
      className={
        "rounded-xl px-4 py-3 text-sm font-medium " +
        (typ === "chyba" ? "bg-red-tint text-red" : "bg-green-tint text-green-ink")
      }
    >
      {children}
    </p>
  );
}

export function Prepinac({ text, odkaz, href }: { text: string; odkaz: string; href: string }) {
  return (
    <>
      <div className="flex items-center gap-4 text-sm font-semibold text-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
        {text}
      </div>
      <Link
        href={href}
        className="flex min-h-12 w-full items-center justify-center rounded-xl border-2 border-green/40 px-6 text-base font-semibold text-green-ink transition hover:border-green hover:bg-green-tint"
      >
        {odkaz}
      </Link>
    </>
  );
}
