import { randomBytes } from "crypto";
import {
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminDisableUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { cognito } from "@/lib/aws-clients";
import { COGNITO_USER_POOL_ID } from "@/lib/tables";

// Mismo flujo que _crear_usuario_cognito en el Backend real (post_allowlist):
// AdminCreateUser + AdminSetUserPassword(Permanent=false), para que el
// ganadero tenga que definir su propia contraseña en el primer ingreso.
export function generarPasswordTemporal(): string {
  return `Mv${randomBytes(10).toString("base64url")}9!`;
}

export async function crearUsuarioCognito(telefono: string): Promise<string> {
  const passwordTemporal = generarPasswordTemporal();
  if (!COGNITO_USER_POOL_ID) return passwordTemporal;

  await cognito.send(
    new AdminCreateUserCommand({
      UserPoolId: COGNITO_USER_POOL_ID,
      Username: telefono,
      MessageAction: "SUPPRESS",
      TemporaryPassword: passwordTemporal,
    })
  );
  await cognito.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: COGNITO_USER_POOL_ID,
      Username: telefono,
      Password: passwordTemporal,
      Permanent: false,
    })
  );
  return passwordTemporal;
}

// Mismo flujo que _deshabilitar_usuario_cognito en el Backend real
// (delete_allowlist_entry): no borra el usuario, lo deshabilita.
export async function deshabilitarUsuarioCognito(telefono: string): Promise<void> {
  if (!COGNITO_USER_POOL_ID) return;
  try {
    await cognito.send(new AdminDisableUserCommand({ UserPoolId: COGNITO_USER_POOL_ID, Username: telefono }));
  } catch (err) {
    const code = (err as { name?: string })?.name;
    if (code !== "UserNotFoundException") throw err;
  }
}
