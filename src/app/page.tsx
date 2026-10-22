import { redirect } from "next/navigation";

// Zatím vede rovnou na přehled. V kroku 1 (přihlášení) se sem přidá
// kontrola: nepřihlášený uživatel půjde na /prihlaseni.
export default function Home() {
  redirect("/prehled");
}
