terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

variable "db_identifier" {
  type    = string
  default = "auto-deploy-db"
}

variable "engine" {
  type    = string
  default = "mysql"
}

variable "instance_class" {
  type    = string
  default = "db.t3.micro"
}

variable "allocated_storage" {
  type    = number
  default = 20
}

variable "master_username" {
  type    = string
  default = "admin"
}

variable "master_password" {
  type      = string
  sensitive = true
}

variable "deployment_id" {
  type = string
}

resource "aws_db_instance" "main" {
  identifier           = var.db_identifier
  engine               = var.engine
  instance_class       = var.instance_class
  allocated_storage    = var.allocated_storage
  username             = var.master_username
  password             = var.master_password
  skip_final_snapshot  = true
  publicly_accessible  = false

  tags = {
    DeploymentId = var.deployment_id
    ManagedBy    = "cloud-auto-deploy"
  }
}

output "endpoint" {
  value = aws_db_instance.main.endpoint
}

output "database_name" {
  value = aws_db_instance.main.db_name
}
