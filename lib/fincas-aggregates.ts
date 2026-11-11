import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
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

export interface PuntoTrend {
  fecha: string;
  cantidad: number;
}

// Mismo Query-todo-y-ordena-en-memoria que listarEventosRecientes (la sort
// key no es cronológica entre animales distintos) -- acá en vez de quedarse
// con los últimos N, se agrupan TODOS los de la ventana por día calendario,
// para la gráfica de tendencia de la ficha de finca.
export async function listarEventosPorDia(finca_id: string, dias = 30): Promise<PuntoTrend[]> {
  const desde = new Date();
  desde.setDate(desde.getDate() - (dias - 1));
  const porDia = new Map<string, number>();
  for (let i = 0; i < dias; i++) {
    const d = new Date(desde);
    d.setDate(d.getDate() + i);
    porDia.set(d.toISOString().slice(0, 10), 0);
  }

  let lastKey: Record<string, unknown> | undefined;
  do {
    const resp = await ddb.send(
      new QueryCommand({
        TableName: TABLES.eventos,
        KeyConditionExpression: "finca_id = :f",
        ExpressionAttributeValues: { ":f": finca_id },
        ProjectionExpression: "fecha_creacion",
        ExclusiveStartKey: lastKey,
      })
    );
    for (const item of resp.Items ?? []) {
      const fecha = String(item.fecha_creacion ?? "").slice(0, 10);
      if (porDia.has(fecha)) porDia.set(fecha, (porDia.get(fecha) ?? 0) + 1);
    }
    lastKey = resp.LastEvaluatedKey;
  } while (lastKey);

  return [...porDia.entries()].map(([fecha, cantidad]) => ({ fecha, cantidad }));
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

// Contadores diarios de uso que escribe el Agent (ver
// Agent/app/services/cost_tracking.py) — un ítem por finca_id+fecha con
// ADD atómico en cada llamada a OpenAI y cada WhatsApp enviado. Se usa para
// dar visibilidad de costo real por finca en el panel, no para facturar.
export interface CostoDiario {
  finca_id: string;
  fecha: string;
  openai_llamadas?: number;
  whatsapp_mensajes_enviados?: number;
  whatsapp_mensajes_recibidos?: number;
}

export interface ResumenCostos {
  dias: CostoDiario[];
  total_openai_llamadas: number;
  total_whatsapp_mensajes: number;
  total_whatsapp_recibidos: number;
}

export async function listarCostos(finca_id: string, dias = 30): Promise<ResumenCostos> {
  const vacio: ResumenCostos = {
    dias: [],
    total_openai_llamadas: 0,
    total_whatsapp_mensajes: 0,
    total_whatsapp_recibidos: 0,
  };
  try {
    const desde = new Date();
    desde.setDate(desde.getDate() - dias);
    const fechaDesde = desde.toISOString().slice(0, 10);

    const resp = await ddb.send(
      new QueryCommand({
        TableName: TABLES.costos,
        KeyConditionExpression: "finca_id = :f AND fecha >= :desde",
        ExpressionAttributeValues: { ":f": finca_id, ":desde": fechaDesde },
      })
    );
    const items = (resp.Items ?? []) as CostoDiario[];
    items.sort((a, b) => a.fecha.localeCompare(b.fecha));

    return {
      dias: items,
      total_openai_llamadas: items.reduce((acc, d) => acc + (d.openai_llamadas ?? 0), 0),
      total_whatsapp_mensajes: items.reduce((acc, d) => acc + (d.whatsapp_mensajes_enviados ?? 0), 0),
      total_whatsapp_recibidos: items.reduce((acc, d) => acc + (d.whatsapp_mensajes_recibidos ?? 0), 0),
    };
  } catch {
    // Si la tabla AgentCostos todavía no existe (ej. Terraform no aplicado
    // en este ambiente) la ficha de la finca sigue funcionando igual, solo
    // sin esta sección — igual criterio que el widget de salud del sistema.
    return vacio;
  }
}

export interface AllowlistItem {
  telefono: string;
  finca_id: string;
  rol?: string;
  nombre?: string;
  activo?: boolean;
  creado_en?: string;
  modo_respuesta?: string;
  ultimo_codigo_registro?: string;
  // True si ultimo_codigo_registro ya fue canjeado por WhatsApp (ver
  // lib/codigos-registro.ts) -- resuelto acá, no en el ítem de DynamoDB.
  whatsapp_confirmado?: boolean;
}

// True si el código de registro referenciado ya fue canjeado. GetItem
// directo por su PK (codigo) -- barato incluso por usuario, nada de Scan.
async function whatsappConfirmado(codigo: string | undefined): Promise<boolean> {
  if (!codigo) return false;
  const resp = await ddb.send(new GetCommand({ TableName: TABLES.codigosRegistro, Key: { codigo } }));
  return Boolean(resp.Item?.usado);
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
  const items = (resp.Items ?? []) as AllowlistItem[];
  return Promise.all(
    items.map(async (item) => ({
      ...item,
      whatsapp_confirmado: await whatsappConfirmado(item.ultimo_codigo_registro),
    }))
  );
}
