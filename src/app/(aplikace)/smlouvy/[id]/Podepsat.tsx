"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { tridyVstupu } from "@/components/Formular";
import { malym } from "@/lib/smlouvy";
import { podepsatSmlouvuAkce } from "../actions";

/*
  Podpis prstem nebo myší na obrazovce. Kreslí se do plátna, uloží se jako obrázek PNG
  (prostý elektronický podpis) spolu se jménem podepisujícího a časem.
*/

const SIRKA = 600;
const VYSKA = 200;

export function Podepsat({ id, strana, role, vychoziJmeno }: { id: string; strana: "my" | "oni"; role: string; vychoziJmeno: string }) {
  const router = useRouter();
  const platno = useRef<HTMLCanvasElement>(null);
  const kreslim = useRef(false);
  const posledni = useRef<{ x: number; y: number } | null>(null);
  const [otevreno, setOtevreno] = useState(false);
  const [prazdne, setPrazdne] = useState(true);
  const [jmeno, setJmeno] = useState(vychoziJmeno);
  const [chyba, setChyba] = useState<string | null>(null);
  const [ukladam, start] = useTransition();

  useEffect(() => {
    if (!otevreno) return;
    const c = platno.current!;
    const ctx = c.getContext("2d")!;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f2537";
  }, [otevreno]);

  const bod = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * SIRKA, y: ((e.clientY - r.top) / r.height) * VYSKA };
  };

  function zacni(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    kreslim.current = true;
    posledni.current = bod(e);
    const ctx = e.currentTarget.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(posledni.current.x, posledni.current.y, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = "#0f2537";
    ctx.fill();
    setPrazdne(false);
  }

  function tahni(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!kreslim.current || !posledni.current) return;
    const ctx = e.currentTarget.getContext("2d")!;
    const b = bod(e);
    ctx.beginPath();
    ctx.moveTo(posledni.current.x, posledni.current.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    posledni.current = b;
  }

  function skonci() {
    kreslim.current = false;
    posledni.current = null;
  }

  function smazat() {
    const c = platno.current!;
    c.getContext("2d")!.clearRect(0, 0, SIRKA, VYSKA);
    setPrazdne(true);
  }

  function ulozit() {
    setChyba(null);
    if (prazdne) return setChyba("Nejdřív se podepište do rámečku.");
    if (!jmeno.trim()) return setChyba("Napište jméno podepisujícího.");
    const obrazek = platno.current!.toDataURL("image/png");
    start(async () => {
      const v = await podepsatSmlouvuAkce(id, strana, obrazek, jmeno.trim());
      if (!v.ok) return setChyba(v.chyba);
      setOtevreno(false);
      router.refresh();
    });
  }

  if (!otevreno)
    return (
      <button
        type="button"
        onClick={() => setOtevreno(true)}
        className="min-h-11 rounded-xl border-[1.5px] border-line bg-surface px-4 text-sm font-semibold text-navy hover:border-muted"
      >
        Podepsat jako {malym(role)}
      </button>
    );

  return (
    <div className="flex w-full flex-col gap-3 rounded-xl border border-green-soft bg-green-tint p-4">
      <div className="text-sm font-bold text-navy">Podpis – {role}</div>
      <canvas
        ref={platno}
        width={SIRKA}
        height={VYSKA}
        onPointerDown={zacni}
        onPointerMove={tahni}
        onPointerUp={skonci}
        onPointerCancel={skonci}
        aria-label="Plocha pro podpis. Podepište se prstem nebo myší."
        className="aspect-[3/1] w-full max-w-[600px] cursor-crosshair touch-none rounded-lg border-[1.5px] border-dashed border-slate-400 bg-white"
      />
      <label className="flex max-w-[600px] flex-col gap-1 text-[13px] font-semibold text-muted" htmlFor={`jmeno-${strana}`}>
        Jméno podepisujícího
        <input id={`jmeno-${strana}`} value={jmeno} onChange={(e) => setJmeno(e.target.value)} className={tridyVstupu()} />
      </label>
      {chyba && (
        <p role="alert" className="text-sm font-semibold text-red">
          {chyba}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={ulozit} disabled={ukladam} className="min-h-11 rounded-xl bg-green px-5 text-sm font-bold text-navy hover:brightness-95 disabled:opacity-60">
          {ukladam ? "Ukládám…" : "Uložit podpis"}
        </button>
        <button type="button" onClick={smazat} className="min-h-11 rounded-xl border-[1.5px] border-line bg-surface px-4 text-sm font-semibold text-navy hover:border-muted">
          Smazat a znovu
        </button>
        <button type="button" onClick={() => setOtevreno(false)} className="min-h-11 px-2 text-sm font-semibold text-muted hover:text-navy">
          Zrušit
        </button>
      </div>
      <p className="text-[12px] text-muted">Jde o prostý elektronický podpis. Uloží se obrázek podpisu, jméno a čas podpisu.</p>
    </div>
  );
}
