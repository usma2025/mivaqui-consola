import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { GetCommand, PutCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { AdminCreateUserCommand, AdminSetUserPasswordCommand } from "@aws-sdk/client-cognito-identity-provider";
import { ddb, cognito } from "@/lib/aws-clients";
import { TABLES, COGNITO_USER_POOL_ID } from "@/lib/tables";

interface FincaItem {
  finca_id: string;
  nombre_finca?: string;
  ubicacion?: string;
  tamano_hato_aprox?: number;
  estado_piloto?: string;
  creado_en?: string;
}

async function contarAnimalesActivos(finca_id: string): Promise<number> {
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

async function contarAlertasActivas(finca_id: string): Promise<number> {
  const resp = await ddb.send(
    new QueryCommand({
      TableName: TABLES.alertas,
      KeyConditionExpression: "finca_id = :f",
      ExpressionAttributeValues: { ":f": finca_id },
      Select: "COUNT",
    })
  );
  return resp.Count ?? 0;
}

async function ultimaActividad(finca_id: string): Promise<string | null> {
  // Query, no Scan (finca_id es la partition key) -- pero el orden de la sort
  // key (arete_id#timestamp) no es cronológico entre animales distintos, así
  // que hay que traer fecha_creacion de todos los eventos de la finca y
  // tomar el máximo acá. A esta escala (fincas piloto) es barato; si el
  // volumen de eventos crece mucho, esto necesita un GSI por fecha.
  let lastKey: Record<string, unknown> | undefined;
  let maxFecha: string | null = null;
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
      const fecha = item.fecha_creacion as string | undefined;
      if (fecha && (!maxFecha || fecha > maxFecha)) maxFecha = fecha;
    }
    lastKey = resp.LastEvaluatedKey;
  } while (lastKey);
  return maxFecha;
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

function generarPasswordTemporal(): string {
  // Mismo criterio que el Backend real (_generar_password_temporal): mayúscula,
  // minúscula, número y símbolo garantizados, sin depender de qué política de
  // contraseñas tenga configurada el User Pool.
  return `Mv${randomBytes(10).toString("base64url")}9!`;
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
  const passwordTemporal = generarPasswordTemporal();

  if (COGNITO_USER_POOL_ID) {
    try {
      await cognito.send(
        new AdminCreateUserCommand({
          UserPoolId: COGNITO_USER_POOL_ID,
          Username: telefono_admin,
          MessageAction: "SUPPRESS",
          TemporaryPassword: passwordTemporal,
        })
      );
      await cognito.send(
        new AdminSetUserPasswordCommand({
          UserPoolId: COGNITO_USER_POOL_ID,
          Username: telefono_admin,
          Password: passwordTemporal,
          Permanent: false,
        })
      );
    } catch (err) {
      console.error("No se pudo crear el usuario en Cognito", err);
      return NextResponse.json({ error: "No se pudo crear el usuario de acceso al Portal" }, { status: 502 });
    }
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
        gsi1pk: finca_id,
        gsi1sk: telefono_admin,
      },
    })
  );

  return NextResponse.json({ finca_id, telefono_admin, password_temporal: passwordTemporal }, { status: 201 });
}
