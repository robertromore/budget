import {
  getRecurringDetectionService,
  type DetectionOptions,
} from "$lib/server/domains/shared/recurring-detection";
import { publicProcedure, t } from "$lib/trpc";
import { withErrorHandler } from "$lib/trpc/shared/errors";
import { z } from "zod";

const detectionOptionsSchema = z
  .object({
    accountIds: z.array(z.number().int().positive()).optional(),
    months: z.number().int().min(1).max(24).optional(),
    minTransactions: z.number().int().min(2).max(20).optional(),
    minConfidence: z.number().min(0).max(100).optional(),
    minPredictability: z.number().min(0).max(100).optional(),
    includeExisting: z.boolean().optional(),
    patternTypes: z
      .array(z.enum(["subscription", "bill", "income", "transfer", "other"]))
      .optional(),
  })
  .optional();

export const recurringRoutes = t.router({
  /**
   * Detect recurring payment patterns in transactions.
   * Uses the unified detection service that analyzes intervals, amounts, and payee patterns.
   */
  detect: publicProcedure.input(detectionOptionsSchema).query(
    withErrorHandler(async ({ ctx, input }) => {
      const detectionService = getRecurringDetectionService();
      const options: DetectionOptions = {
        accountIds: input?.accountIds,
        months: input?.months ?? 6,
        minTransactions: input?.minTransactions ?? 3,
        minConfidence: input?.minConfidence ?? 50,
        minPredictability: input?.minPredictability ?? 60,
        includeExisting: input?.includeExisting ?? false,
        patternTypes: input?.patternTypes,
      };

      return detectionService.detectPatterns(ctx.workspaceId, options);
    })
  ),

  /**
   * Get summary statistics about recurring patterns
   */
  summary: publicProcedure.query(
    withErrorHandler(async ({ ctx }) => {
      const detectionService = getRecurringDetectionService();
      const patterns = await detectionService.detectPatterns(ctx.workspaceId, {
        minConfidence: 50,
        minPredictability: 60,
      });

      const subscriptions = patterns.filter((p) => p.patternType === "subscription");
      const bills = patterns.filter((p) => p.patternType === "bill");
      const income = patterns.filter((p) => p.patternType === "income");

      const totalMonthlyExpense = [...subscriptions, ...bills].reduce(
        (sum, p) => {
          // Normalize to monthly
          const monthlyAmount = normalizeToMonthly(p.amount.median, p.frequency);
          return sum + Math.abs(monthlyAmount);
        },
        0
      );

      const totalMonthlyIncome = income.reduce((sum, p) => {
        const monthlyAmount = normalizeToMonthly(p.amount.median, p.frequency);
        return sum + Math.abs(monthlyAmount);
      }, 0);

      return {
        totalPatterns: patterns.length,
        subscriptionCount: subscriptions.length,
        billCount: bills.length,
        incomeCount: income.length,
        totalMonthlyExpense,
        totalMonthlyIncome,
        highConfidenceCount: patterns.filter((p) => p.overallConfidence >= 80).length,
      };
    })
  ),
});

/**
 * Normalize an amount to monthly based on frequency
 */
function normalizeToMonthly(
  amount: number,
  frequency: "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "semi_annual" | "annual" | "irregular"
): number {
  switch (frequency) {
    case "daily":
      return amount * 30;
    case "weekly":
      return amount * 4.33;
    case "biweekly":
      return amount * 2.17;
    case "monthly":
      return amount;
    case "quarterly":
      return amount / 3;
    case "semi_annual":
      return amount / 6;
    case "annual":
      return amount / 12;
    case "irregular":
      return amount; // Assume monthly for irregular
    default:
      return amount;
  }
}
