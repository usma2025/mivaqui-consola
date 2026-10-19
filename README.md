# MiVaqui — Panel administrativo

Herramienta interna (no es parte del producto que usan los ganaderos). Lee y
escribe directamente las tablas de DynamoDB y el User Pool de Cognito del
producto real (cuenta `mivaqui-prod`) — no pasa por la API HTTP del Backend,
porque esa API siempre resuelve `finca_id` del caller autenticado y este
panel necesita ver **todas** las fincas a la vez.

## Qué hace (v1)

- **Login por username/contraseña** (no por teléfono/Cognito como el
  producto) — tabla propia `mivaqui-admin-usuarios`, sesión en cookie
  httpOnly firmada (JWT HS256 vía `jose`), sin registro público.
- **`/`** — resumen: fincas activas, animales registrados, alertas activas,
  postulaciones sin convertir, y aviso de fincas sin actividad hace más de
  7 días.
- **`/fincas`** — listado de todas las fincas con animales activos, alertas
  activas y última actividad real (calculada desde la tabla de Eventos).
- **`/fincas/nueva`** — crea una finca nueva de punta a punta: genera el
  `finca_id` (`FINCA_00N` siguiente), crea el usuario en Cognito
  (`AdminCreateUser` + `AdminSetUserPassword` temporal, mismo flujo que
  `post_allowlist` en el Backend real), y los ítems en las tablas Fincas y
  Allowlist (rol ADMIN). Muestra la contraseña temporal una sola vez.
- **`/pilotos`** — postulaciones del formulario del landing
  (`mivaqui-comercial-pilotos`), con un botón para pre-llenar "Nueva finca"
  con esos datos.

## Correr localmente

```bash
npm install
npm run dev
```

Necesita `.env.local` (no se commitea) con:

```
AWS_PROFILE=mivaqui-prod
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_JblVOAxPD
ADMIN_SESSION_SECRET=<una cadena aleatoria larga>
```

Usa tus credenciales de AWS CLI (perfil `mivaqui-prod`) para hablarle
directo a DynamoDB/Cognito — no hay credenciales de larga duración en el
repo ni en variables de entorno.

## Crear o resetear un usuario del panel

No hay pantalla de registro ni de "olvidé mi contraseña" todavía — es una
herramienta de un puñado de personas. Para crear/resetear un usuario:

```bash
AWS_PROFILE=mivaqui-prod node scripts/create-admin.mjs <username> <password>
```

## Infra (`infra/`)

Stack de Terraform separado y mínimo — hoy solo crea la tabla
`mivaqui-admin-usuarios` (con point-in-time recovery). Todo lo demás que el
panel lee/escribe (Fincas, Animales, Eventos, Alertas, Allowlist, Potreros,
el User Pool de Cognito, la tabla de postulaciones de Comercial) ya existe
en `Ganado/Infra` y `Comercial/backend/infra` — este panel no los
recrea, solo los consume.

```bash
cd infra
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

## Pendiente (siguiente iteración)

- **Desplegar fuera de una máquina local**: hoy depende del perfil de AWS
  CLI de quien lo corre. Para Vercel u otro hosting hace falta un
  usuario/rol de IAM con permisos acotados (lectura en las tablas de
  lectura, escritura solo en Fincas/Allowlist, `cognito-idp:AdminCreateUser`
  + `AdminSetUserPassword` sobre el User Pool puntual) en vez de las
  credenciales amplias del CLI.
- **Costo/consumo por finca** (llamadas a OpenAI, mensajes de WhatsApp) —
  todavía no hay de dónde leer eso; requiere instrumentar el Agent o leer
  CloudWatch Logs Insights.
- **Pantalla de cambio de contraseña** dentro del panel, en vez de depender
  del script de bootstrap para resetear.
- **Estado del piloto editable** (`estado_piloto` ya existe como atributo en
  Fincas, pero hoy solo se setea en `ACTIVA` al crear — falta poder
  marcarlo INACTIVA/CHURN desde la UI).
