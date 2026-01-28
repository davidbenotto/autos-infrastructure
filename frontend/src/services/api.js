const API_BASE = "/api";

// Organization context getter - will be set by OrganizationContext
let getOrgHeaders = () => ({});

export function setOrgHeadersGetter(getter) {
  getOrgHeaders = getter;
}

/**
 * Helper to handle fetch responses safely
 */
async function handleResponse(response) {
  const text = await response.text();
  try {
    // Try to parse JSON
    const data = text ? JSON.parse(text) : {};

    // Check for HTTP error status
    if (!response.ok) {
      const errorMsg =
        data.error ||
        data.message ||
        `HTTP Error ${response.status}: ${response.statusText}`;
      return { success: false, error: errorMsg };
    }

    return data;
  } catch (error) {
    console.error("API Error: Failed to parse response:", text);
    return {
      success: false,
      error: `Server Error (${response.status}): Unexpected response format`,
    };
  }
}

/**
 * API Service for cloud deployment portal
 */
export const api = {
  /**
   * Configure AWS credentials
   */
  async configureAWS(credentials) {
    try {
      const response = await fetch(`${API_BASE}/credentials/aws`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(credentials),
      });
      return handleResponse(response);
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Configure Azure credentials
   */
  async configureAzure(credentials) {
    try {
      const response = await fetch(`${API_BASE}/credentials/azure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(credentials),
      });
      return handleResponse(response);
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Configure GCP credentials
   */
  async configureGCP(credentials) {
    try {
      const response = await fetch(`${API_BASE}/credentials/gcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(credentials),
      });
      return handleResponse(response);
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Get credential status
   */
  async getCredentialStatus() {
    try {
      const response = await fetch(`${API_BASE}/credentials/status`, {
        credentials: "include",
      });
      return handleResponse(response);
    } catch (error) {
      console.error("Failed to check status", error);
      return { aws: {}, azure: {}, gcp: {} };
    }
  },

  /**
   * Clear credentials for a provider
   */
  async clearCredentials(provider) {
    try {
      const response = await fetch(`${API_BASE}/credentials/${provider}`, {
        method: "DELETE",
        credentials: "include",
      });
      return handleResponse(response);
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Get available resource types
   */
  async getResourceTypes() {
    try {
      const response = await fetch(`${API_BASE}/deployments/resources`, {
        credentials: "include",
      });
      return handleResponse(response);
    } catch (error) {
      return { aws: [], azure: [], gcp: [] };
    }
  },

  /**
   * Deploy a resource
   */
  async deploy(provider, resourceType, options = {}) {
    try {
      const orgHeaders = getOrgHeaders();
      const response = await fetch(`${API_BASE}/deployments/deploy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...orgHeaders,
        },
        credentials: "include",
        body: JSON.stringify({ provider, resourceType, options }),
      });

      const result = await handleResponse(response);

      // Ensure specific structure for deployment results
      if (result && !result.success && !result.error) {
        // If it's a raw resource object but success isn't explicitly false, it might be a partial success?
        // No, backend always returns structured object.
        // Just pass it through.
      }
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * List all deployments
   */
  async getDeployments() {
    try {
      const orgHeaders = getOrgHeaders();
      const response = await fetch(`${API_BASE}/deployments`, {
        credentials: "include",
        headers: orgHeaders,
      });
      return handleResponse(response);
    } catch (error) {
      return { count: 0, deployments: [] };
    }
  },

  /**
   * Destroy a deployment
   */
  async destroyDeployment(deploymentId) {
    try {
      const response = await fetch(`${API_BASE}/deployments/${deploymentId}`, {
        method: "DELETE",
        credentials: "include",
      });
      return handleResponse(response);
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const response = await fetch(`${API_BASE}/health`);
      return handleResponse(response);
    } catch (error) {
      return { status: "offline" };
    }
  },
};

export default api;
