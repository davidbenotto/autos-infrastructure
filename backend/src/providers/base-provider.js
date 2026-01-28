import { v4 as uuidv4 } from "uuid";
import logger from "../utils/logger.js";

/**
 * Base Provider class with common functionality
 * All cloud providers (AWS, Azure, GCP) should extend this class
 */
export class BaseProvider {
  constructor(credentials, providerName) {
    this.credentials = credentials;
    this.providerName = providerName;
  }

  /**
   * Generate a unique deployment ID
   */
  generateDeploymentId() {
    return uuidv4();
  }

  /**
   * Generate a short ID for resource naming
   */
  generateShortId() {
    return uuidv4().slice(0, 8);
  }

  /**
   * Handle provider-specific errors and return friendly messages
   */
  handleError(error) {
    // Common error patterns
    const errorPatterns = [
      {
        pattern: /AccessDenied|AccessDeniedException|UnauthorizedOperation/i,
        message: `${this.providerName} Authorization Failed: Your credentials don't have permission for this action.`,
      },
      {
        pattern: /AuthFailure|InvalidCredentials|AuthenticationFailed/i,
        message: `${this.providerName} Authentication Failed: Check your credentials.`,
      },
      {
        pattern: /ResourceNotFound|NotFound/i,
        message: `${this.providerName} Resource Not Found: The specified resource doesn't exist.`,
      },
      {
        pattern: /LimitExceeded|QuotaExceeded/i,
        message: `${this.providerName} Limit Exceeded: You've reached a service quota.`,
      },
      {
        pattern: /InvalidParameter|ValidationError/i,
        message: `${this.providerName} Invalid Parameters: Check your deployment options.`,
      },
    ];

    for (const { pattern, message } of errorPatterns) {
      if (
        pattern.test(error.message) ||
        pattern.test(error.Code || "") ||
        pattern.test(error.name || "")
      ) {
        return message;
      }
    }

    return error.message;
  }

  /**
   * Log deployment action
   */
  logDeployment(action, resourceType, resourceId, details = {}) {
    logger.info(`[${this.providerName}] ${action} ${resourceType}`, {
      resourceId,
      ...details,
    });
  }

  /**
   * Create a standardized success response
   */
  successResponse(deploymentId, resourceType, resourceId, details = {}) {
    return {
      success: true,
      deploymentId,
      resourceType,
      resourceId,
      details,
      provider: this.providerName.toLowerCase(),
    };
  }

  /**
   * Create a standardized error response
   */
  errorResponse(deploymentId, error) {
    return {
      success: false,
      deploymentId,
      error: this.handleError(error),
      provider: this.providerName.toLowerCase(),
    };
  }

  /**
   * Create standard tags for resource tracking
   */
  createTags(deploymentId, customTags = {}) {
    return {
      DeploymentId: deploymentId,
      ManagedBy: "cloud-deploy-portal",
      CreatedAt: new Date().toISOString(),
      ...customTags,
    };
  }

  /**
   * Format tags for AWS (array format)
   */
  formatTagsAWS(deploymentId, customTags = {}) {
    const tags = this.createTags(deploymentId, customTags);
    return Object.entries(tags).map(([Key, Value]) => ({
      Key,
      Value: String(Value),
    }));
  }

  /**
   * Validate credentials - must be implemented by subclass
   */
  async validateCredentials() {
    throw new Error("validateCredentials() must be implemented by subclass");
  }

  /**
   * Get available resource types - must be implemented by subclass
   */
  static getResourceTypes() {
    throw new Error("getResourceTypes() must be implemented by subclass");
  }
}

export default BaseProvider;
