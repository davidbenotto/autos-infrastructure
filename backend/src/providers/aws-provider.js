import {
  EC2Client,
  RunInstancesCommand,
  TerminateInstancesCommand,
  CreateVpcCommand,
  DeleteVpcCommand,
  CreateSubnetCommand,
} from "@aws-sdk/client-ec2";
import {
  S3Client,
  CreateBucketCommand,
  DeleteBucketCommand,
} from "@aws-sdk/client-s3";
import {
  RDSClient,
  CreateDBInstanceCommand,
  DeleteDBInstanceCommand,
} from "@aws-sdk/client-rds";
import {
  LambdaClient,
  CreateFunctionCommand,
  DeleteFunctionCommand,
} from "@aws-sdk/client-lambda";
import {
  ECSClient,
  CreateClusterCommand,
  DeleteClusterCommand,
} from "@aws-sdk/client-ecs";
import {
  DynamoDBClient,
  CreateTableCommand,
  DeleteTableCommand,
} from "@aws-sdk/client-dynamodb";
import { SNSClient, DeleteTopicCommand } from "@aws-sdk/client-sns";
import { SQSClient, DeleteQueueCommand } from "@aws-sdk/client-sqs";
import {
  CloudFrontClient,
  CreateDistributionCommand,
} from "@aws-sdk/client-cloudfront";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import {
  IAMClient,
  CreateServiceLinkedRoleCommand,
  GetRoleCommand,
} from "@aws-sdk/client-iam";
import { v4 as uuidv4 } from "uuid";
import { AWSEC2Service } from "./aws/ec2-service.js";
import { AWSS3Service } from "./aws/s3-service.js";

/**
 * AWS Cloud Provider - Handles all AWS resource deployments
 */
export class AWSProvider {
  constructor(credentials) {
    this.credentials = credentials;
    this.config = {
      region: credentials.region || "us-east-1",
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
    };
    // Initialize modular services
    this.ec2Service = new AWSEC2Service(this.config);
    this.s3Service = new AWSS3Service(this.config);
  }

  /**
   * Helper to handle AWS SDK errors
   */
  handleAWSError(error) {
    if (
      error.Code === "AccessDenied" ||
      error.name === "AccessDeniedException"
    ) {
      return `AWS Authorization Failed: Your IAM user does not have permission to perform this action. Error: ${error.message}`;
    }
    if (error.Code === "AuthFailure" || error.name === "AuthFailure") {
      return `AWS Authentication Failed: Check your Access Key ID and Secret Access Key.`;
    }
    if (error.Code === "UnauthorizedOperation") {
      return `AWS Authorization Failed: Operation not authorized. Check your IAM policy.`;
    }
    return error.message;
  }

  /**
   * Validate AWS credentials
   */
  async validateCredentials() {
    try {
      const stsClient = new STSClient(this.config);
      const response = await stsClient.send(new GetCallerIdentityCommand({}));
      return {
        valid: true,
        accountId: response.Account,
        arn: response.Arn,
        userId: response.UserId,
      };
    } catch (error) {
      return { valid: false, error: this.handleAWSError(error) };
    }
  }

  /**
   * Helper to get latest AMI ID from SSM
   */
  /**
   * Helper to get latest AMI ID from SSM
   */
  async getLatestAmi(osImage) {
    return this.ec2Service.getLatestAmi(osImage);
  }

  /**
   * Ensure ECS Service Linked Role exists
   */
  async ensureECSServiceLinkedRole() {
    const iamClient = new IAMClient(this.config);
    const roleName = "AWSServiceRoleForECS";

    try {
      // Check if role exists
      await iamClient.send(new GetRoleCommand({ RoleName: roleName }));
      return true;
    } catch (error) {
      if (
        error.Code === "NoSuchEntity" ||
        error.name === "NoSuchEntityException"
      ) {
        try {
          // Create the role if it doesn't exist
          await iamClient.send(
            new CreateServiceLinkedRoleCommand({
              AWSServiceName: "ecs.amazonaws.com",
            }),
          );
          // Wait for role validation (eventual consistency)
          await new Promise((resolve) => setTimeout(resolve, 5000));
          return true;
        } catch (createError) {
          // It might have been created concurrently, which is fine
          if (
            createError.Code === "InvalidInput" &&
            createError.message.includes("already exists")
          ) {
            return true;
          }
          console.warn(
            `Failed to create ECS Service Linked Role: ${createError.message}. Proceeding anyway, but deployment might fail.`,
          );
          return false;
        }
      }
      // Re-throw other errors
      console.warn(
        `Failed to check ECS Service Linked Role: ${error.message}. Proceeding anyway.`,
      );
      return false;
    }
  }

  /**
   * Deploy an EC2 instance
   */
  /**
   * Deploy an EC2 instance
   */
  async deployEC2(options = {}) {
    return this.ec2Service.deployEC2(options);
  }

  /**
   * Deploy an S3 bucket
   */
  /**
   * Deploy an S3 bucket
   */
  async deployS3(options = {}) {
    return this.s3Service.deployS3(options);
  }

  /**
   * Deploy a VPC
   */
  /**
   * Deploy a VPC
   */
  async deployVPC(options = {}) {
    return this.ec2Service.deployVPC(options);
  }

  /**
   * Deploy an RDS database
   */
  async deployRDS(options = {}) {
    const rdsClient = new RDSClient(this.config);
    const deploymentId = uuidv4();
    const dbIdentifier =
      options.dbIdentifier || `auto-db-${deploymentId.slice(0, 8)}`;

    try {
      const response = await rdsClient.send(
        new CreateDBInstanceCommand({
          DBInstanceIdentifier: dbIdentifier,
          DBInstanceClass: options.instanceClass || "db.t3.micro",
          Engine: options.engine || "mysql",
          MasterUsername: options.masterUsername || "admin",
          MasterUserPassword:
            options.masterPassword || `AutoDeploy${deploymentId.slice(0, 8)}!`,
          AllocatedStorage: options.storage || 20,
          Tags: [
            { Key: "DeploymentId", Value: deploymentId },
            { Key: "ManagedBy", Value: "cloud-auto-deploy" },
          ],
        }),
      );

      return {
        success: true,
        deploymentId,
        resourceType: "rds",
        resourceId: response.DBInstance.DBInstanceIdentifier,
        details: {
          dbIdentifier: response.DBInstance.DBInstanceIdentifier,
          engine: response.DBInstance.Engine,
          instanceClass: response.DBInstance.DBInstanceClass,
        },
      };
    } catch (error) {
      return { success: false, deploymentId, error: error.message };
    }
  }

  /**
   * Deploy a Lambda function
   */
  async deployLambda(options = {}) {
    const lambdaClient = new LambdaClient(this.config);
    const deploymentId = uuidv4();
    const functionName =
      options.functionName || `auto-lambda-${deploymentId.slice(0, 8)}`;

    try {
      // Create a simple hello world function
      const code = Buffer.from(
        `
        exports.handler = async (event) => {
          return { statusCode: 200, body: JSON.stringify({ message: 'Hello from ${functionName}!' }) };
        };
      `,
      ).toString("base64");

      const response = await lambdaClient.send(
        new CreateFunctionCommand({
          FunctionName: functionName,
          Runtime: options.runtime || "nodejs18.x",
          Role: options.roleArn, // User must provide role ARN
          Handler: "index.handler",
          Code: { ZipFile: Buffer.from(code, "base64") },
          MemorySize: parseInt(options.memory || 128),
          Timeout: parseInt(options.timeout || 30),
          Tags: { DeploymentId: deploymentId, ManagedBy: "cloud-auto-deploy" },
        }),
      );

      return {
        success: true,
        deploymentId,
        resourceType: "lambda",
        resourceId: response.FunctionArn,
        details: {
          functionName: response.FunctionName,
          runtime: response.Runtime,
          arn: response.FunctionArn,
        },
      };
    } catch (error) {
      return { success: false, deploymentId, error: error.message };
    }
  }

  /**
   * Deploy an ECS Cluster
   */
  async deployECS(options = {}) {
    const ecsClient = new ECSClient(this.config);
    const deploymentId = uuidv4();
    const clusterName =
      options.clusterName || `auto-ecs-${deploymentId.slice(0, 8)}`;

    try {
      // Ensure Service Linked Role exists before creating cluster
      await this.ensureECSServiceLinkedRole();

      const response = await ecsClient.send(
        new CreateClusterCommand({
          clusterName,
          capacityProviders: ["FARGATE", "FARGATE_SPOT"],
          tags: [
            { key: "DeploymentId", value: deploymentId },
            { key: "ManagedBy", value: "cloud-auto-deploy" },
          ],
        }),
      );

      return {
        success: true,
        deploymentId,
        resourceType: "ecs",
        resourceId: response.cluster.clusterArn,
        details: {
          clusterName: response.cluster.clusterName,
          clusterArn: response.cluster.clusterArn,
          status: response.cluster.status,
        },
      };
    } catch (error) {
      return { success: false, deploymentId, error: error.message };
    }
  }

  /**
   * Deploy a DynamoDB table
   */
  async deployDynamoDB(options = {}) {
    const dynamoClient = new DynamoDBClient(this.config);
    const deploymentId = uuidv4();
    const tableName =
      options.tableName || `auto-table-${deploymentId.slice(0, 8)}`;

    try {
      const response = await dynamoClient.send(
        new CreateTableCommand({
          TableName: tableName,
          KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
          AttributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
          BillingMode: "PAY_PER_REQUEST",
          Tags: [
            { Key: "DeploymentId", Value: deploymentId },
            { Key: "ManagedBy", Value: "cloud-auto-deploy" },
          ],
        }),
      );

      return {
        success: true,
        deploymentId,
        resourceType: "dynamodb",
        resourceId: response.TableDescription.TableArn,
        details: {
          tableName: response.TableDescription.TableName,
          tableArn: response.TableDescription.TableArn,
          status: response.TableDescription.TableStatus,
        },
      };
    } catch (error) {
      return { success: false, deploymentId, error: error.message };
    }
  }

  /**
   * Deploy CloudFront distribution
   */
  async deployCloudFront(options = {}) {
    const cfClient = new CloudFrontClient(this.config);
    const deploymentId = uuidv4();

    try {
      const response = await cfClient.send(
        new CreateDistributionCommand({
          DistributionConfig: {
            CallerReference: deploymentId,
            Comment:
              options.comment || `Auto Deploy ${deploymentId.slice(0, 8)}`,
            Enabled: true,
            Origins: {
              Quantity: 1,
              Items: [
                {
                  Id: "S3Origin",
                  DomainName:
                    options.originDomain ||
                    `${options.s3Bucket}.s3.amazonaws.com`,
                  S3OriginConfig: { OriginAccessIdentity: "" },
                },
              ],
            },
            DefaultCacheBehavior: {
              TargetOriginId: "S3Origin",
              ViewerProtocolPolicy: "redirect-to-https",
              ForwardedValues: {
                QueryString: false,
                Cookies: { Forward: "none" },
              },
              MinTTL: 0,
            },
          },
        }),
      );

      return {
        success: true,
        deploymentId,
        resourceType: "cloudfront",
        resourceId: response.Distribution.Id,
        details: {
          distributionId: response.Distribution.Id,
          domainName: response.Distribution.DomainName,
          status: response.Distribution.Status,
        },
      };
    } catch (error) {
      return { success: false, deploymentId, error: error.message };
    }
  }

  /**
   * Terminate/Delete a resource
   */
  async destroyResource(resourceType, resourceId) {
    try {
      switch (resourceType) {
        case "ec2":
        case "vpc":
          await this.ec2Service.destroyResource(resourceType, resourceId);
          break;
        case "s3":
          await this.s3Service.destroyResource(resourceId);
          break;
        case "rds": {
          const rdsClient = new RDSClient(this.config);
          await rdsClient.send(
            new DeleteDBInstanceCommand({
              DBInstanceIdentifier: resourceId,
              SkipFinalSnapshot: true,
            }),
          );
          break;
        }
        case "lambda": {
          const lambdaClient = new LambdaClient(this.config);
          await lambdaClient.send(
            new DeleteFunctionCommand({ FunctionName: resourceId }),
          );
          break;
        }
        case "ecs": {
          const ecsClient = new ECSClient(this.config);
          await ecsClient.send(
            new DeleteClusterCommand({ cluster: resourceId }),
          );
          break;
        }
        case "dynamodb": {
          const dynamoClient = new DynamoDBClient(this.config);
          await dynamoClient.send(
            new DeleteTableCommand({ TableName: resourceId.split("/").pop() }),
          );
          break;
        }
        case "sns": {
          const snsClient = new SNSClient(this.config);
          await snsClient.send(
            new DeleteTopicCommand({ TopicArn: resourceId }),
          );
          break;
        }
        case "sqs": {
          const sqsClient = new SQSClient(this.config);
          await sqsClient.send(
            new DeleteQueueCommand({ QueueUrl: resourceId }),
          );
          break;
        }
        default:
          throw new Error(`Unknown resource type: ${resourceType}`);
      }
      return {
        success: true,
        message: `${resourceType} ${resourceId} destroyed`,
      };
    } catch (error) {
      return { success: false, error: this.handleAWSError(error) };
    }
  }

  /**
   * Get available resource types
   */
  static getResourceTypes() {
    return [
      // Compute
      {
        id: "ec2",
        name: "EC2 Instance",
        category: "Compute",
        description: "Virtual machine in AWS",
        icon: "🖥️",
        options: [
          {
            name: "osImage",
            type: "select",
            default: "ubuntu24",
            choices: ["ubuntu24", "ubuntu22", "amazon-linux-2023"],
          },
          {
            name: "instanceType",
            type: "select",
            default: "t2.micro",
            choices: [
              "t2.micro",
              "t2.small",
              "t2.medium",
              "t3.micro",
              "t3.small",
            ],
          },
          {
            name: "name",
            type: "text",
            default: "",
            placeholder: "Instance name",
          },
        ],
      },
      {
        id: "lambda",
        name: "Lambda Function",
        category: "Compute",
        description: "Serverless compute service",
        icon: "λ",
        options: [
          {
            name: "functionName",
            type: "text",
            default: "",
            placeholder: "Function name",
          },
          {
            name: "runtime",
            type: "select",
            default: "nodejs18.x",
            choices: ["nodejs18.x", "python3.11", "java17", "go1.x"],
          },
          {
            name: "memory",
            type: "select",
            default: "128",
            choices: ["128", "256", "512", "1024"],
          },
        ],
      },
      {
        id: "ecs",
        name: "ECS Fargate",
        category: "Compute",
        description: "Container orchestration cluster",
        icon: "🐳",
        options: [
          {
            name: "clusterName",
            type: "text",
            default: "",
            placeholder: "Cluster name",
          },
        ],
      },
      // Storage
      {
        id: "s3",
        name: "S3 Bucket",
        category: "Storage",
        description: "Object storage bucket",
        icon: "🪣",
        options: [
          {
            name: "bucketName",
            type: "text",
            default: "",
            placeholder: "Bucket name (optional)",
          },
        ],
      },
      {
        id: "dynamodb",
        name: "DynamoDB Table",
        category: "Storage",
        description: "NoSQL database table",
        icon: "📊",
        options: [
          {
            name: "tableName",
            type: "text",
            default: "",
            placeholder: "Table name",
          },
        ],
      },
      // Database
      {
        id: "rds",
        name: "RDS Database",
        category: "Database",
        description: "Managed relational database",
        icon: "🗄️",
        options: [
          {
            name: "engine",
            type: "select",
            default: "mysql",
            choices: ["mysql", "postgres", "mariadb"],
          },
          {
            name: "instanceClass",
            type: "select",
            default: "db.t3.micro",
            choices: ["db.t3.micro", "db.t3.small", "db.t3.medium"],
          },
          {
            name: "storage",
            type: "select",
            default: "20",
            choices: ["20", "50", "100"],
          },
        ],
      },
      // Networking
      {
        id: "vpc",
        name: "VPC",
        category: "Networking",
        description: "Virtual Private Cloud network",
        icon: "🌐",
        options: [
          {
            name: "cidrBlock",
            type: "text",
            default: "10.0.0.0/16",
            placeholder: "CIDR block",
          },
          { name: "name", type: "text", default: "", placeholder: "VPC name" },
        ],
      },
      {
        id: "cloudfront",
        name: "CloudFront CDN",
        category: "Networking",
        description: "Content delivery network",
        icon: "⚡",
        options: [
          {
            name: "s3Bucket",
            type: "text",
            default: "",
            placeholder: "Origin S3 bucket name",
          },
          {
            name: "comment",
            type: "text",
            default: "",
            placeholder: "Distribution comment",
          },
        ],
      },
    ];
  }
}

export default AWSProvider;
