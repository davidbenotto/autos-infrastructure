terraform {
  required_version = ">= 1.0"
  required_providers {
    azurerm = { source = "hashicorp/azurerm", version = "~> 3.0" }
  }
}

provider "azurerm" { features {} }

variable "account_name" { type = string }
variable "resource_group_name" { type = string }
variable "location" { type = string; default = "eastus" }
variable "deployment_id" { type = string }

resource "azurerm_cosmosdb_account" "main" {
  name                = var.account_name
  location            = var.location
  resource_group_name = var.resource_group_name
  offer_type          = "Standard"
  kind                = "GlobalDocumentDB"

  consistency_policy {
    consistency_level = "Session"
  }

  geo_location {
    location          = var.location
    failover_priority = 0
  }

  capabilities { name = "EnableServerless" }

  tags = { DeploymentId = var.deployment_id, ManagedBy = "cloud-auto-deploy" }
}

output "endpoint" { value = azurerm_cosmosdb_account.main.endpoint }
output "account_id" { value = azurerm_cosmosdb_account.main.id }
