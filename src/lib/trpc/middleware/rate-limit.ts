import { TRPCError } from "@trpc/server";
import { initTRPC } from "@trpc/server";
import type { Context } from "../context";

// Simple in-memory rate limiter - in production, use Redis or similar
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (ctx: any) => string;
}

const defaultKeyGenerator = (ctx: any) => {
  // In a real app, use user ID or IP address
  // For now, use a simple identifier
  return ctx.user?.id || ctx.ip || "anonymous";
};

// Initialize tRPC instance for middleware creation
const t = initTRPC.context<Context>().create();

/**
 * Rate limiting middleware for tRPC mutations
 * @param options - Configuration options for rate limiting
 */
export const rateLimit = (options: RateLimitOptions) => {
  const { windowMs, maxRequests, keyGenerator = defaultKeyGenerator } = options;

  return t.middleware(async ({ ctx, next, type }) => {
    // Skip rate limiting for tests
    if ((ctx as any).isTest) {
      return next({ ctx });
    }
    
    // Only apply rate limiting to mutations
    if (type !== "mutation") {
      return next({ ctx });
    }

    const key = keyGenerator(ctx);
    const now = Date.now();

    // Clean up expired entries
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetTime < now) {
        rateLimitStore.delete(k);
      }
    }

    let rateData = rateLimitStore.get(key);

    if (!rateData || rateData.resetTime < now) {
      // Create new window
      rateData = { count: 1, resetTime: now + windowMs };
      rateLimitStore.set(key, rateData);
    } else {
      // Increment count in current window
      rateData.count++;
    }

    if (rateData.count > maxRequests) {
      const retryAfter = Math.ceil((rateData.resetTime - now) / 1000);
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      });
    }

    return next({ ctx });
  });
};

// Predefined rate limiters for different operation types
export const mutationRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 mutations per minute
});

export const bulkOperationRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 bulk operations per minute
});

export const strictRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5, // 5 operations per minute
});
