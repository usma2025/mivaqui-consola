output "admin_panel_access_key_id" {
  value = aws_iam_access_key.admin_panel.id
}

output "admin_panel_secret_access_key" {
  value     = aws_iam_access_key.admin_panel.secret
  sensitive = true
}

output "amplify_compute_role_arn" {
  value = aws_iam_role.amplify_compute.arn
}
