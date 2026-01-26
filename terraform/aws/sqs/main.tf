terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

variable "queue_name" {
  type    = string
  default = "auto-deploy-queue"
}

variable "visibility_timeout" {
  type    = number
  default = 30
}

variable "deployment_id" {
  type = string
}

resource "aws_sqs_queue" "main" {
  name                       = var.queue_name
  visibility_timeout_seconds = var.visibility_timeout

  tags = {
    DeploymentId = var.deployment_id
    ManagedBy    = "cloud-auto-deploy"
  }
}

output "queue_url" {
  value = aws_sqs_queue.main.url
}

output "queue_arn" {
  value = aws_sqs_queue.main.arn
}
