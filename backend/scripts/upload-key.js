import {
  EC2Client,
  ImportKeyPairCommand,
  DescribeKeyPairsCommand,
} from "@aws-sdk/client-ec2";
import fs from "fs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// backend/scripts/ -> backend/ -> root/
dotenv.config({ path: path.join(__dirname, "../../.env") });

async function uploadKeyToAWS() {
  const publicKeyPath = process.env.SSH_PUBLIC_KEY_PATH;
  const keyPairName = process.env.AWS_KEY_PAIR_NAME || "cloud-portal-key";

  console.log(`🔑 Key Path: ${publicKeyPath}`);
  console.log(`🏷️  Key Pair Name: ${keyPairName}`);

  if (!publicKeyPath) {
    console.error("❌ SSH_PUBLIC_KEY_PATH not set in .env");
    process.exit(1);
  }

  try {
    const publicKey = fs.readFileSync(publicKeyPath, "utf-8");

    // Check credentials
    // If not found in env, the SDK will look in ~/.aws/credentials
    const ec2Client = new EC2Client({
      region: process.env.AWS_REGION || "us-east-1",
    });

    // Check if key exists
    try {
      await ec2Client.send(
        new DescribeKeyPairsCommand({ KeyNames: [keyPairName] }),
      );
      console.log(`✅ Key pair '${keyPairName}' already exists in AWS.`);
    } catch (err) {
      if (err.name === "InvalidKeyPair.NotFound") {
        console.log(`Creating key pair '${keyPairName}'...`);
        await ec2Client.send(
          new ImportKeyPairCommand({
            KeyName: keyPairName,
            PublicKeyMaterial: Buffer.from(publicKey),
          }),
        );
        console.log(
          `✅ Successfully imported key pair '${keyPairName}' to AWS.`,
        );
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.error("❌ Failed to process SSH keys:", error.message);
    if (error.name === "CredentialsProviderError") {
      console.log("⚠️  Could not find AWS credentials.");
      console.log(
        "   The static key will still be used for AWS if you have configured credentials in the Web UI.",
      );
      console.log(
        "   However, to use this script to UPLOAD the key, you need ~/.aws/credentials or env vars.",
      );
    }
  }
}

uploadKeyToAWS();
