import { NextResponse } from "next/server";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "@/lib/aws-clients";
import { TABLES } from "@/lib/tables";
import { requireAdmin } from "@/lib/session-server";
import { registrarAccion } from "@/lib/audit";

// Cierra el loop de "Convertir a finca": marca la postulación como
// convertida y guarda a qué finca dio lugar, para que deje de contar como
// "postulación sin convertir" en el dashboard.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const { finca_id } = (body as Record<string, unknown>) ?? {};
  if (!finca_id || typeof finca_id !== "string") {
    return NextResponse.json({ error: "finca_id es requerido" }, { status: 400 });
  }

  await ddb.send(
    new UpdateCommand({
      TableName: TABLES.pilotosComercial,
      Key: { id },
      UpdateExpression: "SET convertido = :c, finca_id_creada = :f, convertido_en = :ce",
      ExpressionAttributeValues: { ":c": true, ":f": finca_id, ":ce": new Date().toISOString() },
    })
  );

  await registrarAccion({
    usuario: session.username,
    finca_id,
    accion: "convertir_postulacion",
    detalle: `Postulación ${id}`,
  });

  return NextResponse.json({ message: "Postulación marcada como convertida" });
}
