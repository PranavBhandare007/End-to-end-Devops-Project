# All inputs required for our project are defined here

variable "project_name" {
  description = "Name used to tag and prefix all resources"
  type        = string
  default     = "devops-project"
}

variable "aws_region" {
  description = "AWS region where all resources will be created"
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "IP range for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "IP range of the public subnet created inside the vpc"
  type        = string
  default     = "10.0.1.0/24"
}

variable "availability_zone" {
  description = "Which AZ to place the subnet in"
  type        = string
  default     = "us-east-1a"
}

variable "instance_type" {
  description = "EC2 instacne size "
  type        = string
  default     = "t2.micro"
}

variable "ami_id" {
  description = "Amazon Machine Image - Amazon Linux 2023 in us-east-1"
  type        = string
  default     = "ami-0c101f26f147fa7fd"
}

variable "key_pair_name" {
  description = "Name of the existing EC2 key pair for SSH access"
  type        = string
  default     = ""

}

variable "s3_bucket_name" {
  description = "Name for the S3 bucket - must be globally unique"
  type        = string
  default     = "devops-project-buckets"
}
