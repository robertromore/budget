/**
 * User Behavior tRPC Routes
 *
 * Provides API endpoints for user behavior tracking, acceptance prediction,
 * and engagement optimization.
 */

import { rateLimitedProcedure, t } from "$lib/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createMLModelStore } from "../model-store";
import { createUserBehaviorService } from "./service";

// Lazy initialization of services (singleton pattern)
let userBehaviorService: ReturnType<typeof createUserBehaviorService> | null = null;

function getUserBehaviorService() {
  if (!userBehaviorService) {
    const modelStore = createMLModelStore();
    userBehaviorService = createUserBehaviorService(modelStore);
  }
  return userBehaviorService;
}

// Zod schemas
const recommendationInputSchema = z.object({
  recommendationId: z.string(),
  confidence: z.number().min(0).max(1),
  entityType: z.string(),
  entityId: z.number().optional(),
  categoryId: z.number().optional(),
  amount: z.number().optional(),
  isRecurring: z.boolean().optional(),
  similarityScore: z.number().min(0).max(1).optional(),
  explanation: z.string().optional(),
});

const outcomeSchema = z.object({
  recommendationId: z.string(),
  outcome: z.enum(["accepted", "rejected", "corrected", "ignored"]),
  timeToDecision: z.number().nonnegative(),
  correction: z
    .object({
      from: z.unknown(),
      to: z.unknown(),
    })
    .optional(),
  feedback: z.string().optional(),
});

export const userBehaviorRoutes = t.router({
  /**
   * Track a user interaction
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
        const service = getUserBehaviorService();

        service.trackInteraction(
          ctx.workspaceId,
          input.interactionType,
          input.entityType,
          input.metadata ?? {}
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

  /**
   * Record recommendation outcome
   */
  recordOutcome: rateLimitedProcedure.input(outcomeSchema).mutation(async ({ input, ctx }) => {
    try {
      const service = getUserBehaviorService();

      service.recordOutcome(ctx.workspaceId, input);

      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to record outcome: ${errorMessage}`,
      });
    }
  }),

  /**
   * Predict acceptance for a single recommendation
   */
  predictAcceptance: rateLimitedProcedure
    .input(recommendationInputSchema)
    .query(async ({ input, ctx }) => {
      try {
        const service = getUserBehaviorService();

        const prediction = await service.predictAcceptance(ctx.workspaceId, input);

        return prediction;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to predict acceptance: ${errorMessage}`,
        });
      }
    }),

  /**
   * Batch predict acceptance for multiple recommendations
   */
  batchPredictAcceptance: rateLimitedProcedure
    .input(
      z.object({
        recommendations: z.array(recommendationInputSchema).max(50),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const service = getUserBehaviorService();

        const predictions = await service.batchPredictAcceptance(
          ctx.workspaceId,
          input.recommendations
        );

        return {
          predictions,
          total: predictions.length,
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to batch predict: ${errorMessage}`,
        });
      }
    }),

  /**
   * Get optimized recommendations with predictions
   */
  getOptimizedRecommendations: rateLimitedProcedure
    .input(
      z.object({
        recommendations: z.array(recommendationInputSchema).max(50),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const service = getUserBehaviorService();

        const optimized = await service.getOptimizedRecommendations(
          ctx.workspaceId,
          input.recommendations
        );

        return {
          recommendations: optimized,
          total: optimized.length,
          showCount: optimized.filter((r) => r.shouldShow).length,
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to optimize recommendations: ${errorMessage}`,
        });
      }
    }),

  /**
   * Get engagement optimization strategy
   */
  optimizeEngagement: rateLimitedProcedure
    .input(
      z.object({
        recommendations: z.array(recommendationInputSchema).max(50),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const service = getUserBehaviorService();

        const optimization = await service.optimizeEngagement(
          ctx.workspaceId,
          input.recommendations
        );

        return optimization;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to optimize engagement: ${errorMessage}`,
        });
      }
    }),

  /**
   * Get user behavior profile
   */
  getProfile: rateLimitedProcedure.query(async ({ ctx }) => {
    try {
      const service = getUserBehaviorService();

      const profile = await service.getProfile(ctx.workspaceId);

      return profile;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to get profile: ${errorMessage}`,
      });
    }
  }),

  /**
   * Get interaction statistics
   */
  getInteractionStats: rateLimitedProcedure
    .input(
      z.object({
        entityType: z.string().optional(),
        daysBack: z.number().min(1).max(365).default(30),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const service = getUserBehaviorService();

        const stats = service.getInteractionStats(ctx.workspaceId, {
          entityType: input.entityType,
          daysBack: input.daysBack,
        });

        return stats;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get interaction stats: ${errorMessage}`,
        });
      }
    }),

  /**
   * Get calibration report
   */
  getCalibrationReport: rateLimitedProcedure.query(async ({ ctx }) => {
    try {
      const service = getUserBehaviorService();

      const report = service.getCalibrationReport(ctx.workspaceId);

      return report;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to get calibration report: ${errorMessage}`,
      });
    }
  }),

  /**
   * Calibrate a confidence score
   */
  calibrateConfidence: rateLimitedProcedure
    .input(
      z.object({
        confidence: z.number().min(0).max(1),
        entityType: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const service = getUserBehaviorService();

        const calibrated = service.calibrateConfidence(
          ctx.workspaceId,
          input.confidence,
          input.entityType
        );

        return {
          original: input.confidence,
          calibrated,
          adjustment: calibrated - input.confidence,
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to calibrate confidence: ${errorMessage}`,
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
        const service = getUserBehaviorService();

        const threshold = await service.getPersonalizedThreshold(
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
   * Retrain models
   */
  retrainModels: rateLimitedProcedure.mutation(async ({ ctx }) => {
    try {
      const service = getUserBehaviorService();

      await service.retrainModels(ctx.workspaceId);

      const metrics = await service.getHealthMetrics(ctx.workspaceId);

      return {
        success: true,
        metrics,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to retrain models: ${errorMessage}`,
      });
    }
  }),

  /**
   * Get service health metrics
   */
  getHealthMetrics: rateLimitedProcedure.query(async ({ ctx }) => {
    try {
      const service = getUserBehaviorService();

      const metrics = await service.getHealthMetrics(ctx.workspaceId);

      return metrics;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to get health metrics: ${errorMessage}`,
      });
    }
  }),
});
