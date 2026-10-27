import type { NextConfig } from "next";

// Soubory, které knihovna PDF načítá až za běhu, takže je Vercel sám nepřibalí:
// naše písma a výchozí písma a barevný profil knihovny pdfkit.
const SOUBORY_PRO_PDF = ["./src/fonts/**", "./node_modules/pdfkit/js/standard-fonts/**", "./node_modules/pdfkit/js/data/**"];

const nextConfig: NextConfig = {
  // Písma pro PDF faktury musí být součástí nasazení na Vercelu
  outputFileTracingIncludes: {
    "/faktury/[id]/pdf": SOUBORY_PRO_PDF,
    "/faktury/[id]/upominka/[cislo]": SOUBORY_PRO_PDF,
    "/smlouvy/[id]/pdf": SOUBORY_PRO_PDF,
  },
  serverExternalPackages: ["@react-pdf/renderer"],
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
