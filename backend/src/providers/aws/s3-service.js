import {
  S3Client,
  CreateBucketCommand,
  DeleteBucketCommand,
  PutBucketVersioningCommand,
  PutPublicAccessBlockCommand,
} from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

export class AWSS3Service {
  constructor(config) {
    this.config = config;
    this.s3Client = new S3Client(config);
  }

  /**
   * Deploy an S3 bucket
   */
  async deployS3(options = {}) {
    const deploymentId = uuidv4();
    const bucketName =
      options.bucketName ||
      `auto-deploy-${deploymentId.slice(0, 8)}-${Date.now()}`;

    try {
      const params = {
        Bucket: bucketName,
        ...(this.config.region !== "us-east-1" && {
          CreateBucketConfiguration: { LocationConstraint: this.config.region },
        }),
      };

      await this.s3Client.send(new CreateBucketCommand(params));

      // Configure Versioning
      if (options.versioning === "Enabled") {
        await this.s3Client.send(
          new PutBucketVersioningCommand({
            Bucket: bucketName,
            VersioningConfiguration: { Status: "Enabled" },
          }),
        );
      }

      // Configure Public Access
      if (options.publicAccess === "Private") {
        await this.s3Client.send(
          new PutPublicAccessBlockCommand({
            Bucket: bucketName,
            PublicAccessBlockConfiguration: {
              BlockPublicAcls: true,
              IgnorePublicAcls: true,
              BlockPublicPolicy: true,
              RestrictPublicBuckets: true,
            },
          }),
        );
      } else if (options.publicAccess === "Public Read") {
        // We do NOT block public access, but we don't necessarily enable ACLs unless requested.
        // For simplicity, we just turn off the block.
        await this.s3Client.send(
          new PutPublicAccessBlockCommand({
            Bucket: bucketName,
            PublicAccessBlockConfiguration: {
              BlockPublicAcls: false,
              IgnorePublicAcls: false,
              BlockPublicPolicy: false,
              RestrictPublicBuckets: false,
            },
          }),
        );
      }

      return {
        success: true,
        deploymentId,
        resourceType: "s3",
        resourceId: bucketName,
        details: {
          bucketName,
          region: this.config.region,
          versioning: options.versioning || "Disabled",
          publicAccess: options.publicAccess || "Private",
        },
      };
    } catch (error) {
      return { success: false, deploymentId, error: error.message };
    }
  }

  /**
   * Destroy S3 bucket
   */
  async destroyResource(resourceId) {
    await this.s3Client.send(new DeleteBucketCommand({ Bucket: resourceId }));
  }
}
