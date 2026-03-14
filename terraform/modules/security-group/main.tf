# This file contains the main.tf file for the security group module.
# Creates a security group with the specified ingress and egress rules.

resource "aws_security_group" "main" {
  name        = "${var.project_name}-security-group"
  description = "Security group which allow SSH and HTTP traffic from the internet"
  vpc_id      = var.vpc_id

  ingress {
    description = "SSH access from the internet"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP access from the internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-sg"
  }

}