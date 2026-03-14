variable "project_name" {
  description = "Name used to tag and prefix all EC2 resources"
  type        = string
}

variable "ami_id" {
  description = "Amazon Machine Image ID -the OS for the EC2"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance size"
  type        = string
}

variable "subnet_id" {
  description = "Subnet in which EC2 instance need to create - comes from VPC module"
  type        = string
}

variable "security_group_id" {
  description = "Which security group need to attach - comes from security group module"
  type        = string
}

variable "key_pair_name" {
  description = "EC2 key pair name for ssh access - leave empty to skip"
  type        = string
  default     = ""
}

variable "s3_bucket_name" {
  description = "Name for the S3 bucket"
  type        = string
}

