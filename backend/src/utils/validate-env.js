import { z } from "zod";
import logger from "./logger.js";

/**
 * Environment variable schema using Zod
 * Validates required and optional environment variables at startup
 */
const envSchema = z.object({
  // Server
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z
    .enum(["development", "staging", "production", "test"])
    .default("development"),

  // Session
  SESSION_SECRET: z.string().min(16).default("dev-secret-change-in-production"),

  // Encryption
  ENCRYPTION_KEY: z
    .string()
    .min(16)
    .default("a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6"),

  // CORS
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),

  // Database
  DATABASE_URL: z
    .string()
    .default(
      "postgresql://cloudportal:cloudportal123@localhost:5432/cloudportal",
    ),

  // Redis
  REDIS_URL: z.string().default("redis://localhost:6379"),

  // Pre-configured credentials toggle
  USE_PRECONFIGURED_CREDENTIALS: z
    .string()
    .transform((v) => v === "true")
    .default("false"),

  // AWS (optional - only needed if USE_PRECONFIGURED_CREDENTIALS is true)
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default("us-east-1"),

  // Azure (optional)
  AZURE_CLIENT_ID: z.string().optional(),
  AZURE_CLIENT_SECRET: z.string().optional(),
  AZURE_TENANT_ID: z.string().optional(),
  AZURE_SUBSCRIPTION_ID: z.string().optional(),
  AZURE_RESOURCE_GROUP: z.string().default("cloud-portal-rg"),
  AZURE_LOCATION: z.string().default("eastus"),

  // GCP (optional)
  GCP_PROJECT_ID: z.string().optional(),
  GCP_CLIENT_EMAIL: z.string().optional(),
  GCP_PRIVATE_KEY: z.string().optional(),
});

/**
 * Validates environment variables and returns typed config
 * Logs warnings for missing optional credentials
 */
export function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    logger.error("❌ Invalid environment configuration:");
    result.error.issues.forEach((issue) => {
      logger.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    });
    process.exit(1);
  }

  const env = result.data;

  // Warn about missing credentials if pre-configured mode is enabled
  if (env.USE_PRECONFIGURED_CREDENTIALS) {
    if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
      logger.warn(
        "⚠️ USE_PRECONFIGURED_CREDENTIALS is true but AWS credentials are missing",
      );
    }
    if (!env.AZURE_CLIENT_ID || !env.AZURE_CLIENT_SECRET) {
      logger.warn(
        "⚠️ USE_PRECONFIGURED_CREDENTIALS is true but Azure credentials are missing",
      );
    }
    if (!env.GCP_PROJECT_ID || !env.GCP_CLIENT_EMAIL) {
      logger.warn(
        "⚠️ USE_PRECONFIGURED_CREDENTIALS is true but GCP credentials are missing",
      );
    }
  }

  // Warn about default SESSION_SECRET in production
  if (
    env.NODE_ENV === "production" &&
    env.SESSION_SECRET === "dev-secret-change-in-production"
  ) {
    logger.warn(
      "⚠️ Using default SESSION_SECRET in production - please set a secure value!",
    );
  }

  logger.info("✅ Environment configuration validated");
  return env;
}

export default validateEnv;
