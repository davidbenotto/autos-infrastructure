import express from "express";
import {
  encryptCredentials,
  decryptCredentials,
} from "../services/encryption-service.js";
import { AWSProvider } from "../providers/aws-provider.js";
import { AzureProvider } from "../providers/azure-provider.js";

const router = express.Router();

/**
 * POST /api/credentials/aws
 * Configure AWS credentials
 */
router.post("/aws", async (req, res, next) => {
  try {
    const { accessKeyId, secretAccessKey, region } = req.body;

    if (!accessKeyId || !secretAccessKey) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["accessKeyId", "secretAccessKey"],
      });
    }

    const credentials = {
      accessKeyId,
      secretAccessKey,
      region: region || "us-east-1",
    };

    // Validate credentials
    const provider = new AWSProvider(credentials);
    const validation = await provider.validateCredentials();

    if (!validation.valid) {
      return res.status(401).json({
        error: "Invalid AWS credentials",
        details: validation.error,
      });
    }

    // Store encrypted credentials in session
    req.session.aws_credentials = encryptCredentials(credentials);
    req.session.aws_account = validation.accountId;
    req.session.aws_preconfigured = false;

    res.json({
      success: true,
      message: "AWS credentials configured successfully",
      account: {
        accountId: validation.accountId,
        region: credentials.region,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/credentials/azure
 * Configure Azure credentials
 */
router.post("/azure", async (req, res, next) => {
  try {
    const {
      tenantId,
      clientId,
      clientSecret,
      subscriptionId,
      resourceGroup,
      location,
    } = req.body;

    if (!tenantId || !clientId || !clientSecret || !subscriptionId) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["tenantId", "clientId", "clientSecret", "subscriptionId"],
      });
    }

    const credentials = {
      tenantId,
      clientId,
      clientSecret,
      subscriptionId,
      resourceGroup: resourceGroup || "cloud-portal-rg",
      location: location || "eastus",
    };

    // Validate credentials
    const provider = new AzureProvider(credentials);
    const validation = await provider.validateCredentials();

    if (!validation.valid) {
      return res.status(401).json({
        error: "Invalid Azure credentials",
        details: validation.error,
      });
    }

    // Store encrypted credentials in session
    req.session.azure_credentials = encryptCredentials(credentials);
    req.session.azure_subscription = subscriptionId;
    req.session.azure_preconfigured = false;

    res.json({
      success: true,
      message: "Azure credentials configured successfully",
      account: {
        subscriptionId: validation.subscriptionId,
        tenantId: validation.tenantId,
        resourceGroup: credentials.resourceGroup,
        location: credentials.location,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/credentials/status
 * Check which providers are configured
 */
router.get("/status", (req, res) => {
  res.json({
    aws: {
      configured: !!req.session.aws_credentials,
      accountId: req.session.aws_account || null,
      preconfigured: req.session.aws_preconfigured || false,
    },
    azure: {
      configured: !!req.session.azure_credentials,
      subscriptionId: req.session.azure_subscription || null,
      preconfigured: req.session.azure_preconfigured || false,
    },
  });
});

/**
 * DELETE /api/credentials/:provider
 * Clear credentials for a provider
 */
router.delete("/:provider", (req, res) => {
  const { provider } = req.params;

  if (provider === "aws") {
    delete req.session.aws_credentials;
    delete req.session.aws_account;
    delete req.session.aws_preconfigured;
  } else if (provider === "azure") {
    delete req.session.azure_credentials;
    delete req.session.azure_subscription;
    delete req.session.azure_preconfigured;
  } else {
    return res.status(400).json({ error: "Invalid provider" });
  }

  res.json({
    success: true,
    message: `${provider.toUpperCase()} credentials cleared`,
  });
});

export default router;
