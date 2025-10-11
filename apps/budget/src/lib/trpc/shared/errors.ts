import { TRPCError } from "@trpc/server";
import {
  ConflictError,
  DatabaseError,
  DomainError,
  NotFoundError,
  ValidationError,
} from "$lib/server/shared/types/errors";

/**
 * Translates domain-specific errors into tRPC errors with appropriate HTTP status codes.
 *
 * This provides a centralized error handling strategy for all tRPC routes:
 * - ValidationError -> BAD_REQUEST (400)
 * - NotFoundError -> NOT_FOUND (404)
 * - ConflictError -> CONFLICT (409)
 * - DomainError (non-database) -> BAD_REQUEST (400)
 * - DatabaseError -> INTERNAL_SERVER_ERROR (500)
 * - Already TRPCError -> passthrough
 * - Unknown errors -> INTERNAL_SERVER_ERROR (500)
 *
 * @param error - The error to translate
 * @returns A TRPCError with appropriate code and message
 *
 * @example
 * ```typescript
 * try {
 *   return await service.doSomething(input);
 * } catch (error) {
 *   throw translateDomainError(error);
 * }
 * ```
 */
export function translateDomainError(error: unknown): TRPCError {
  // Already a TRPCError, return as-is
  if (error instanceof TRPCError) {
    return error;
  }

  // Validation errors (invalid input)
  if (error instanceof ValidationError) {
    return new TRPCError({ code: "BAD_REQUEST", message: error.message });
  }

  // Not found errors (entity doesn't exist)
  if (error instanceof NotFoundError) {
    return new TRPCError({ code: "NOT_FOUND", message: error.message });
  }

  // Conflict errors (duplicate, constraint violation)
  if (error instanceof ConflictError) {
    return new TRPCError({ code: "CONFLICT", message: error.message });
  }

  // Domain errors (business logic violations, excluding database)
  if (error instanceof DomainError && !(error instanceof DatabaseError)) {
    return new TRPCError({ code: "BAD_REQUEST", message: error.message });
  }

  // Database errors (persistence layer failures)
  if (error instanceof DatabaseError) {
    return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
  }

  // Unknown errors (fallback)
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: (error as Error)?.message ?? "Unknown error",
  });
}
