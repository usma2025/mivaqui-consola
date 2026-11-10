import { NextResponse } from "next/server";
import { GetCommand, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "@/lib/aws-clients";
import { TABLES } from "@/lib/tables";
import { contarAnimalesActivos, contarAlertasActivas, ultimaActividad } from "@/lib/fincas-aggregates";
import { crearUsuarioCognito } from "@/lib/cognito-helpers";
import { requireAdmin } from "@/lib/session-server";
import { registrarAccion } from "@/lib/audit";

interface FincaItem {
  finca_id: string;
  nombre_finca?: string;
  ubicacion?: string;
  tamano_hato_aprox?: number;
  estado_piloto?: string;
  creado_en?: string;
}

export async function GET() {
  const scan = await ddb.send(new ScanCommand({ TableName: TABLES.fincas }));
  const fincas = (scan.Items ?? []) as FincaItem[];

  const enriquecidas = await Promise.all(
    fincas.map(async (finca) => {
      const [animales_activos, alertas_activas, ultima_actividad] = await Promise.all([
        contarAnimalesActivos(finca.finca_id),
        contarAlertasActivas(finca.finca_id),
        ultimaActividad(finca.finca_id),
      ]);
      return { ...finca, animales_activos, alertas_activas, ultima_actividad };
    })
  );

  enriquecidas.sort((a, b) => a.finca_id.localeCompare(b.finca_id));
  return NextResponse.json({ fincas: enriquecidas });
}

async function siguienteFincaId(): Promise<string> {
  const scan = await ddb.send(new ScanCommand({ TableName: TABLES.fincas, ProjectionExpression: "finca_id" }));
  let max = 0;
  for (const item of scan.Items ?? []) {
    const match = /^FINCA_(\d+)$/.exec((item.finca_id as string) ?? "");
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return `FINCA_${String(max + 1).padStart(3, "0")}`;
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const { nombre_finca, ubicacion, tamano_hato_aprox, telefono_admin, nombre_admin } =
    (body as Record<string, unknown>) ?? {};

  if (!nombre_finca || typeof nombre_finca !== "string") {
    return NextResponse.json({ error: "nombre_finca es requerido" }, { status: 400 });
  }
  if (!telefono_admin || typeof telefono_admin !== "string" || !telefono_admin.startsWith("+")) {
    return NextResponse.json({ error: "telefono_admin es requerido en formato E.164 (+573...)" }, { status: 400 });
  }
  if (!nombre_admin || typeof nombre_admin !== "string") {
    return NextResponse.json({ error: "nombre_admin es requerido" }, { status: 400 });
  }

  const existingAllowlist = await ddb.send(
    new GetCommand({ TableName: TABLES.allowlist, Key: { telefono: telefono_admin } })
  );
  if (existingAllowlist.Item) {
    return NextResponse.json({ error: "Ese número ya está asignado a otra finca" }, { status: 409 });
  }

  const finca_id = await siguienteFincaId();
  const now = new Date().toISOString();

  let passwordTemporal: string;
  try {
    passwordTemporal = await crearUsuarioCognito(telefono_admin);
  } catch (err) {
    console.error("No se pudo crear el usuario en Cognito", err);
    return NextResponse.json({ error: "No se pudo crear el usuario de acceso al Portal" }, { status: 502 });
  }

  await ddb.send(
    new PutCommand({
      TableName: TABLES.fincas,
      Item: {
        finca_id,
        nombre_finca,
        ...(ubicacion ? { ubicacion } : {}),
        ...(typeof tamano_hato_aprox === "number" ? { tamano_hato_aprox } : {}),
        estado_piloto: "ACTIVA",
        creado_en: now,
        notas: [],
      },
    })
  );

  await ddb.send(
    new PutCommand({
      TableName: TABLES.allowlist,
      Item: {
        telefono: telefono_admin,
        finca_id,
        rol: "ADMIN",
        nombre: nombre_admin,
        activo: true,
        creado_en: now,
        modo_respuesta: "TEXTO",
        gsi1pk: finca_id,
        gsi1sk: telefono_admin,
      },
    })
  );

  await registrarAccion({
    usuario: session.username,
    finca_id,
    accion: "crear_finca",
    detalle: `Finca "${nombre_finca}" creada con admin ${telefono_admin}`,
  });

  return NextResponse.json({ finca_id, telefono_admin, password_temporal: passwordTemporal }, { status: 201 });
}
