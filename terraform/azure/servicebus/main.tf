terraform {
  required_version = ">= 1.0"
  required_providers {
    azurerm = { source = "hashicorp/azurerm", version = "~> 3.0" }
  }
}

provider "azurerm" { features {} }

variable "namespace_name" { type = string }
variable "resource_group_name" { type = string }
variable "location" { type = string; default = "eastus" }
variable "sku" { type = string; default = "Basic" }
variable "deployment_id" { type = string }

resource "azurerm_servicebus_namespace" "main" {
  name                = var.namespace_name
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = var.sku

  tags = { DeploymentId = var.deployment_id, ManagedBy = "cloud-auto-deploy" }
}

output "endpoint" { value = azurerm_servicebus_namespace.main.endpoint }
output "namespace_id" { value = azurerm_servicebus_namespace.main.id }
