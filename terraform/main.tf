# Configure the Azure Provider
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~>3.0"
    }
  }
}

# Authenticate to Azure
provider "azurerm" {
  features {}
}

# 1. Define your Resource Group with tags
resource "azurerm_resource_group" "rg" {
  name     = "campusbookingrg"
  location = "Central India"
  tags = {
    Owner = "220701045@rajalakshmi.edu.in"
  }
}

# 2. Define your Azure Container Registry
resource "azurerm_container_registry" "acr" {
  name                = "campusbookingacr"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  sku                 = "Basic"
  admin_enabled       = true
}

# 3. Define your SQL Server with identity and tags
resource "azurerm_mssql_server" "sqlserver" {
  name                         = "campusbookingserver"
  resource_group_name          = azurerm_resource_group.rg.name
  location                     = azurerm_resource_group.rg.location
  version                      = "12.0"
  administrator_login          = "campusbookingserver"
  administrator_login_password = "Campusresourcebooking@220701045" 

  identity {
    type = "SystemAssigned"
  }
  
  tags = {
    Owner = "220701045@rajalakshmi.edu.in"
  }
}

# 4. Define your SQL Database
resource "azurerm_mssql_database" "sqldb" {
  name                 = "campusbookingdb"
  server_id            = azurerm_mssql_server.sqlserver.id
  sku_name             = "S0"
  storage_account_type = "Local"
}

# 5. Define your App Service Plan
resource "azurerm_service_plan" "plan" {
  name                = "campus-booking-plan"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  os_type             = "Linux"
  sku_name            = "B1"
}

# 6. Define the Backend App Service
resource "azurerm_linux_web_app" "backend" {
  name                    = "campus-booking-backend-api"
  resource_group_name     = azurerm_resource_group.rg.name
  location                = azurerm_resource_group.rg.location
  service_plan_id         = azurerm_service_plan.plan.id
  client_affinity_enabled = true

  app_settings = {
    "DB_DATABASE"                         = "campusbookingdb"
    "DB_ENCRYPT"                          = "true"
    "DB_PASSWORD"                         = "Campusresourcebooking@220701045" 
    "DB_SERVER"                           = "campusbookingserver.database.windows.net"
    "DB_USERNAME"                         = "campusbookingserver"
    "JWT_SECRET"                          = "6d90f5be37b4659689c3ccc62fc82482" 
    "NODE_ENV"                            = "production"
    "PORT"                                = "8080"
    "AZURE_APP_SERVICE_URL"               = "https://campus-booking-frontend-web.azurewebsites.net"
    "WEBSITES_ENABLE_APP_SERVICE_STORAGE" = "false"
  }

  site_config {
    always_on     = false
    ftps_state    = "FtpsOnly"
    http2_enabled = true
  }
}

# 7. Define the Frontend App Service
resource "azurerm_linux_web_app" "frontend" {
  name                    = "campus-booking-frontend-web"
  resource_group_name     = azurerm_resource_group.rg.name
  location                = azurerm_resource_group.rg.location
  service_plan_id         = azurerm_service_plan.plan.id
  client_affinity_enabled = true

  app_settings = {
    "REACT_APP_API_URL"                   = "https://campus-booking-backend-api.azurewebsites.net/api"
    "WEBSITES_ENABLE_APP_SERVICE_STORAGE" = "false"
  }
  
  site_config {
    always_on     = false
    ftps_state    = "FtpsOnly"
    http2_enabled = true
  }
}
output "backend_url" {
  value = "https://${azurerm_linux_web_app.backend.default_hostname}"
  description = "Backend API URL"
}

output "frontend_url" {
  value = "https://${azurerm_linux_web_app.frontend.default_hostname}"
  description = "Frontend Web App URL"
}

output "acr_login_server" {
  value = azurerm_container_registry.acr.login_server
  description = "Container Registry URL"
}
# 8. Define AKS Cluster
resource "azurerm_kubernetes_cluster" "aks" {
  name                = "campusbookingaks"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  dns_prefix          = "campusbooking"

  default_node_pool {
    name       = "nodepool1"
    node_count = 1
    vm_size    = "Standard_B2s"
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin = "azure"
  }

  tags = {
    environment = "production"
  }
}

# 9. Grant AKS access to pull from ACR
resource "azurerm_role_assignment" "aks_acr_pull" {
  principal_id         = azurerm_kubernetes_cluster.aks.kubelet_identity[0].object_id
  role_definition_name = "AcrPull"
  scope                = azurerm_container_registry.acr.id
}