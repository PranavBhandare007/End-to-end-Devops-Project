# Project — Terraform AWS Infrastructure

Provision a complete AWS environment using Terraform modules.
Every resource is defined as code, versioned, and reproducible.

---

## What This Provisions

| Resource | Details |
|----------|---------|
| VPC      | 10.0.0.0/16, DNS enabled |
| Public Subnet | 10.0.1.0/24, us-east-1a |
| Internet Gateway | Attached to VPC |
| Route Table | 0.0.0.0/0 → Internet Gateway |
| Security Group | Ingress: SSH 22, HTTP 80 · Egress: all |
| EC2 Instance | t2.micro, Amazon Linux 2023 |
| S3 Bucket (app) | Private, versioned, encrypted |
| S3 Bucket (state) | Terraform remote state backend |

---

## Prerequisites

```bash
# Check Terraform is installed (need >= 1.6.0)
terraform -version

# Check AWS CLI is installed
aws --version

# Configure your AWS credentials
aws configure
# Prompts: Access Key ID / Secret Access Key / Region / Output format
```

---

## First-Time Setup (do once)

```bash
# Create the S3 bucket for Terraform remote state
aws s3api create-bucket \
  --bucket devops-project-tfstate-<YOUR_SUFFIX> \
  --region us-east-1

# Enable versioning on the state bucket (lets you roll back state)
aws s3api put-bucket-versioning \
  --bucket devops-project-tfstate-<YOUR_SUFFIX> \
  --versioning-configuration Status=Enabled

---

## Usage

```bash
# Initialise — downloads AWS provider, connects to S3 backend
terraform init

# See what will be created (no changes made)
terraform plan

# Create all resources (~2 minutes)
terraform apply

# See outputs (EC2 public IP, bucket name, etc.)
terraform output

# SSH into the EC2 instance
ssh -i ~/.ssh/<your-key>.pem ec2-user@<EC2_PUBLIC_IP>

# Tear down everything when done
terraform destroy
```

---

## Module Details

### `modules/vpc`
Creates: VPC → Public Subnet → Internet Gateway → Route Table → Route Table Association

Input variables: `vpc_cidr`, `public_subnet_cidr`, `availability_zone`, `project_name`

### `modules/security-group`
Creates: Security Group with configurable ingress rules

Input variables: `vpc_id`, `project_name`, `allowed_ssh_cidr`

### `modules/ec2`
Creates: EC2 instance in the public subnet

Input variables: `ami_id`, `instance_type`, `subnet_id`, `security_group_id`, `key_pair_name`, `project_name`

---

## Outputs

After `terraform apply` completes, these values are printed:

| Output | Description |
|--------|-------------|
| `ec2_public_ip` | Public IP to SSH into or open in browser |
| `ec2_instance_id` | AWS instance ID |
| `vpc_id` | VPC ID |
| `s3_bucket_name` | App bucket name |

---

## File Reference

```
terraform/
├── provider.tf          # AWS provider declaration + default tags
├── backend.tf           # S3 remote state configuration
├── variables.tf         # All input variable definitions + validation
├── main.tf              # Root module — calls all child modules
├── outputs.tf           # Values printed after apply
├── terraform.tfvars     # Your personal values (gitignored)
├── terraform.tfvars.example  # Template to copy from
└── modules/
    ├── vpc/
    │   ├── main.tf      # VPC, subnet, IGW, route table resources
    │   ├── variables.tf # Module input variables
    │   └── outputs.tf   # vpc_id, subnet_id exported to root
    ├── ec2/
    │   ├── main.tf      # EC2 instance resource
    │   ├── variables.tf
    │   └── outputs.tf   # instance_id, public_ip exported
    └── security-group/
        ├── main.tf      # Security group + ingress/egress rules
        ├── variables.tf
        └── outputs.tf   # security_group_id exported
```

---

## Common Errors

**`Error: No valid credential sources found`**
→ Run `aws configure` and enter your Access Key ID and Secret.

**`Error: S3 bucket does not exist`**
→ Create the state bucket using the first-time setup commands above.

**`Error: InvalidAMIID`**
→ The AMI ID in `variables.tf` is region-specific. Find the correct one in the AWS Console under EC2 → AMIs, filter by "Amazon Linux 2023".

**`Error: KeyPair not found`**
→ Either create a key pair in the EC2 Console and update `key_pair_name` in `terraform.tfvars`, or leave it empty to skip SSH access.
