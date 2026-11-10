# Infra del panel administrativo interno de MiVaqui. A propósito mínima: el
# panel lee/escribe directamente las tablas DynamoDB y el User Pool de
# Cognito que YA existen (Ganado/Infra) usando el mismo perfil de AWS CLI
# del operador -- no hay API, Lambda ni API Gateway propios para esto
# todavía. Lo único que es exclusivo de este panel es su tabla de usuarios
# (login por username, no por teléfono/Cognito como el producto).
#
# Pendiente para cuando esto se despliegue fuera de una máquina local
# (Vercel u otro): crear un usuario/rol de IAM con permisos acotados en vez
# de depender del perfil de CLI con acceso amplio.

resource "aws_dynamodb_table" "admin_usuarios" {
  name         = "mivaqui-admin-usuarios"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "username"

  attribute {
    name = "username"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }
}

# Quién hizo qué y cuándo dentro del panel (crear finca, agregar/desactivar
# usuario, cambiar estado, convertir postulación) -- ver lib/audit.ts. GSI1
# da el feed global ordenado por tiempo sin tener que escanear toda la tabla
# (gsi1pk constante "ALL" porque a esta escala no hace falta particionar el
# feed global por nada más).
resource "aws_dynamodb_table" "admin_audit" {
  name         = "mivaqui-admin-audit"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "finca_id"
  range_key    = "timestamp"

  attribute {
    name = "finca_id"
    type = "S"
  }
  attribute {
    name = "timestamp"
    type = "S"
  }
  attribute {
    name = "gsi1pk"
    type = "S"
  }
  attribute {
    name = "gsi1sk"
    type = "S"
  }

  global_secondary_index {
    name            = "GSI1"
    hash_key        = "gsi1pk"
    range_key       = "gsi1sk"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }
}

# ═══════════════════════════════════════════════════════════════════════════
# Usuario de IAM con permisos acotados para correr este panel fuera de una
# máquina local (Vercel u otro) — reemplaza el perfil de CLI de acceso amplio
# que se usa hoy en desarrollo. Solo cubre exactamente las llamadas que el
# código del panel hace de verdad (ver lib/aws-clients.ts, lib/fincas-
# aggregates.ts, lib/cognito-helpers.ts, app/api/system-health) — nada de
# wildcards por comodidad.
# ═══════════════════════════════════════════════════════════════════════════

data "aws_caller_identity" "current" {}

locals {
  # Tablas del producto real (Ganado/Infra) que este panel lee/escribe
  # directamente. AgentCostos-prod es la única sin PK compuesta por finca_id
  # como hash key simple -- igual la cubre el mismo set de acciones.
  product_table_names = [
    "GanaderiaFincas-prod",
    "GanaderiaAnimales-prod",
    "GanaderiaEventos-prod",
    "GanaderiaAlertas-prod",
    "GanaderiaAllowlist-prod",
    "GanaderiaPotreros-prod",
    "AgentCostos-prod",
    "GanaderiaIntentosAcceso-prod",
  ]

  cognito_user_pool_arn = "arn:aws:cognito-idp:${var.aws_region}:${data.aws_caller_identity.current.account_id}:userpool/${var.cognito_user_pool_id}"
}

data "aws_dynamodb_table" "product" {
  for_each = toset(local.product_table_names)
  name     = each.value
}

data "aws_dynamodb_table" "pilotos_comercial" {
  name = var.pilotos_comercial_table_name
}

data "aws_iam_policy_document" "admin_panel" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:Query", "dynamodb:Scan",
      # DeleteItem: solo lo usa autorizar un intento de GanaderiaIntentosAcceso
      # (ver app/api/intentos-acceso/[identificador]/autorizar) -- ninguna
      # otra ruta del panel borra ítems del producto.
      "dynamodb:DeleteItem",
    ]
    resources = concat(
      [for t in data.aws_dynamodb_table.product : t.arn],
      ["${data.aws_dynamodb_table.product["GanaderiaAllowlist-prod"].arn}/index/*"],
      [data.aws_dynamodb_table.pilotos_comercial.arn],
      [aws_dynamodb_table.admin_usuarios.arn],
      [aws_dynamodb_table.admin_audit.arn, "${aws_dynamodb_table.admin_audit.arn}/index/*"],
    )
  }
  statement {
    # Mismas 3 acciones que usa lib/cognito-helpers.ts (crear ganadero,
    # fijar su contraseña temporal, deshabilitarlo) -- nada de AdminDeleteUser
    # ni acciones de lectura masiva del User Pool.
    effect    = "Allow"
    actions   = ["cognito-idp:AdminCreateUser", "cognito-idp:AdminSetUserPassword", "cognito-idp:AdminDisableUser"]
    resources = [local.cognito_user_pool_arn]
  }
  statement {
    # DescribeAlarms no soporta restricción por recurso -- es de solo
    # lectura y es la única llamada de CloudWatch que hace el panel (ver
    # app/api/system-health).
    effect    = "Allow"
    actions   = ["cloudwatch:DescribeAlarms"]
    resources = ["*"]
  }
}

resource "aws_iam_user" "admin_panel" {
  name = "mivaqui-admin-panel"
}

resource "aws_iam_user_policy" "admin_panel" {
  name   = "mivaqui-admin-panel-policy"
  user   = aws_iam_user.admin_panel.name
  policy = data.aws_iam_policy_document.admin_panel.json
}

resource "aws_iam_access_key" "admin_panel" {
  user = aws_iam_user.admin_panel.name
}
