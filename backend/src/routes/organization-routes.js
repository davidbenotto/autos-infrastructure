import express from "express";
import { db } from "../services/database-service.js";
import logger from "../utils/logger.js";

const router = express.Router();

/**
 * GET /api/organizations
 * List all organizations with deployment counts
 */
router.get("/", async (req, res) => {
  try {
    const organizations = await db.getAllOrganizations();
    res.json(organizations);
  } catch (error) {
    logger.error("Error fetching organizations:", error);
    res.status(500).json({ error: "Failed to fetch organizations" });
  }
});

/**
 * GET /api/organizations/:id
 * Get single organization by ID
 */
router.get("/:id", async (req, res) => {
  try {
    const org = await db.getOrganization(req.params.id);
    if (!org) {
      return res.status(404).json({ error: "Organization not found" });
    }
    res.json(org);
  } catch (error) {
    logger.error("Error fetching organization:", error);
    res.status(500).json({ error: "Failed to fetch organization" });
  }
});

/**
 * POST /api/organizations
 * Create new organization
 */
router.post("/", async (req, res) => {
  try {
    const { name, slug, description } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ error: "Name and slug are required" });
    }

    const org = await db.createOrganization({ name, slug, description });
    logger.info(`Created organization: ${name} (${slug})`);
    res.status(201).json(org);
  } catch (error) {
    logger.error("Error creating organization:", error);
    res
      .status(400)
      .json({ error: error.message || "Failed to create organization" });
  }
});

/**
 * PUT /api/organizations/:id
 * Update organization
 */
router.put("/:id", async (req, res) => {
  try {
    const { name, description, is_active } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (is_active !== undefined) updates.is_active = is_active;

    const org = await db.updateOrganization(req.params.id, updates);
    logger.info(`Updated organization: ${req.params.id}`);
    res.json(org);
  } catch (error) {
    logger.error("Error updating organization:", error);
    res
      .status(400)
      .json({ error: error.message || "Failed to update organization" });
  }
});

/**
 * DELETE /api/organizations/:id
 * Delete (deactivate) organization
 */
router.delete("/:id", async (req, res) => {
  try {
    await db.deleteOrganization(req.params.id);
    logger.info(`Deleted organization: ${req.params.id}`);
    res.json({ success: true });
  } catch (error) {
    logger.error("Error deleting organization:", error);
    res
      .status(400)
      .json({ error: error.message || "Failed to delete organization" });
  }
});

export default router;
