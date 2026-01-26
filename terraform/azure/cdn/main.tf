terraform {
  required_version = ">= 1.0"
  required_providers {
    azurerm = { source = "hashicorp/azurerm", version = "~> 3.0" }
  }
}

provider "azurerm" { features {} }

variable "profile_name" { type = string }
variable "resource_group_name" { type = string }
variable "location" { type = string; default = "global" }
variable "sku" { type = string; default = "Standard_Microsoft" }
variable "deployment_id" { type = string }

resource "azurerm_cdn_profile" "main" {
  name                = var.profile_name
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = var.sku

  tags = { DeploymentId = var.deployment_id, ManagedBy = "cloud-auto-deploy" }
}

output "cdn_profile_id" { value = azurerm_cdn_profile.main.id }
output "cdn_profile_name" { value = azurerm_cdn_profile.main.name }
