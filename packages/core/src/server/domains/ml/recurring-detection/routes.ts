/**
 * Recurring Transaction Detection tRPC Routes
 *
 * Provides API endpoints for detecting and analyzing recurring transaction patterns.
 */

import { rateLimitedProcedure, t } from "$lib/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createMLModelStore } from "../model-store";
import { createRecurringTransactionDetectionService } from "./service";

// Lazy initialization of services (singleton pattern)
let recurringService: ReturnType<typeof createRecurringTransactionDetectionService> | null = null;

function getRecurringService() {
  if (!recurringService) {
    const modelStore = createMLModelStore();
    recurringService = createRecurringTransactionDetectionService(modelStore);
  }
  return recurringService;
}

export const recurringDetectionRoutes = t.router({
  /**
   * Detect all recurring patterns for workspace or specific account
   */
  detectPatterns: rateLimitedProcedure
    .input(
      z.object({
        accountId: z.number().positive().optional(),
        minOccurrences: z.number().min(2).max(10).default(3),
        minConfidence: z.number().min(0).max(1).default(0.6),
        lookbackMonths: z.number().min(1).max(36).default(12),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const service = getRecurringService();

        const result = await service.detectPatterns(ctx.workspaceId, {
          accountId: input.accountId,
          minOccurrences: input.minOccurrences,
          minConfidence: input.minConfidence,
          lookbackMonths: input.lookbackMonths,
        });

        return result;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to detect patterns: ${errorMessage}`,
        });
      }
    }),

  /**
   * Detect recurring patterns for a specific payee
   */
  detectForPayee: rateLimitedProcedure
    .input(
      z.object({
        payeeId: z.number().positive(),
        minOccurrences: z.number().min(2).max(10).default(3),
        minConfidence: z.number().min(0).max(1).default(0.6),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const service = getRecurringService();

        const patterns = await service.detectForPayee(ctx.workspaceId, input.payeeId, {
          minOccurrences: input.minOccurrences,
          minConfidence: input.minConfidence,
        });

        return {
          payeeId: input.payeeId,
          patterns,
          count: patterns.length,
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to detect payee patterns: ${errorMessage}`,
        });
      }
    }),

  /**
   * Analyze a specific pattern in detail
   */
  analyzePattern: rateLimitedProcedure
    .input(
      z.object({
        patternId: z.string().min(1),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const service = getRecurringService();

        const analysis = await service.analyzePattern(ctx.workspaceId, input.patternId);

        if (!analysis) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Pattern not found: ${input.patternId}`,
          });
        }

        return analysis;
      } catch (error: unknown) {
        if (error instanceof TRPCError) throw error;

        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to analyze pattern: ${errorMessage}`,
        });
      }
    }),

  /**
   * Get schedule suggestion for a pattern
   */
  suggestSchedule: rateLimitedProcedure
    .input(
      z.object({
        patternId: z.string().min(1),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const service = getRecurringService();

        // First get the pattern analysis
        const analysis = await service.analyzePattern(ctx.workspaceId, input.patternId);

        if (!analysis) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Pattern not found: ${input.patternId}`,
          });
        }

        // Generate schedule suggestion
        const suggestion = service.suggestScheduleFromPattern(analysis.pattern);

        return {
          pattern: {
            id: analysis.pattern.patternId,
            payeeName: analysis.pattern.payeeName,
            frequency: analysis.pattern.frequency,
            confidence: analysis.pattern.confidence,
          },
          suggestion,
          healthScore: analysis.healthScore,
          warnings: [
            ...(analysis.missedOccurrences.length > 0
              ? [`Pattern has ${analysis.missedOccurrences.length} missed occurrence(s)`]
              : []),
            ...(analysis.anomalies.length > 0
              ? [`Pattern has ${analysis.anomalies.length} amount anomaly(ies)`]
              : []),
            ...(!analysis.pattern.isActive ? ["Pattern appears inactive"] : []),
          ],
        };
      } catch (error: unknown) {
        if (error instanceof TRPCError) throw error;

        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to generate schedule suggestion: ${errorMessage}`,
        });
      }
    }),

  /**
   * Get summary of all detected recurring patterns
   */
  getSummary: rateLimitedProcedure
    .input(
      z.object({
        accountId: z.number().positive().optional(),
        minConfidence: z.number().min(0).max(1).default(0.6),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const service = getRecurringService();

        const result = await service.detectPatterns(ctx.workspaceId, {
          accountId: input.accountId,
          minConfidence: input.minConfidence,
        });

        // Get top patterns by monthly impact
        const topByValue = [...result.patterns]
          .sort((a, b) => {
            const aMonthly = Math.abs(a.averageAmount) * (30 / a.interval);
            const bMonthly = Math.abs(b.averageAmount) * (30 / b.interval);
            return bMonthly - aMonthly;
          })
          .slice(0, 10);

        // Get potentially inactive patterns (expected but not seen recently)
        const inactive = result.patterns.filter((p) => !p.isActive);

        // Get subscriptions (small, regular expenses)
        const subscriptions = result.patterns.filter(
          (p) =>
            p.amountType === "exact" &&
            p.averageAmount < 0 &&
            Math.abs(p.averageAmount) < 100 &&
            p.confidence >= 0.7
        );

        return {
          summary: result.summary,
          topByValue,
          inactive,
          subscriptions,
          totalPatterns: result.patterns.length,
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get summary: ${errorMessage}`,
        });
      }
    }),

  /**
   * Check for expected recurring transactions that are missing
   */
  checkMissing: rateLimitedProcedure
    .input(
      z.object({
        accountId: z.number().positive().optional(),
        daysAhead: z.number().min(1).max(30).default(7),
        minConfidence: z.number().min(0).max(1).default(0.7),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const service = getRecurringService();

        const result = await service.detectPatterns(ctx.workspaceId, {
          accountId: input.accountId,
          minConfidence: input.minConfidence,
        });

        const today = new Date();
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() + input.daysAhead);

        // Find patterns where next expected date is within range but pattern is inactive
        const missing = result.patterns.filter((p) => {
          const nextExpected = new Date(p.nextPredicted);
          const lastSeen = new Date(p.lastOccurrence);
          const daysSinceLast = (today.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24);

          // Pattern is "missing" if:
          // 1. Next expected date is in the past or within our check window
          // 2. Time since last occurrence exceeds expected interval significantly
          return (
            nextExpected <= checkDate && daysSinceLast > p.interval * 1.3 && p.confidence >= 0.7
          );
        });

        return {
          missing: missing.map((p) => ({
            patternId: p.patternId,
            payeeName: p.payeeName,
            expectedAmount: p.averageAmount,
            expectedDate: p.nextPredicted,
            lastSeen: p.lastOccurrence,
            confidence: p.confidence,
            frequency: p.frequency,
          })),
          count: missing.length,
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to check for missing patterns: ${errorMessage}`,
        });
      }
    }),
});
