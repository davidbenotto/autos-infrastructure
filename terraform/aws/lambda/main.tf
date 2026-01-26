terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

variable "function_name" {
  type    = string
  default = "auto-deploy-lambda"
}

variable "runtime" {
  type    = string
  default = "nodejs18.x"
}

variable "handler" {
  type    = string
  default = "index.handler"
}

variable "memory_size" {
  type    = number
  default = 128
}

variable "timeout" {
  type    = number
  default = 30
}

variable "role_arn" {
  type = string
}

variable "deployment_id" {
  type = string
}

resource "aws_lambda_function" "main" {
  function_name = var.function_name
  runtime       = var.runtime
  handler       = var.handler
  memory_size   = var.memory_size
  timeout       = var.timeout
  role          = var.role_arn

  filename = "${path.module}/placeholder.zip"

  tags = {
    DeploymentId = var.deployment_id
    ManagedBy    = "cloud-auto-deploy"
  }
}

output "function_arn" {
  value = aws_lambda_function.main.arn
}

output "function_name" {
  value = aws_lambda_function.main.function_name
}
