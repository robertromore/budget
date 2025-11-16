import type { Context } from "$lib/trpc/context";
import { initTRPC } from "@trpc/server";
import {
  mutationRateLimit,
  bulkOperationRateLimit,
  strictRateLimit,
} from "./middleware/rate-limit";
import { inputSanitization, strictInputSanitization } from "./middleware/input-sanitization";
import { standardLimits, bulkOperationLimits, strictLimits } from "./middleware/request-limits";
import { securityLogging } from "./middleware/security-logging";

export const t = initTRPC.context<Context>().create();

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
