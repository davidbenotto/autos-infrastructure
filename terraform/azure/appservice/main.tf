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
variable "sku" { type = string; default = "F1" }
variable "runtime" { type = string; default = "NODE|18-lts" }
variable "deployment_id" { type = string }

resource "azurerm_service_plan" "main" {
  name                = "${var.app_name}-plan"
  resource_group_name = var.resource_group_name
  location            = var.location
  os_type             = "Linux"
  sku_name            = var.sku
}

resource "azurerm_linux_web_app" "main" {
  name                = var.app_name
  resource_group_name = var.resource_group_name
  location            = var.location
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    application_stack {
      node_version = split("|", var.runtime)[0] == "NODE" ? split("|", var.runtime)[1] : null
    }
  }

  tags = { DeploymentId = var.deployment_id, ManagedBy = "cloud-auto-deploy" }
}

output "app_url" { value = "https://${azurerm_linux_web_app.main.default_hostname}" }
output "app_id" { value = azurerm_linux_web_app.main.id }
