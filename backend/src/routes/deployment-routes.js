import express from "express";
import { decryptCredentials } from "../services/encryption-service.js";
import { AWSProvider } from "../providers/aws-provider.js";
import { AzureProvider } from "../providers/azure-provider.js";
import { db } from "../services/database-service.js";

const router = express.Router();

/**
 * GET /api/deployments/resources
 * Get available resource types for each provider
 */
router.get("/resources", (req, res) => {
  res.json({
    aws: AWSProvider.getResourceTypes(),
    azure: AzureProvider.getResourceTypes(),
  });
});

/**
 * POST /api/deployments/deploy
 * Deploy a resource
 */
router.post("/deploy", async (req, res, next) => {
  try {
    const { provider, resourceType, options } = req.body;

    if (!provider || !resourceType) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["provider", "resourceType"],
      });
    }

    const credentialKey = `${provider}_credentials`;
    if (!req.session[credentialKey]) {
      return res.status(401).json({
        error: `${provider.toUpperCase()} credentials not configured`,
      });
    }

    const credentials = decryptCredentials(req.session[credentialKey]);
    let result;

    if (provider === "aws") {
      const awsProvider = new AWSProvider(credentials);
      const deployMethods = {
        ec2: () => awsProvider.deployEC2(options),
        s3: () => awsProvider.deployS3(options),
        vpc: () => awsProvider.deployVPC(options),
        rds: () => awsProvider.deployRDS(options),
        lambda: () => awsProvider.deployLambda(options),
        ecs: () => awsProvider.deployECS(options),
        dynamodb: () => awsProvider.deployDynamoDB(options),
        sns: () => awsProvider.deploySNS(options),
        sqs: () => awsProvider.deploySQS(options),
        cloudfront: () => awsProvider.deployCloudFront(options),
      };

      if (!deployMethods[resourceType]) {
        return res
          .status(400)
          .json({ error: `Unknown resource type: ${resourceType}` });
      }
      result = await deployMethods[resourceType]();
    } else if (provider === "azure") {
      // Debug logging for Azure credentials
      console.log("🔵 Azure deployment requested:", {
        resourceType,
        options,
        credentials: {
          tenantId: credentials.tenantId?.slice(0, 8) + "...",
          clientId: credentials.clientId?.slice(0, 8) + "...",
          subscriptionId: credentials.subscriptionId?.slice(0, 8) + "...",
          resourceGroup: credentials.resourceGroup,
          location: credentials.location,
        },
      });
      const azureProvider = new AzureProvider(credentials);
      const deployMethods = {
        vm: () => azureProvider.deployVM(options),
        storage: () => azureProvider.deployStorage(options),
        vnet: () => azureProvider.deployVNet(options),
        sql: () => azureProvider.deploySQL(options),
        functions: () => azureProvider.deployFunctions(options),
        container: () => azureProvider.deployContainerInstance(options),
        cosmosdb: () => azureProvider.deployCosmosDB(options),
        servicebus: () => azureProvider.deployServiceBus(options),
        cdn: () => azureProvider.deployCDN(options),
        appservice: () => azureProvider.deployAppService(options),
      };

      if (!deployMethods[resourceType]) {
        return res
          .status(400)
          .json({ error: `Unknown resource type: ${resourceType}` });
      }

      console.log(`🔵 Starting Azure ${resourceType} deployment...`);
      result = await deployMethods[resourceType]();
      console.log(
        `🔵 Azure ${resourceType} deployment result:`,
        JSON.stringify(result, null, 2),
      );

      if (!result.success) {
        console.error(
          `❌ Azure ${resourceType} deployment failed:`,
          result.error,
        );
      }
    } else {
      return res.status(400).json({ error: "Invalid provider" });
    }

    // Store deployment in database
    try {
      await db.createDeployment({
        deploymentId: result.deploymentId,
        provider,
        resourceType,
        resourceId: result.resourceId,
        resourceName: options?.name || result.resourceId,
        status: result.success ? "active" : "failed",
        options: options || {},
        details: result.details || {},
      });
    } catch (dbError) {
      console.error("Database error:", dbError);
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/deployments
 */
router.get("/", async (req, res) => {
  try {
    const { provider } = req.query;
    const deployments = await db.getAllDeployments(provider);
    res.json({
      count: deployments.length,
      deployments: deployments.map((d) => ({
        deploymentId: d.deployment_id,
        provider: d.provider,
        resourceType: d.resource_type,
        resourceId: d.resource_id,
        resourceName: d.resource_name,
        status: d.status,
        details: d.details,
        createdAt: d.created_at,
        destroyedAt: d.destroyed_at,
      })),
    });
  } catch (error) {
    res.json({ count: 0, deployments: [] });
  }
});

/**
 * DELETE /api/deployments/:id
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const deployment = await db.getDeployment(req.params.id);
    if (!deployment) {
      return res.status(404).json({ error: "Deployment not found" });
    }

    const credentialKey = `${deployment.provider}_credentials`;
    if (!req.session[credentialKey]) {
      return res.status(401).json({
        error: `${deployment.provider.toUpperCase()} credentials not configured`,
      });
    }

    const credentials = decryptCredentials(req.session[credentialKey]);
    let result;

    if (deployment.resource_id) {
      try {
        if (deployment.provider === "aws") {
          const awsProvider = new AWSProvider(credentials);
          result = await awsProvider.destroyResource(
            deployment.resource_type,
            deployment.resource_id,
          );
        } else {
          const azureProvider = new AzureProvider(credentials);
          result = await azureProvider.destroyResource(
            deployment.resource_type,
            deployment.resource_id,
          );
        }
      } catch (resourceError) {
        console.warn(
          `Failed to destroy resource ${deployment.resource_id}: ${resourceError.message}`,
        );
        // If it was already failed, we might still want to mark it as destroyed in DB
        // ignoring resource not found errors
        result = {
          success: true,
          message: "Resource cleanup skipped or failed, marking as destroyed",
        };
      }
    } else {
      // No resource ID means it probably failed before creation
      result = {
        success: true,
        message: "No resource to destroy, marked as destroyed",
      };
    }

    if (result.success) {
      await db.updateDeployment(deployment.deployment_id, {
        status: "destroyed",
      });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
