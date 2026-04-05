/**
 * Natural Language Search tRPC Routes
 *
 * Provides API endpoints for natural language transaction searching.
 */

import { rateLimitedProcedure, t } from "$lib/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createNaturalLanguageSearchService } from "./service";

// Lazy initialization (singleton pattern)
let nlSearchService: ReturnType<typeof createNaturalLanguageSearchService> | null = null;

function getNLSearchService() {
  if (!nlSearchService) {
    nlSearchService = createNaturalLanguageSearchService();
  }
  return nlSearchService;
}

export const nlSearchRoutes = t.router({
  /**
   * Search transactions using natural language
   */
  search: rateLimitedProcedure
    .input(
      z.object({
        query: z.string().min(1).max(500),
        limit: z.number().min(1).max(100).optional().default(50),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const service = getNLSearchService();
        return await service.search(input.query, ctx.workspaceId, {
          limit: input.limit,
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Search failed: ${errorMessage}`,
        });
      }
    }),

  /**
   * Parse a query without executing it (for preview/debugging)
   */
  parse: rateLimitedProcedure
    .input(
      z.object({
        query: z.string().min(1).max(500),
      })
    )
    .query(async ({ input }) => {
      try {
        const service = getNLSearchService();
        return service.parseQuery(input.query);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Parse failed: ${errorMessage}`,
        });
      }
    }),

  /**
   * Get search suggestions based on partial query
   */
  suggestions: rateLimitedProcedure
    .input(
      z.object({
        partialQuery: z.string().max(500),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const service = getNLSearchService();
        return await service.getSuggestions(input.partialQuery, ctx.workspaceId);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Suggestions failed: ${errorMessage}`,
        });
      }
    }),

  /**
   * Get example queries to help users understand the feature
   */
  examples: t.procedure.query(() => {
    return {
      examples: [
        {
          query: "Show me all Amazon purchases",
          description: "Find transactions from a specific payee",
        },
        {
          query: "What did I spend on groceries last month?",
          description: "Category spending in a time period",
        },
        {
          query: "Large expenses over $500 this year",
          description: "Filter by amount and date",
        },
        {
          query: "Coffee purchases in December",
          description: "Search by keyword and month",
        },
        {
          query: "Recent income deposits",
          description: "Filter by transaction type",
        },
        {
          query: "Top 10 largest transactions",
          description: "Sort and limit results",
        },
        {
          query: "Spending at restaurants past 30 days",
          description: "Combine payee, category, and date filters",
        },
        {
          query: "Subscriptions between $10 and $50",
          description: "Amount range filtering",
        },
      ],
    };
  }),
});
