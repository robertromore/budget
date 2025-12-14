import { DomainError } from "$lib/server/shared/types";
import type { Context } from "$lib/trpc/context";
import { initTRPC, TRPCError } from "@trpc/server";

// Initialize tRPC for middleware creation
const t = initTRPC.context<Context>().create();

/**
 * Enhanced error handling middleware for tRPC
 */
export const errorHandler = t.middleware(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    // Handle domain errors with proper tRPC error codes
    if (error instanceof DomainError) {
      let trpcCode: TRPCError["code"] = "INTERNAL_SERVER_ERROR";

      switch (error.code) {
        case "VALIDATION_ERROR":
          trpcCode = "BAD_REQUEST";
          break;
        case "NOT_FOUND":
          trpcCode = "NOT_FOUND";
          break;
        case "CONFLICT":
          trpcCode = "CONFLICT";
          break;
        case "UNAUTHORIZED":
          trpcCode = "UNAUTHORIZED";
          break;
        case "FORBIDDEN":
          trpcCode = "FORBIDDEN";
          break;
        case "TOO_MANY_REQUESTS":
          trpcCode = "TOO_MANY_REQUESTS";
          break;
        case "DATABASE_ERROR":
          trpcCode = "INTERNAL_SERVER_ERROR";
          break;
        default:
          trpcCode = "INTERNAL_SERVER_ERROR";
      }

      throw new TRPCError({
        code: trpcCode,
        message: error.message,
        cause: error,
      });
    }

    // Handle generic errors
    if (error instanceof Error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message,
        cause: error,
      });
    }

    // Fallback for unknown errors
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "An unknown error occurred",
    });
  }
});
