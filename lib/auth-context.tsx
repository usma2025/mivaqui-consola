"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { AdminRol } from "@/lib/auth";

interface AuthState {
  username: string | null;
  rol: AdminRol | null;
  cargando: boolean;
  esAdmin: boolean;
}

const AuthContext = createContext<AuthState>({ username: null, rol: null, cargando: true, esAdmin: false });

// Una sola llamada a /api/auth/me por carga de la app -- el login ya
// escribe la cookie de sesión, esto solo la decodifica del lado del
// cliente para poder esconder botones de escritura si el usuario es
// LECTURA. La API sigue siendo la que de verdad lo hace cumplir (ver
// lib/session-server.ts) -- esto es solo para la UI, nunca el único gate.
// Reintenta antes de rendirse: un cold start del compute SSR (Lambda) puede
// hacer que este fetch falle o tarde una sola vez -- sin reintento, eso se
// ve como el botón de "Nueva finca" (y el resto de la UI de admin)
// desapareciendo intermitentemente, aunque la sesión sea válida. En
// localhost (proceso siempre caliente) este caso casi nunca ocurre.
async function obtenerSesionConReintento(intentos = 2): Promise<Response | null> {
  for (let i = 0; i < intentos; i++) {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok || res.status === 401) return res; // 401 es una respuesta válida (no autenticado), no un fallo transitorio
    } catch {
      // red/cold start -- reintenta
    }
    if (i < intentos - 1) await new Promise((r) => setTimeout(r, 400));
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ username: null, rol: null, cargando: true, esAdmin: false });

  useEffect(() => {
    obtenerSesionConReintento()
      .then((res) => (res?.ok ? res.json() : null))
      .then((data) => {
        setState({
          username: data?.username ?? null,
          rol: data?.rol ?? null,
          cargando: false,
          esAdmin: data?.rol === "ADMIN",
        });
      })
      .catch(() => setState({ username: null, rol: null, cargando: false, esAdmin: false }));
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
