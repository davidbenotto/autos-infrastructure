import { z } from "zod";

export const deploymentSchema = z.object({
  provider: z.enum(["aws", "azure", "gcp"], {
    required_error: "Provider is required",
    invalid_type_error: "Provider must be 'aws', 'azure', or 'gcp'",
  }),
  resourceType: z.string({
    required_error: "Resource type is required",
  }),
  options: z.record(z.any()).optional().default({}),
});
