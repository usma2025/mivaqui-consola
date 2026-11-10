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

// Buscador cross-finca por nombre/id de finca, o arete de animal -- el
// punto del panel es ver todo junto, así que encontrar algo no debería
// requerir saber de antemano en qué finca está. Animales no tiene GSI por
// arete_id (hash_key finca_id, range_key arete_id -- ver Infra), así que
// buscar por arete implica un Scan con filtro; aceptable al volumen de
// animales de un puñado de fincas piloto.
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ fincas: [], animales: [] });
  }
  const qLower = q.toLowerCase();

  const [fincasResp, animalesResp] = await Promise.all([
    ddb.send(new ScanCommand({ TableName: TABLES.fincas, ProjectionExpression: "finca_id, nombre_finca" })),
    ddb.send(
      new ScanCommand({
        TableName: TABLES.animales,
        FilterExpression: "contains(arete_id, :q)",
        ExpressionAttributeValues: { ":q": q },
        ProjectionExpression: "finca_id, arete_id, categoria",
      })
    ),
  ]);

  const fincas = ((fincasResp.Items ?? []) as FincaMatch[]).filter(
    (f) => f.finca_id.toLowerCase().includes(qLower) || (f.nombre_finca ?? "").toLowerCase().includes(qLower)
  );
  const animales = (animalesResp.Items ?? []) as AnimalMatch[];

  return NextResponse.json({ fincas: fincas.slice(0, 20), animales: animales.slice(0, 20) });
}
