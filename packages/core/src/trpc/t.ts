import type { Context } from "$core/trpc/context";
import { initTRPC, TRPCError } from "@trpc/server";
import { inputSanitization, strictInputSanitization } from "./middleware/input-sanitization";
import {
  authRateLimit,
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

// Open procedures that do not require authentication
// Use sparingly for flows like password reset and invitation token lookup.
export const openProcedure = baseProcedure.use(standardLimits).use(inputSanitization);

// Rate-limited open procedure for unauthenticated auth-sensitive endpoints
// (email availability, forgot password, password reset, email verify, etc.).
// Prevents enumeration and reset-email spam from unauthenticated clients.
export const authOpenProcedure = baseProcedure
  .use(authRateLimit)
  .use(standardLimits)
  .use(inputSanitization);

// Authenticated procedures with input sanitization and standard limits
export const publicProcedure = baseProcedure
  .use(isAuthenticated)
  .use(standardLimits)
  .use(inputSanitization);

// Rate-limited procedures for mutations with enhanced security
export const rateLimitedProcedure = baseProcedure
  .use(isAuthenticated)
  .use(mutationRateLimit)
  .use(standardLimits)
  .use(inputSanitization);

// Bulk operation procedures with specialized limits
export const bulkOperationProcedure = baseProcedure
  .use(isAuthenticated)
  .use(bulkOperationRateLimit)
  .use(bulkOperationLimits)
  .use(strictInputSanitization);

// High-security procedures for sensitive operations
export const secureOperationProcedure = baseProcedure
  .use(isAuthenticated)
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
