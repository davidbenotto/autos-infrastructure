import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "./database-service.js";
import pg from "pg";

// Mock pg module
vi.mock("pg", () => {
  const mPool = {
    connect: vi.fn(),
    query: vi.fn(),
    on: vi.fn(),
  };
  return {
    default: {
      Pool: vi.fn(function () {
        return mPool;
      }),
    },
  };
});

// Mock Redis to prevent connection attempts
vi.mock("ioredis", () => ({
  default: vi.fn(),
}));

// Mock logger
vi.mock("../utils/logger.js", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Database Service", () => {
  let pool;

  beforeEach(() => {
    vi.clearAllMocks();
    pool = new pg.Pool();
  });

  it("should initialize successfully", () => {
    expect(db).toBeDefined();
    expect(db.createDeployment).toBeDefined();
  });

  describe("deployments", () => {
    it("should create a deployment", async () => {
      const mockDeployment = {
        deploymentId: "dep-123",
        organization_id: "org1",
        provider: "aws",
        resourceType: "ec2",
        options: { name: "test-vm" },
      };

      const mockResult = {
        rows: [{ id: 1, ...mockDeployment }],
      };

      pool.query.mockResolvedValueOnce(mockResult);

      const result = await db.createDeployment(mockDeployment);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO deployments"),
        expect.arrayContaining(["org1", "aws", "ec2"]),
      );
      expect(result).toEqual(mockResult.rows[0]);
    });

    it("should get deployments by org", async () => {
      const mockRows = [
        { id: "1", name: "dep1" },
        { id: "2", name: "dep2" },
      ];
      pool.query.mockResolvedValueOnce({ rows: mockRows });

      const result = await db.getDeploymentsByOrg("org1");

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE organization_id = $1"),
        ["org1"],
      );
      expect(result).toEqual(mockRows);
    });
  });

  describe("organizations", () => {
    it("should create an organization", async () => {
      const mockOrg = { name: "My Org", slug: "my-org" };
      const mockResult = { rows: [{ id: "org-1", ...mockOrg }] };

      pool.query.mockResolvedValueOnce(mockResult);

      const result = await db.createOrganization(mockOrg);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO organizations"),
        ["My Org", "my-org", null],
      );
      expect(result).toEqual(mockResult.rows[0]);
    });
  });
});
