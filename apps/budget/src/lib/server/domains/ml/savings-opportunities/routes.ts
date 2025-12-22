/**
 * Savings Opportunities Detection tRPC Routes
 *
 * Provides API endpoints for identifying potential savings including
 * unused subscriptions, price increases, duplicates, and spending increases.
 */

import { rateLimitedProcedure, t } from "$lib/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createMLModelStore } from "../model-store";
import { createSavingsOpportunityService, type SavingsOpportunity } from "./service";

// Lazy initialization of service (singleton pattern)
let savingsOpportunityService: ReturnType<typeof createSavingsOpportunityService> | null = null;

function getSavingsOpportunityService() {
  if (!savingsOpportunityService) {
    const modelStore = createMLModelStore();
    savingsOpportunityService = createSavingsOpportunityService(modelStore);
  }
  return savingsOpportunityService;
}

// Opportunity type schema
const opportunityTypeSchema = z.enum([
  "unused_subscription",
  "price_increase",
  "duplicate_service",
  "spending_increase",
  "negotiation_candidate",
]);

export const savingsOpportunityRoutes = t.router({
  /**
   * Get all savings opportunities
   */
  getAll: rateLimitedProcedure
    .input(
      z.object({
        lookbackMonths: z.number().min(3).max(24).default(12),
        minAmount: z.number().min(0).default(5),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      try {
        const service = getSavingsOpportunityService();

        const summary = await service.getOpportunities(ctx.workspaceId, {
          lookbackMonths: input?.lookbackMonths,
          minSubscriptionAmount: input?.minAmount,
        });

        return {
          ...summary,
          success: true,
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get savings opportunities: ${errorMessage}`,
        });
      }
    }),

  /**
   * Get opportunities by type
   */
  byType: rateLimitedProcedure
    .input(
      z.object({
        type: opportunityTypeSchema,
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const service = getSavingsOpportunityService();

        let opportunities: SavingsOpportunity[];
        switch (input.type) {
          case "unused_subscription":
            opportunities = await service.detectUnusedSubscriptions(ctx.workspaceId);
            break;
          case "price_increase":
            opportunities = await service.detectPriceIncreases(ctx.workspaceId);
            break;
          case "duplicate_service":
            opportunities = await service.detectDuplicates(ctx.workspaceId);
            break;
          case "spending_increase":
            opportunities = await service.detectSpendingIncreases(ctx.workspaceId);
            break;
          case "negotiation_candidate":
            opportunities = await service.detectNegotiationCandidates(ctx.workspaceId);
            break;
          default:
            opportunities = [];
        }

        return {
          type: input.type,
          opportunities,
          count: opportunities.length,
          totalMonthlyPotential: opportunities.reduce(
            (sum, o) => sum + o.estimatedMonthlySavings,
            0
          ),
          success: true,
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get opportunities by type: ${errorMessage}`,
        });
      }
    }),

  /**
   * Get unused subscriptions only
   */
  unusedSubscriptions: rateLimitedProcedure.query(async ({ ctx }) => {
    try {
      const service = getSavingsOpportunityService();
      const opportunities = await service.detectUnusedSubscriptions(ctx.workspaceId);

      return {
        opportunities,
        count: opportunities.length,
        totalMonthlyPotential: opportunities.reduce(
          (sum, o) => sum + o.estimatedMonthlySavings,
          0
        ),
        success: true,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to detect unused subscriptions: ${errorMessage}`,
      });
    }
  }),

  /**
   * Get price increases only
   */
  priceIncreases: rateLimitedProcedure.query(async ({ ctx }) => {
    try {
      const service = getSavingsOpportunityService();
      const opportunities = await service.detectPriceIncreases(ctx.workspaceId);

      return {
        opportunities,
        count: opportunities.length,
        totalMonthlyPotential: opportunities.reduce(
          (sum, o) => sum + o.estimatedMonthlySavings,
          0
        ),
        success: true,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to detect price increases: ${errorMessage}`,
      });
    }
  }),

  /**
   * Get duplicate services only
   */
  duplicates: rateLimitedProcedure.query(async ({ ctx }) => {
    try {
      const service = getSavingsOpportunityService();
      const opportunities = await service.detectDuplicates(ctx.workspaceId);

      return {
        opportunities,
        count: opportunities.length,
        totalMonthlyPotential: opportunities.reduce(
          (sum, o) => sum + o.estimatedMonthlySavings,
          0
        ),
        success: true,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to detect duplicate services: ${errorMessage}`,
      });
    }
  }),

  /**
   * Get spending increases only
   */
  spendingIncreases: rateLimitedProcedure.query(async ({ ctx }) => {
    try {
      const service = getSavingsOpportunityService();
      const opportunities = await service.detectSpendingIncreases(ctx.workspaceId);

      return {
        opportunities,
        count: opportunities.length,
        totalMonthlyPotential: opportunities.reduce(
          (sum, o) => sum + o.estimatedMonthlySavings,
          0
        ),
        success: true,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to detect spending increases: ${errorMessage}`,
      });
    }
  }),

  /**
   * Get negotiation candidates (bills that could be negotiated for better rates)
   */
  negotiationCandidates: rateLimitedProcedure.query(async ({ ctx }) => {
    try {
      const service = getSavingsOpportunityService();
      const opportunities = await service.detectNegotiationCandidates(ctx.workspaceId);

      return {
        opportunities,
        count: opportunities.length,
        totalMonthlyPotential: opportunities.reduce(
          (sum, o) => sum + o.estimatedMonthlySavings,
          0
        ),
        success: true,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to detect negotiation candidates: ${errorMessage}`,
      });
    }
  }),

  /**
   * Get quick dashboard summary
   */
  summary: rateLimitedProcedure.query(async ({ ctx }) => {
    try {
      const service = getSavingsOpportunityService();
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
   * Get high-priority opportunities only
   */
  highPriority: rateLimitedProcedure.query(async ({ ctx }) => {
    try {
      const service = getSavingsOpportunityService();
      const { opportunities } = await service.getOpportunities(ctx.workspaceId);

      const highPriority = opportunities.filter((o) => o.priority === "high");

      return {
        opportunities: highPriority,
        count: highPriority.length,
        totalMonthlyPotential: highPriority.reduce(
          (sum, o) => sum + o.estimatedMonthlySavings,
          0
        ),
        success: true,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to get high-priority opportunities: ${errorMessage}`,
      });
    }
  }),
});
