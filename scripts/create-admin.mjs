// Crea (o resetea la contraseña y/o el rol de) un usuario del panel
// administrativo. No hay registro público a propósito -- es una
// herramienta interna.
//
// Uso:
//   AWS_PROFILE=mivaqui-prod node scripts/create-admin.mjs <username> <password> [ADMIN|LECTURA]
//
// Rol por defecto: ADMIN. LECTURA puede ver todo el panel pero ninguna
// mutación (crear/editar finca, agregar o desactivar usuarios, convertir
// postulaciones) -- ver lib/session-server.ts:requireAdmin.
import { randomBytes, scrypt as scryptCallback } from "crypto";
import { promisify } from "util";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { fromIni } from "@aws-sdk/credential-providers";

const scrypt = promisify(scryptCallback);

const [, , username, password, rolArg] = process.argv;
if (!username || !password) {
  console.error("Uso: node scripts/create-admin.mjs <username> <password> [ADMIN|LECTURA]");
  process.exit(1);
}
const rol = rolArg === "LECTURA" ? "LECTURA" : "ADMIN";

const profile = process.env.AWS_PROFILE;
const region = process.env.AWS_REGION || "us-east-1";
const tableName = process.env.ADMIN_USUARIOS_TABLE_NAME || "mivaqui-admin-usuarios";

const client = new DynamoDBClient({ region, credentials: profile ? fromIni({ profile }) : undefined });
const ddb = DynamoDBDocumentClient.from(client);

async function hashPassword(plain) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(plain, salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}

const password_hash = await hashPassword(password);

await ddb.send(
  new PutCommand({
    TableName: tableName,
    Item: {
      username: username.trim().toLowerCase(),
      password_hash,
      rol,
      creado_en: new Date().toISOString(),
    },
  })
);

console.log(`Usuario '${username}' (rol ${rol}) guardado en ${tableName}.`);
