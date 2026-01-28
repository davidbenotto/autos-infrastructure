import express from "express";
import cors from "cors";
import helmet from "helmet";
import session from "express-session";
import RedisStore from "connect-redis";
import Redis from "ioredis";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import deploymentRoutes from "./routes/deployment-routes.js";
import credentialRoutes from "./routes/credential-routes.js";
import organizationRoutes from "./routes/organization-routes.js";
import { encryptCredentials } from "./services/encryption-service.js";
import { db } from "./services/database-service.js";
import logger from "./utils/logger.js";

// Rate limiter for deployment endpoint (prevents abuse)
const deployRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 deployments per window
  message: { error: "Too many deployment requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiter
const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { error: "Too many requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

dotenv.config();

// Validate environment variables at startup
import validateEnv from "./utils/validate-env.js";
const env = validateEnv();

const app = express();
const PORT = env.PORT;

// Redis client for sessions
let redisClient;
let sessionStore;

try {
  redisClient = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
  sessionStore = new RedisStore({ client: redisClient });
  logger.info("📦 Connected to Redis");
} catch (error) {
  logger.warn("⚠️ Redis not available, using memory sessions");
  sessionStore = undefined;
}

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);

// Body parsing
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});

// Session configuration
app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }),
);

// Auto-load pre-configured credentials middleware
app.use((req, res, next) => {
  if (
    process.env.USE_PRECONFIGURED_CREDENTIALS === "true" &&
    !req.session.manually_disconnected
  ) {
    // Auto-inject AWS credentials if configured
    if (
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      !req.session.aws_credentials
    ) {
      const awsCredentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || "us-east-1",
      };
      req.session.aws_credentials = encryptCredentials(awsCredentials);
      req.session.aws_account = "preconfigured";
      req.session.aws_preconfigured = true;
    }

    // Auto-inject Azure credentials if configured
    if (
      process.env.AZURE_CLIENT_ID &&
      process.env.AZURE_CLIENT_SECRET &&
      !req.session.azure_credentials
    ) {
      const azureCredentials = {
        tenantId: process.env.AZURE_TENANT_ID,
        clientId: process.env.AZURE_CLIENT_ID,
        clientSecret: process.env.AZURE_CLIENT_SECRET,
        subscriptionId: process.env.AZURE_SUBSCRIPTION_ID,
        resourceGroup: process.env.AZURE_RESOURCE_GROUP || "cloud-portal-rg",
        location: process.env.AZURE_LOCATION || "eastus",
      };
      req.session.azure_credentials = encryptCredentials(azureCredentials);
      req.session.azure_subscription =
        process.env.AZURE_SUBSCRIPTION_ID || "preconfigured";
      req.session.azure_preconfigured = true;
    }

    // Auto-inject GCP credentials if configured
    if (
      process.env.GCP_PROJECT_ID &&
      process.env.GCP_CLIENT_EMAIL &&
      !req.session.gcp_credentials
    ) {
      const gcpCredentials = {
        projectId: process.env.GCP_PROJECT_ID,
        clientEmail: process.env.GCP_CLIENT_EMAIL,
        privateKey: process.env.GCP_PRIVATE_KEY
          ? process.env.GCP_PRIVATE_KEY.replace(/\\n/g, "\n")
          : "",
      };
      req.session.gcp_credentials = encryptCredentials(gcpCredentials);
      req.session.gcp_project = process.env.GCP_PROJECT_ID;
      req.session.gcp_preconfigured = true;
    }
  }
  next();
});

// Organization context middleware - extract org ID from headers
app.use((req, res, next) => {
  req.orgContext = {
    orgId: req.headers["x-organization-id"] || null,
    isAdmin: req.headers["x-admin-mode"] === "true",
  };
  next();
});

// API Routes with rate limiting
app.use("/api", apiRateLimiter);
app.use("/api/organizations", organizationRoutes);
app.use("/api/credentials", credentialRoutes);
app.use("/api/deployments/deploy", deployRateLimiter); // Stricter limits for deployments
app.use("/api/deployments", deploymentRoutes);

// Health check with database status
app.get("/api/health", async (req, res) => {
  const dbHealth = await db.healthCheck();
  const redisHealth = redisClient
    ? (await redisClient.ping()) === "PONG"
    : false;

  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    providers: ["aws", "azure"],
    preconfigured: process.env.USE_PRECONFIGURED_CREDENTIALS === "true",
    database: dbHealth,
    redis: { connected: redisHealth },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error("Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

app.listen(PORT, () => {
  logger.info(`🚀 Cloud Deploy Portal API running on http://localhost:${PORT}`);
  logger.info(`📦 Supported providers: AWS, Azure`);
  if (process.env.USE_PRECONFIGURED_CREDENTIALS === "true") {
    logger.info(`🔐 Pre-configured credentials enabled`);
  }
});

export default app;
