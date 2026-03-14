output "security_group_id" {
  description = "ID of created security group"
  value       = aws_security_group.main.id
}