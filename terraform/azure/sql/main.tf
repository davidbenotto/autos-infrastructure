terraform {
  required_version = ">= 1.0"
  required_providers {
    azurerm = { source = "hashicorp/azurerm", version = "~> 3.0" }
  }
}

provider "azurerm" { features {} }

variable "server_name" { type = string }
variable "database_name" { type = string; default = "autodb" }
variable "resource_group_name" { type = string }
variable "location" { type = string; default = "eastus" }
variable "admin_login" { type = string; default = "sqladmin" }
variable "admin_password" { type = string; sensitive = true }
variable "sku" { type = string; default = "Basic" }
variable "deployment_id" { type = string }

resource "azurerm_mssql_server" "main" {
  name                         = var.server_name
  resource_group_name          = var.resource_group_name
  location                     = var.location
  version                      = "12.0"
  administrator_login          = var.admin_login
  administrator_login_password = var.admin_password
  tags = { DeploymentId = var.deployment_id, ManagedBy = "cloud-auto-deploy" }
}

resource "azurerm_mssql_database" "main" {
  name      = var.database_name
  server_id = azurerm_mssql_server.main.id
  sku_name  = var.sku
  tags = { DeploymentId = var.deployment_id }
}

output "server_fqdn" { value = azurerm_mssql_server.main.fully_qualified_domain_name }
output "database_id" { value = azurerm_mssql_database.main.id }
