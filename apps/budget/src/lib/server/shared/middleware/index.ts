// Re-export all middleware
export * from "./error-handling";
export * from "./validation";
export * from "./auth";

// Re-export existing rate limiting middleware
export {
  rateLimit,
  mutationRateLimit,
  bulkOperationRateLimit,
  strictRateLimit,
} from "$lib/trpc/middleware/rate-limit";
