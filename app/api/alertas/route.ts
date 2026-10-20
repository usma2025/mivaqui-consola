import { NextResponse } from "next/server";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "@/lib/aws-clients";
import { TABLES } from "@/lib/tables";
import { listarAlertas } from "@/lib/fincas-aggregates";

interface FincaItem {
  finca_id: string;
  nombre_finca?: string;
}

export async function GET() {
  const scan = await ddb.send(new ScanCommand({ TableName: TABLES.fincas, ProjectionExpression: "finca_id, nombre_finca" }));
  const fincas = (scan.Items ?? []) as FincaItem[];

  const porFinca = await Promise.all(
    fincas.map(async (f) => {
      const alertas = await listarAlertas(f.finca_id);
      return alertas.map((a) => ({ ...a, finca_nombre: f.nombre_finca ?? f.finca_id }));
    })
  );

  const todas = porFinca.flat().sort((a, b) => String(b.fecha_alerta ?? "").localeCompare(String(a.fecha_alerta ?? "")));
  return NextResponse.json({ alertas: todas });
}
