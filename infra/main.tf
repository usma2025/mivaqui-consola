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
