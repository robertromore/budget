/**
 * Smart Category Suggestions tRPC Routes
 *
 * Provides API endpoints for intelligent category suggestions based on
 * payee matching, amount patterns, time patterns, and historical data.
 */

import { rateLimitedProcedure, t } from "$lib/trpc";
import { TRPCError } from "@trpc/server";
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
  suggestTop: rateLimitedProcedure
    .input(transactionContextSchema)
    .query(async ({ input, ctx }) => {
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
  analyzeType: rateLimitedProcedure
    .input(transactionContextSchema)
    .query(({ input }) => {
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
  getTimeHints: rateLimitedProcedure
    .input(transactionContextSchema)
    .query(({ input }) => {
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
            const suggestions = await service.suggestCategories(
              ctx.workspaceId,
              txn,
              input.limit
            );
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
