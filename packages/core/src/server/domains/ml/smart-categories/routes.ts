/**
 * Smart Category Suggestions tRPC Routes
 *
 * Provides API endpoints for intelligent category suggestions based on
 * payee matching, amount patterns, time patterns, and historical data.
 */

import { payeeCategoryCorrections } from "$core/schema/payee-category-corrections";
import { db } from "$core/server/db";
import { publicProcedure, rateLimitedProcedure, t } from "$core/trpc/t";
import { TRPCError } from "@trpc/server";
import { and, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { createMLModelStore } from "../model-store";
import { createSmartCategoryService } from "./service";

// Lazy initialization of services (singleton pattern)
let smartCategoryService: ReturnType<typeof createSmartCategoryService> | null = null;

function getSmartCategoryService() {
  if (!smartCategoryService) {
    const modelStore = createMLModelStore();
    smartCategoryService = createSmartCategoryService(modelStore);
  }
  return smartCategoryService;
}

// Input schema for transaction context
const transactionContextSchema = z.object({
  description: z.string().min(1).max(500),
  amount: z.number(),
  date: z.string(), // ISO date string
  payeeId: z.number().optional(),
  payeeName: z.string().max(200).optional(),
  rawPayeeString: z.string().max(500).optional(),
  memo: z.string().max(500).optional(),
  isRecurring: z.boolean().optional(),
});

export const smartCategoryRoutes = t.router({
  /**
   * Get smart category suggestions for a transaction
   */
  suggest: rateLimitedProcedure
    .input(
      z.object({
        transaction: transactionContextSchema,
        limit: z.number().min(1).max(10).default(5),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const service = getSmartCategoryService();

        const suggestions = await service.suggestCategories(
          ctx.workspaceId,
          input.transaction,
          input.limit
        );

        return {
          transaction: {
            description: input.transaction.description,
            amount: input.transaction.amount,
            date: input.transaction.date,
          },
          suggestions,
          total: suggestions.length,
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get category suggestions: ${errorMessage}`,
        });
      }
    }),

  /**
   * Get the top category suggestion for a transaction
   */
  suggestTop: rateLimitedProcedure.input(transactionContextSchema).query(async ({ input, ctx }) => {
    try {
      const service = getSmartCategoryService();

      const suggestions = await service.suggestCategories(ctx.workspaceId, input, 1);

      if (suggestions.length === 0) {
        return {
          transaction: {
            description: input.description,
            amount: input.amount,
          },
          suggestion: null,
          found: false,
        };
      }

      return {
        transaction: {
          description: input.description,
          amount: input.amount,
        },
        suggestion: suggestions[0],
        found: true,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to get category suggestion: ${errorMessage}`,
      });
    }
  }),

  /**
   * Analyze transaction type (income/expense/transfer)
   */
  analyzeType: rateLimitedProcedure.input(transactionContextSchema).query(({ input }) => {
    const service = getSmartCategoryService();

    const analysis = service.analyzeTransactionType(input);

    return {
      transaction: {
        description: input.description,
        amount: input.amount,
      },
      analysis,
    };
  }),

  /**
   * Detect if a transaction is likely a subscription
   */
  detectSubscription: rateLimitedProcedure
    .input(transactionContextSchema)
    .query(async ({ input, ctx }) => {
      try {
        const service = getSmartCategoryService();

        const result = await service.detectSubscription(ctx.workspaceId, input);

        return {
          transaction: {
            description: input.description,
            amount: input.amount,
          },
          ...result,
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to detect subscription: ${errorMessage}`,
        });
      }
    }),

  /**
   * Get time-based category hints for a transaction
   */
  getTimeHints: rateLimitedProcedure.input(transactionContextSchema).query(({ input }) => {
    const service = getSmartCategoryService();

    const hints = service.getTimeBasedHints(input);

    return {
      transaction: {
        description: input.description,
        date: input.date,
      },
      hints,
      total: hints.length,
    };
  }),

  /**
   * Batch suggest categories for multiple transactions
   */
  batchSuggest: rateLimitedProcedure
    .input(
      z.object({
        transactions: z.array(transactionContextSchema).max(100),
        limit: z.number().min(1).max(5).default(3),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const service = getSmartCategoryService();

        const results = await Promise.all(
          input.transactions.map(async (txn) => {
            const suggestions = await service.suggestCategories(ctx.workspaceId, txn, input.limit);
            return {
              transaction: {
                description: txn.description,
                amount: txn.amount,
                date: txn.date,
              },
              suggestions,
              topSuggestion: suggestions[0] || null,
            };
          })
        );

        const withSuggestions = results.filter((r) => r.topSuggestion !== null).length;

        return {
          results,
          total: results.length,
          withSuggestions,
          withoutSuggestions: results.length - withSuggestions,
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to batch suggest categories: ${errorMessage}`,
        });
      }
    }),

  /**
   * Drift statistics for smart-category suggestions over a rolling
   * window. Computes accept / override / dismiss rates from
   * payee_category_corrections so the UI can decide whether the model
   * needs retraining. When the override rate climbs the model is
   * out of step with the user's intent — that's the retrain signal.
   */
  getDriftStats: publicProcedure
    .input(
      z
        .object({
          days: z.number().min(1).max(180).default(30),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const days = input?.days ?? 30;
      const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
      const since = new Date(sinceMs).toISOString();

      // Pull aggregate counts by correctionTrigger over the window.
      // Limited to the three triggers that come from the import flow
      // (the only ones the AI-suggestion pipeline currently emits).
      const rows = await db
        .select({
          trigger: payeeCategoryCorrections.correctionTrigger,
          count: sql<number>`COUNT(*)`,
        })
        .from(payeeCategoryCorrections)
        .where(
          and(
            eq(payeeCategoryCorrections.workspaceId, ctx.workspaceId),
            gte(payeeCategoryCorrections.createdAt, since)
          )
        )
        .groupBy(payeeCategoryCorrections.correctionTrigger);

      const counts: Record<string, number> = {};
      for (const row of rows) counts[row.trigger] = Number(row.count) || 0;

      const accepted = counts["ai_suggestion_accepted"] ?? 0;
      const overridden = counts["import_category_override"] ?? 0;
      const dismissed = counts["import_dismissal"] ?? 0;
      const total = accepted + overridden + dismissed;

      const acceptRate = total > 0 ? accepted / total : null;
      const overrideRate = total > 0 ? overridden / total : null;
      const dismissRate = total > 0 ? dismissed / total : null;

      // Heuristic recommendation: ask for retrain if the model has
      // seen enough signal AND less than half is acceptance. The
      // thresholds are deliberately conservative so we don't pester
      // users with a "retrain" CTA after a handful of corrections.
      const MIN_SIGNAL = 25;
      const ACCEPT_THRESHOLD = 0.5;
      const shouldRetrain =
        total >= MIN_SIGNAL && acceptRate !== null && acceptRate < ACCEPT_THRESHOLD;

      return {
        windowDays: days,
        totals: { accepted, overridden, dismissed, total },
        rates: { acceptRate, overrideRate, dismissRate },
        shouldRetrain,
        minSignalRequired: MIN_SIGNAL,
        acceptThreshold: ACCEPT_THRESHOLD,
      };
    }),

  /**
   * Record user category selection for learning (future use)
   */
  recordSelection: rateLimitedProcedure
    .input(
      z.object({
        transaction: transactionContextSchema,
        selectedCategoryId: z.number(),
        suggestedCategoryId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const service = getSmartCategoryService();

        await service.recordUserSelection(
          ctx.workspaceId,
          input.transaction,
          input.selectedCategoryId,
          input.suggestedCategoryId
        );

        return {
          success: true,
          message: "Selection recorded",
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to record selection: ${errorMessage}`,
        });
      }
    }),
});
