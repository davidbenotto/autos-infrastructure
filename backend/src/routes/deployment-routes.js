import express from "express";
import { decryptCredentials } from "../services/encryption-service.js";
import { AWSProvider } from "../providers/aws-provider.js";
import { AzureProvider } from "../providers/azure-provider.js";
import { db } from "../services/database-service.js";
import logger from "../utils/logger.js";

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

import {
  deploymentRequestSchema,
  getValidationSchema,
} from "../schemas/deployment-schemas.js";

/**
 * POST /api/deployments/deploy
 * Deploy a resource
 */
router.post("/deploy", async (req, res, next) => {
  try {
    // 1. Validate Basic Request Structure
    const validationResult = deploymentRequestSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid request format",
        details: validationResult.error.issues,
      });
    }

    const { provider, resourceType, options } = validationResult.data;

    // 2. Validate Resource Specific Options
    const resourceSchema = getValidationSchema(resourceType);
    const optionsValidation = resourceSchema.safeParse(options);

    if (!optionsValidation.success) {
      return res.status(400).json({
        error: "Invalid deployment options",
        details: optionsValidation.error.issues,
      });
    }

    const validOptions = optionsValidation.data;

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
        ec2: () => awsProvider.deployEC2(validOptions),
        s3: () => awsProvider.deployS3(validOptions),
        vpc: () => awsProvider.deployVPC(validOptions),
        rds: () => awsProvider.deployRDS(validOptions),
        lambda: () => awsProvider.deployLambda(validOptions),
        ecs: () => awsProvider.deployECS(validOptions),
        dynamodb: () => awsProvider.deployDynamoDB(validOptions),
        sns: () => awsProvider.deploySNS(validOptions),
        sqs: () => awsProvider.deploySQS(validOptions),
        cloudfront: () => awsProvider.deployCloudFront(validOptions),
      };

      if (!deployMethods[resourceType]) {
        return res
          .status(400)
          .json({ error: `Unknown resource type: ${resourceType}` });
      }
      result = await deployMethods[resourceType]();
    } else if (provider === "azure") {
      // Debug logging for Azure credentials
      logger.info("🔵 Azure deployment requested", {
        resourceType,
        deploymentOptions: validOptions,
      });
      const azureProvider = new AzureProvider(credentials);
      const deployMethods = {
        vm: () => azureProvider.deployVM(validOptions),
        storage: () => azureProvider.deployStorage(validOptions),
        vnet: () => azureProvider.deployVNet(validOptions),
        sql: () => azureProvider.deploySQL(validOptions),
        functions: () => azureProvider.deployFunctions(validOptions),
        container: () => azureProvider.deployContainerInstance(validOptions),
        cosmosdb: () => azureProvider.deployCosmosDB(validOptions),
        servicebus: () => azureProvider.deployServiceBus(validOptions),
        cdn: () => azureProvider.deployCDN(validOptions),
        appservice: () => azureProvider.deployAppService(validOptions),
      };

      if (!deployMethods[resourceType]) {
        return res
          .status(400)
          .json({ error: `Unknown resource type: ${resourceType}` });
      }

      logger.info(`🔵 Starting Azure ${resourceType} deployment...`);
      result = await deployMethods[resourceType]();
      logger.info(`🔵 Azure ${resourceType} deployment result`, { result });

      if (!result.success) {
        logger.error(`❌ Azure ${resourceType} deployment failed`, {
          error: result.error,
        });
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
        resourceName: validOptions?.name || result.resourceId,
        status: result.success ? "active" : "failed",
        options: validOptions || {},
        details: result.details || {},
      });
    } catch (dbError) {
      logger.error("Database error:", dbError);
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
        logger.warn(
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
