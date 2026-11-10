import { NextResponse } from "next/server";
import { DeleteCommand, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "@/lib/aws-clients";
import { TABLES } from "@/lib/tables";
import { crearUsuarioCognito } from "@/lib/cognito-helpers";
import { requireAdmin } from "@/lib/session-server";
import { registrarAccion } from "@/lib/audit";

const ROLES_VALIDOS = new Set(["ADMIN", "LECTURA"]);

// A diferencia de app/api/fincas/[finca_id]/usuarios (que exige
// telefono.startsWith("+")), `identificador` acá puede ser un BSUID de
// WhatsApp (ej. "CO.2615028948909537", sin "+") -- por eso es una ruta
// separada en vez de reutilizar esa, y por eso finca_id es un campo del
// body (elegido por el operador) y no viene de la URL: el operador de este
// panel decide a qué finca asociar el identificador, viendo intentos de
// TODAS las fincas a la vez.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ identificador: string }> }
) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { identificador } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const { finca_id, nombre, rol } = (body as Record<string, unknown>) ?? {};
  if (!finca_id || typeof finca_id !== "string") {
    return NextResponse.json({ error: "finca_id es requerido" }, { status: 400 });
  }
  const rolFinal = typeof rol === "string" && ROLES_VALIDOS.has(rol) ? rol : "LECTURA";
  const nombreFinal = typeof nombre === "string" && nombre.trim() ? nombre.trim() : undefined;

  const intento = await ddb.send(
    new GetCommand({ TableName: TABLES.intentosAcceso, Key: { identificador } })
  );
  if (!intento.Item) {
    return NextResponse.json({ error: "Ese identificador no tiene ningún intento registrado" }, { status: 404 });
  }

  const finca = await ddb.send(new GetCommand({ TableName: TABLES.fincas, Key: { finca_id } }));
  if (!finca.Item) {
    return NextResponse.json({ error: "Finca no encontrada" }, { status: 404 });
  }

  const existingAllowlist = await ddb.send(
    new GetCommand({ TableName: TABLES.allowlist, Key: { telefono: identificador } })
  );
  if (existingAllowlist.Item) {
    return NextResponse.json({ error: "Ese identificador ya está asignado a una finca" }, { status: 409 });
  }

  let passwordTemporal: string;
  try {
    passwordTemporal = await crearUsuarioCognito(identificador);
  } catch (err) {
    console.error("No se pudo crear el usuario en Cognito", err);
    return NextResponse.json({ error: "No se pudo crear el usuario de acceso al Portal" }, { status: 502 });
  }

  const now = new Date().toISOString();
  await ddb.send(
    new PutCommand({
      TableName: TABLES.allowlist,
      Item: {
        telefono: identificador,
        finca_id,
        rol: rolFinal,
        nombre: nombreFinal,
        activo: true,
        creado_en: now,
        modo_respuesta: "TEXTO",
        gsi1pk: finca_id,
        gsi1sk: identificador,
      },
    })
  );

  await ddb.send(new DeleteCommand({ TableName: TABLES.intentosAcceso, Key: { identificador } }));

  await registrarAccion({
    usuario: session.username,
    finca_id,
    accion: "autorizar_intento_acceso",
    detalle: `${identificador}${nombreFinal ? ` (${nombreFinal})` : ""}, rol ${rolFinal}`,
  });

  return NextResponse.json({ identificador, finca_id, password_temporal: passwordTemporal }, { status: 201 });
}
