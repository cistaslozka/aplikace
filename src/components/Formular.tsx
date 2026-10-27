// Společné části formulářů v aplikaci (nastavení firmy, klienti, později faktury).

export const vstup =
  "w-full rounded-xl border-[1.5px] bg-slate-50 px-4 py-3 text-[15px] text-navy outline-none transition focus:bg-white focus:ring-4 focus:ring-green/10";

/** Třídy pro vstup podle toho, jestli je u něj chyba. */
export function tridyVstupu(chyba?: string) {
  return vstup + (chyba ? " border-red" : " border-line focus:border-green");
}

export function Pole({
  id,
  label,
  napoveda,
  chyba,
  children,
  className = "",
}: {
  id: string;
  label: string;
  napoveda?: string;
  chyba?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={"flex min-w-0 flex-col gap-1.5 " + className}>
      <label htmlFor={id} className="text-sm font-bold text-navy">
        {label}
      </label>
      {children}
      {chyba ? (
        <p id={`${id}-chyba`} className="text-[13px] font-medium text-red">
          {chyba}
        </p>
      ) : (
        napoveda && <p className="text-[13px] text-muted">{napoveda}</p>
      )}
    </div>
  );
}

export function Sekce({ nadpis, popis, children }: { nadpis: string; popis?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-5 rounded-2xl border border-line bg-surface p-5 md:grid-cols-[220px_minmax(0,1fr)] md:p-6">
      <div>
        <h2 className="text-base font-bold">{nadpis}</h2>
        {popis && <p className="mt-1 text-[13px] text-muted">{popis}</p>}
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
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
