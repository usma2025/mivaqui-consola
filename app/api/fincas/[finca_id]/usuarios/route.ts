import { NextResponse } from "next/server";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "@/lib/aws-clients";
import { TABLES } from "@/lib/tables";
import { listarUsuarios } from "@/lib/fincas-aggregates";
import { crearUsuarioCognito } from "@/lib/cognito-helpers";
import { crearCodigoRegistro } from "@/lib/codigos-registro";
import { requireAdmin } from "@/lib/session-server";
import { registrarAccion } from "@/lib/audit";

const ROLES_VALIDOS = new Set(["ADMIN", "LECTURA"]);
const MODOS_RESPUESTA_VALIDOS = new Set(["TEXTO", "VOZ"]);

export async function GET(_request: Request, { params }: { params: Promise<{ finca_id: string }> }) {
  const { finca_id } = await params;
  const usuarios = await listarUsuarios(finca_id);
  return NextResponse.json({ usuarios });
}

export async function POST(request: Request, { params }: { params: Promise<{ finca_id: string }> }) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { finca_id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const { telefono, nombre, rol, modo_respuesta } = (body as Record<string, unknown>) ?? {};
  if (!telefono || typeof telefono !== "string" || !telefono.startsWith("+")) {
    return NextResponse.json({ error: "telefono requerido en formato E.164 (+573...)" }, { status: 400 });
  }
  if (!nombre || typeof nombre !== "string") {
    return NextResponse.json({ error: "nombre requerido" }, { status: 400 });
  }
  const rolFinal = typeof rol === "string" && ROLES_VALIDOS.has(rol) ? rol : "LECTURA";
  const modoFinal = typeof modo_respuesta === "string" && MODOS_RESPUESTA_VALIDOS.has(modo_respuesta) ? modo_respuesta : "TEXTO";

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
        modo_respuesta: modoFinal,
        gsi1pk: finca_id,
        gsi1sk: telefono,
      },
    })
  );

  await registrarAccion({
    usuario: session.username,
    finca_id,
    accion: "agregar_usuario",
    detalle: `${nombre} (${telefono}, rol ${rolFinal}, respuesta ${modoFinal})`,
  });

  // El QR es una comodidad sobre el alta que ya ocurrió -- si falla, el
  // usuario queda creado en el allowlist igual (puede generarse de nuevo
  // desde la ficha de la finca).
  let codigoRegistro: Awaited<ReturnType<typeof crearCodigoRegistro>> | null = null;
  try {
    codigoRegistro = await crearCodigoRegistro(telefono, finca_id, rolFinal);
  } catch (err) {
    console.error("No se pudo generar el código de registro", err);
  }

  return NextResponse.json(
    { telefono, password_temporal: passwordTemporal, codigo_registro: codigoRegistro },
    { status: 201 }
  );
}
