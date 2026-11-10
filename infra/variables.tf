variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "aws_profile" {
  type    = string
  default = "mivaqui-prod"
}

variable "cognito_user_pool_id" {
  type    = string
  default = "us-east-1_JblVOAxPD"
}

variable "pilotos_comercial_table_name" {
  type    = string
  default = "mivaqui-comercial-pilotos"
}
