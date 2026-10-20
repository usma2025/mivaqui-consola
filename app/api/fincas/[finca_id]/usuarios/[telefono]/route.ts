import { NextResponse } from "next/server";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "@/lib/aws-clients";
import { TABLES } from "@/lib/tables";
import { deshabilitarUsuarioCognito } from "@/lib/cognito-helpers";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ finca_id: string; telefono: string }> }
) {
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

  return NextResponse.json({ message: "Usuario desactivado" });
}
