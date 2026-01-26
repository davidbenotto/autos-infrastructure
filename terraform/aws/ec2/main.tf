terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# EC2 Instance
resource "aws_instance" "main" {
  ami           = var.ami_id
  instance_type = var.instance_type

  tags = merge(
    {
      Name         = var.instance_name
      DeploymentId = var.deployment_id
      ManagedBy    = "cloud-deploy-portal"
    },
    var.tags
  )

  lifecycle {
    create_before_destroy = true
  }
}

output "instance_id" {
  description = "ID of the EC2 instance"
  value       = aws_instance.main.id
}

output "public_ip" {
  description = "Public IP of the instance"
  value       = aws_instance.main.public_ip
}

output "private_ip" {
  description = "Private IP of the instance"
  value       = aws_instance.main.private_ip
}

output "instance_state" {
  description = "State of the instance"
  value       = aws_instance.main.instance_state
}
