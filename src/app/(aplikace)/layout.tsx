import { Sidebar } from "@/components/Sidebar";

// Rozvržení všech stránek po přihlášení: boční menu + obsah.
// Na mobilu je menu nahoře a dá se posouvat do strany.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">{children}</div>
      </main>
    </div>
  );
}
