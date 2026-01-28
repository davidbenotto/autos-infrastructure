import { z } from "zod";

// Base schema for common deployment options
const baseOptionSchema = z.object({
  name: z
    .string()
    .min(3)
    .max(63)
    .regex(/^[a-z0-9-]+$/, "Name must be lowercase alphanumeric with hyphens")
    .optional(),
  tags: z.record(z.string()).optional(),
});

// EC2 Schema
export const ec2Schema = baseOptionSchema.extend({
  osImage: z.enum(["ubuntu24", "ubuntu22", "amazon-linux-2023"]).optional(),
  instanceType: z.string().default("t2.micro"),
});

// Azure VM Schema
export const azureVmSchema = baseOptionSchema.extend({
  osType: z.enum(["ubuntu24", "windows2022"]).default("ubuntu24"),
  vmSize: z.string().default("Standard_B1s"),
});

// S3/Storage Schema
export const storageSchema = baseOptionSchema.extend({
  versioning: z.boolean().optional(),
});

// Aurora/RDS Schema
export const databaseSchema = baseOptionSchema.extend({
  engine: z.string().optional(),
  size: z.string().optional(),
});

// GCP Schemas
export const gceSchema = baseOptionSchema.extend({
  machineType: z
    .enum(["e2-micro", "e2-small", "e2-medium"])
    .default("e2-micro"),
  zone: z.string().default("us-central1-a"),
});

export const gcsSchema = baseOptionSchema.extend({
  bucketName: z.string().min(3).optional(),
  location: z.enum(["US", "EU", "ASIA"]).default("US"),
});

// Main Deployment Request Schema
export const deploymentRequestSchema = z.object({
  provider: z.enum(["aws", "azure", "gcp"]),
  resourceType: z.string(),
  options: z.object({}).passthrough(), // validation will happen inside based on type
});

export const getValidationSchema = (resourceType) => {
  switch (resourceType) {
    case "ec2":
      return ec2Schema;
    case "vm":
      return azureVmSchema;
    case "gce":
      return gceSchema;
    case "s3":
    case "storage":
    case "gcs":
      return storageSchema; // Reuse storage schema or distinct if needed
    case "rds":
    case "sql":
      return databaseSchema;
    default:
      return baseOptionSchema;
  }
};
