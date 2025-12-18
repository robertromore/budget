import { t } from "$lib/trpc/t";
import { dev } from "$app/environment";

/**
 * Development-only tRPC request logger.
 * Logs request path, type, duration, and status (but NOT response data).
 *
 * @example
 * ```typescript
 * // Use in procedure builder (dev only)
 * export const loggedProcedure = publicProcedure.use(requestLogger);
 * ```
 */
export const requestLogger = t.middleware(async ({ path, type, next }) => {
  if (!dev) {
    return next();
  }

  const start = Date.now();
  const result = await next();
  const duration = Date.now() - start;

  // Only log summary info, never response data
  console.log(`[tRPC] ${result.ok ? "✓" : "✗"} ${type.toUpperCase()} ${path} (${duration}ms)`);

  return result;
});

/**
 * @deprecated Use `requestLogger` instead. This alias exists for backwards compatibility.
 */
export const logger = requestLogger;
