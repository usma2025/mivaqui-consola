import { NextResponse } from "next/server";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "@/lib/aws-clients";
import { TABLES } from "@/lib/tables";

interface FincaMatch {
  finca_id: string;
  nombre_finca?: string;
}

interface AnimalMatch {
  finca_id: string;
  arete_id: string;
  categoria?: string;
}

const MAX_RESULTADOS = 20;
// Tope de páginas de Scan (1MB c/u) para una sola búsqueda -- sin esto, una
// consulta con pocos o ningún match obligaría a escanear la tabla de
// Animales completa en cada tecleo. Con el tope, una búsqueda rara puede
// no encontrar un match que exista más allá de este límite; se prefiere
// eso a que cada búsqueda cueste una lectura total de la tabla.
const MAX_PAGINAS_SCAN = 25;

// Buscador cross-finca por nombre/id de finca, o arete de animal -- el
// punto del panel es ver todo junto, así que encontrar algo no debería
// requerir saber de antemano en qué finca está. Animales no tiene GSI por
// arete_id (hash_key finca_id, range_key arete_id -- ver Infra), así que
// buscar por arete implica un Scan con filtro.
async function buscarAnimales(q: string): Promise<AnimalMatch[]> {
  const encontrados: AnimalMatch[] = [];
  let lastKey: Record<string, unknown> | undefined;
  for (let pagina = 0; pagina < MAX_PAGINAS_SCAN; pagina++) {
    const resp = await ddb.send(
      new ScanCommand({
        TableName: TABLES.animales,
        FilterExpression: "contains(arete_id, :q)",
        ExpressionAttributeValues: { ":q": q },
        ProjectionExpression: "finca_id, arete_id, categoria",
        ExclusiveStartKey: lastKey,
      })
    );
    encontrados.push(...((resp.Items ?? []) as AnimalMatch[]));
    lastKey = resp.LastEvaluatedKey;
    if (!lastKey || encontrados.length >= MAX_RESULTADOS) break;
  }
  return encontrados;
}

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ fincas: [], animales: [] });
  }
  const qLower = q.toLowerCase();

  const [fincasResp, animales] = await Promise.all([
    ddb.send(new ScanCommand({ TableName: TABLES.fincas, ProjectionExpression: "finca_id, nombre_finca" })),
    buscarAnimales(q),
  ]);

  const fincas = ((fincasResp.Items ?? []) as FincaMatch[]).filter(
    (f) => f.finca_id.toLowerCase().includes(qLower) || (f.nombre_finca ?? "").toLowerCase().includes(qLower)
  );

  return NextResponse.json({ fincas: fincas.slice(0, MAX_RESULTADOS), animales: animales.slice(0, MAX_RESULTADOS) });
}
