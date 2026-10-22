import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      // Dokud nejsou hotové kroky 1–4, ukazujeme na webu schválené HTML návrhy:
      //   /        → úvodní a přihlašovací stránka (public/uvod_cistaslozka.html)
      //   /navrh   → proklikávací návrh aplikace (public/navrh-aplikace.html)
      // Skutečná aplikace běží na /prehled, /faktury atd.
      beforeFiles: [
        { source: "/", destination: "/uvod_cistaslozka.html" },
        { source: "/navrh", destination: "/navrh-aplikace.html" },
      ],
    };
  },
};

export default nextConfig;
