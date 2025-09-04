import { initTRPC } from "@trpc/server";
import type { Context } from "$lib/trpc/context";
import { errorHandler } from "$lib/server/shared/middleware";
import { requireAuth, requireAdmin } from "$lib/server/shared/middleware";
import { mutationRateLimit, bulkOperationRateLimit, strictRateLimit } from "$lib/server/shared/middleware";

// Initialize tRPC
const t = initTRPC.context<Context>().create();

// Base procedure with error handling
const baseProcedure = t.procedure.use(errorHandler);

/**
 * Public procedure - no authentication required
 */
export const publicProcedure = baseProcedure;

/**
 * Authenticated procedure - requires valid user session
 */
export const authenticatedProcedure = baseProcedure.use(requireAuth);

/**
 * Admin procedure - requires admin role
 */
export const adminProcedure = authenticatedProcedure.use(requireAdmin);

/**
 * Rate limited procedure - for standard mutations
 */
export const rateLimitedProcedure = authenticatedProcedure.use(mutationRateLimit);

/**
 * Bulk operation procedure - for operations on multiple entities
 */
export const bulkProcedure = authenticatedProcedure.use(bulkOperationRateLimit);

/**
 * Strict rate limited procedure - for sensitive operations
 */
export const strictProcedure = authenticatedProcedure.use(strictRateLimit);

/**
 * Admin rate limited procedure - for admin operations
 */
export const adminRateLimitedProcedure = adminProcedure.use(mutationRateLimit);