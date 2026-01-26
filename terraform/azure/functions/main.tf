terraform {
  required_version = ">= 1.0"
  required_providers {
    azurerm = { source = "hashicorp/azurerm", version = "~> 3.0" }
  }
}

provider "azurerm" { features {} }

variable "app_name" { type = string }
variable "resource_group_name" { type = string }
variable "location" { type = string; default = "eastus" }
variable "runtime" { type = string; default = "node" }
variable "deployment_id" { type = string }

resource "azurerm_storage_account" "func" {
  name                     = "${replace(var.app_name, "-", "")}stor"
  resource_group_name      = var.resource_group_name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_service_plan" "main" {
  name                = "${var.app_name}-plan"
  resource_group_name = var.resource_group_name
  location            = var.location
  os_type             = "Linux"
  sku_name            = "Y1"
}

resource "azurerm_linux_function_app" "main" {
  name                       = var.app_name
  resource_group_name        = var.resource_group_name
  location                   = var.location
  service_plan_id            = azurerm_service_plan.main.id
  storage_account_name       = azurerm_storage_account.func.name
  storage_account_access_key = azurerm_storage_account.func.primary_access_key

  site_config {
    application_stack {
      node_version = var.runtime == "node" ? "18" : null
      python_version = var.runtime == "python" ? "3.11" : null
    }
  }

  tags = { DeploymentId = var.deployment_id, ManagedBy = "cloud-auto-deploy" }
}

output "function_app_url" { value = "https://${azurerm_linux_function_app.main.default_hostname}" }
output "function_app_id" { value = azurerm_linux_function_app.main.id }
