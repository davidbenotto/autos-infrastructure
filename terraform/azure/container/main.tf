terraform {
  required_version = ">= 1.0"
  required_providers {
    azurerm = { source = "hashicorp/azurerm", version = "~> 3.0" }
  }
}

provider "azurerm" { features {} }

variable "container_group_name" { type = string }
variable "resource_group_name" { type = string }
variable "location" { type = string; default = "eastus" }
variable "image" { type = string; default = "mcr.microsoft.com/azuredocs/aci-helloworld" }
variable "cpu" { type = number; default = 1 }
variable "memory" { type = number; default = 1.5 }
variable "deployment_id" { type = string }

resource "azurerm_container_group" "main" {
  name                = var.container_group_name
  location            = var.location
  resource_group_name = var.resource_group_name
  os_type             = "Linux"
  ip_address_type     = "Public"

  container {
    name   = "main"
    image  = var.image
    cpu    = var.cpu
    memory = var.memory

    ports { port = 80; protocol = "TCP" }
  }

  tags = { DeploymentId = var.deployment_id, ManagedBy = "cloud-auto-deploy" }
}

output "ip_address" { value = azurerm_container_group.main.ip_address }
output "container_group_id" { value = azurerm_container_group.main.id }
