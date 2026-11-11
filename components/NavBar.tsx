"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Resumen" },
  { href: "/fincas", label: "Fincas" },
  { href: "/alertas", label: "Alertas" },
  { href: "/pilotos", label: "Postulaciones" },
  { href: "/intentos-acceso", label: "Intentos sin autorizar" },
  { href: "/auditoria", label: "Auditoría" },
];

// Contenido compartido entre el sidebar de escritorio y el drawer móvil --
// mismo estado de búsqueda/logout, solo cambia el contenedor que lo envuelve.
// `onNavigate` lo pasa el drawer para cerrarse al tocar un enlace o buscar;
// el sidebar de escritorio no lo necesita.
function NavBarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function handleBuscar(e: React.FormEvent) {
    e.preventDefault();
    if (!busqueda.trim()) return;
    router.push(`/buscar?q=${encodeURIComponent(busqueda.trim())}`);
    onNavigate?.();
  }

  return (
    <>
      <div className="flex h-16 shrink-0 items-center px-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Logo-multiformato-09.png" alt="MiVaqui" className="h-8 w-auto object-contain" />
      </div>

      <form onSubmit={handleBuscar} className="px-3 pb-3">
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar finca o arete…"
          className="w-full rounded-lg px-3 py-2 text-[13px] text-white placeholder-white/50 outline-none"
          style={{ backgroundColor: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}
        />
      </form>

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
              onClick={onNavigate}
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
        <Link
          href="/cuenta"
          onClick={onNavigate}
          className="block w-full rounded-lg px-3.5 py-2 text-left text-[13px] font-medium text-white/65 transition-colors duration-150 hover:text-white"
        >
          Mi cuenta
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="block w-full rounded-lg px-3.5 py-2 text-left text-[13px] font-medium text-white/65 transition-colors duration-150 hover:text-white"
        >
          Cerrar sesión
        </button>
      </div>
    </>
  );
}

function HamburgerIcon() {
  return (
    <svg
      width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
    >
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

export function NavBar() {
  const pathname = usePathname();
  const [drawerAbierto, setDrawerAbierto] = useState(false);

  // Red de seguridad: si la navegación cambia por cualquier otra vía (botón
  // atrás/adelante, cerrar sesión, etc.) el drawer no debe quedar abierto.
  // Ajustado durante el render (no en un Effect) -- patrón recomendado por
  // React para "resetear estado cuando cambia una prop".
  const [pathnamePrevio, setPathnamePrevio] = useState(pathname);
  if (pathname !== pathnamePrevio) {
    setPathnamePrevio(pathname);
    setDrawerAbierto(false);
  }

  if (pathname === "/login") return null;

  return (
    <>
      {/* Barra superior móvil -- reemplaza el sidebar por debajo de `lg` */}
      <header
        className="no-print sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between px-4 lg:hidden"
        style={{ backgroundColor: "#0B4C4A" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Logo-multiformato-09.png" alt="MiVaqui" className="h-7 w-auto object-contain" />
        <button
          type="button"
          aria-label="Abrir menú de navegación"
          onClick={() => setDrawerAbierto(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 transition-colors duration-150 hover:text-white hover:bg-white/10"
        >
          <HamburgerIcon />
        </button>
      </header>

      {drawerAbierto && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 animate-fade-in"
            onClick={() => setDrawerAbierto(false)}
          />
          <aside
            className="absolute inset-y-0 left-0 flex h-full w-72 max-w-[80vw] flex-col overflow-y-auto shadow-xl animate-slide-in-left"
            style={{ backgroundColor: "#0B4C4A" }}
          >
            <NavBarContent onNavigate={() => setDrawerAbierto(false)} />
          </aside>
        </div>
      )}

      {/* Sidebar fijo -- sin cambios de comportamiento en `lg` y superior */}
      <aside
        className="no-print sticky top-0 hidden h-screen w-60 shrink-0 flex-col lg:flex"
        style={{ backgroundColor: "#0B4C4A" }}
      >
        <NavBarContent />
      </aside>
    </>
  );
}
