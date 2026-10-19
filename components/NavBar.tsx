"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

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
    <aside
      className="no-print sticky top-0 flex h-screen w-60 shrink-0 flex-col"
      style={{ backgroundColor: "#0B4C4A" }}
    >
      <div className="flex h-16 shrink-0 items-center px-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Logo-multiformato-09.png" alt="MiVaqui" className="h-8 w-auto object-contain" />
      </div>

      <div className="px-5 pb-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#53B04B" }}>
          Panel administrativo
        </p>
      </div>

      <div className="h-px shrink-0" style={{ backgroundColor: "rgba(255,255,255,0.15)" }} />

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "relative block rounded-lg px-3.5 py-2.5 text-[14px] font-medium transition-colors duration-150",
                active ? "text-white" : "text-white/65 hover:text-white"
              )}
              style={active ? { backgroundColor: "rgba(83,176,75,0.22)" } : undefined}
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.08)";
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = "";
              }}
            >
              <span>{link.label}</span>
              {active && (
                <span
                  className="absolute inset-y-1.5 left-0 w-0.5 rounded-full"
                  style={{ backgroundColor: "#53B04B" }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 space-y-2 px-3 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}>
        <div
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium"
          style={{ backgroundColor: "rgba(83,176,75,0.18)", color: "#74BA62", border: "1px solid rgba(83,176,75,0.3)" }}
        >
          <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#53B04B" }} />
          En línea
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="block w-full rounded-lg px-3.5 py-2 text-left text-[13px] font-medium text-white/65 transition-colors duration-150 hover:text-white"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
