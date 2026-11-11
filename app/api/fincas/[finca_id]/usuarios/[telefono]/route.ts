import { NextResponse } from "next/server";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "@/lib/aws-clients";
import { TABLES } from "@/lib/tables";
import { deshabilitarUsuarioCognito } from "@/lib/cognito-helpers";
import { crearCodigoRegistro } from "@/lib/codigos-registro";
import { requireAdmin } from "@/lib/session-server";
import { registrarAccion } from "@/lib/audit";

// Re-genera el QR de autoregistro para un usuario que ya existe en el
// allowlist (ej. el primero se perdió o expiró) -- no crea nada nuevo en
// Cognito/Allowlist, solo un código adicional ligado al mismo teléfono.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ finca_id: string; telefono: string }> }
) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { finca_id, telefono: telefonoParam } = await params;
  const telefono = decodeURIComponent(telefonoParam);

  const existing = await ddb.send(new GetCommand({ TableName: TABLES.allowlist, Key: { telefono } }));
  if (!existing.Item || existing.Item.finca_id !== finca_id) {
    return NextResponse.json({ error: "Número no encontrado en esta finca" }, { status: 404 });
  }

  const codigoRegistro = await crearCodigoRegistro(telefono, finca_id, (existing.Item.rol as string) ?? "LECTURA");
  return NextResponse.json({ codigo_registro: codigoRegistro });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ finca_id: string; telefono: string }> }
) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { finca_id, telefono: telefonoParam } = await params;
  const telefono = decodeURIComponent(telefonoParam);

  const existing = await ddb.send(new GetCommand({ TableName: TABLES.allowlist, Key: { telefono } }));
  if (!existing.Item || existing.Item.finca_id !== finca_id) {
    return NextResponse.json({ error: "Número no encontrado en esta finca" }, { status: 404 });
  }

  await ddb.send(
    new UpdateCommand({
      TableName: TABLES.allowlist,
      Key: { telefono },
      UpdateExpression: "SET activo = :f",
      ExpressionAttributeValues: { ":f": false },
    })
  );

  try {
    await deshabilitarUsuarioCognito(telefono);
  } catch (err) {
    console.error("No se pudo deshabilitar el usuario en Cognito", err);
  }

  await registrarAccion({ usuario: session.username, finca_id, accion: "desactivar_usuario", detalle: telefono });

  return NextResponse.json({ message: "Usuario desactivado" });
}
