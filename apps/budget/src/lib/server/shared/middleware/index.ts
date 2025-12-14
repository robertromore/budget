// Re-export all middleware
export * from "./auth";
export * from "./error-handling";
export * from "./validation";

// Re-export existing rate limiting middleware
export {
  bulkOperationRateLimit, mutationRateLimit, rateLimit, strictRateLimit
} from "$lib/trpc/middleware/rate-limit";
