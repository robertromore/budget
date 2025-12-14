import {
  ConflictError,
  DatabaseError,
  DomainError,
  NotFoundError,
  ValidationError,
} from "$lib/server/shared/types/errors";
import { TRPCError } from "@trpc/server";

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

/**
 * Wraps a tRPC route handler with automatic error translation.
 *
 * This eliminates the need for repetitive try-catch blocks in every route.
 * Any domain errors thrown by the handler are automatically translated to TRPCErrors.
 *
 * @param handler - The async route handler function
 * @returns A wrapped handler that catches and translates errors
 *
 * @example
 * ```typescript
 * // Before:
 * load: publicProcedure.input(schema).query(async ({ input }) => {
 *   try {
 *     return await service.method(input);
 *   } catch (error) {
 *     throw translateDomainError(error);
 *   }
 * }),
 *
 * // After:
 * load: publicProcedure.input(schema).query(
 *   withErrorHandler(async ({ input }) => service.method(input))
 * ),
 * ```
 */
export function withErrorHandler<TInput, TOutput>(
  handler: (input: TInput) => Promise<TOutput>
): (input: TInput) => Promise<TOutput> {
  return async (input: TInput) => {
    try {
      return await handler(input);
    } catch (error) {
      throw translateDomainError(error);
    }
  };
}
