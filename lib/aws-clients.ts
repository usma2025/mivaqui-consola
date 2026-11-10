import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";

// Este panel corre fuera del Terraform del producto (es una herramienta
// interna, no multi-tenant) y lee/escribe directo las tablas DynamoDB y el
// User Pool de Cognito del producto real. Sin pasar `credentials` explícitas,
// el SDK usa su cadena por defecto: variables de entorno
// (AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY, del usuario de IAM acotado -- ver
// infra/main.tf -- cuando esto corre fuera de una máquina local) primero, y
// si no existen, el perfil de AWS CLI que indique AWS_PROFILE (desarrollo
// local). Mismo cliente sirve para los dos casos sin lógica condicional.
const region = process.env.AWS_REGION || "us-east-1";

const ddbClient = new DynamoDBClient({ region });

export const ddb = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true },
});

export const cognito = new CognitoIdentityProviderClient({ region });

export const cloudwatch = new CloudWatchClient({ region });
