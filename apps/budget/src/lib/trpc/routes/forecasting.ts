/**
 * Forecasting tRPC Routes
 *
 * Provides API endpoints for time series forecasting, cash flow predictions,
 * and spending projections.
 */

import {
  createFeatureEngineeringService,
  createMLModelStore,
  createTimeSeriesForecastingService,
} from "$lib/server/domains/ml";
import { rateLimitedProcedure, t } from "$lib/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

// Lazy initialization of services (singleton pattern)
let forecastingService: ReturnType<typeof createTimeSeriesForecastingService> | null = null;

function getForecastingService() {
  if (!forecastingService) {
    const modelStore = createMLModelStore();
    const featureService = createFeatureEngineeringService();
    forecastingService = createTimeSeriesForecastingService(modelStore, featureService);
  }
  return forecastingService;
}

export const forecastingRoutes = t.router({
  /**
   * Get cash flow predictions for a workspace or specific account
   */
  cashFlow: rateLimitedProcedure
    .input(
      z.object({
        accountId: z.number().positive().optional(),
        horizon: z.number().min(1).max(24).default(6),
        granularity: z.enum(["daily", "weekly", "monthly"]).default("monthly"),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const service = getForecastingService();

        const prediction = await service.predictCashFlow(ctx.workspaceId, {
          horizon: input.horizon,
          granularity: input.granularity,
          accountId: input.accountId,
        });

        return prediction;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to generate cash flow prediction: ${errorMessage}`,
        });
      }
    }),

  /**
   * Get spending forecast for a specific category
   */
  categorySpending: rateLimitedProcedure
    .input(
      z.object({
        categoryId: z.number().positive(),
        horizon: z.number().min(1).max(12).default(3),
        confidenceLevel: z.number().min(0.8).max(0.99).default(0.95),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const service = getForecastingService();

        const forecast = await service.predictCategorySpending(ctx.workspaceId, input.categoryId, {
          horizon: input.horizon,
          confidenceLevel: input.confidenceLevel,
        });

        return {
          categoryId: input.categoryId,
          forecast,
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to generate category spending forecast: ${errorMessage}`,
        });
      }
    }),

  /**
   * Get spending forecast for a specific payee
   */
  payeeSpending: rateLimitedProcedure
    .input(
      z.object({
        payeeId: z.number().positive(),
        horizon: z.number().min(1).max(12).default(3),
        confidenceLevel: z.number().min(0.8).max(0.99).default(0.95),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const service = getForecastingService();

        const forecast = await service.predictPayeeSpending(ctx.workspaceId, input.payeeId, {
          horizon: input.horizon,
          confidenceLevel: input.confidenceLevel,
        });

        return {
          payeeId: input.payeeId,
          forecast,
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to generate payee spending forecast: ${errorMessage}`,
        });
      }
    }),

  /**
   * Get a bulk forecast for multiple categories
   */
  bulkCategoryForecasts: rateLimitedProcedure
    .input(
      z.object({
        categoryIds: z.array(z.number().positive()).max(20),
        horizon: z.number().min(1).max(12).default(3),
        confidenceLevel: z.number().min(0.8).max(0.99).default(0.95),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const service = getForecastingService();

        const forecasts = await Promise.all(
          input.categoryIds.map(async (categoryId) => {
            const forecast = await service.predictCategorySpending(ctx.workspaceId, categoryId, {
              horizon: input.horizon,
              confidenceLevel: input.confidenceLevel,
            });
            return { categoryId, forecast };
          })
        );

        return forecasts;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to generate bulk category forecasts: ${errorMessage}`,
        });
      }
    }),

  /**
   * Get ML model health status
   */
  modelHealth: rateLimitedProcedure.query(async ({ ctx }) => {
    try {
      const modelStore = createMLModelStore();
      const status = await modelStore.getModelStatus(ctx.workspaceId);
      const accuracy = await modelStore.getPredictionAccuracy(ctx.workspaceId, "time_series", 30);
      const acceptanceRate = await modelStore.getAcceptanceRate(ctx.workspaceId, 30);

      return {
        models: status,
        predictionAccuracy: accuracy,
        recommendationAcceptance: acceptanceRate,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to get model health: ${errorMessage}`,
      });
    }
  }),

  /**
   * Get pending anomaly alerts
   */
  anomalyAlerts: rateLimitedProcedure
    .input(
      z.object({
        riskLevel: z.enum(["low", "medium", "high", "critical"]).optional(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const modelStore = createMLModelStore();
        const alerts = await modelStore.getPendingAlerts(ctx.workspaceId, {
          riskLevel: input.riskLevel,
          limit: input.limit,
        });

        return alerts;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get anomaly alerts: ${errorMessage}`,
        });
      }
    }),

  /**
   * Update anomaly alert status
   */
  updateAlertStatus: rateLimitedProcedure
    .input(
      z.object({
        alertId: z.number().positive(),
        status: z.enum(["reviewed", "dismissed", "confirmed"]),
        notes: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const modelStore = createMLModelStore();
        await modelStore.updateAlertStatus(input.alertId, input.status, input.notes);

        return { success: true };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to update alert status: ${errorMessage}`,
        });
      }
    }),

  /**
   * Track user behavior event for ML learning
   */
  trackBehavior: rateLimitedProcedure
    .input(
      z.object({
        eventType: z.enum([
          "recommendation_shown",
          "recommendation_accepted",
          "recommendation_rejected",
          "recommendation_corrected",
          "recommendation_ignored",
          "category_changed",
          "transaction_edited",
        ]),
        recommendationId: z.string().optional(),
        entityType: z.string().optional(),
        entityId: z.number().positive().optional(),
        eventData: z.record(z.string(), z.unknown()).optional(),
        timeToAction: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const modelStore = createMLModelStore();
        const eventId = await modelStore.trackBehaviorEvent(ctx.workspaceId, {
          eventType: input.eventType,
          recommendationId: input.recommendationId,
          entityType: input.entityType,
          entityId: input.entityId,
          eventData: input.eventData,
          timeToAction: input.timeToAction,
        });

        return { eventId };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to track behavior event: ${errorMessage}`,
        });
      }
    }),
});
