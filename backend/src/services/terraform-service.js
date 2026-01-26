import { exec } from "child_process";
import fs from "fs/promises";
import path from "path";
import util from "util";

const execPromise = util.promisify(exec);

/**
 * Service to handle Terraform execution
 * Note: This is scaffolding for future migration.
 */
export class TerraformService {
  constructor(workingDir) {
    this.workingDir = workingDir;
    this.env = { ...process.env }; // Inherit environment variables
  }

  /**
   * Check if Terraform is installed
   */
  async checkAvailability() {
    try {
      const { stdout } = await execPromise("terraform --version");
      console.log(`Terraform found: ${stdout.split("\n")[0]}`);
      return true;
    } catch (error) {
      console.warn("Terraform not found in PATH");
      return false;
    }
  }

  /**
   * Initialize Terraform directory
   */
  async init() {
    try {
      await execPromise("terraform init", { cwd: this.workingDir });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a plan
   */
  async plan(vars = {}) {
    // Construct -var arguments
    const varArgs = Object.entries(vars)
      .map(([k, v]) => `-var="${k}=${v}"`)
      .join(" ");

    try {
      const { stdout } = await execPromise(
        `terraform plan ${varArgs} -out=tfplan`,
        {
          cwd: this.workingDir,
        },
      );
      return { success: true, output: stdout };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Apply configuration
   */
  async apply() {
    try {
      const { stdout } = await execPromise(
        "terraform apply -auto-approve tfplan",
        {
          cwd: this.workingDir,
        },
      );
      return { success: true, output: stdout };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Destroy infrastructure
   */
  async destroy(vars = {}) {
    const varArgs = Object.entries(vars)
      .map(([k, v]) => `-var="${k}=${v}"`)
      .join(" ");

    try {
      const { stdout } = await execPromise(
        `terraform destroy ${varArgs} -auto-approve`,
        {
          cwd: this.workingDir,
        },
      );
      return { success: true, output: stdout };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
