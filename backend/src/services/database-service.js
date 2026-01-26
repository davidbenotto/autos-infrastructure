import pg from "pg";
const { Pool } = pg;

// PostgreSQL connection pool
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://cloudportal:cloudportal123@localhost:5432/cloudportal",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on("connect", () => {
  console.log("📦 Connected to PostgreSQL");
});

pool.on("error", (err) => {
  console.error("PostgreSQL error:", err);
});

/**
 * Database service for deployments
 */
export const db = {
  /**
   * Create a new deployment
   */
  async createDeployment(deployment) {
    const query = `
      INSERT INTO deployments (deployment_id, provider, resource_type, resource_id, resource_name, status, options, details)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [
      deployment.deploymentId,
      deployment.provider,
      deployment.resourceType,
      deployment.resourceId || null,
      deployment.resourceName || null,
      deployment.status || "pending",
      JSON.stringify(deployment.options || {}),
      JSON.stringify(deployment.details || {}),
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  },

  /**
   * Update deployment status
   */
  async updateDeployment(deploymentId, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.status) {
      fields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.resourceId) {
      fields.push(`resource_id = $${paramIndex++}`);
      values.push(updates.resourceId);
    }
    if (updates.details) {
      fields.push(`details = $${paramIndex++}`);
      values.push(JSON.stringify(updates.details));
    }
    if (updates.errorMessage) {
      fields.push(`error_message = $${paramIndex++}`);
      values.push(updates.errorMessage);
    }
    if (updates.status === "destroyed") {
      fields.push(`destroyed_at = CURRENT_TIMESTAMP`);
    }

    values.push(deploymentId);
    const query = `
      UPDATE deployments 
      SET ${fields.join(", ")}
      WHERE deployment_id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  },

  /**
   * Get deployment by ID
   */
  async getDeployment(deploymentId) {
    const result = await pool.query(
      "SELECT * FROM deployments WHERE deployment_id = $1",
      [deploymentId],
    );
    return result.rows[0];
  },

  /**
   * Get all deployments
   */
  async getAllDeployments(provider = null) {
    let query = "SELECT * FROM deployments ORDER BY created_at DESC";
    let values = [];

    if (provider) {
      query =
        "SELECT * FROM deployments WHERE provider = $1 ORDER BY created_at DESC";
      values = [provider];
    }

    const result = await pool.query(query, values);
    return result.rows;
  },

  /**
   * Add deployment log
   */
  async addLog(deploymentDbId, level, message, metadata = {}) {
    const query = `
      INSERT INTO deployment_logs (deployment_id, level, message, metadata)
      VALUES ($1, $2, $3, $4)
    `;
    await pool.query(query, [
      deploymentDbId,
      level,
      message,
      JSON.stringify(metadata),
    ]);
  },

  /**
   * Get deployment logs
   */
  async getLogs(deploymentDbId) {
    const result = await pool.query(
      "SELECT * FROM deployment_logs WHERE deployment_id = $1 ORDER BY created_at DESC",
      [deploymentDbId],
    );
    return result.rows;
  },

  /**
   * Save Terraform state
   */
  async saveTerraformState(deploymentDbId, stateData) {
    const query = `
      INSERT INTO terraform_states (deployment_id, state_data)
      VALUES ($1, $2)
      ON CONFLICT (deployment_id) 
      DO UPDATE SET state_data = $2, version = terraform_states.version + 1, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const result = await pool.query(query, [
      deploymentDbId,
      JSON.stringify(stateData),
    ]);
    return result.rows[0];
  },

  /**
   * Get Terraform state
   */
  async getTerraformState(deploymentDbId) {
    const result = await pool.query(
      "SELECT * FROM terraform_states WHERE deployment_id = $1",
      [deploymentDbId],
    );
    return result.rows[0];
  },

  /**
   * Health check
   */
  async healthCheck() {
    try {
      await pool.query("SELECT 1");
      return { connected: true };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  },
};

export default db;
