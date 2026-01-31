import {
  EC2Client,
  RunInstancesCommand,
  TerminateInstancesCommand,
  CreateVpcCommand,
  DeleteVpcCommand,
  DescribeVpcsCommand,
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
import {
  Route53Client,
  CreateHostedZoneCommand,
  DeleteHostedZoneCommand,
} from "@aws-sdk/client-route-53";
import {
  ElastiCacheClient,
  CreateCacheClusterCommand,
  DeleteCacheClusterCommand,
} from "@aws-sdk/client-elasticache";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import {
  IAMClient,
  CreateServiceLinkedRoleCommand,
  GetRoleCommand,
} from "@aws-sdk/client-iam";
import { AWSEC2Service } from "./aws/ec2-service.js";
import { AWSS3Service } from "./aws/s3-service.js";
import BaseProvider from "./base-provider.js";

/**
 * AWS Cloud Provider - Handles all AWS resource deployments
 */
export class AWSProvider extends BaseProvider {
  constructor(credentials) {
    super(credentials, "AWS");

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
    const deploymentId = this.generateDeploymentId();
    const dbIdentifier =
      options.dbIdentifier || `auto-db-${this.generateShortId()}`;

    try {
      const response = await rdsClient.send(
        new CreateDBInstanceCommand({
          DBInstanceIdentifier: dbIdentifier,
          DBInstanceClass: options.instanceClass || "db.t3.micro",
          Engine: options.engine || "mysql",
          EngineVersion: options.engineVersion || "8.0",
          MasterUsername: options.masterUsername || "admin",
          MasterUserPassword:
            options.masterPassword || `AutoDeploy${this.generateShortId()}!`,
          AllocatedStorage: parseInt(options.storage || 20),
          MultiAZ: options.multiAZ === "true",
          Tags: this.formatTagsAWS(deploymentId),
        }),
      );

      return this.successResponse(
        deploymentId,
        "rds",
        response.DBInstance.DBInstanceIdentifier,
        {
          dbIdentifier: response.DBInstance.DBInstanceIdentifier,
          engine: response.DBInstance.Engine,
          instanceClass: response.DBInstance.DBInstanceClass,
        },
      );
    } catch (error) {
      return this.errorResponse(deploymentId, error);
    }
  }

  /**
   * Deploy a Lambda function
   */
  async deployLambda(options = {}) {
    const lambdaClient = new LambdaClient(this.config);
    const deploymentId = this.generateDeploymentId();
    const functionName =
      options.functionName || `auto-lambda-${this.generateShortId()}`;

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
          Tags: this.createTags(deploymentId),
        }),
      );

      return this.successResponse(
        deploymentId,
        "lambda",
        response.FunctionArn,
        {
          functionName: response.FunctionName,
          runtime: response.Runtime,
          arn: response.FunctionArn,
        },
      );
    } catch (error) {
      return this.errorResponse(deploymentId, error);
    }
  }

  /**
   * Deploy an ECS Cluster
   */
  async deployECS(options = {}) {
    const ecsClient = new ECSClient(this.config);
    const deploymentId = this.generateDeploymentId();
    const clusterName =
      options.clusterName || `auto-ecs-${this.generateShortId()}`;

    try {
      // Ensure Service Linked Role exists before creating cluster
      await this.ensureECSServiceLinkedRole();

      const response = await ecsClient.send(
        new CreateClusterCommand({
          clusterName,
          capacityProviders: ["FARGATE", "FARGATE_SPOT"],
          tags: this.formatTagsAWS(deploymentId),
        }),
      );

      return this.successResponse(
        deploymentId,
        "ecs",
        response.cluster.clusterArn,
        {
          clusterName: response.cluster.clusterName,
          clusterArn: response.cluster.clusterArn,
          status: response.cluster.status,
        },
      );
    } catch (error) {
      return this.errorResponse(deploymentId, error);
    }
  }

  /**
   * Deploy a DynamoDB table
   */
  async deployDynamoDB(options = {}) {
    const dynamoClient = new DynamoDBClient(this.config);
    const deploymentId = this.generateDeploymentId();
    const tableName =
      options.tableName || `auto-table-${this.generateShortId()}`;

    try {
      const response = await dynamoClient.send(
        new CreateTableCommand({
          TableName: tableName,
          KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
          AttributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
          BillingMode: options.billingMode || "PAY_PER_REQUEST",
          ...(options.billingMode === "PROVISIONED" && {
            ProvisionedThroughput: {
              ReadCapacityUnits: 5,
              WriteCapacityUnits: 5,
            },
          }),
          Tags: this.formatTagsAWS(deploymentId),
        }),
      );

      return this.successResponse(
        deploymentId,
        "dynamodb",
        response.TableDescription.TableArn,
        {
          tableName: response.TableDescription.TableName,
          tableArn: response.TableDescription.TableArn,
          status: response.TableDescription.TableStatus,
        },
      );
    } catch (error) {
      return this.errorResponse(deploymentId, error);
    }
  }

  /**
   * Deploy CloudFront distribution
   */
  async deployCloudFront(options = {}) {
    const cfClient = new CloudFrontClient(this.config);
    const deploymentId = this.generateDeploymentId();

    try {
      const response = await cfClient.send(
        new CreateDistributionCommand({
          DistributionConfig: {
            CallerReference: deploymentId,
            Comment: options.comment || `Auto Deploy ${this.generateShortId()}`,
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

      return this.successResponse(
        deploymentId,
        "cloudfront",
        response.Distribution.Id,
        {
          distributionId: response.Distribution.Id,
          domainName: response.Distribution.DomainName,
          status: response.Distribution.Status,
        },
      );
    } catch (error) {
      return this.errorResponse(deploymentId, error);
    }
  }

  /**
   * Deploy Route53 Hosted Zone
   */
  async deployRoute53(options = {}) {
    const route53Client = new Route53Client(this.config);
    const deploymentId = this.generateDeploymentId();
    const domainName =
      options.domainName || `example-${this.generateShortId()}.com`;

    try {
      const response = await route53Client.send(
        new CreateHostedZoneCommand({
          Name: domainName,
          CallerReference: deploymentId,
          HostedZoneConfig: {
            Comment: "Managed by Cloud Auto Deploy",
            PrivateZone: false,
          },
        }),
      );

      return this.successResponse(
        deploymentId,
        "route53",
        response.HostedZone.Id,
        {
          hostedZoneId: response.HostedZone.Id,
          domainName: response.HostedZone.Name,
          nameServers: response.DelegationSet.NameServers,
        },
      );
    } catch (error) {
      return this.errorResponse(deploymentId, error);
    }
  }

  /**
   * Deploy ElastiCache Redis Cluster
   */
  async deployElastiCache(options = {}) {
    const elastiCacheClient = new ElastiCacheClient(this.config);
    const deploymentId = this.generateDeploymentId();
    const clusterId =
      options.clusterId || `auto-redis-${this.generateShortId()}`;

    try {
      const response = await elastiCacheClient.send(
        new CreateCacheClusterCommand({
          CacheClusterId: clusterId,
          Engine: "redis",
          CacheNodeType: options.nodeType || "cache.t2.micro",
          NumCacheNodes: 1,
          Tags: this.formatTagsAWS(deploymentId),
        }),
      );

      return this.successResponse(
        deploymentId,
        "elasticache",
        response.CacheCluster.CacheClusterId,
        {
          clusterId: response.CacheCluster.CacheClusterId,
          engine: response.CacheCluster.Engine,
          status: response.CacheCluster.CacheClusterStatus,
          endpoint: response.CacheCluster.ConfigurationEndpoint?.Address,
        },
      );
    } catch (error) {
      return this.errorResponse(deploymentId, error);
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
        cost: { estimate: "~$8-35/month", note: "Varies by instance type" },
        options: [
          {
            name: "region",
            type: "select",
            default: "us-east-1",
            choices: [
              "us-east-1",
              "us-east-2",
              "us-west-1",
              "us-west-2",
              "eu-west-1",
              "eu-central-1",
              "ap-southeast-1",
            ],
          },
          {
            name: "osImage",
            type: "select",
            default: "ubuntu24",
            choices: [
              "ubuntu24",
              "ubuntu22",
              "amazon-linux-2023",
              "debian12",
              "rhel9",
            ],
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
            costMap: {
              "t2.micro": "~$8/month",
              "t2.small": "~$17/month",
              "t2.medium": "~$34/month",
              "t3.micro": "~$8/month",
              "t3.small": "~$15/month",
            },
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
        cost: { estimate: "Pay per use", note: "~$0.20 per 1M requests" },
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
            choices: ["128", "256", "512", "1024", "2048", "3008"],
            costMap: {
              128: "~$0.0000021/sec",
              1024: "~$0.0000167/sec",
              2048: "~$0.0000333/sec",
            },
          },
          {
            name: "timeout",
            type: "number",
            default: "3",
            min: "1",
            max: "900",
            placeholder: "Timeout (seconds)",
          },
        ],
      },
      {
        id: "ecs",
        name: "ECS Fargate",
        category: "Compute",
        description: "Container orchestration cluster",
        icon: "🐳",
        cost: { estimate: "~$25-50/month", note: "Depends on vCPU/memory" },
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
        cost: { estimate: "Pay per use", note: "~$0.023/GB stored" },
        options: [
          {
            name: "bucketName",
            type: "text",
            default: "",
            placeholder: "Bucket name (optional)",
          },
          {
            name: "versioning",
            type: "select",
            default: "Disabled",
            choices: ["Enabled", "Disabled"],
          },
          {
            name: "publicAccess",
            type: "select",
            default: "Private",
            choices: ["Private", "Public Read"],
          },
        ],
      },
      {
        id: "dynamodb",
        name: "DynamoDB Table",
        category: "Storage",
        description: "NoSQL database table",
        icon: "📊",
        cost: { estimate: "Pay per use", note: "On-demand pricing" },
        options: [
          {
            name: "tableName",
            type: "text",
            default: "",
            placeholder: "Table name",
          },
          {
            name: "billingMode",
            type: "select",
            default: "PAY_PER_REQUEST",
            choices: ["PAY_PER_REQUEST", "PROVISIONED"],
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
        cost: { estimate: "~$12-50/month", note: "Varies by instance class" },
        options: [
          {
            name: "engine",
            type: "select",
            default: "mysql",
            choices: ["mysql", "postgres", "mariadb"],
          },
          {
            name: "engineVersion",
            type: "select",
            default: "8.0",
            choices: ["8.0", "5.7", "14.6", "15.2"], // Simplified list
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
          {
            name: "multiAZ",
            type: "select",
            default: "false",
            choices: ["true", "false"],
            costMap: {
              true: "x2 price",
              false: "Standard",
            },
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
      {
        id: "route53",
        name: "Route 53",
        category: "Networking",
        description: "DNS Hosted Zone",
        icon: "🧭",
        options: [
          {
            name: "domainName",
            type: "text",
            default: "",
            placeholder: "example.com",
          },
        ],
      },
      {
        id: "elasticache",
        name: "ElastiCache Redis",
        category: "Database",
        description: "Managed Redis cluster",
        icon: "🧠",
        options: [
          {
            name: "clusterId",
            type: "text",
            default: "",
            placeholder: "Cluster ID",
          },
          {
            name: "nodeType",
            type: "select",
            default: "cache.t2.micro",
            choices: ["cache.t2.micro", "cache.t3.micro"],
          },
        ],
      },
    ];
  }
}

export default AWSProvider;
