"use client";

import { useEffect, useRef, useState } from "react";

// Zmenší list A4 (794 px) tak, aby se vešel do šířky rodiče. Při tisku se zmenšení ruší.
export function Meritko({ children, sirka = 794, vyska = 1123 }: { children: React.ReactNode; sirka?: number; vyska?: number }) {
  const obal = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);

  useEffect(() => {
    const el = obal.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setK(Math.min(1, e.contentRect.width / sirka)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [sirka]);

  return (
    <div ref={obal} className="meritko w-full">
      <div className="meritko-plocha mx-auto overflow-hidden" style={{ width: sirka * k, height: vyska * k }}>
        <div className="meritko-obsah origin-top-left" style={{ transform: `scale(${k})`, width: sirka }}>
          {children}
        </div>
      </div>
    </div>
  );
}
