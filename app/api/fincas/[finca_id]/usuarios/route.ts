import { NextResponse } from "next/server";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "@/lib/aws-clients";
import { TABLES } from "@/lib/tables";
import { listarUsuarios } from "@/lib/fincas-aggregates";
import { crearUsuarioCognito } from "@/lib/cognito-helpers";

const ROLES_VALIDOS = new Set(["ADMIN", "LECTURA"]);

export async function GET(_request: Request, { params }: { params: Promise<{ finca_id: string }> }) {
  const { finca_id } = await params;
  const usuarios = await listarUsuarios(finca_id);
  return NextResponse.json({ usuarios });
}

export async function POST(request: Request, { params }: { params: Promise<{ finca_id: string }> }) {
  const { finca_id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const { telefono, nombre, rol } = (body as Record<string, unknown>) ?? {};
  if (!telefono || typeof telefono !== "string" || !telefono.startsWith("+")) {
    return NextResponse.json({ error: "telefono requerido en formato E.164 (+573...)" }, { status: 400 });
  }
  if (!nombre || typeof nombre !== "string") {
    return NextResponse.json({ error: "nombre requerido" }, { status: 400 });
  }
  const rolFinal = typeof rol === "string" && ROLES_VALIDOS.has(rol) ? rol : "LECTURA";

  const fincaResp = await ddb.send(new GetCommand({ TableName: TABLES.fincas, Key: { finca_id } }));
  if (!fincaResp.Item) {
    return NextResponse.json({ error: "Finca no encontrada" }, { status: 404 });
  }

  const existing = await ddb.send(new GetCommand({ TableName: TABLES.allowlist, Key: { telefono } }));
  if (existing.Item) {
    return NextResponse.json({ error: "Ese número ya está asignado a una finca" }, { status: 409 });
  }

  let passwordTemporal: string;
  try {
    passwordTemporal = await crearUsuarioCognito(telefono);
  } catch (err) {
    console.error("No se pudo crear el usuario en Cognito", err);
    return NextResponse.json({ error: "No se pudo crear el usuario de acceso al Portal" }, { status: 502 });
  }

  const now = new Date().toISOString();
  await ddb.send(
    new PutCommand({
      TableName: TABLES.allowlist,
      Item: {
        telefono,
        finca_id,
        rol: rolFinal,
        nombre,
        activo: true,
        creado_en: now,
        gsi1pk: finca_id,
        gsi1sk: telefono,
      },
    })
  );

  return NextResponse.json({ telefono, password_temporal: passwordTemporal }, { status: 201 });
}
