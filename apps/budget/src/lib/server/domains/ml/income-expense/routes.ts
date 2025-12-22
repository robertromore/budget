/**
 * Income vs Expense Breakdown tRPC Routes
 *
 * Provides API endpoints for income/expense analysis including
 * trend indicators, period comparisons, and forecasts.
 */

import { rateLimitedProcedure, t } from "$lib/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createIncomeExpenseService } from "./service";

// Lazy initialization of service (singleton pattern)
let incomeExpenseService: ReturnType<typeof createIncomeExpenseService> | null = null;

function getIncomeExpenseService() {
  if (!incomeExpenseService) {
    incomeExpenseService = createIncomeExpenseService();
  }
  return incomeExpenseService;
}

export const incomeExpenseRoutes = t.router({
  /**
   * Get comprehensive income vs expense breakdown
   */
  breakdown: rateLimitedProcedure
    .input(
      z.object({
        months: z.number().min(3).max(36).default(12),
        forecastHorizon: z.number().min(1).max(12).default(3),
        accountId: z.number().positive().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const service = getIncomeExpenseService();

        const breakdown = await service.getBreakdown(ctx.workspaceId, {
          months: input.months,
          forecastHorizon: input.forecastHorizon,
          accountId: input.accountId,
        });

        return {
          breakdown,
          success: true,
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get income/expense breakdown: ${errorMessage}`,
        });
      }
    }),

  /**
   * Get income trend indicator
   */
  incomeTrend: rateLimitedProcedure.query(async ({ ctx }) => {
    try {
      const service = getIncomeExpenseService();
      const trend = await service.getIncomeTrend(ctx.workspaceId);

      return {
        trend,
        success: true,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to get income trend: ${errorMessage}`,
      });
    }
  }),

  /**
   * Get expense trend indicator
   */
  expenseTrend: rateLimitedProcedure.query(async ({ ctx }) => {
    try {
      const service = getIncomeExpenseService();
      const trend = await service.getExpenseTrend(ctx.workspaceId);

      return {
        trend,
        success: true,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to get expense trend: ${errorMessage}`,
      });
    }
  }),

  /**
   * Get period-over-period comparison
   */
  compare: rateLimitedProcedure
    .input(
      z.object({
        periodType: z.enum(["month", "quarter", "year"]),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const service = getIncomeExpenseService();

        const comparison = await service.getPeriodComparison(
          ctx.workspaceId,
          input.periodType
        );

        return {
          comparison,
          periodType: input.periodType,
          success: true,
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get period comparison: ${errorMessage}`,
        });
      }
    }),

  /**
   * Get income/expense history
   */
  history: rateLimitedProcedure
    .input(
      z.object({
        months: z.number().min(1).max(60).default(12),
        accountId: z.number().positive().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const service = getIncomeExpenseService();

        const history = await service.getHistory(
          ctx.workspaceId,
          input.months,
          input.accountId
        );

        return {
          history,
          total: history.length,
          success: true,
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get history: ${errorMessage}`,
        });
      }
    }),

  /**
   * Get quick dashboard summary
   */
  summary: rateLimitedProcedure.query(async ({ ctx }) => {
    try {
      const service = getIncomeExpenseService();
      const summary = await service.getSummary(ctx.workspaceId);

      return {
        ...summary,
        success: true,
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
   * Get trends for dashboard cards
   */
  trends: rateLimitedProcedure.query(async ({ ctx }) => {
    try {
      const service = getIncomeExpenseService();

      const [incomeTrend, expenseTrend] = await Promise.all([
        service.getIncomeTrend(ctx.workspaceId),
        service.getExpenseTrend(ctx.workspaceId),
      ]);

      return {
        income: incomeTrend,
        expenses: expenseTrend,
        success: true,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to get trends: ${errorMessage}`,
      });
    }
  }),
});
