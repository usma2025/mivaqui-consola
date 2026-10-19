import { NextResponse } from "next/server";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "@/lib/aws-clients";
import { TABLES } from "@/lib/tables";
import { createSessionToken, verifyPassword, SESSION_COOKIE_NAME, SESSION_DURATION_SECONDS } from "@/lib/auth";

interface AdminUsuario {
  username: string;
  password_hash: string;
  nombre?: string;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const { username, password } = (body as { username?: string; password?: string }) ?? {};
  if (!username || !password) {
    return NextResponse.json({ error: "Usuario y contraseña requeridos" }, { status: 400 });
  }

  const resp = await ddb.send(
    new GetCommand({ TableName: TABLES.adminUsuarios, Key: { username: username.trim().toLowerCase() } })
  );
  const usuario = resp.Item as AdminUsuario | undefined;

  // Mismo mensaje exista o no el usuario, y comparación de contraseña igual
  // de "costosa" en ambos casos — no dar pistas de qué usuarios existen.
  const passwordOk = usuario ? await verifyPassword(password, usuario.password_hash) : await verifyPassword(password, "0".repeat(32) + ":" + "0".repeat(128));
  if (!usuario || !passwordOk) {
    return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
  }

  const token = await createSessionToken({ username: usuario.username });
  const response = NextResponse.json({ username: usuario.username, nombre: usuario.nombre ?? null });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
  return response;
}
