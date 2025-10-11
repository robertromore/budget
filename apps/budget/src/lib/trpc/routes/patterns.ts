import {z} from "zod";
import {rateLimitedProcedure, t} from "$lib/trpc";
import {TRPCError} from "@trpc/server";
import {PatternDetectionService} from "$lib/server/domains/patterns";

const patternService = new PatternDetectionService();

const detectionCriteriaSchema = z.object({
  minOccurrences: z.number().min(2).optional(),
  amountVariancePercent: z.number().min(0).max(100).optional(),
  minConfidenceScore: z.number().min(0).max(100).optional(),
  lookbackMonths: z.number().min(1).max(24).optional(),
});

export const patternRoutes = t.router({
  // Run detection for specific account (or all accounts if no accountId)
  detect: rateLimitedProcedure
    .input(
      z.object({
        accountId: z.number().positive().optional(),
        criteria: detectionCriteriaSchema.optional(),
      })
    )
    .mutation(async ({input}) => {
      // NOTE: Single-user mode - authentication not yet implemented
      // When multi-user support is added, uncomment this:
      // if (!ctx.user?.id) {
      //   throw new TRPCError({
      //     code: "UNAUTHORIZED",
      //     message: "Authentication required",
      //   });
      // }

      try {
        let detectedPatterns;
        if (input.accountId) {
          // Single account detection
          detectedPatterns = await patternService.detectPatternsForAccount(
            input.accountId,
            undefined, // Single-user mode
            input.criteria
          );
        } else {
          // Detect patterns for all accounts
          detectedPatterns = await patternService.detectPatternsForUserAccounts(
            undefined, // Single-user mode
            input.criteria
          );
        }

        // Save all detected patterns to database (with deduplication)
        for (const pattern of detectedPatterns) {
          await patternService.saveOrUpdatePattern(pattern, undefined);
        }

        return detectedPatterns;
      } catch (error: any) {
        // Multi-user error handling (ready for when auth is added)
        if (error.statusCode === 403) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: error.message || "Access denied",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to detect patterns",
        });
      }
    }),

  // Get detected patterns
  list: rateLimitedProcedure
    .input(
      z.object({
        accountId: z.number().positive().optional(),
        status: z.enum(["pending", "accepted", "dismissed", "converted"]).optional(),
      })
    )
    .query(async ({input}) => {
      // NOTE: Single-user mode - authentication not yet implemented
      // When multi-user support is added, uncomment this:
      // if (!ctx.user?.id) {
      //   throw new TRPCError({
      //     code: "UNAUTHORIZED",
      //     message: "Authentication required",
      //   });
      // }

      try {
        return await patternService.getDetectedPatterns(
          undefined, // Single-user mode
          input.accountId,
          input.status
        );
      } catch (error: any) {
        // Multi-user error handling (ready for when auth is added)
        if (error.statusCode === 403) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: error.message || "Access denied",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to fetch patterns",
        });
      }
    }),

  // Convert pattern to schedule
  convertToSchedule: rateLimitedProcedure
    .input(z.object({patternId: z.number().positive()}))
    .mutation(async ({input}) => {
      // NOTE: Single-user mode - authentication not yet implemented
      // When multi-user support is added, uncomment this:
      // if (!ctx.user?.id) {
      //   throw new TRPCError({
      //     code: "UNAUTHORIZED",
      //     message: "Authentication required",
      //   });
      // }

      try {
        return await patternService.convertPatternToSchedule(
          input.patternId,
          undefined // Single-user mode
        );
      } catch (error: any) {
        if (error.message === "Pattern not found") {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        // Multi-user error handling (ready for when auth is added)
        if (error.statusCode === 403) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: error.message || "Access denied",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to create schedule",
        });
      }
    }),

  // Dismiss pattern
  dismiss: rateLimitedProcedure
    .input(z.object({patternId: z.number().positive()}))
    .mutation(async ({input}) => {
      // NOTE: Single-user mode - authentication not yet implemented
      // When multi-user support is added, uncomment this:
      // if (!ctx.user?.id) {
      //   throw new TRPCError({
      //     code: "UNAUTHORIZED",
      //     message: "Authentication required",
      //   });
      // }

      try {
        await patternService.dismissPattern(
          input.patternId,
          undefined // Single-user mode
        );
        return {success: true};
      } catch (error: any) {
        // Multi-user error handling (ready for when auth is added)
        if (error.statusCode === 403) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: error.message || "Access denied",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to dismiss pattern",
        });
      }
    }),

  // Expire stale patterns
  expireStale: rateLimitedProcedure
    .input(
      z.object({
        daysSinceLastMatch: z.number().min(1).optional(),
      })
    )
    .mutation(async ({input}) => {
      // NOTE: Single-user mode - authentication not yet implemented
      // When multi-user support is added, uncomment this:
      // if (!ctx.user?.id) {
      //   throw new TRPCError({
      //     code: "UNAUTHORIZED",
      //     message: "Authentication required",
      //   });
      // }

      try {
        const count = await patternService.expireStalePatterns(
          undefined, // Single-user mode
          input.daysSinceLastMatch
        );
        return {count};
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to expire patterns",
        });
      }
    }),

  // Delete all patterns
  deleteAll: rateLimitedProcedure
    .input(
      z.object({
        status: z.enum(["pending", "accepted", "dismissed", "converted"]).optional(),
      })
    )
    .mutation(async ({input}) => {
      // NOTE: Single-user mode - authentication not yet implemented
      // When multi-user support is added, uncomment this:
      // if (!ctx.user?.id) {
      //   throw new TRPCError({
      //     code: "UNAUTHORIZED",
      //     message: "Authentication required",
      //   });
      // }

      try {
        const count = await patternService.deleteAllPatterns(undefined, input.status);
        return {count};
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to delete patterns",
        });
      }
    }),
});
