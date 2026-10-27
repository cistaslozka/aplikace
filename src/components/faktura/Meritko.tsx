"use client";

import { useEffect, useRef, useState } from "react";

// Zmenší list A4 (794 px) tak, aby se vešel do šířky rodiče. Při tisku se zmenšení ruší.
// volnaVyska: výška podle obsahu (smlouvy na více stran), jinak pevně jedna strana A4.
export function Meritko({
  children,
  sirka = 794,
  vyska = 1123,
  volnaVyska = false,
}: {
  children: React.ReactNode;
  sirka?: number;
  vyska?: number;
  volnaVyska?: boolean;
}) {
  const obal = useRef<HTMLDivElement>(null);
  const obsah = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  const [h, setH] = useState(vyska);

  useEffect(() => {
    const el = obal.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setK(Math.min(1, e.contentRect.width / sirka)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [sirka]);

  useEffect(() => {
    const el = obsah.current;
    if (!el || !volnaVyska) return;
    const ro = new ResizeObserver(() => setH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [volnaVyska]);

  return (
    <div ref={obal} className="meritko w-full">
      <div className="meritko-plocha mx-auto overflow-hidden" style={{ width: sirka * k, height: (volnaVyska ? h : vyska) * k }}>
        <div ref={obsah} className="meritko-obsah origin-top-left" style={{ transform: `scale(${k})`, width: sirka }}>
          {children}
        </div>
      </div>
    </div>
  );
}
