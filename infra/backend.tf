# Mismo bucket de estado de la cuenta mivaqui-prod que usa el resto de
# MiVaqui (Ganado/Infra y Comercial/backend/infra) -- key propia, state
# completamente separado.
terraform {
  backend "s3" {
    bucket         = "mivaqui-terraform-state-599966658037"
    key            = "adminpanel/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "mivaqui-terraform-locks"
    encrypt        = true
    profile        = "mivaqui-prod"
  }
}
