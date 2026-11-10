import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "@/lib/aws-clients";
import { TABLES } from "@/lib/tables";
import { hashPassword, verifyPassword, SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

interface AdminUsuario {
  username: string;
  password_hash: string;
}

export async function POST(request: Request) {
  // proxy.ts ya exige sesión para llegar hasta acá, pero igual se necesita
  // decodificarla de nuevo para saber DE QUIÉN es la contraseña a cambiar.
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const { currentPassword, newPassword } = (body as { currentPassword?: string; newPassword?: string }) ?? {};
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Contraseña actual y nueva son requeridas" }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "La nueva contraseña debe tener al menos 8 caracteres" }, { status: 400 });
  }

  const resp = await ddb.send(
    new GetCommand({ TableName: TABLES.adminUsuarios, Key: { username: session.username } })
  );
  const usuario = resp.Item as AdminUsuario | undefined;
  if (!usuario || !(await verifyPassword(currentPassword, usuario.password_hash))) {
    return NextResponse.json({ error: "La contraseña actual no es correcta" }, { status: 401 });
  }

  const password_hash = await hashPassword(newPassword);
  await ddb.send(
    new UpdateCommand({
      TableName: TABLES.adminUsuarios,
      Key: { username: session.username },
      UpdateExpression: "SET password_hash = :h",
      ExpressionAttributeValues: { ":h": password_hash },
    })
  );

  return NextResponse.json({ message: "Contraseña actualizada" });
}
