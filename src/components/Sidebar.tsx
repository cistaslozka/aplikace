"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { IconClients, IconContract, IconDashboard, IconInvoice, IconPeople, IconPlus, IconSettings } from "./icons";

const NAV = [
  { href: "/prehled", label: "Přehled", Icon: IconDashboard },
  { href: "/faktury", label: "Faktury", Icon: IconInvoice },
  { href: "/smlouvy", label: "Smlouvy", Icon: IconContract },
  { href: "/hr", label: "HR a zaměstnanci", Icon: IconPeople, pro: true },
  { href: "/klienti", label: "Adresář klientů", Icon: IconClients },
];

function NavLink({ href, label, Icon, pro }: (typeof NAV)[number]) {
  const path = usePathname();
  const active = path === href || path.startsWith(href + "/");
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium whitespace-nowrap transition-colors " +
        (active ? "bg-green/15 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white")
      }
    >
      <Icon className="shrink-0" />
      <span className="flex-1">{label}</span>
      {pro && <span className="rounded-full bg-green-soft px-2 py-0.5 text-[11px] font-bold text-navy">PRO</span>}
    </Link>
  );
}

export function Sidebar() {
  return (
    <aside className="flex flex-col gap-6 bg-navy px-4 py-5 text-slate-300 md:sticky md:top-0 md:h-screen md:w-62 md:shrink-0 md:py-6">
      <div className="flex items-center justify-between gap-3">
        <Logo />
        <Link
          href="/faktury/nova"
          className="flex items-center gap-2 rounded-xl bg-green px-4 py-2.5 text-sm font-bold text-navy md:hidden"
        >
          <IconPlus /> Nový doklad
        </Link>
      </div>

      <Link
        href="/faktury/nova"
        className="hidden items-center justify-center gap-2 rounded-xl bg-green px-4 py-3 text-[15px] font-bold text-navy hover:brightness-95 md:flex"
      >
        <IconPlus /> Nový doklad
      </Link>

      <nav aria-label="Hlavní menu" className="-mx-1 flex gap-1 overflow-x-auto px-1 md:flex-col md:overflow-visible">
        {NAV.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </nav>

      <nav aria-label="Účet" className="hidden md:mt-auto md:block">
        <NavLink href="/nastaveni" label="Nastavení firmy" Icon={IconSettings} />
      </nav>
    </aside>
  );
}
