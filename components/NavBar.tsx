"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/", label: "Resumen" },
  { href: "/fincas", label: "Fincas" },
  { href: "/pilotos", label: "Postulaciones" },
];

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/login") return null;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col bg-[#0B4C4A]">
      <div className="px-5 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#53B04B]">MiVaqui</p>
        <p className="text-sm font-bold text-white">Panel admin</p>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                active ? "bg-white/15 text-white" : "text-white/65 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-4">
        <button
          type="button"
          onClick={handleLogout}
          className="block w-full rounded-lg px-3 py-2 text-left text-[13px] font-medium text-white/65 transition hover:text-white"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
