// API and rate limiting constants
export const RATE_LIMIT = {
  WINDOW_MS: 60 * 1000, // 1 minute
  MUTATION_MAX_REQUESTS: 30,
  BULK_OPERATION_MAX_REQUESTS: 10,
  STRICT_MAX_REQUESTS: 5,
} as const;

// Database limits
export const DATABASE_LIMITS = {
  MAX_SAFETY_LIMIT: 50,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;
