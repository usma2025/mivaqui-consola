import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { fromIni } from "@aws-sdk/credential-providers";

// Este panel corre fuera del Terraform del producto (es una herramienta
// interna, no multi-tenant) y por ahora se autentica contra AWS con el
// mismo perfil de CLI que ya usas para todo lo demás (mivaqui-prod), en vez
// de credenciales de larga duración en variables de entorno. Para
// desplegarlo fuera de tu máquina (Vercel, etc.) hay que crear un usuario o
// rol de IAM con permisos acotados — ver README.md.
const region = process.env.AWS_REGION || "us-east-1";
const profile = process.env.AWS_PROFILE;

const credentials = profile ? fromIni({ profile }) : undefined;

const ddbClient = new DynamoDBClient({ region, credentials });

export const ddb = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true },
});

export const cognito = new CognitoIdentityProviderClient({ region, credentials });

export const cloudwatch = new CloudWatchClient({ region, credentials });
