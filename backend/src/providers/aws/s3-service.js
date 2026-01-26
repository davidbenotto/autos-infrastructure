import {
  S3Client,
  CreateBucketCommand,
  DeleteBucketCommand,
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
      return {
        success: true,
        deploymentId,
        resourceType: "s3",
        resourceId: bucketName,
        details: { bucketName, region: this.config.region },
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
