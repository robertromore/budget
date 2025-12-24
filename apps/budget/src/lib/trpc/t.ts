import type { Context } from "$lib/trpc/context";
import { initTRPC, TRPCError } from "@trpc/server";
import { inputSanitization, strictInputSanitization } from "./middleware/input-sanitization";
import {
  bulkOperationRateLimit,
  mutationRateLimit,
  strictRateLimit,
} from "./middleware/rate-limit";
import { bulkOperationLimits, standardLimits, strictLimits } from "./middleware/request-limits";
import { securityLogging } from "./middleware/security-logging";

export const t = initTRPC.context<Context>().create();

/**
 * Middleware to enforce authentication.
 * Throws UNAUTHORIZED if userId or sessionId is not present.
 * Note: Procedures using this middleware can safely use ctx.userId! and ctx.sessionId!
 * as the middleware guarantees they are non-null after this point.
 */
const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.userId || !ctx.sessionId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to perform this action",
    });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
      sessionId: ctx.sessionId,
    },
  });
});

// Base procedure with security logging
const baseProcedure = t.procedure.use(securityLogging);

// Public procedures with input sanitization and standard limits
export const publicProcedure = baseProcedure.use(standardLimits).use(inputSanitization);

// Rate-limited procedures for mutations with enhanced security
export const rateLimitedProcedure = baseProcedure
  .use(mutationRateLimit)
  .use(standardLimits)
  .use(inputSanitization);

// Bulk operation procedures with specialized limits
export const bulkOperationProcedure = baseProcedure
  .use(bulkOperationRateLimit)
  .use(bulkOperationLimits)
  .use(strictInputSanitization);

// High-security procedures for sensitive operations
export const secureOperationProcedure = baseProcedure
  .use(strictRateLimit)
  .use(strictLimits)
  .use(strictInputSanitization);

// Legacy export for backward compatibility
export const secureProcedure = rateLimitedProcedure;

// Protected procedure requiring authentication
export const protectedProcedure = baseProcedure
  .use(isAuthenticated)
  .use(standardLimits)
  .use(inputSanitization);

// Secure protected procedure for sensitive operations (auth-required + rate limited)
export const secureProtectedProcedure = baseProcedure
  .use(isAuthenticated)
  .use(strictRateLimit)
  .use(strictLimits)
  .use(strictInputSanitization);
