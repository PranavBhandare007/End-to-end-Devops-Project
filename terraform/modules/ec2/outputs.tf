output "instance_id" {
  description = "EC2 instance id"
  value       = aws_instance.main.id
}

output "public_ip" {
  description = "Public IP of the EC2 instacne"
  value       = aws_instance.main.public_ip
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.app.bucket
}