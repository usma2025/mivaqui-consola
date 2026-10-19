import { NextResponse } from "next/server";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "@/lib/aws-clients";
import { TABLES } from "@/lib/tables";

export async function GET() {
  // Tabla pequeña (postulaciones del formulario del landing) -- un Scan es
  // razonable acá, no tiene finca_id por el que hacer Query.
  const resp = await ddb.send(new ScanCommand({ TableName: TABLES.pilotosComercial }));
  const pilotos = (resp.Items ?? []).sort((a, b) =>
    String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""))
  );
  return NextResponse.json({ pilotos });
}
