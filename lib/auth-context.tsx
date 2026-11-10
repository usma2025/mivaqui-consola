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
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ username: null, rol: null, cargando: true, esAdmin: false });

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
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
