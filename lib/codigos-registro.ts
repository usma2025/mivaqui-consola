import { randomInt } from "crypto";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "@/lib/aws-clients";
import { TABLES, WHATSAPP_NUMBER_DISPLAY } from "@/lib/tables";

// Mismo esquema de ítem que escribe el Backend real en post_codigo_registro
// (ver Backend/backend/lambdas/api_handler/handler.py) -- este panel escribe
// directo a la misma tabla GanaderiaCodigosRegistro-prod para que un código
// generado desde la consola sea indistinguible de uno generado desde el
// Portal: el Agent lo canjea igual (POST /v1/codigos-registro/validar) sin
// saber ni importarle cuál de los dos lo creó.
const ALFABETO_CODIGO = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // sin 0/O/1/I
const LARGO_CODIGO = 8;
const VIGENCIA_HORAS_DEFAULT = 72;
const TTL_SEGUNDOS_EXTRA = 86400; // margen de 1 día tras expirar, igual que el Backend

function generarCodigo(): string {
  let codigo = "";
  for (let i = 0; i < LARGO_CODIGO; i++) {
    codigo += ALFABETO_CODIGO[randomInt(ALFABETO_CODIGO.length)];
  }
  return codigo;
}

export interface CodigoRegistro {
  codigo: string;
  url_whatsapp: string;
  expira_en: string;
}

export async function crearCodigoRegistro(
  telefono: string,
  finca_id: string,
  rol: string,
  vigenciaHoras: number = VIGENCIA_HORAS_DEFAULT
): Promise<CodigoRegistro> {
  const codigo = generarCodigo();
  const ahora = new Date();
  const expiraEn = new Date(ahora.getTime() + vigenciaHoras * 3600_000);
  const ttl = Math.floor(expiraEn.getTime() / 1000) + TTL_SEGUNDOS_EXTRA;

  await ddb.send(
    new PutCommand({
      TableName: TABLES.codigosRegistro,
      Item: {
        codigo,
        finca_id,
        rol,
        telefono,
        creado_en: ahora.toISOString(),
        expira_en: expiraEn.toISOString(),
        ttl,
        usado: false,
      },
    })
  );

  // Deja a este código como "el vigente" para que listarUsuarios() sepa de
  // cuál fijarse para decidir si este teléfono ya confirmó su WhatsApp (ver
  // whatsapp_confirmado en fincas-aggregates.ts). Si el teléfono todavía no
  // existe en el allowlist (código generado antes del alta) no hay nada que
  // actualizar todavía -- se ignora, no es un error.
  try {
    await ddb.send(
      new UpdateCommand({
        TableName: TABLES.allowlist,
        Key: { telefono },
        UpdateExpression: "SET ultimo_codigo_registro = :c",
        ConditionExpression: "attribute_exists(telefono)",
        ExpressionAttributeValues: { ":c": codigo },
      })
    );
  } catch (err) {
    if (!(err instanceof ConditionalCheckFailedException)) throw err;
  }

  const url_whatsapp = WHATSAPP_NUMBER_DISPLAY ? `https://wa.me/${WHATSAPP_NUMBER_DISPLAY}?text=${codigo}` : "";
  return { codigo, url_whatsapp, expira_en: expiraEn.toISOString() };
}
