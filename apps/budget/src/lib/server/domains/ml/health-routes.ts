/**
 * ML Health Monitoring tRPC Routes
 *
 * Provides API endpoints for ML system health monitoring,
 * model management, and unified ML operations.
 */

import { rateLimitedProcedure, t } from "$lib/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getUnifiedMLCoordinator } from "./unified-coordinator";

// =============================================================================
// ML Health Routes
// =============================================================================

export const mlHealthRoutes = t.router({
  /**
   * Get ML system health status
   */
  getHealthStatus: rateLimitedProcedure.query(async ({ ctx }) => {
    try {
      const coordinator = getUnifiedMLCoordinator();
      const status = await coordinator.getHealthStatus(ctx.workspaceId);
      return status;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to get health status: ${errorMessage}`,
      });
    }
  }),

  /**
   * Retrain ML models for workspace
   */
  retrainModels: rateLimitedProcedure.mutation(async ({ ctx }) => {
    try {
      const coordinator = getUnifiedMLCoordinator();
      const result = await coordinator.retrainModels(ctx.workspaceId);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to retrain models: ${errorMessage}`,
      });
    }
  }),

  /**
   * Get enhanced recommendations for a payee
   */
  getEnhancedRecommendations: rateLimitedProcedure
    .input(
      z.object({
        payeeId: z.number(),
        transactionAmount: z.number().optional(),
        transactionDate: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const coordinator = getUnifiedMLCoordinator();
        const recommendations = await coordinator.generateEnhancedRecommendations(
          input.payeeId,
          ctx.workspaceId,
          {
            transactionAmount: input.transactionAmount,
            transactionDate: input.transactionDate,
          }
        );
        return recommendations;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get enhanced recommendations: ${errorMessage}`,
        });
      }
    }),

  /**
   * Analyze a transaction for anomalies and suggestions
   */
  analyzeTransaction: rateLimitedProcedure
    .input(
      z.object({
        amount: z.number(),
        date: z.string(),
        description: z.string(),
        payeeId: z.number().optional(),
        categoryId: z.number().optional(),
        accountId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const coordinator = getUnifiedMLCoordinator();
        const analysis = await coordinator.analyzeTransaction(ctx.workspaceId, input);
        return analysis;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to analyze transaction: ${errorMessage}`,
        });
      }
    }),

  /**
   * Get cash flow forecast
   */
  getCashFlowForecast: rateLimitedProcedure
    .input(
      z.object({
        horizon: z.number().min(1).max(365).default(30),
        granularity: z.enum(["daily", "weekly", "monthly"]).default("monthly"),
        accountId: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const coordinator = getUnifiedMLCoordinator();
        const forecast = await coordinator.getCashFlowForecast(ctx.workspaceId, input);
        return forecast;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get cash flow forecast: ${errorMessage}`,
        });
      }
    }),

  /**
   * Get category spending forecast
   */
  getCategoryForecast: rateLimitedProcedure
    .input(
      z.object({
        categoryId: z.number(),
        horizon: z.number().min(1).max(12).default(3),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const coordinator = getUnifiedMLCoordinator();
        const forecast = await coordinator.getCategoryForecast(
          ctx.workspaceId,
          input.categoryId,
          input.horizon
        );
        return forecast;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get category forecast: ${errorMessage}`,
        });
      }
    }),

  /**
   * Get anomaly alerts
   */
  getAnomalyAlerts: rateLimitedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        minRiskLevel: z.enum(["low", "medium", "high", "critical"]).default("low"),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const coordinator = getUnifiedMLCoordinator();
        const alerts = await coordinator.getAnomalyAlerts(ctx.workspaceId, input);
        return {
          alerts,
          total: alerts.length,
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get anomaly alerts: ${errorMessage}`,
        });
      }
    }),

  /**
   * Batch score transactions for anomalies
   */
  batchScoreTransactions: rateLimitedProcedure
    .input(
      z.object({
        transactionIds: z.array(z.number()).max(100),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const coordinator = getUnifiedMLCoordinator();
        const scores = await coordinator.batchScoreTransactions(
          ctx.workspaceId,
          input.transactionIds
        );
        return {
          scores,
          total: scores.length,
          highRiskCount: scores.filter(
            (s) => s.riskLevel === "high" || s.riskLevel === "critical"
          ).length,
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to score transactions: ${errorMessage}`,
        });
      }
    }),

  /**
   * Find similar payees
   */
  findSimilarPayees: rateLimitedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(50).default(10),
        minScore: z.number().min(0).max(1).default(0.6),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const coordinator = getUnifiedMLCoordinator();
        const matches = await coordinator.findSimilarPayees(ctx.workspaceId, input.query, {
          limit: input.limit,
          minScore: input.minScore,
        });
        return {
          matches,
          total: matches.length,
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
   * Get canonical payee groups
   */
  getCanonicalGroups: rateLimitedProcedure.query(async ({ ctx }) => {
    try {
      const coordinator = getUnifiedMLCoordinator();
      const groups = await coordinator.getCanonicalGroups(ctx.workspaceId);
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
   * Initialize similarity index for fast matching
   */
  initializeSimilarityIndex: rateLimitedProcedure.mutation(async ({ ctx }) => {
    try {
      const coordinator = getUnifiedMLCoordinator();
      await coordinator.initializeSimilarityIndex(ctx.workspaceId);
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to initialize similarity index: ${errorMessage}`,
      });
    }
  }),

  /**
   * Get user behavior profile
   */
  getUserProfile: rateLimitedProcedure.query(async ({ ctx }) => {
    try {
      const coordinator = getUnifiedMLCoordinator();
      const profile = await coordinator.getUserProfile(ctx.workspaceId);
      return profile;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to get user profile: ${errorMessage}`,
      });
    }
  }),

  /**
   * Get personalized confidence threshold
   */
  getPersonalizedThreshold: rateLimitedProcedure
    .input(
      z.object({
        targetAcceptanceRate: z.number().min(0).max(1).default(0.8),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const coordinator = getUnifiedMLCoordinator();
        const threshold = await coordinator.getPersonalizedThreshold(
          ctx.workspaceId,
          input.targetAcceptanceRate
        );
        return {
          threshold,
          targetAcceptanceRate: input.targetAcceptanceRate,
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get personalized threshold: ${errorMessage}`,
        });
      }
    }),

  /**
   * Track user interaction
   */
  trackInteraction: rateLimitedProcedure
    .input(
      z.object({
        interactionType: z.enum([
          "recommendation_shown",
          "recommendation_accepted",
          "recommendation_rejected",
          "recommendation_corrected",
          "recommendation_ignored",
          "category_selected",
          "payee_selected",
          "threshold_adjusted",
        ]),
        entityType: z.string(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const coordinator = getUnifiedMLCoordinator();
        coordinator.trackInteraction(
          ctx.workspaceId,
          input.interactionType,
          input.entityType,
          input.metadata
        );
        return { success: true };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to track interaction: ${errorMessage}`,
        });
      }
    }),
});
