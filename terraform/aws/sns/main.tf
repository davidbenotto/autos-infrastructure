terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

variable "topic_name" {
  type    = string
  default = "auto-deploy-topic"
}

variable "deployment_id" {
  type = string
}

resource "aws_sns_topic" "main" {
  name = var.topic_name

  tags = {
    DeploymentId = var.deployment_id
    ManagedBy    = "cloud-auto-deploy"
  }
}

output "topic_arn" {
  value = aws_sns_topic.main.arn
}

output "topic_name" {
  value = aws_sns_topic.main.name
}
