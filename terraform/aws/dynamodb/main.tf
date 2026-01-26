terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

variable "table_name" {
  type    = string
  default = "auto-deploy-table"
}

variable "hash_key" {
  type    = string
  default = "id"
}

variable "billing_mode" {
  type    = string
  default = "PAY_PER_REQUEST"
}

variable "deployment_id" {
  type = string
}

resource "aws_dynamodb_table" "main" {
  name         = var.table_name
  billing_mode = var.billing_mode
  hash_key     = var.hash_key

  attribute {
    name = var.hash_key
    type = "S"
  }

  tags = {
    DeploymentId = var.deployment_id
    ManagedBy    = "cloud-auto-deploy"
  }
}

output "table_arn" {
  value = aws_dynamodb_table.main.arn
}

output "table_name" {
  value = aws_dynamodb_table.main.name
}
