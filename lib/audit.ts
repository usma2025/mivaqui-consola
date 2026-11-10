import { randomBytes } from "crypto";
import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "@/lib/aws-clients";
import { TABLES } from "@/lib/tables";

export interface AuditoriaItem {
  finca_id: string;
  timestamp: string;
  usuario: string;
  accion: string;
  detalle?: string;
}

interface RegistrarAccionInput {
  usuario: string;
  finca_id: string;
  accion: string;
  detalle?: string;
}

// Quién hizo qué y cuándo, por finca. Se llama DESPUÉS de que la mutación
// real ya se hizo -- si escribir el registro de auditoría falla (throttling,
// tabla no disponible), la acción del operador ya quedó hecha y no debe
// revertirse ni fallarle a él por esto; se registra el warning y se sigue,
// mismo criterio que cost_tracking.py en el Agent.
export async function registrarAccion({ usuario, finca_id, accion, detalle }: RegistrarAccionInput): Promise<void> {
  try {
    const now = new Date().toISOString();
    // Sufijo random: dos acciones en el mismo milisegundo no deben pisarse
    // (mismo finca_id+timestamp sería la misma Key).
    const timestamp = `${now}#${randomBytes(3).toString("hex")}`;
    await ddb.send(
      new PutCommand({
        TableName: TABLES.auditoria,
        Item: {
          finca_id,
          timestamp,
          usuario,
          accion,
          ...(detalle ? { detalle } : {}),
          gsi1pk: "ALL",
          gsi1sk: timestamp,
        },
      })
    );
  } catch (err) {
    console.error("No se pudo registrar la auditoría", err);
  }
}

export async function listarAuditoriaFinca(finca_id: string, limite = 50): Promise<AuditoriaItem[]> {
  try {
    const resp = await ddb.send(
      new QueryCommand({
        TableName: TABLES.auditoria,
        KeyConditionExpression: "finca_id = :f",
        ExpressionAttributeValues: { ":f": finca_id },
        ScanIndexForward: false,
        Limit: limite,
      })
    );
    return (resp.Items ?? []) as AuditoriaItem[];
  } catch {
    // Misma lógica que listarCostos: si la tabla no está disponible todavía,
    // la ficha de la finca sigue funcionando igual, solo sin esta sección.
    return [];
  }
}

export async function listarAuditoriaGlobal(limite = 100): Promise<AuditoriaItem[]> {
  try {
    const resp = await ddb.send(
      new QueryCommand({
        TableName: TABLES.auditoria,
        IndexName: "GSI1",
        KeyConditionExpression: "gsi1pk = :a",
        ExpressionAttributeValues: { ":a": "ALL" },
        ScanIndexForward: false,
        Limit: limite,
      })
    );
    return (resp.Items ?? []) as AuditoriaItem[];
  } catch {
    return [];
  }
}
