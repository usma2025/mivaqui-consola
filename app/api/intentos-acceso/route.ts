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
  const scan = await ddb.send(new ScanCommand({ TableName: TABLES.intentosAcceso }));
  const intentos = (scan.Items ?? []) as IntentoAccesoItem[];
  intentos.sort((a, b) => (b.ultima_vez ?? "").localeCompare(a.ultima_vez ?? ""));
  return NextResponse.json({ intentos });
}
