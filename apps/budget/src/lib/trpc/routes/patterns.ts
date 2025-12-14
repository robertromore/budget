import { PatternDetectionService, PatternRepository } from "$lib/server/domains/patterns";
import type { DetectionCriteria } from "$lib/server/domains/patterns/types";
import { rateLimitedProcedure, t } from "$lib/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const patternRepository = new PatternRepository();
const patternService = new PatternDetectionService(patternRepository);

// Helper to strip undefined values for exactOptionalPropertyTypes compatibility
function stripUndefined<T extends Record<string, unknown>>(obj: T | undefined): Partial<DetectionCriteria> | undefined {
  if (!obj) return undefined;
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<DetectionCriteria>;
}

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
    .mutation(async ({ input, ctx }) => {
      try {
        let detectedPatterns;
        const criteria = stripUndefined(input.criteria);
        if (input.accountId) {
          // Single account detection
          detectedPatterns = await patternService.detectPatternsForAccount(
            input.accountId,
            ctx.workspaceId,
            criteria
          );
        } else {
          // Detect patterns for all accounts
          detectedPatterns = await patternService.detectPatternsForUserAccounts(
            ctx.workspaceId,
            criteria
          );
        }

        // Save all detected patterns to database (with deduplication)
        // Track which ones were actually saved vs skipped (e.g., dismissed patterns)
        const savedPatterns = [];
        for (const pattern of detectedPatterns) {
          const result = await patternService.saveOrUpdatePattern(pattern, ctx.workspaceId);
          if (!result.skipped) {
            savedPatterns.push(pattern);
          }
        }

        // Return only the patterns that were actually saved/updated
        return savedPatterns;
      } catch (error: any) {
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
    .query(async ({ input, ctx }) => {
      try {
        return await patternService.getDetectedPatterns(
          ctx.workspaceId,
          input.accountId,
          input.status
        );
      } catch (error: any) {
        console.error("[patterns.list] Error fetching patterns:", error);
        console.error("[patterns.list] Error stack:", error.stack);

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
    .input(z.object({ patternId: z.number().positive() }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await patternService.convertPatternToSchedule(input.patternId, ctx.workspaceId);
      } catch (error: any) {
        if (error.message === "Pattern not found") {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
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
    .input(z.object({ patternId: z.number().positive() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await patternService.dismissPattern(input.patternId, ctx.workspaceId);
        return { success: true };
      } catch (error: any) {
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
    .mutation(async ({ input, ctx }) => {
      try {
        const count = await patternService.expireStalePatterns(
          ctx.workspaceId,
          input.daysSinceLastMatch
        );
        return { count };
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
    .mutation(async ({ input, ctx }) => {
      try {
        const count = await patternService.deleteAllPatterns(ctx.workspaceId, input.status);
        return { count };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to delete patterns",
        });
      }
    }),
});
