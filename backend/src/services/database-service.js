import pg from "pg";
import logger from "../utils/logger.js";

const { Pool } = pg;

// Default organization ID
const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000000";

// Create connection pool
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://cloudportal:cloudportal123@localhost:5432/cloudportal",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on("connect", () => {
  logger.info("📦 Connected to PostgreSQL database");
});

pool.on("error", (err) => {
  logger.error("PostgreSQL pool error:", err);
});

/**
 * Initialize database schema
 */
export const initSchema = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      -- Organizations table
      CREATE TABLE IF NOT EXISTS organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Deployments table
      CREATE TABLE IF NOT EXISTS deployments (
        id SERIAL PRIMARY KEY,
        deployment_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
        organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
        provider VARCHAR(50) NOT NULL,
        resource_type VARCHAR(100) NOT NULL,
        resource_id VARCHAR(500),
        resource_name VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        options JSONB DEFAULT '{}',
        details JSONB DEFAULT '{}',
        destroyed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Deployment logs table
      CREATE TABLE IF NOT EXISTS deployment_logs (
        id SERIAL PRIMARY KEY,
        deployment_id UUID REFERENCES deployments(deployment_id) ON DELETE CASCADE,
        level VARCHAR(20) NOT NULL DEFAULT 'info',
        message TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Terraform states table
      CREATE TABLE IF NOT EXISTS terraform_states (
        id SERIAL PRIMARY KEY,
        deployment_id UUID UNIQUE REFERENCES deployments(deployment_id) ON DELETE CASCADE,
        state_data JSONB NOT NULL,
        version INTEGER DEFAULT 1,
        version INTEGER DEFAULT 1,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Ensure columns exist if table was already created
      ALTER TABLE deployments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_deployments_org_id ON deployments(organization_id);
      CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);
      CREATE INDEX IF NOT EXISTS idx_deployments_created_at ON deployments(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_deployment_logs_deployment_id ON deployment_logs(deployment_id);
      CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

      -- Insert default organization
      INSERT INTO organizations (id, name, slug, description)
      VALUES ('00000000-0000-0000-0000-000000000000', 'Default', 'default', 'Default organization')
      ON CONFLICT (id) DO NOTHING;

      -- Use ALTER TABLE to ensure columns exist if table was already created
      ALTER TABLE deployments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
    `);
    logger.info("✅ Database schema initialized");
  } finally {
    client.release();
  }
};

/**
 * Database service for deployments (PostgreSQL)
 */
export const db = {
  // ==================== DEPLOYMENT OPERATIONS ====================

  /**
   * Create a new deployment
   */
  async createDeployment(deployment) {
    const result = await pool.query(
      `INSERT INTO deployments 
        (deployment_id, organization_id, provider, resource_type, resource_id, resource_name, status, options, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        deployment.deploymentId,
        deployment.organization_id || DEFAULT_ORG_ID,
        deployment.provider,
        deployment.resourceType,
        deployment.resourceId || null,
        deployment.resourceName || null,
        deployment.status || "pending",
        JSON.stringify(deployment.options || {}),
        JSON.stringify(deployment.details || {}),
      ],
    );
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
   * Update deployment
   */
  async updateDeployment(deploymentId, updates) {
    const setParts = [];
    const values = [];
    let i = 1;

    if (updates.status !== undefined) {
      setParts.push(`status = $${i++}`);
      values.push(updates.status);
      if (updates.status === "destroyed") {
        setParts.push(`destroyed_at = CURRENT_TIMESTAMP`);
      }
    }
    if (updates.details !== undefined) {
      setParts.push(`details = $${i++}`);
      values.push(JSON.stringify(updates.details));
    }

    values.push(deploymentId);

    const result = await pool.query(
      `UPDATE deployments SET ${setParts.join(", ")}, updated_at = CURRENT_TIMESTAMP
       WHERE deployment_id = $${i}
       RETURNING *`,
      values,
    );
    return result.rows[0];
  },

  /**
   * Get all deployments (optionally filtered by provider)
   */
  async getAllDeployments(provider = null) {
    let query = "SELECT * FROM deployments";
    const params = [];

    if (provider) {
      query += " WHERE provider = $1";
      params.push(provider);
    }
    query += " ORDER BY created_at DESC";

    const result = await pool.query(query, params);
    return result.rows;
  },

  /**
   * Get deployments filtered by organization
   */
  async getDeploymentsByOrg(organizationId, provider = null) {
    const conditions = [];
    const params = [];
    let i = 1;

    if (organizationId) {
      conditions.push(`organization_id = $${i++}`);
      params.push(organizationId);
    }
    if (provider) {
      conditions.push(`provider = $${i++}`);
      params.push(provider);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await pool.query(
      `SELECT * FROM deployments ${whereClause} ORDER BY created_at DESC`,
      params,
    );
    return result.rows;
  },

  // ==================== LOG OPERATIONS ====================

  /**
   * Add deployment log
   */
  async addLog(deploymentId, level, message, metadata = {}) {
    await pool.query(
      `INSERT INTO deployment_logs (deployment_id, level, message, metadata)
       VALUES ($1, $2, $3, $4)`,
      [deploymentId, level, message, JSON.stringify(metadata)],
    );
  },

  /**
   * Get deployment logs
   */
  async getLogs(deploymentId) {
    const result = await pool.query(
      `SELECT * FROM deployment_logs WHERE deployment_id = $1 ORDER BY created_at DESC`,
      [deploymentId],
    );
    return result.rows;
  },

  // ==================== TERRAFORM STATE OPERATIONS ====================

  /**
   * Save Terraform state
   */
  async saveTerraformState(deploymentId, stateData) {
    const result = await pool.query(
      `INSERT INTO terraform_states (deployment_id, state_data, version)
       VALUES ($1, $2, 1)
       ON CONFLICT (deployment_id) 
       DO UPDATE SET state_data = $2, version = terraform_states.version + 1, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [deploymentId, JSON.stringify(stateData)],
    );
    return result.rows[0];
  },

  /**
   * Get Terraform state
   */
  async getTerraformState(deploymentId) {
    const result = await pool.query(
      "SELECT * FROM terraform_states WHERE deployment_id = $1",
      [deploymentId],
    );
    return result.rows[0];
  },

  // ==================== ORGANIZATION OPERATIONS ====================

  /**
   * Get all organizations
   */
  async getAllOrganizations() {
    const result = await pool.query(`
      SELECT o.*, 
        COUNT(CASE WHEN d.status != 'destroyed' THEN 1 END)::integer as deployment_count
      FROM organizations o
      LEFT JOIN deployments d ON d.organization_id = o.id
      WHERE o.is_active = true
      GROUP BY o.id
      ORDER BY o.name ASC
    `);
    return result.rows;
  },

  /**
   * Get organization by ID
   */
  async getOrganization(id) {
    const result = await pool.query(
      "SELECT * FROM organizations WHERE id = $1",
      [id],
    );
    return result.rows[0];
  },

  /**
   * Create organization
   */
  async createOrganization({ name, slug, description }) {
    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      throw new Error(
        "Slug must contain only lowercase letters, numbers, and hyphens",
      );
    }

    const result = await pool.query(
      `INSERT INTO organizations (name, slug, description)
       VALUES ($1, $2, $3)
       RETURNING *, 0 as deployment_count`,
      [name, slug.toLowerCase(), description || null],
    );
    return result.rows[0];
  },

  /**
   * Update organization
   */
  async updateOrganization(id, updates) {
    if (id === DEFAULT_ORG_ID && updates.is_active === false) {
      throw new Error("Cannot deactivate the default organization");
    }

    const setParts = [];
    const values = [];
    let i = 1;

    if (updates.name !== undefined) {
      setParts.push(`name = $${i++}`);
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      setParts.push(`description = $${i++}`);
      values.push(updates.description);
    }
    if (updates.is_active !== undefined) {
      setParts.push(`is_active = $${i++}`);
      values.push(updates.is_active);
    }

    if (setParts.length === 0) {
      return this.getOrganization(id);
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE organizations SET ${setParts.join(", ")} WHERE id = $${i} RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      throw new Error("Organization not found");
    }
    return result.rows[0];
  },

  /**
   * Delete (deactivate) organization
   */
  async deleteOrganization(id) {
    if (id === DEFAULT_ORG_ID) {
      throw new Error("Cannot delete the default organization");
    }

    // Check for active deployments
    const activeCheck = await pool.query(
      `SELECT COUNT(*) as count FROM deployments 
       WHERE organization_id = $1 AND status != 'destroyed'`,
      [id],
    );

    if (parseInt(activeCheck.rows[0].count) > 0) {
      throw new Error(
        "Cannot delete organization with active deployments. Destroy deployments first.",
      );
    }

    await pool.query(
      "UPDATE organizations SET is_active = false WHERE id = $1",
      [id],
    );
    return { success: true };
  },

  // ==================== HEALTH CHECK ====================

  /**
   * Health check
   */
  async healthCheck() {
    try {
      await pool.query("SELECT 1");
      return { connected: true, type: "postgresql" };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  },
};

// Initialize schema on import
initSchema().catch((err) => {
  logger.error("Failed to initialize database schema:", err);
});

export default db;
