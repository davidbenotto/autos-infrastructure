import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { validateEnv } from "./validate-env.js";
import logger from "./logger.js";

// Mock logger
vi.mock("./logger.js", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn((...args) => console.error("MOCK LOGGER ERROR:", ...args)),
  },
}));

describe("validateEnv", () => {
  const originalEnv = process.env;
  let mockExit;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    // Mock exit to throw so execution stops
    mockExit = vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`Process.exit(${code})`);
    });
  });

  afterEach(() => {
    mockExit.mockRestore();
    process.env = originalEnv;
  });

  it("should return valid config with defaults", () => {
    // Ensure minimal required env is present if any
    delete process.env.PORT;
    delete process.env.NODE_ENV;

    // Using string 'false' for boolean transform default check
    // Zod .default() applies to input, so "false" -> transform -> false

    const config = validateEnv();

    expect(config.PORT).toBe(3001);
    expect(config.NODE_ENV).toBe("development");
    expect(logger.info).toHaveBeenCalledWith(
      "✅ Environment configuration validated",
    );
  });

  it("should validate valid environment variables", () => {
    process.env.PORT = "4000";
    process.env.NODE_ENV = "production";
    process.env.SESSION_SECRET = "a-very-long-and-secure-secret-key-12345";
    process.env.USE_PRECONFIGURED_CREDENTIALS = "false";

    const config = validateEnv();

    expect(config.PORT).toBe(4000);
    expect(config.NODE_ENV).toBe("production");
  });

  it("should exit if validation fails", () => {
    // Ensure we start clean
    process.env = { ...originalEnv };
    process.env.NODE_ENV = "invalid-env";

    // Using a regex to match the error message, dealing with potential async nature of exit
    expect(() => validateEnv()).toThrow();

    expect(logger.error).toHaveBeenCalledWith(
      "❌ Invalid environment configuration:",
    );
  });

  it("should warn about missing credentials when preconfigured mode is on", () => {
    process.env = { ...originalEnv };
    process.env.USE_PRECONFIGURED_CREDENTIALS = "true";
    process.env.AWS_ACCESS_KEY_ID = ""; // Missing

    // Should NOT throw/exit, just warn
    validateEnv();

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("AWS credentials are missing"),
    );
  });

  it("should warn about default session secret in production", () => {
    process.env.NODE_ENV = "production";
    process.env.SESSION_SECRET = "dev-secret-change-in-production";

    validateEnv();

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Using default SESSION_SECRET in production"),
    );
  });
});
