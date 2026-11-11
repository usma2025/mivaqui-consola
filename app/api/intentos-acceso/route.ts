import { NextResponse } from "next/server";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "@/lib/aws-clients";
import { TABLES } from "@/lib/tables";

interface IntentoAccesoItem {
  identificador: string;
  ultimo_mensaje?: string;
  veces?: number;
  primera_vez?: string;
  ultima_vez?: string;
}

// Lista intentos de identificadores (teléfono o BSUID de WhatsApp) que
// escribieron al bot sin estar autorizados. A propósito NO pasa por la API
// HTTP del Backend (ver lib/tables.ts) -- esta bandeja es, por diseño,
// cross-finca (todavía no se sabe a qué finca pertenece cada intento), así
// que solo debe poder verla/resolverla un operador de este panel, nunca un
// admin de una finca individual desde `hato`.
export async function GET() {
  // Un Scan de una sola página trunca en silencio pasado 1MB -- con
  // suficientes intentos pendientes acumulados, esto dejaba algunos sin
  // mostrar y sin ningún aviso. Pagina hasta agotar la tabla.
  let lastKey: Record<string, unknown> | undefined;
  const intentos: IntentoAccesoItem[] = [];
  do {
    const resp = await ddb.send(new ScanCommand({ TableName: TABLES.intentosAcceso, ExclusiveStartKey: lastKey }));
    intentos.push(...((resp.Items ?? []) as IntentoAccesoItem[]));
    lastKey = resp.LastEvaluatedKey;
  } while (lastKey);

  intentos.sort((a, b) => (b.ultima_vez ?? "").localeCompare(a.ultima_vez ?? ""));
  return NextResponse.json({ intentos });
}
