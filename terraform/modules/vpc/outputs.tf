output "vpc_id" {
  description = "ID of the created vpc"
  value       = aws_vpc.main.id
}

output "public_subnet_id" {
  description = "ID of created subnet"
  value       = aws_subnet.public.id
}