import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "@/lib/aws-clients";
import { TABLES } from "@/lib/tables";

export async function contarAnimalesActivos(finca_id: string): Promise<number> {
  const resp = await ddb.send(
    new QueryCommand({
      TableName: TABLES.animales,
      KeyConditionExpression: "finca_id = :f",
      FilterExpression: "attribute_not_exists(estado) OR estado <> :inactivo",
      ExpressionAttributeValues: { ":f": finca_id, ":inactivo": "INACTIVO" },
      Select: "COUNT",
    })
  );
  return resp.Count ?? 0;
}

export interface AlertaItem {
  finca_id: string;
  alerta_sk: string;
  arete_id?: string;
  tipo_alerta?: string;
  descripcion?: string;
  fecha_alerta?: string;
}

export async function listarAlertas(finca_id: string): Promise<AlertaItem[]> {
  const resp = await ddb.send(
    new QueryCommand({
      TableName: TABLES.alertas,
      KeyConditionExpression: "finca_id = :f",
      ExpressionAttributeValues: { ":f": finca_id },
    })
  );
  return (resp.Items ?? []) as AlertaItem[];
}

export async function contarAlertasActivas(finca_id: string): Promise<number> {
  return (await listarAlertas(finca_id)).length;
}

// Query, no Scan (finca_id es la partition key) -- pero el orden de la sort
// key (arete_id#timestamp) no es cronológico entre animales distintos, así
// que hay que traer fecha_creacion de todos los eventos de la finca y
// ordenar acá. A esta escala (fincas piloto) es barato; si el volumen de
// eventos crece mucho, esto necesita un GSI por fecha.
export interface EventoResumen {
  arete_id?: string;
  tipo_evento?: string;
  fecha_evento?: string;
  fecha_creacion?: string;
  registrado_por?: string;
}

export async function listarEventosRecientes(finca_id: string, limite = 20): Promise<EventoResumen[]> {
  let lastKey: Record<string, unknown> | undefined;
  const todos: EventoResumen[] = [];
  do {
    const resp = await ddb.send(
      new QueryCommand({
        TableName: TABLES.eventos,
        KeyConditionExpression: "finca_id = :f",
        ExpressionAttributeValues: { ":f": finca_id },
        ProjectionExpression: "arete_id, tipo_evento, fecha_evento, fecha_creacion, registrado_por",
        ExclusiveStartKey: lastKey,
      })
    );
    todos.push(...((resp.Items ?? []) as EventoResumen[]));
    lastKey = resp.LastEvaluatedKey;
  } while (lastKey);

  todos.sort((a, b) => String(b.fecha_creacion ?? "").localeCompare(String(a.fecha_creacion ?? "")));
  return todos.slice(0, limite);
}

export async function ultimaActividad(finca_id: string): Promise<string | null> {
  const eventos = await listarEventosRecientes(finca_id, 1);
  return eventos[0]?.fecha_creacion ?? null;
}

export interface PotreroItem {
  finca_id: string;
  potrero_id: string;
  nombre?: string;
  area_hectareas?: number;
  capacidad_animales?: number;
  activo?: boolean;
}

export async function listarPotreros(finca_id: string): Promise<PotreroItem[]> {
  const resp = await ddb.send(
    new QueryCommand({
      TableName: TABLES.potreros,
      KeyConditionExpression: "finca_id = :f",
      ExpressionAttributeValues: { ":f": finca_id },
    })
  );
  return (resp.Items ?? []) as PotreroItem[];
}

export interface AllowlistItem {
  telefono: string;
  finca_id: string;
  rol?: string;
  nombre?: string;
  activo?: boolean;
  creado_en?: string;
}

export async function listarUsuarios(finca_id: string): Promise<AllowlistItem[]> {
  const resp = await ddb.send(
    new QueryCommand({
      TableName: TABLES.allowlist,
      IndexName: "GSI1",
      KeyConditionExpression: "gsi1pk = :f",
      ExpressionAttributeValues: { ":f": finca_id },
    })
  );
  return (resp.Items ?? []) as AllowlistItem[];
}
