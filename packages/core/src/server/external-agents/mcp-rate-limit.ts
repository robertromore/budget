/**
 * Per-key rate limiter for the MCP HTTP endpoint.
 *
 * The tRPC middleware limiter at `$core/trpc/middleware/rate-limit` is
 * bound to a tRPC Context, but `/api/mcp` is a bare SvelteKit route
 * handler — different shape, no tRPC procedure to wrap. Rather than
 * fold both call paths into one abstraction, this module is a small
 * standalone limiter keyed by `apiKeyId`.
 *
 * Defaults: 60 requests per 60 seconds per key. Tunable per call site.
 * Same amortized-sweep strategy as the tRPC limiter so the store
 * doesn't grow unbounded under a burst of distinct keys.
 */

const DEFAULT_WINDOW_MS = 60 * 1000;
const DEFAULT_MAX_REQUESTS = 60;
const MAX_STORE_SIZE = 10_000;
const SWEEP_INTERVAL_MS = 30_000;

interface Bucket {
  count: number;
  resetTime: number;
}

const store = new Map<number, Bucket>();
let lastSweepAt = 0;

function sweepExpired(now: number): void {
  for (const [k, v] of store) {
    if (v.resetTime < now) store.delete(k);
  }
  lastSweepAt = now;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the window resets. Only meaningful when allowed=false. */
  retryAfterSeconds: number;
  /** Remaining requests in the current window. */
  remaining: number;
}

export interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
}

/**
 * Check + increment in one call. Returns `allowed: false` once the
 * caller has exceeded the limit; the caller should translate that
 * into an HTTP 429 with `Retry-After` set.
 */
export function checkMcpRateLimit(
  apiKeyId: number,
  options: RateLimitOptions = {}
): RateLimitResult {
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const maxRequests = options.maxRequests ?? DEFAULT_MAX_REQUESTS;
  const now = Date.now();

  if (now - lastSweepAt > SWEEP_INTERVAL_MS || store.size > MAX_STORE_SIZE) {
    sweepExpired(now);
    if (store.size > MAX_STORE_SIZE) {
      // Pathological burst — drop oldest entries rather than grow forever.
      const excess = store.size - MAX_STORE_SIZE;
      let dropped = 0;
      for (const k of store.keys()) {
        if (dropped >= excess) break;
        store.delete(k);
        dropped++;
      }
    }
  }

  let bucket = store.get(apiKeyId);
  if (!bucket || bucket.resetTime < now) {
    bucket = { count: 1, resetTime: now + windowMs };
    store.set(apiKeyId, bucket);
    return { allowed: true, retryAfterSeconds: 0, remaining: maxRequests - 1 };
  }

  bucket.count++;
  if (bucket.count > maxRequests) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetTime - now) / 1000)),
      remaining: 0,
    };
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: Math.max(0, maxRequests - bucket.count),
  };
}

/** Test hook: clear the store so unit tests don't leak between cases. */
export function _resetMcpRateLimitStore(): void {
  store.clear();
  lastSweepAt = 0;
}
