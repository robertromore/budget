/**
 * Similarity Service tRPC Routes
 *
 * Provides API endpoints for payee similarity, merchant canonicalization,
 * and category matching.
 */

import { rateLimitedProcedure, t } from "$lib/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createMLModelStore } from "../model-store";
import { createSimilarityService } from "./service";
import { extractMerchantName, normalizeMerchantName } from "./text-similarity";

// Lazy initialization of services (singleton pattern)
let similarityService: ReturnType<typeof createSimilarityService> | null = null;

function getSimilarityService() {
  if (!similarityService) {
    const modelStore = createMLModelStore();
    similarityService = createSimilarityService(modelStore);
  }
  return similarityService;
}

export const similarityRoutes = t.router({
  /**
   * Find similar payees to a query string
   */
  findSimilarPayees: rateLimitedProcedure
    .input(
      z.object({
        query: z.string().min(1).max(200),
        limit: z.number().min(1).max(50).default(10),
        minScore: z.number().min(0).max(1).default(0.5),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const service = getSimilarityService();

        const results = await service.findSimilarPayees(ctx.workspaceId, input.query, {
          limit: input.limit,
          minScore: input.minScore,
        });

        return {
          query: input.query,
          results,
          total: results.length,
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to find similar payees: ${errorMessage}`,
        });
      }
    }),

  /**
   * Match a transaction description to an existing payee
   */
  matchPayee: rateLimitedProcedure
    .input(
      z.object({
        transactionDescription: z.string().min(1).max(500),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const service = getSimilarityService();

        const match = await service.matchPayee(ctx.workspaceId, input.transactionDescription);

        return {
          description: input.transactionDescription,
          match,
          found: match !== null,
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to match payee: ${errorMessage}`,
        });
      }
    }),

  /**
   * Get canonical form for a merchant name
   */
  getCanonical: rateLimitedProcedure
    .input(
      z.object({
        merchantName: z.string().min(1).max(200),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const service = getSimilarityService();

        const canonical = await service.getCanonical(ctx.workspaceId, input.merchantName);

        return {
          input: input.merchantName,
          canonical,
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get canonical: ${errorMessage}`,
        });
      }
    }),

  /**
   * Get all canonical groups for the workspace
   */
  getCanonicalGroups: rateLimitedProcedure.query(async ({ ctx }) => {
    try {
      const service = getSimilarityService();

      const groups = await service.getCanonicalGroups(ctx.workspaceId);

      return {
        groups,
        total: groups.length,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to get canonical groups: ${errorMessage}`,
      });
    }
  }),

  /**
   * Find similar categories
   */
  findSimilarCategories: rateLimitedProcedure
    .input(
      z.object({
        query: z.string().min(1).max(200),
        limit: z.number().min(1).max(20).default(5),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const service = getSimilarityService();

        const results = await service.findSimilarCategories(ctx.workspaceId, input.query, {
          limit: input.limit,
        });

        return {
          query: input.query,
          results,
          total: results.length,
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to find similar categories: ${errorMessage}`,
        });
      }
    }),

  /**
   * Suggest category based on similar payees
   */
  suggestCategory: rateLimitedProcedure
    .input(
      z.object({
        payeeName: z.string().min(1).max(200),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const service = getSimilarityService();

        const suggestion = await service.suggestCategoryByPayee(ctx.workspaceId, input.payeeName);

        return {
          payeeName: input.payeeName,
          suggestion,
          found: suggestion !== null,
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to suggest category: ${errorMessage}`,
        });
      }
    }),

  /**
   * Initialize or refresh the LSH index for fast similarity lookups
   */
  initializeIndex: rateLimitedProcedure.mutation(async ({ ctx }) => {
    try {
      const service = getSimilarityService();

      await service.initializeLSHIndex(ctx.workspaceId);

      const stats = await service.getStats(ctx.workspaceId);

      return {
        success: true,
        message: "LSH index initialized successfully",
        stats,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to initialize index: ${errorMessage}`,
      });
    }
  }),

  /**
   * Get similarity service statistics
   */
  getStats: rateLimitedProcedure.query(async ({ ctx }) => {
    try {
      const service = getSimilarityService();

      const stats = await service.getStats(ctx.workspaceId);

      return stats;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to get stats: ${errorMessage}`,
      });
    }
  }),

  /**
   * Batch match payees from transaction descriptions
   */
  batchMatchPayees: rateLimitedProcedure
    .input(
      z.object({
        descriptions: z.array(z.string().min(1).max(500)).max(100),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const service = getSimilarityService();

        const results = await Promise.all(
          input.descriptions.map(async (description) => {
            const match = await service.matchPayee(ctx.workspaceId, description);
            return {
              description,
              match,
            };
          })
        );

        const matched = results.filter((r) => r.match !== null).length;

        return {
          results,
          total: results.length,
          matched,
          unmatched: results.length - matched,
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to batch match payees: ${errorMessage}`,
        });
      }
    }),

  /**
   * Normalize a single merchant name (clean up messy transaction descriptions)
   */
  normalizeMerchant: rateLimitedProcedure
    .input(
      z.object({
        description: z.string().min(1).max(500),
      })
    )
    .query(({ input }) => {
      const extracted = extractMerchantName(input.description);
      const normalized = normalizeMerchantName(input.description);

      return {
        original: input.description,
        extracted,
        normalized,
      };
    }),

  /**
   * Normalize multiple merchant names in batch
   */
  batchNormalizeMerchants: rateLimitedProcedure
    .input(
      z.object({
        descriptions: z.array(z.string().min(1).max(500)).max(500),
      })
    )
    .query(({ input }) => {
      const results = input.descriptions.map((description) => ({
        original: description,
        extracted: extractMerchantName(description),
        normalized: normalizeMerchantName(description),
      }));

      // Count unique normalized names
      const uniqueNormalized = new Set(results.map((r) => r.normalized)).size;

      return {
        results,
        total: results.length,
        uniqueNormalized,
        consolidationRatio: results.length > 0 ? uniqueNormalized / results.length : 1,
      };
    }),

  /**
   * Preview normalization for transactions - shows what would change
   */
  previewNormalization: rateLimitedProcedure
    .input(
      z.object({
        descriptions: z.array(z.string().min(1).max(500)).max(100),
      })
    )
    .query(({ input }) => {
      const results = input.descriptions.map((description) => {
        const normalized = normalizeMerchantName(description);
        const wouldChange = description.trim() !== normalized;

        return {
          original: description,
          normalized,
          wouldChange,
        };
      });

      const changesNeeded = results.filter((r) => r.wouldChange).length;

      return {
        results,
        total: results.length,
        changesNeeded,
        alreadyNormalized: results.length - changesNeeded,
      };
    }),
});
