import { InstancesClient, ZoneOperationsClient } from "@google-cloud/compute";
import { Storage } from "@google-cloud/storage";
import { v4 as uuidv4 } from "uuid";
import logger from "../utils/logger.js";

/**
 * Google Cloud Provider - Handles all GCP resource deployments
 */
export class GCPProvider {
  constructor(credentials) {
    this.credentials = credentials;
    this.projectId = credentials.projectId;
    // credentials object usually contains client_email, private_key etc.
    this.config = {
      projectId: this.projectId,
      credentials: {
        client_email: credentials.clientEmail,
        private_key: credentials.privateKey,
      },
    };

    this.instancesClient = new InstancesClient(this.config);
    this.operationsClient = new ZoneOperationsClient(this.config);
    this.storage = new Storage(this.config);
  }

  /**
   * Validate GCP credentials
   */
  async validateCredentials() {
    try {
      const [buckets] = await this.storage.getBuckets();
      return {
        valid: true,
        projectId: this.projectId,
        bucketsCount: buckets.length,
      };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Deploy GCE Instance
   */
  async deployGCE(options = {}) {
    const deploymentId = uuidv4();
    const zone = options.zone || "us-central1-a";
    const name = options.name || `auto-gce-${deploymentId.slice(0, 8)}`;
    const machineType = `zones/${zone}/machineTypes/${options.machineType || "e2-micro"}`;
    const sourceImage =
      options.sourceImage ||
      "projects/debian-cloud/global/images/family/debian-11";

    try {
      const [response, operation] = await this.instancesClient.insert({
        project: this.projectId,
        zone,
        instanceResource: {
          name,
          machineType,
          disks: [
            {
              boot: true,
              initializeParams: {
                sourceImage,
              },
            },
          ],
          networkInterfaces: [
            {
              name: "global/networks/default",
              accessConfigs: [{ name: "External NAT", type: "ONE_TO_ONE_NAT" }],
            },
          ],
          labels: {
            deployment_id: deploymentId,
            managed_by: "cloud-auto-deploy",
          },
        },
      });

      // We don't wait for operation completion to keep UI responsive,
      // but in a real app we might want to poll or use webhooks.
      // For now, we return the operation ID.

      return {
        success: true,
        deploymentId,
        resourceType: "gce",
        resourceId: name,
        details: {
          name,
          zone,
          machineType: options.machineType || "e2-micro",
          status: "PROVISIONING",
          operationId: operation.name,
        },
      };
    } catch (error) {
      return { success: false, deploymentId, error: error.message };
    }
  }

  /**
   * Deploy Cloud Storage Bucket
   */
  async deployGCS(options = {}) {
    const deploymentId = uuidv4();
    const bucketName =
      options.bucketName || `auto-gcs-${deploymentId.slice(0, 8)}`;

    try {
      await this.storage.createBucket(bucketName, {
        location: options.location || "US",
        storageClass: options.storageClass || "STANDARD",
        labels: {
          deployment_id: deploymentId,
          managed_by: "cloud-auto-deploy",
        },
      });

      return {
        success: true,
        deploymentId,
        resourceType: "gcs",
        resourceId: bucketName,
        details: {
          bucketName,
          location: options.location || "US",
        },
      };
    } catch (error) {
      return { success: false, deploymentId, error: error.message };
    }
  }

  /**
   * Destroy Resource
   */
  async destroyResource(resourceType, resourceId) {
    try {
      switch (resourceType) {
        case "gce": {
          // resourceId = name
          // Assuming default zone for simplicity in this MVP,
          // usually we'd need to store zone in DB
          const zone = "us-central1-a";
          await this.instancesClient.delete({
            project: this.projectId,
            zone,
            instance: resourceId,
          });
          break;
        }
        case "gcs":
          await this.storage.bucket(resourceId).delete();
          break;
        default:
          throw new Error(`Unknown resource type: ${resourceType}`);
      }
      return {
        success: true,
        message: `${resourceType} ${resourceId} destroyed`,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static getResourceTypes() {
    return [
      {
        id: "gce",
        name: "Compute Engine",
        category: "Compute",
        description: "Virtual Machine in GCP",
        icon: "🖥️",
        options: [
          {
            name: "machineType",
            type: "select",
            default: "e2-micro",
            choices: ["e2-micro", "e2-small", "e2-medium"],
          },
          {
            name: "zone",
            type: "select",
            default: "us-central1-a",
            choices: ["us-central1-a", "us-east1-b", "europe-west1-b"],
          },
          {
            name: "name",
            type: "text",
            default: "",
            placeholder: "Instance Name",
          },
        ],
      },
      {
        id: "gcs",
        name: "Cloud Storage",
        category: "Storage",
        description: "Object storage bucket",
        icon: "🪣",
        options: [
          {
            name: "bucketName",
            type: "text",
            default: "",
            placeholder: "Bucket Name",
          },
          {
            name: "location",
            type: "select",
            default: "US",
            choices: ["US", "EU", "ASIA"],
          },
        ],
      },
    ];
  }
}
