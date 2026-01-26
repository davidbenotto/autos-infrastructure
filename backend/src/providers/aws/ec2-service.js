import {
  EC2Client,
  RunInstancesCommand,
  TerminateInstancesCommand,
  CreateVpcCommand,
  DeleteVpcCommand,
  CreateSubnetCommand,
  CreateKeyPairCommand,
} from "@aws-sdk/client-ec2";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { v4 as uuidv4 } from "uuid";

export class AWSEC2Service {
  constructor(config) {
    this.config = config;
    this.ec2Client = new EC2Client(config);
    this.ssmClient = new SSMClient(config);
  }

  /**
   * Helper to get latest AMI ID from SSM
   */
  async getLatestAmi(osImage) {
    // Map simplified OS names to SSM Parameter paths
    const ssmPaths = {
      ubuntu24:
        "/aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id",
      ubuntu22:
        "/aws/service/canonical/ubuntu/server/22.04/stable/current/amd64/hvm/ebs-gp3/ami-id",
      "amazon-linux-2023":
        "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64",
    };

    const paramName = ssmPaths[osImage] || ssmPaths["ubuntu24"];

    try {
      const response = await this.ssmClient.send(
        new GetParameterCommand({
          Name: paramName,
        }),
      );
      return response.Parameter.Value;
    } catch (error) {
      console.warn(
        `Failed to fetch AMI from SSM for ${osImage}, falling back to defaults if available. Error: ${error.message}`,
      );
      // Fallback map for us-east-1 as a safety net
      const fallbackMap = {
        ubuntu24: "ami-04b70fa74e45c3917",
        ubuntu22: "ami-0c02fb55956c7d316",
        "amazon-linux-2023": "ami-051f7e7f6c2f40dc1",
      };
      return fallbackMap[osImage] || fallbackMap["ubuntu24"];
    }
  }

  /**
   * Deploy an EC2 instance
   */
  async deployEC2(options = {}) {
    const deploymentId = uuidv4();
    const imageId = await this.getLatestAmi(options.osImage);

    // Generate a unique key pair for this deployment
    const keyName = `key-${deploymentId}`;
    let keyMaterial = null;

    try {
      const keyPair = await this.ec2Client.send(
        new CreateKeyPairCommand({ KeyName: keyName }),
      );
      keyMaterial = keyPair.KeyMaterial;
    } catch (error) {
      console.warn("Failed to create key pair:", error);
      // Proceed without key if failed (fallback to no-key access or existing mechanisms)
    }

    const params = {
      ImageId: imageId,
      InstanceType: options.instanceType || "t2.micro",
      MinCount: 1,
      MaxCount: 1,
      KeyName: keyName, // Associate the generated key
      TagSpecifications: [
        {
          ResourceType: "instance",
          Tags: [
            {
              Key: "Name",
              Value: options.name || `auto-deploy-${deploymentId.slice(0, 8)}`,
            },
            { Key: "DeploymentId", Value: deploymentId },
            { Key: "ManagedBy", Value: "cloud-auto-deploy" },
          ],
        },
      ],
    };

    try {
      const response = await this.ec2Client.send(
        new RunInstancesCommand(params),
      );

      const result = {
        success: true,
        deploymentId,
        resourceType: "ec2",
        resourceId: response.Instances[0].InstanceId,
        details: {
          instanceId: response.Instances[0].InstanceId,
          instanceType: response.Instances[0].InstanceType,
          imageId: imageId,
          osImage: options.osImage || "ubuntu24",
          state: response.Instances[0].State.Name,
          keyName: keyName,
        },
      };

      // Include credentials if generated
      if (keyMaterial) {
        result.credentials = {
          type: "pem",
          filename: `${options.name || "ec2"}-${deploymentId.slice(0, 4)}.pem`,
          content: keyMaterial,
        };
      }

      return result;
    } catch (error) {
      return { success: false, deploymentId, error: error.message };
    }
  }

  /**
   * Deploy a VPC
   */
  async deployVPC(options = {}) {
    const deploymentId = uuidv4();

    try {
      const vpcResponse = await this.ec2Client.send(
        new CreateVpcCommand({
          CidrBlock: options.cidrBlock || "10.0.0.0/16",
          TagSpecifications: [
            {
              ResourceType: "vpc",
              Tags: [
                {
                  Key: "Name",
                  Value: options.name || `auto-vpc-${deploymentId.slice(0, 8)}`,
                },
                { Key: "DeploymentId", Value: deploymentId },
              ],
            },
          ],
        }),
      );

      const vpcId = vpcResponse.Vpc.VpcId;
      await this.ec2Client.send(
        new CreateSubnetCommand({
          VpcId: vpcId,
          CidrBlock: options.subnetCidr || "10.0.1.0/24",
        }),
      );

      return {
        success: true,
        deploymentId,
        resourceType: "vpc",
        resourceId: vpcId,
        details: { vpcId, cidrBlock: vpcResponse.Vpc.CidrBlock },
      };
    } catch (error) {
      return { success: false, deploymentId, error: error.message };
    }
  }

  /**
   * Terminate/Delete EC2 resource
   */
  async destroyResource(resourceType, resourceId) {
    if (resourceType === "ec2") {
      await this.ec2Client.send(
        new TerminateInstancesCommand({ InstanceIds: [resourceId] }),
      );
    } else if (resourceType === "vpc") {
      await this.ec2Client.send(new DeleteVpcCommand({ VpcId: resourceId }));
    } else {
      throw new Error(`Invalid EC2 resource type: ${resourceType}`);
    }
  }
}
