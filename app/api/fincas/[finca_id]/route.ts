import { NextResponse } from "next/server";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "@/lib/aws-clients";
import { TABLES } from "@/lib/tables";
import {
  contarAnimalesActivos,
  listarAlertas,
  listarCostos,
  listarEventosRecientes,
  listarEventosPorDia,
  listarPotreros,
  listarUsuarios,
} from "@/lib/fincas-aggregates";
import { requireAdmin } from "@/lib/session-server";
import { registrarAccion, listarAuditoriaFinca } from "@/lib/audit";

const ESTADOS_VALIDOS = new Set(["ACTIVA", "PAUSADA", "CHURN"]);

export async function GET(_request: Request, { params }: { params: Promise<{ finca_id: string }> }) {
  const { finca_id } = await params;

  const fincaResp = await ddb.send(new GetCommand({ TableName: TABLES.fincas, Key: { finca_id } }));
  if (!fincaResp.Item) {
    return NextResponse.json({ error: "Finca no encontrada" }, { status: 404 });
  }

  const [animales_activos, alertas, eventos_recientes, potreros, usuarios, costos, eventos_por_dia, auditoria] =
    await Promise.all([
      contarAnimalesActivos(finca_id),
      listarAlertas(finca_id),
      listarEventosRecientes(finca_id, 20),
      listarPotreros(finca_id),
      listarUsuarios(finca_id),
      listarCostos(finca_id, 30),
      listarEventosPorDia(finca_id, 30),
      listarAuditoriaFinca(finca_id, 50),
    ]);

  return NextResponse.json({
    finca: fincaResp.Item,
    animales_activos,
    alertas,
    eventos_recientes,
    potreros,
    usuarios,
    costos,
    eventos_por_dia,
    auditoria,
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ finca_id: string }> }) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { finca_id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const { estado_piloto, nota } = (body as Record<string, unknown>) ?? {};

  const fincaResp = await ddb.send(new GetCommand({ TableName: TABLES.fincas, Key: { finca_id } }));
  if (!fincaResp.Item) {
    return NextResponse.json({ error: "Finca no encontrada" }, { status: 404 });
  }

  const nuevasNotas: { fecha: string; texto: string }[] = [];
  const now = new Date().toISOString();

  if (estado_piloto !== undefined) {
    if (typeof estado_piloto !== "string" || !ESTADOS_VALIDOS.has(estado_piloto)) {
      return NextResponse.json({ error: `estado_piloto debe ser uno de: ${[...ESTADOS_VALIDOS].join(", ")}` }, { status: 400 });
    }
    nuevasNotas.push({ fecha: now, texto: `Estado del piloto actualizado a ${estado_piloto}` });
  }

  if (nota !== undefined) {
    if (typeof nota !== "string" || !nota.trim()) {
      return NextResponse.json({ error: "nota no puede estar vacía" }, { status: 400 });
    }
    nuevasNotas.push({ fecha: now, texto: nota.trim() });
  }

  if (estado_piloto === undefined && nuevasNotas.length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  const setParts = ["fecha_actualizacion = :fa"];
  const exprValues: Record<string, unknown> = { ":fa": now };

  if (estado_piloto !== undefined) {
    setParts.push("estado_piloto = :ep");
    exprValues[":ep"] = estado_piloto;
  }

  if (nuevasNotas.length > 0) {
    const notasActuales = Array.isArray(fincaResp.Item.notas) ? fincaResp.Item.notas : [];
    exprValues[":notas"] = [...notasActuales, ...nuevasNotas];
    setParts.push("notas = :notas");
  }

  await ddb.send(
    new UpdateCommand({
      TableName: TABLES.fincas,
      Key: { finca_id },
      UpdateExpression: "SET " + setParts.join(", "),
      ExpressionAttributeValues: exprValues,
    })
  );

  if (estado_piloto !== undefined) {
    await registrarAccion({
      usuario: session.username,
      finca_id,
      accion: "cambiar_estado",
      detalle: `estado_piloto -> ${estado_piloto}`,
    });
  }
  if (typeof nota === "string" && nota.trim()) {
    await registrarAccion({ usuario: session.username, finca_id, accion: "agregar_nota", detalle: nota.trim() });
  }

  return NextResponse.json({ message: "Actualizado" });
}
