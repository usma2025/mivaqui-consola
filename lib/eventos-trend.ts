import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "@/lib/aws-clients";
import { TABLES } from "@/lib/tables";
import type { PuntoTrend } from "@/lib/fincas-aggregates";

// Igual que listarEventosPorDia pero a través de TODAS las fincas -- no hay
// un índice global por fecha, así que es un Scan completo de la tabla de
// Eventos. Aceptable a la escala de un puñado de fincas piloto (mismo
// criterio que el resto de agregados de este panel); si el volumen de
// eventos crece mucho, esto necesita un GSI por fecha.
export async function eventosPorDiaGlobal(dias = 30): Promise<PuntoTrend[]> {
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
      new ScanCommand({
        TableName: TABLES.eventos,
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
