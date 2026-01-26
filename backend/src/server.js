import express from "express";
import cors from "cors";
import helmet from "helmet";
import session from "express-session";
import RedisStore from "connect-redis";
import Redis from "ioredis";
import dotenv from "dotenv";
import deploymentRoutes from "./routes/deployment-routes.js";
import credentialRoutes from "./routes/credential-routes.js";
import { encryptCredentials } from "./services/encryption-service.js";
import { db } from "./services/database-service.js";
import logger from "./utils/logger.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

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
  if (process.env.USE_PRECONFIGURED_CREDENTIALS === "true") {
    // Auto-inject AWS credentials if configured
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
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
    if (process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET) {
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
  }
  next();
});

// API Routes
app.use("/api/credentials", credentialRoutes);
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
