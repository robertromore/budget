import { ValidationError } from "$lib/server/shared/types";
import type { Context } from "$lib/trpc/context";
import { initTRPC } from "@trpc/server";
import { z } from "zod";

// Initialize tRPC for middleware creation
const t = initTRPC.context<Context>().create();

/**
 * Create validation middleware for input schemas
 */
export const createValidationMiddleware = <T>(schema: z.ZodSchema<T>) =>
  t.middleware(async ({ next, getRawInput }) => {
    try {
      const rawInput = await getRawInput();
      const result = await schema.safeParseAsync(rawInput);

      if (!result.success) {
        const firstError = result.error.issues[0];
        const field = firstError?.path.join(".") ?? "unknown";
        const message = firstError?.message ?? "Validation failed";

        throw new ValidationError(`Validation failed for field '${field}': ${message}`, field);
      }

      return next({ ctx: { validatedInput: result.data } });
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      throw new ValidationError("Input validation failed");
    }
  });

/**
 * Generic input validation middleware
 */
export const validateInput = <T extends z.ZodSchema>(schema: T) =>
  createValidationMiddleware(schema);
