import { RATE_LIMIT } from "$core/constants/api";
import type { Context } from "$core/trpc";
import { initTRPC, TRPCError } from "@trpc/server";

/**
 * Maximum number of entries in the rate-limit store before we force a sweep.
 * Bounds memory against a distributed attack using many distinct keys.
 */
const MAX_STORE_SIZE = 100_000;

/**
 * Interval between opportunistic cleanup passes. Cleanup is amortized: a
 * sweep runs at most once per SWEEP_INTERVAL_MS, not on every request.
 */
const SWEEP_INTERVAL_MS = 30_000;

// Simple in-memory rate limiter - in production, use Redis or similar
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
let lastSweepAt = 0;

interface RateLimitOptions {
  name?: string;
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (ctx: Context) => string;
  /**
   * Whether to also apply this limit to queries (not just mutations).
   * Default false — most limiters only gate mutations.
   */
  applyToQueries?: boolean;
}

/**
 * Extract a stable client identifier for rate limiting.
 *
 * Priority:
 *   1. Authenticated userId (cross-session stable)
 *   2. Session id (for logged-in but not-yet-fully-contextual requests)
 *   3. Client IP from proxy headers (x-forwarded-for / x-real-ip / cf-connecting-ip)
 *   4. Anonymous bucket — a known hazard, only reached when no other signal exists
 *
 * NOTE: `x-forwarded-for` is client-controlled when the app is not behind a
 * trusted proxy. Callers should ensure a reverse proxy strips/overrides this
 * header in production so it cannot be spoofed.
 */
const defaultKeyGenerator = (ctx: Context): string => {
  if (ctx.userId) return `u:${ctx.userId}`;
  if (ctx.sessionId) return `s:${ctx.sessionId}`;

  const headers = ctx.request?.headers;
  if (headers) {
    const forwarded = headers.get("x-forwarded-for");
    if (forwarded) {
      // Take only the first IP; the rest are proxies.
      const first = forwarded.split(",")[0]?.trim();
      if (first) return `ip:${first}`;
    }
    const real = headers.get("x-real-ip") ?? headers.get("cf-connecting-ip");
    if (real) return `ip:${real.trim()}`;
  }

  return "anon";
};

function sweepExpired(now: number): void {
  for (const [k, v] of rateLimitStore) {
    if (v.resetTime < now) {
      rateLimitStore.delete(k);
    }
  }
  lastSweepAt = now;
}

// Initialize tRPC instance for middleware creation
const t = initTRPC.context<Context>().create();

/**
 * Rate limiting middleware for tRPC mutations
 * @param options - Configuration options for rate limiting
 */
export const rateLimit = (options: RateLimitOptions) => {
  const {
    name,
    windowMs,
    maxRequests,
    keyGenerator = defaultKeyGenerator,
    applyToQueries = false,
  } = options;

  return t.middleware(async ({ ctx, next, type }) => {
    // Skip rate limiting for tests
    if ((ctx as Context).isTest) {
      return next({ ctx });
    }

    if (!applyToQueries && type !== "mutation") {
      return next({ ctx });
    }

    const key = `${name ?? `${windowMs}:${maxRequests}`}:${keyGenerator(ctx)}`;
    const now = Date.now();

    // Amortized sweep — O(n) at most once per SWEEP_INTERVAL_MS, plus a forced
    // sweep when the store has grown past its cap.
    if (now - lastSweepAt > SWEEP_INTERVAL_MS || rateLimitStore.size > MAX_STORE_SIZE) {
      sweepExpired(now);
      // If still oversized after sweep (pathological burst of live keys), drop
      // the oldest entries rather than growing unbounded.
      if (rateLimitStore.size > MAX_STORE_SIZE) {
        const excess = rateLimitStore.size - MAX_STORE_SIZE;
        let dropped = 0;
        for (const k of rateLimitStore.keys()) {
          if (dropped >= excess) break;
          rateLimitStore.delete(k);
          dropped++;
        }
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
  name: "mutation",
  windowMs: RATE_LIMIT.WINDOW_MS,
  maxRequests: RATE_LIMIT.MUTATION_MAX_REQUESTS,
});

export const bulkOperationRateLimit = rateLimit({
  name: "bulk-operation",
  windowMs: RATE_LIMIT.WINDOW_MS,
  maxRequests: RATE_LIMIT.BULK_OPERATION_MAX_REQUESTS,
});

export const strictRateLimit = rateLimit({
  name: "strict",
  windowMs: RATE_LIMIT.WINDOW_MS,
  maxRequests: RATE_LIMIT.STRICT_MAX_REQUESTS,
});

/**
 * Rate limit for unauthenticated auth endpoints (email check, forgot password,
 * reset password, email verify). Keyed by client IP since userId is unavailable.
 * Applies to both queries and mutations — `checkEmailAvailable` is a query but
 * is a primary enumeration vector.
 */
export const authRateLimit = rateLimit({
  name: "auth",
  windowMs: RATE_LIMIT.WINDOW_MS,
  maxRequests: 10,
  applyToQueries: true,
});
