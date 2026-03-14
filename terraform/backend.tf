# Tells Terraform where to save its state file
#
# State file = Stores the state of infrastructure managed by Terraform 

terraform {
  backend "s3" {
    bucket       = "devops-project-tfstate-pranav"
    key          = "terraform/state/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true # encrypts the state file at rest
    use_lockfile = true # prevents two people running apply at the same time
  }
}