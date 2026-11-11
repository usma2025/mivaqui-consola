import { NextResponse } from "next/server";
import { DeleteCommand, GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "@/lib/aws-clients";
import { TABLES } from "@/lib/tables";
import { crearUsuarioCognito } from "@/lib/cognito-helpers";
import { requireAdmin } from "@/lib/session-server";
import { registrarAccion } from "@/lib/audit";

const ROLES_VALIDOS = new Set(["ADMIN", "LECTURA"]);

// `identificador` (el que llegó por WhatsApp) puede ser un BSUID (ej.
// "CO.2615028948909537", username activado) en vez del teléfono real -- por
// eso el operador SIEMPRE da el teléfono real por separado (`telefono` en
// el body). La fila de Allowlist (y su usuario de Cognito, necesario para
// entrar al Portal) queda keyed por ESE teléfono, nunca por el BSUID. Si
// ambos difieren, se vincula el BSUID a esa misma fila (atributo `bsuid` +
// GSI2) en vez de crear una fila aparte -- una sola fila por persona, igual
// que hace POST /v1/codigos-registro/validar en el Backend.
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

  const { finca_id, telefono, nombre, rol } = (body as Record<string, unknown>) ?? {};
  if (!finca_id || typeof finca_id !== "string") {
    return NextResponse.json({ error: "finca_id es requerido" }, { status: 400 });
  }
  if (!telefono || typeof telefono !== "string" || !telefono.startsWith("+")) {
    return NextResponse.json({ error: "telefono es requerido en formato E.164 (+573...)" }, { status: 400 });
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
    new GetCommand({ TableName: TABLES.allowlist, Key: { telefono } })
  );
  if (existingAllowlist.Item && existingAllowlist.Item.finca_id !== finca_id) {
    return NextResponse.json({ error: "Ese teléfono ya está asignado a otra finca" }, { status: 409 });
  }

  let passwordTemporal: string | null = null;
  if (!existingAllowlist.Item) {
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
          nombre: nombreFinal,
          activo: true,
          creado_en: now,
          modo_respuesta: "TEXTO",
          gsi1pk: finca_id,
          gsi1sk: telefono,
        },
      })
    );
  }

  // Quien llegó hasta acá ya le escribió al bot por WhatsApp (por eso existe
  // un intento de acceso) -- whatsapp_confirmado_manual es el mismo escape
  // hatch que usa el Backend/Consola para pilotos probados a mano, así que
  // "Generar QR" deja de ofrecerse para este número de una vez.
  await ddb.send(
    new UpdateCommand({
      TableName: TABLES.allowlist,
      Key: { telefono },
      UpdateExpression:
        "SET whatsapp_confirmado_manual = :t" + (identificador !== telefono ? ", bsuid = :b" : ""),
      ExpressionAttributeValues: {
        ":t": true,
        ...(identificador !== telefono ? { ":b": identificador } : {}),
      },
    })
  );

  await ddb.send(new DeleteCommand({ TableName: TABLES.intentosAcceso, Key: { identificador } }));

  await registrarAccion({
    usuario: session.username,
    finca_id,
    accion: "autorizar_intento_acceso",
    detalle: `${telefono}${identificador !== telefono ? ` (bsuid ${identificador})` : ""}${nombreFinal ? ` — ${nombreFinal}` : ""}, rol ${rolFinal}`,
  });

  return NextResponse.json({ identificador, telefono, finca_id, password_temporal: passwordTemporal }, { status: 201 });
}
