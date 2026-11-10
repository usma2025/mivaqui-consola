import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { SignJWT, jwtVerify } from "jose";

const scrypt = promisify(scryptCallback);

const SESSION_COOKIE_NAME = "mivaqui_admin_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 días

function getSessionSecret(): Uint8Array {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET no está configurado");
  }
  return new TextEncoder().encode(secret);
}

// ── Contraseñas: scrypt con salt propio, nada de dependencias nativas (bcrypt
// necesita compilación) — scrypt ya viene en el módulo crypto de Node. ──────

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const storedBuffer = Buffer.from(hashHex, "hex");
  if (derived.length !== storedBuffer.length) return false;
  return timingSafeEqual(derived, storedBuffer);
}

// ── Sesión: JWT firmado (HS256) en una cookie httpOnly — mismo espíritu que
// el modo LOCAL_JWT_SECRET del Backend real, pero este panel es su propia
// aplicación independiente, con su propia tabla de usuarios por username
// (no por teléfono/Cognito, que es el esquema del producto). ───────────────

export type AdminRol = "ADMIN" | "LECTURA";

export interface SessionPayload {
  username: string;
  rol: AdminRol;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSessionSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    if (typeof payload.username !== "string") return null;
    // Sesiones firmadas antes de que existiera `rol` (si quedó alguna cookie
    // viva de antes de este cambio) se tratan como ADMIN -- eran la única
    // clase de usuario que existía en ese momento.
    const rol = payload.rol === "LECTURA" ? "LECTURA" : "ADMIN";
    return { username: payload.username, rol };
  } catch {
    return null;
  }
}

export { SESSION_COOKIE_NAME, SESSION_DURATION_SECONDS };
