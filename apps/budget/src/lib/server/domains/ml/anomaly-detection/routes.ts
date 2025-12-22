/**
 * Anomaly Detection tRPC Routes
 *
 * Provides API endpoints for transaction anomaly detection and scoring.
 */

import { rateLimitedProcedure, t } from "$lib/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createMLModelStore } from "../model-store";
import { createAnomalyDetectionService } from "./service";

// Lazy initialization of services (singleton pattern)
let anomalyService: ReturnType<typeof createAnomalyDetectionService> | null = null;

function getAnomalyService() {
  if (!anomalyService) {
    const modelStore = createMLModelStore();
    anomalyService = createAnomalyDetectionService(modelStore);
  }
  return anomalyService;
}

export const anomalyDetectionRoutes = t.router({
  /**
   * Score a single transaction for anomalies
   */
  scoreTransaction: rateLimitedProcedure
    .input(
      z.object({
        transactionId: z.number().positive(),
        amount: z.number(),
        date: z.string(),
        payeeId: z.number().positive().optional(),
        categoryId: z.number().positive().optional(),
        accountId: z.number().positive(),
        notes: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const service = getAnomalyService();

        const score = await service.scoreTransaction(ctx.workspaceId, {
          id: input.transactionId,
          amount: input.amount,
          date: input.date,
          payeeId: input.payeeId,
          categoryId: input.categoryId,
          accountId: input.accountId,
          notes: input.notes,
        });

        return score;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to score transaction: ${errorMessage}`,
        });
      }
    }),

  /**
   * Score multiple transactions in batch
   */
  scoreTransactions: rateLimitedProcedure
    .input(
      z.object({
        transactionIds: z.array(z.number().positive()).max(50),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const service = getAnomalyService();

        const scores = await service.scoreTransactions(ctx.workspaceId, input.transactionIds);

        return scores;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to score transactions: ${errorMessage}`,
        });
      }
    }),

  /**
   * Scan recent transactions for anomalies
   */
  scanRecent: rateLimitedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(90).default(7),
        limit: z.number().min(1).max(500).default(100),
        minRiskLevel: z.enum(["low", "medium", "high", "critical"]).default("medium"),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const service = getAnomalyService();

        const scores = await service.scanRecentTransactions(ctx.workspaceId, {
          days: input.days,
          limit: input.limit,
          minRiskLevel: input.minRiskLevel,
        });

        return {
          total: scores.length,
          scores,
          summary: {
            critical: scores.filter((s) => s.riskLevel === "critical").length,
            high: scores.filter((s) => s.riskLevel === "high").length,
            medium: scores.filter((s) => s.riskLevel === "medium").length,
            low: scores.filter((s) => s.riskLevel === "low").length,
          },
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to scan transactions: ${errorMessage}`,
        });
      }
    }),

  /**
   * Get anomaly profile for a specific payee
   */
  payeeProfile: rateLimitedProcedure
    .input(
      z.object({
        payeeId: z.number().positive(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const service = getAnomalyService();

        const profile = await service.getPayeeAnomalyProfile(ctx.workspaceId, input.payeeId);

        return profile;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get payee anomaly profile: ${errorMessage}`,
        });
      }
    }),

  /**
   * Create anomaly alerts for scored transactions
   */
  createAlerts: rateLimitedProcedure
    .input(
      z.object({
        transactionIds: z.array(z.number().positive()).max(50),
        minRiskLevel: z.enum(["medium", "high", "critical"]).default("high"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const service = getAnomalyService();

        // Score the transactions
        const scores = await service.scoreTransactions(ctx.workspaceId, input.transactionIds);

        // Create alerts for qualifying scores
        const alertIds = await service.autoCreateAlerts(
          ctx.workspaceId,
          scores,
          input.minRiskLevel
        );

        return {
          alertsCreated: alertIds.length,
          alertIds,
          scoresProcessed: scores.length,
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create alerts: ${errorMessage}`,
        });
      }
    }),

  /**
   * Run a full anomaly scan and create alerts
   */
  scanAndAlert: rateLimitedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(30).default(7),
        minRiskLevel: z.enum(["medium", "high", "critical"]).default("high"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const service = getAnomalyService();

        // Scan recent transactions
        const scores = await service.scanRecentTransactions(ctx.workspaceId, {
          days: input.days,
          limit: 500,
          minRiskLevel: input.minRiskLevel,
        });

        // Create alerts
        const alertIds = await service.autoCreateAlerts(
          ctx.workspaceId,
          scores,
          input.minRiskLevel
        );

        return {
          transactionsScanned: scores.length,
          alertsCreated: alertIds.length,
          alertIds,
          summary: {
            critical: scores.filter((s) => s.riskLevel === "critical").length,
            high: scores.filter((s) => s.riskLevel === "high").length,
            medium: scores.filter((s) => s.riskLevel === "medium").length,
          },
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to run scan and alert: ${errorMessage}`,
        });
      }
    }),
});
