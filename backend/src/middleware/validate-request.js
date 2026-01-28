import { z } from "zod";

/**
 * Middleware factory to validate request body against a Zod schema.
 * @param {z.ZodSchema} schema - The Zod schema to validate against
 */
export const validateRequest = (schema) => (req, res, next) => {
  try {
    const result = schema.parse(req.body);
    req.body = result; // Replace body with parsed (and strictly typed/coerced) data
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation Error",
        details: error.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      });
    }
    next(error);
  }
};
