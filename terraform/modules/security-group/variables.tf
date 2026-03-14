variable "project_name" {
  description = "Used to tag and prefix all security group resources"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC to create the security group in"
  type        = string
}