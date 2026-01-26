const API_BASE = "/api";

/**
 * API Service for cloud deployment portal
 */
export const api = {
  /**
   * Configure AWS credentials
   */
  async configureAWS(credentials) {
    const response = await fetch(`${API_BASE}/credentials/aws`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(credentials),
    });
    return response.json();
  },

  /**
   * Configure Azure credentials
   */
  async configureAzure(credentials) {
    const response = await fetch(`${API_BASE}/credentials/azure`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(credentials),
    });
    return response.json();
  },

  /**
   * Get credential status
   */
  async getCredentialStatus() {
    const response = await fetch(`${API_BASE}/credentials/status`, {
      credentials: "include",
    });
    return response.json();
  },

  /**
   * Clear credentials for a provider
   */
  async clearCredentials(provider) {
    const response = await fetch(`${API_BASE}/credentials/${provider}`, {
      method: "DELETE",
      credentials: "include",
    });
    return response.json();
  },

  /**
   * Get available resource types
   */
  async getResourceTypes() {
    const response = await fetch(`${API_BASE}/deployments/resources`, {
      credentials: "include",
    });
    return response.json();
  },

  /**
   * Deploy a resource
   */
  async deploy(provider, resourceType, options = {}) {
    const response = await fetch(`${API_BASE}/deployments/deploy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ provider, resourceType, options }),
    });

    const data = await response.json();

    // If HTTP error, ensure we return it properly
    if (!response.ok) {
      return {
        success: false,
        error:
          data.error || `HTTP Error: ${response.status} ${response.statusText}`,
      };
    }

    // If the response doesn't have success property, check if it has an error
    if (data.success === undefined && data.error) {
      return { success: false, error: data.error };
    }

    return data;
  },

  /**
   * List all deployments
   */
  async getDeployments() {
    const response = await fetch(`${API_BASE}/deployments`, {
      credentials: "include",
    });
    return response.json();
  },

  /**
   * Destroy a deployment
   */
  async destroyDeployment(deploymentId) {
    const response = await fetch(`${API_BASE}/deployments/${deploymentId}`, {
      method: "DELETE",
      credentials: "include",
    });
    return response.json();
  },

  /**
   * Health check
   */
  async healthCheck() {
    const response = await fetch(`${API_BASE}/health`);
    return response.json();
  },
};

export default api;
