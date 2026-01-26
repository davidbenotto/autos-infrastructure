import { ClientSecretCredential } from "@azure/identity";
import { ComputeManagementClient } from "@azure/arm-compute";
import { StorageManagementClient } from "@azure/arm-storage";
import { NetworkManagementClient } from "@azure/arm-network";
import { SqlManagementClient } from "@azure/arm-sql";
import { WebSiteManagementClient } from "@azure/arm-appservice";
import { ContainerInstanceManagementClient } from "@azure/arm-containerinstance";
import { CosmosDBManagementClient } from "@azure/arm-cosmosdb";
import { ServiceBusManagementClient } from "@azure/arm-servicebus";
import { CdnManagementClient } from "@azure/arm-cdn";
import { ResourceManagementClient } from "@azure/arm-resources";
import { v4 as uuidv4 } from "uuid";

/**
 * Azure Cloud Provider - Handles all Azure resource deployments
 */
export class AzureProvider {
  constructor(credentials) {
    this.credentials = credentials;
    this.credential = new ClientSecretCredential(
      credentials.tenantId,
      credentials.clientId,
      credentials.clientSecret,
    );
    this.subscriptionId = credentials.subscriptionId;
    this.resourceGroup = credentials.resourceGroup || "cloud-portal-rg";
    this.location = credentials.location || "eastus";
    this._resourceGroupCreated = false;
  }

  /**
   * Ensure the resource group exists before executing an operation
   */
  async ensureResourceGroup() {
    if (this._resourceGroupCreated) {
      return; // Already created in this session
    }

    const resourceClient = new ResourceManagementClient(
      this.credential,
      this.subscriptionId,
    );

    try {
      // Check if resource group exists
      await resourceClient.resourceGroups.get(this.resourceGroup);
      this._resourceGroupCreated = true;
    } catch (error) {
      // Resource group doesn't exist, create it
      if (error.statusCode === 404) {
        try {
          await resourceClient.resourceGroups.createOrUpdate(
            this.resourceGroup,
            {
              location: this.location,
              tags: { ManagedBy: "cloud-auto-deploy" },
            },
          );
          this._resourceGroupCreated = true;
          console.log(`Created resource group: ${this.resourceGroup}`);
        } catch (createError) {
          if (
            createError.statusCode === 403 ||
            createError.code === "AuthorizationFailed"
          ) {
            throw new Error(
              `Azure Authorization Failed: Your Service Principal does not have permission to create resource groups. Please assign the 'Contributor' role to your service principal for subscription ${this.subscriptionId}.`,
            );
          }
          throw createError;
        }
      } else if (
        error.statusCode === 403 ||
        error.code === "AuthorizationFailed"
      ) {
        throw new Error(
          `Azure Authorization Failed: Your Service Principal does not have permission to read resources. Please assign the 'Reader' or 'Contributor' role to your service principal.`,
        );
      } else {
        throw error;
      }
    }
  }

  /**
   * Validate Azure credentials
   */
  async validateCredentials() {
    try {
      const computeClient = new ComputeManagementClient(
        this.credential,
        this.subscriptionId,
      );
      const iterator = computeClient.virtualMachines.listAll();
      await iterator.next();
      return {
        valid: true,
        subscriptionId: this.subscriptionId,
        tenantId: this.credentials.tenantId,
      };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Deploy an Azure Virtual Machine
   */
  async deployVM(options = {}) {
    const computeClient = new ComputeManagementClient(
      this.credential,
      this.subscriptionId,
    );
    const networkClient = new NetworkManagementClient(
      this.credential,
      this.subscriptionId,
    );
    const deploymentId = uuidv4();
    const vmName = options.name || `auto-vm-${deploymentId.slice(0, 8)}`;

    try {
      // Ensure resource group exists
      await this.ensureResourceGroup();

      // Create VNet
      const vnetName = `${vmName}-vnet`;
      await networkClient.virtualNetworks.beginCreateOrUpdateAndWait(
        this.resourceGroup,
        vnetName,
        {
          location: this.location,
          addressSpace: { addressPrefixes: ["10.0.0.0/16"] },
          subnets: [{ name: "default", addressPrefix: "10.0.0.0/24" }],
        },
      );

      // Create Public IP
      const pip =
        await networkClient.publicIPAddresses.beginCreateOrUpdateAndWait(
          this.resourceGroup,
          `${vmName}-pip`,
          { location: this.location, publicIPAllocationMethod: "Dynamic" },
        );

      // Create NIC
      const nic =
        await networkClient.networkInterfaces.beginCreateOrUpdateAndWait(
          this.resourceGroup,
          `${vmName}-nic`,
          {
            location: this.location,
            ipConfigurations: [
              {
                name: "ipconfig1",
                subnet: {
                  id: `/subscriptions/${this.subscriptionId}/resourceGroups/${this.resourceGroup}/providers/Microsoft.Network/virtualNetworks/${vnetName}/subnets/default`,
                },
                publicIPAddress: { id: pip.id },
              },
            ],
          },
        );

      // Image Reference Mapping
      let imageReference;
      const osType = options.osType || "ubuntu24";

      if (osType === "windows2022") {
        imageReference = {
          publisher: "MicrosoftWindowsServer",
          offer: "WindowsServer",
          sku: "2022-Datacenter",
          version: "latest",
        };
      } else {
        // Default to Ubuntu 24.04 LTS
        imageReference = {
          publisher: "Canonical",
          offer: "ubuntu-24_04-lts",
          sku: "server",
          version: "latest",
        };
      }

      // Create VM
      const vm = await computeClient.virtualMachines.beginCreateOrUpdateAndWait(
        this.resourceGroup,
        vmName,
        {
          location: this.location,
          hardwareProfile: { vmSize: options.vmSize || "Standard_B1s" },
          storageProfile: {
            imageReference: imageReference,
            osDisk: {
              createOption: "FromImage",
              managedDisk: { storageAccountType: "Standard_LRS" },
            },
          },
          osProfile: {
            computerName: vmName,
            adminUsername: "azureuser",
            adminPassword: `AutoDeploy${deploymentId.slice(0, 8)}!`,
          },
          networkProfile: { networkInterfaces: [{ id: nic.id }] },
          tags: { DeploymentId: deploymentId, ManagedBy: "cloud-auto-deploy" },
        },
      );

      return {
        success: true,
        deploymentId,
        resourceType: "vm",
        resourceId: vm.id,
        details: {
          vmName: vm.name,
          vmSize: vm.hardwareProfile.vmSize,
          osType: osType,
          location: vm.location,
        },
      };
    } catch (error) {
      return { success: false, deploymentId, error: error.message };
    }
  }

  /**
   * Deploy an Azure Storage Account
   */
  async deployStorage(options = {}) {
    const storageClient = new StorageManagementClient(
      this.credential,
      this.subscriptionId,
    );
    const deploymentId = uuidv4();
    const accountName =
      options.name || `autostor${deploymentId.replace(/-/g, "").slice(0, 14)}`;

    try {
      // Ensure resource group exists
      await this.ensureResourceGroup();

      const account = await storageClient.storageAccounts.beginCreateAndWait(
        this.resourceGroup,
        accountName,
        {
          location: this.location,
          sku: { name: options.sku || "Standard_LRS" },
          kind: "StorageV2",
          tags: { DeploymentId: deploymentId, ManagedBy: "cloud-auto-deploy" },
        },
      );
      return {
        success: true,
        deploymentId,
        resourceType: "storage",
        resourceId: account.id,
        details: {
          name: account.name,
          location: account.location,
          sku: account.sku.name,
        },
      };
    } catch (error) {
      return { success: false, deploymentId, error: error.message };
    }
  }

  /**
   * Deploy an Azure Virtual Network
   */
  async deployVNet(options = {}) {
    const networkClient = new NetworkManagementClient(
      this.credential,
      this.subscriptionId,
    );
    const deploymentId = uuidv4();
    const vnetName = options.name || `auto-vnet-${deploymentId.slice(0, 8)}`;

    try {
      // Ensure resource group exists
      await this.ensureResourceGroup();

      const vnet =
        await networkClient.virtualNetworks.beginCreateOrUpdateAndWait(
          this.resourceGroup,
          vnetName,
          {
            location: this.location,
            addressSpace: {
              addressPrefixes: [options.addressPrefix || "10.0.0.0/16"],
            },
            subnets: [
              { name: "default", addressPrefix: "10.0.0.0/24" },
              { name: "private", addressPrefix: "10.0.1.0/24" },
            ],
            tags: {
              DeploymentId: deploymentId,
              ManagedBy: "cloud-auto-deploy",
            },
          },
        );
      return {
        success: true,
        deploymentId,
        resourceType: "vnet",
        resourceId: vnet.id,
        details: {
          name: vnet.name,
          location: vnet.location,
          addressSpace: vnet.addressSpace,
        },
      };
    } catch (error) {
      return { success: false, deploymentId, error: error.message };
    }
  }

  /**
   * Deploy an Azure SQL Database
   */
  async deploySQL(options = {}) {
    const sqlClient = new SqlManagementClient(
      this.credential,
      this.subscriptionId,
    );
    const deploymentId = uuidv4();
    const serverName =
      options.serverName || `auto-sql-${deploymentId.slice(0, 8)}`;
    const dbName = options.dbName || "autodb";

    try {
      // Ensure resource group exists
      await this.ensureResourceGroup();

      // Create SQL Server
      await sqlClient.servers.beginCreateOrUpdateAndWait(
        this.resourceGroup,
        serverName,
        {
          location: this.location,
          administratorLogin: "sqladmin",
          administratorLoginPassword: `AutoDeploy${deploymentId.slice(0, 8)}!`,
          tags: { DeploymentId: deploymentId, ManagedBy: "cloud-auto-deploy" },
        },
      );

      // Create Database
      const db = await sqlClient.databases.beginCreateOrUpdateAndWait(
        this.resourceGroup,
        serverName,
        dbName,
        {
          location: this.location,
          sku: { name: options.sku || "Basic", tier: "Basic" },
          tags: { DeploymentId: deploymentId },
        },
      );

      return {
        success: true,
        deploymentId,
        resourceType: "sql",
        resourceId: db.id,
        details: { serverName, databaseName: db.name, sku: db.sku.name },
      };
    } catch (error) {
      return { success: false, deploymentId, error: error.message };
    }
  }

  /**
   * Deploy an Azure Function App
   */
  async deployFunctions(options = {}) {
    const webClient = new WebSiteManagementClient(
      this.credential,
      this.subscriptionId,
    );
    const storageClient = new StorageManagementClient(
      this.credential,
      this.subscriptionId,
    );
    const deploymentId = uuidv4();
    const appName = options.name || `auto-func-${deploymentId.slice(0, 8)}`;
    const storageName = `autofuncstor${deploymentId.replace(/-/g, "").slice(0, 10)}`;

    try {
      // Ensure resource group exists
      await this.ensureResourceGroup();

      // Create storage account for functions
      await storageClient.storageAccounts.beginCreateAndWait(
        this.resourceGroup,
        storageName,
        {
          location: this.location,
          sku: { name: "Standard_LRS" },
          kind: "StorageV2",
        },
      );

      // Create App Service Plan (Consumption)
      const planName = `${appName}-plan`;
      await webClient.appServicePlans.beginCreateOrUpdateAndWait(
        this.resourceGroup,
        planName,
        {
          location: this.location,
          sku: { name: "Y1", tier: "Dynamic" },
          kind: "functionapp",
        },
      );

      // Create Function App
      const funcApp = await webClient.webApps.beginCreateOrUpdateAndWait(
        this.resourceGroup,
        appName,
        {
          location: this.location,
          kind: "functionapp",
          serverFarmId: `/subscriptions/${this.subscriptionId}/resourceGroups/${this.resourceGroup}/providers/Microsoft.Web/serverfarms/${planName}`,
          siteConfig: {
            appSettings: [
              {
                name: "FUNCTIONS_WORKER_RUNTIME",
                value: options.runtime || "node",
              },
              { name: "FUNCTIONS_EXTENSION_VERSION", value: "~4" },
            ],
          },
          tags: { DeploymentId: deploymentId, ManagedBy: "cloud-auto-deploy" },
        },
      );

      return {
        success: true,
        deploymentId,
        resourceType: "functions",
        resourceId: funcApp.id,
        details: {
          name: funcApp.name,
          location: funcApp.location,
          runtime: options.runtime || "node",
        },
      };
    } catch (error) {
      return { success: false, deploymentId, error: error.message };
    }
  }

  /**
   * Deploy Azure Container Instance
   */
  async deployContainerInstance(options = {}) {
    const containerClient = new ContainerInstanceManagementClient(
      this.credential,
      this.subscriptionId,
    );
    const deploymentId = uuidv4();
    const containerGroupName =
      options.name || `auto-aci-${deploymentId.slice(0, 8)}`;

    try {
      // Ensure resource group exists
      await this.ensureResourceGroup();

      const containerGroup =
        await containerClient.containerGroups.beginCreateOrUpdateAndWait(
          this.resourceGroup,
          containerGroupName,
          {
            location: this.location,
            containers: [
              {
                name: "main",
                image:
                  options.image || "mcr.microsoft.com/azuredocs/aci-helloworld",
                resources: {
                  requests: {
                    cpu: options.cpu || 1,
                    memoryInGB: options.memory || 1.5,
                  },
                },
                ports: [{ port: 80 }],
              },
            ],
            osType: "Linux",
            ipAddress: {
              type: "Public",
              ports: [{ protocol: "TCP", port: 80 }],
            },
            tags: {
              DeploymentId: deploymentId,
              ManagedBy: "cloud-auto-deploy",
            },
          },
        );

      return {
        success: true,
        deploymentId,
        resourceType: "container",
        resourceId: containerGroup.id,
        details: {
          name: containerGroup.name,
          ipAddress: containerGroup.ipAddress?.ip,
          image: options.image,
        },
      };
    } catch (error) {
      return { success: false, deploymentId, error: error.message };
    }
  }

  /**
   * Deploy Cosmos DB account
   */
  async deployCosmosDB(options = {}) {
    const cosmosClient = new CosmosDBManagementClient(
      this.credential,
      this.subscriptionId,
    );
    const deploymentId = uuidv4();
    const accountName =
      options.name || `auto-cosmos-${deploymentId.slice(0, 8)}`;

    try {
      // Ensure resource group exists
      await this.ensureResourceGroup();

      const account =
        await cosmosClient.databaseAccounts.beginCreateOrUpdateAndWait(
          this.resourceGroup,
          accountName,
          {
            location: this.location,
            databaseAccountOfferType: "Standard",
            locations: [{ locationName: this.location, failoverPriority: 0 }],
            capabilities: options.serverless
              ? [{ name: "EnableServerless" }]
              : [],
            tags: {
              DeploymentId: deploymentId,
              ManagedBy: "cloud-auto-deploy",
            },
          },
        );

      return {
        success: true,
        deploymentId,
        resourceType: "cosmosdb",
        resourceId: account.id,
        details: { name: account.name, endpoint: account.documentEndpoint },
      };
    } catch (error) {
      return { success: false, deploymentId, error: error.message };
    }
  }

  /**
   * Deploy Azure CDN profile
   */
  async deployCDN(options = {}) {
    const cdnClient = new CdnManagementClient(
      this.credential,
      this.subscriptionId,
    );
    const deploymentId = uuidv4();
    const profileName = options.name || `auto-cdn-${deploymentId.slice(0, 8)}`;

    try {
      // Ensure resource group exists
      await this.ensureResourceGroup();

      const profile = await cdnClient.profiles.beginCreateAndWait(
        this.resourceGroup,
        profileName,
        {
          location: "global",
          sku: { name: options.sku || "Standard_Microsoft" },
          tags: { DeploymentId: deploymentId, ManagedBy: "cloud-auto-deploy" },
        },
      );

      return {
        success: true,
        deploymentId,
        resourceType: "cdn",
        resourceId: profile.id,
        details: { name: profile.name, sku: profile.sku.name },
      };
    } catch (error) {
      return { success: false, deploymentId, error: error.message };
    }
  }

  /**
   * Deploy Azure App Service
   */
  async deployAppService(options = {}) {
    const webClient = new WebSiteManagementClient(
      this.credential,
      this.subscriptionId,
    );
    const deploymentId = uuidv4();
    const appName = options.name || `auto-app-${deploymentId.slice(0, 8)}`;
    const planName = `${appName}-plan`;

    try {
      // Ensure resource group exists
      await this.ensureResourceGroup();

      // Create App Service Plan
      await webClient.appServicePlans.beginCreateOrUpdateAndWait(
        this.resourceGroup,
        planName,
        {
          location: this.location,
          sku: { name: options.sku || "F1", tier: options.tier || "Free" },
          kind: "linux",
          reserved: true,
        },
      );

      // Create Web App
      const webApp = await webClient.webApps.beginCreateOrUpdateAndWait(
        this.resourceGroup,
        appName,
        {
          location: this.location,
          kind: "app,linux",
          serverFarmId: `/subscriptions/${this.subscriptionId}/resourceGroups/${this.resourceGroup}/providers/Microsoft.Web/serverfarms/${planName}`,
          siteConfig: { linuxFxVersion: options.runtime || "NODE|18-lts" },
          tags: { DeploymentId: deploymentId, ManagedBy: "cloud-auto-deploy" },
        },
      );

      return {
        success: true,
        deploymentId,
        resourceType: "appservice",
        resourceId: webApp.id,
        details: {
          name: webApp.name,
          url: `https://${webApp.defaultHostName}`,
          runtime: options.runtime,
        },
      };
    } catch (error) {
      return { success: false, deploymentId, error: error.message };
    }
  }

  /**
   * Delete a resource
   */
  async destroyResource(resourceType, resourceId) {
    const resourceName = resourceId.split("/").pop();
    try {
      switch (resourceType) {
        case "vm": {
          const client = new ComputeManagementClient(
            this.credential,
            this.subscriptionId,
          );
          await client.virtualMachines.beginDeleteAndWait(
            this.resourceGroup,
            resourceName,
          );
          break;
        }
        case "storage": {
          const client = new StorageManagementClient(
            this.credential,
            this.subscriptionId,
          );
          await client.storageAccounts.delete(this.resourceGroup, resourceName);
          break;
        }
        case "vnet": {
          const client = new NetworkManagementClient(
            this.credential,
            this.subscriptionId,
          );
          await client.virtualNetworks.beginDeleteAndWait(
            this.resourceGroup,
            resourceName,
          );
          break;
        }
        case "sql": {
          const client = new SqlManagementClient(
            this.credential,
            this.subscriptionId,
          );
          await client.servers.beginDeleteAndWait(
            this.resourceGroup,
            resourceName,
          );
          break;
        }
        case "functions":
        case "appservice": {
          const client = new WebSiteManagementClient(
            this.credential,
            this.subscriptionId,
          );
          await client.webApps.delete(this.resourceGroup, resourceName);
          break;
        }
        case "container": {
          const client = new ContainerInstanceManagementClient(
            this.credential,
            this.subscriptionId,
          );
          await client.containerGroups.beginDeleteAndWait(
            this.resourceGroup,
            resourceName,
          );
          break;
        }
        case "cosmosdb": {
          const client = new CosmosDBManagementClient(
            this.credential,
            this.subscriptionId,
          );
          await client.databaseAccounts.beginDeleteAndWait(
            this.resourceGroup,
            resourceName,
          );
          break;
        }
        case "servicebus": {
          const client = new ServiceBusManagementClient(
            this.credential,
            this.subscriptionId,
          );
          await client.namespaces.beginDeleteAndWait(
            this.resourceGroup,
            resourceName,
          );
          break;
        }
        case "cdn": {
          const client = new CdnManagementClient(
            this.credential,
            this.subscriptionId,
          );
          await client.profiles.beginDeleteAndWait(
            this.resourceGroup,
            resourceName,
          );
          break;
        }
        default:
          throw new Error(`Unknown resource type: ${resourceType}`);
      }
      return {
        success: true,
        message: `${resourceType} ${resourceName} destroyed`,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get available resource types
   */
  static getResourceTypes() {
    return [
      // Compute
      {
        id: "vm",
        name: "Virtual Machine",
        category: "Compute",
        description: "Azure VM instance",
        icon: "🖥️",
        options: [
          {
            name: "osType",
            type: "select",
            default: "ubuntu24",
            choices: ["ubuntu24", "windows2022"],
          },
          {
            name: "vmSize",
            type: "select",
            default: "Standard_B1s",
            choices: ["Standard_B1s", "Standard_B2s", "Standard_D2s_v3"],
          },
          { name: "name", type: "text", default: "", placeholder: "VM name" },
        ],
      },
      {
        id: "functions",
        name: "Azure Functions",
        category: "Compute",
        description: "Serverless compute",
        icon: "⚡",
        options: [
          {
            name: "name",
            type: "text",
            default: "",
            placeholder: "Function app name",
          },
          {
            name: "runtime",
            type: "select",
            default: "node",
            choices: ["node", "python", "dotnet", "java"],
          },
        ],
      },
      {
        id: "container",
        name: "Container Instance",
        category: "Compute",
        description: "Serverless containers",
        icon: "🐳",
        options: [
          {
            name: "name",
            type: "text",
            default: "",
            placeholder: "Container group name",
          },
          {
            name: "image",
            type: "text",
            default: "mcr.microsoft.com/azuredocs/aci-helloworld",
            placeholder: "Container image",
          },
        ],
      },
      {
        id: "appservice",
        name: "App Service",
        category: "Compute",
        description: "Managed web hosting",
        icon: "🌍",
        options: [
          { name: "name", type: "text", default: "", placeholder: "App name" },
          {
            name: "runtime",
            type: "select",
            default: "NODE|20-lts",
            choices: [
              "NODE|20-lts",
              "PYTHON|3.12",
              "DOTNETCORE|8.0",
              "NODE|18-lts",
            ],
          },
        ],
      },
      // Storage
      {
        id: "storage",
        name: "Storage Account",
        category: "Storage",
        description: "Azure Blob Storage",
        icon: "📦",
        options: [
          {
            name: "sku",
            type: "select",
            default: "Standard_LRS",
            choices: ["Standard_LRS", "Standard_GRS", "Premium_LRS"],
          },
          {
            name: "name",
            type: "text",
            default: "",
            placeholder: "Storage name (lowercase)",
          },
        ],
      },
      {
        id: "cosmosdb",
        name: "Cosmos DB",
        category: "Storage",
        description: "Global NoSQL database",
        icon: "🌍",
        options: [
          {
            name: "name",
            type: "text",
            default: "",
            placeholder: "Account name",
          },
        ],
      },
      // Database
      {
        id: "sql",
        name: "Azure SQL",
        category: "Database",
        description: "Managed SQL database",
        icon: "🗄️",
        options: [
          {
            name: "serverName",
            type: "text",
            default: "",
            placeholder: "SQL server name",
          },
          {
            name: "sku",
            type: "select",
            default: "Basic",
            choices: ["Basic", "S0", "S1"],
          },
        ],
      },
      // Networking
      {
        id: "vnet",
        name: "Virtual Network",
        category: "Networking",
        description: "Azure VNet",
        icon: "🌐",
        options: [
          {
            name: "addressPrefix",
            type: "text",
            default: "10.0.0.0/16",
            placeholder: "Address space",
          },
          { name: "name", type: "text", default: "", placeholder: "VNet name" },
        ],
      },
      {
        id: "cdn",
        name: "Azure CDN",
        category: "Networking",
        description: "Content delivery network",
        icon: "⚡",
        options: [
          {
            name: "name",
            type: "text",
            default: "",
            placeholder: "CDN profile name",
          },
          {
            name: "sku",
            type: "select",
            default: "Standard_Microsoft",
            choices: [
              "Standard_Microsoft",
              "Standard_Akamai",
              "Standard_Verizon",
            ],
          },
        ],
      },
    ];
  }
}

export default AzureProvider;
