/**
 * Budget Overspend Prediction tRPC Routes
 *
 * Provides API endpoints for predicting budget overruns before month-end
 * by analyzing spending rates, recurring transactions, and historical patterns.
 */

import { rateLimitedProcedure, t } from "$lib/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createMLModelStore } from "../model-store";
import { createBudgetPredictionService, type OverspendRisk } from "./service";

// Lazy initialization of services (singleton pattern)
let budgetPredictionService: ReturnType<typeof createBudgetPredictionService> | null = null;

function getBudgetPredictionService() {
  if (!budgetPredictionService) {
    const modelStore = createMLModelStore();
    budgetPredictionService = createBudgetPredictionService(modelStore);
  }
  return budgetPredictionService;
}

// Risk level schema
const riskLevelSchema = z.enum(["none", "low", "medium", "high", "critical"]);

export const budgetPredictionRoutes = t.router({
  /**
   * Predict overspend for a specific budget
   */
  predict: rateLimitedProcedure
    .input(
      z.object({
        budgetId: z.number().int().positive(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const service = getBudgetPredictionService();

        const prediction = await service.predictOverspend(
          ctx.workspaceId,
          input.budgetId
        );

        if (!prediction) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Budget not found or has no active period",
          });
        }

        return {
          prediction,
          success: true,
        };
      } catch (error: unknown) {
        if (error instanceof TRPCError) throw error;
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to predict budget overspend: ${errorMessage}`,
        });
      }
    }),

  /**
   * Get overspend predictions for all budgets in the workspace
   */
  predictAll: rateLimitedProcedure.query(async ({ ctx }) => {
    try {
      const service = getBudgetPredictionService();

      const summary = await service.predictWorkspaceOverspend(ctx.workspaceId);

      return {
        summary,
        success: true,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to predict workspace overspend: ${errorMessage}`,
      });
    }
  }),

  /**
   * Get budgets at risk of overspending
   */
  atRisk: rateLimitedProcedure
    .input(
      z.object({
        minRisk: riskLevelSchema.default("low"),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const service = getBudgetPredictionService();

        const budgets = await service.getBudgetsAtRisk(
          ctx.workspaceId,
          input.minRisk as OverspendRisk
        );

        return {
          budgets,
          total: budgets.length,
          minRiskFilter: input.minRisk,
          success: true,
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get at-risk budgets: ${errorMessage}`,
        });
      }
    }),

  /**
   * Get daily spending limit recommendation for a budget
   */
  dailyLimit: rateLimitedProcedure
    .input(
      z.object({
        budgetId: z.number().int().positive(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const service = getBudgetPredictionService();

        const result = await service.getDailySpendingLimit(
          ctx.workspaceId,
          input.budgetId
        );

        return {
          budgetId: input.budgetId,
          ...result,
          success: true,
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get daily spending limit: ${errorMessage}`,
        });
      }
    }),

  /**
   * Get category-level overspend predictions within a budget
   */
  categoryBreakdown: rateLimitedProcedure
    .input(
      z.object({
        budgetId: z.number().int().positive(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const service = getBudgetPredictionService();

        const categories = await service.predictCategoryOverspend(
          ctx.workspaceId,
          input.budgetId
        );

        const atRisk = categories.filter((c) => c.risk !== "none").length;

        return {
          budgetId: input.budgetId,
          categories,
          total: categories.length,
          categoriesAtRisk: atRisk,
          success: true,
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get category breakdown: ${errorMessage}`,
        });
      }
    }),

  /**
   * Get a quick summary of budget health for dashboard display
   */
  healthSummary: rateLimitedProcedure.query(async ({ ctx }) => {
    try {
      const service = getBudgetPredictionService();

      const summary = await service.predictWorkspaceOverspend(ctx.workspaceId);

      // Create a simplified summary for dashboard
      return {
        totalBudgets: summary.predictions.length,
        budgetsAtRisk: summary.budgetsAtRisk,
        overallRisk: summary.overallRisk,
        totalAllocated: summary.totalAllocated,
        totalSpent: summary.totalSpent,
        percentSpent: summary.totalAllocated > 0
          ? (summary.totalSpent / summary.totalAllocated) * 100
          : 0,
        predictedOverspend: summary.totalPredictedOverspend,
        topRisks: summary.predictions
          .filter((p) => p.overSpendRisk !== "none")
          .slice(0, 3)
          .map((p) => ({
            budgetId: p.budgetId,
            budgetName: p.budgetName,
            risk: p.overSpendRisk,
            predictedOverspend: p.predictedOverspend,
            percentSpent: p.percentUsed,
            recommendation: p.recommendation,
          })),
        lastUpdated: summary.lastUpdated,
        success: true,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to get health summary: ${errorMessage}`,
      });
    }
  }),
});
