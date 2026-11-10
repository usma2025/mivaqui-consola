import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken, type SessionPayload } from "@/lib/auth";

// proxy.ts ya exige una sesión válida para llegar a cualquier ruta de API
// (menos /api/auth/login) -- esto decodifica esa misma cookie DENTRO del
// route handler cuando se necesita saber QUIÉN hace la acción (auditoría) o
// con qué rol (gating de mutaciones), no solo que haya alguien logueado.
export async function getCurrentSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return token ? await verifySessionToken(token) : null;
}

// Para endpoints que mutan datos reales del producto (crear finca, agregar/
// desactivar usuario, cambiar estado, convertir postulación): un usuario
// LECTURA puede ver todo pero no escribir nada. Devuelve la sesión si puede
// escribir, o la respuesta 401/403 lista para retornar si no.
export async function requireAdmin(): Promise<SessionPayload | NextResponse> {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (session.rol !== "ADMIN") {
    return NextResponse.json({ error: "Tu usuario es de solo lectura" }, { status: 403 });
  }
  return session;
}
