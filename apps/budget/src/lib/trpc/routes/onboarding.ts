/**
 * Onboarding tRPC Routes
 *
 * API endpoints for the onboarding wizard and tour system.
 */

import { workspaces, type WorkspacePreferences } from "$lib/schema/workspaces";
import {
  OnboardingService,
  type OnboardingWorkspaceRepository,
} from "$lib/server/domains/onboarding/services";
import { serviceFactory } from "$lib/server/shared/container/service-factory";
import { publicProcedure, t } from "$lib/trpc";
import { withErrorHandler } from "$lib/trpc/shared/errors";
import { nowISOString } from "$lib/utils/dates";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { db } from "$lib/server/db";

// Zod schema for OnboardingFormData
const onboardingFormDataSchema = z.object({
  incomeSource: z.enum(["salary", "freelance", "multiple", "investment", "retirement", "other"]),
  incomeFrequency: z.enum(["weekly", "biweekly", "semimonthly", "monthly", "irregular"]),
  primaryIncomeAmount: z.number().optional(),
  employmentStatus: z.enum([
    "employed",
    "self-employed",
    "retired",
    "student",
    "unemployed",
    "other",
  ]),
  householdType: z.enum(["single", "couple", "family-small", "family-large"]),
  financialGoals: z.array(
    z.enum([
      "emergency-fund",
      "pay-debt",
      "budget-better",
      "save-for-goal",
      "invest",
      "reduce-spending",
    ])
  ),
  accountsToTrack: z.array(
    z.enum(["checking", "savings", "credit-card", "investment", "hsa", "loan", "mortgage", "utility"])
  ),
  spendingAreas: z.array(
    z.enum([
      "housing",
      "transportation",
      "food-groceries",
      "food-dining",
      "entertainment",
      "healthcare",
      "education",
      "personal-care",
      "pets",
      "shopping",
      "travel",
      "giving",
      "business",
    ])
  ),
  hasDebt: z.boolean(),
  debtOverview: z.array(
    z.object({
      type: z.enum([
        "credit-card",
        "student-loan",
        "car-loan",
        "mortgage",
        "personal-loan",
        "medical-debt",
      ]),
      approximateAmount: z.number(),
      interestRate: z.number().optional(),
    })
  ),
  currency: z.string(),
  locale: z.string(),
  dateFormat: z.enum(["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"]),
});

/**
 * Create a workspace repository adapter that works with tRPC context
 */
function createWorkspaceRepository(database: typeof db): OnboardingWorkspaceRepository {
  return {
    async getWorkspacePreferences(workspaceId: number): Promise<WorkspacePreferences | null> {
      const [workspace] = await database
        .select({ preferences: workspaces.preferences })
        .from(workspaces)
        .where(eq(workspaces.id, workspaceId))
        .limit(1);

      if (!workspace?.preferences) {
        return null;
      }

      try {
        return JSON.parse(workspace.preferences) as WorkspacePreferences;
      } catch {
        return null;
      }
    },

    async updateWorkspacePreferences(
      workspaceId: number,
      preferences: WorkspacePreferences
    ): Promise<void> {
      await database
        .update(workspaces)
        .set({
          preferences: JSON.stringify(preferences),
          updatedAt: nowISOString(),
        })
        .where(eq(workspaces.id, workspaceId));
    },
  };
}

/**
 * Get or create OnboardingService for a given database context
 */
function getOnboardingService(database: typeof db): OnboardingService {
  const workspaceRepo = createWorkspaceRepository(database);
  const accountService = serviceFactory.getAccountService();
  const categoryService = serviceFactory.getCategoryService();

  return new OnboardingService(workspaceRepo, accountService, categoryService);
}

export const onboardingRoutes = t.router({
  /**
   * Check if onboarding wizard should be shown
   */
  shouldShowOnboarding: publicProcedure.query(
    withErrorHandler(async ({ ctx }) => {
      const service = getOnboardingService(ctx.db);
      return service.shouldShowOnboarding(ctx.workspaceId);
    })
  ),

  /**
   * Check if spotlight tour should auto-start
   */
  shouldShowTour: publicProcedure.query(
    withErrorHandler(async ({ ctx }) => {
      const service = getOnboardingService(ctx.db);
      return service.shouldShowTour(ctx.workspaceId);
    })
  ),

  /**
   * Get current onboarding status
   */
  getStatus: publicProcedure.query(
    withErrorHandler(async ({ ctx }) => {
      const service = getOnboardingService(ctx.db);
      return service.getOnboardingStatus(ctx.workspaceId);
    })
  ),

  /**
   * Complete the onboarding wizard
   */
  completeWizard: publicProcedure.input(onboardingFormDataSchema).mutation(
    withErrorHandler(async ({ ctx, input }) => {
      const service = getOnboardingService(ctx.db);
      return service.completeWizard(ctx.workspaceId, input);
    })
  ),

  /**
   * Mark tour as complete
   */
  completeTour: publicProcedure.mutation(
    withErrorHandler(async ({ ctx }) => {
      const service = getOnboardingService(ctx.db);
      await service.completeTour(ctx.workspaceId);
      return { success: true };
    })
  ),

  /**
   * Skip the tour
   */
  skipTour: publicProcedure.mutation(
    withErrorHandler(async ({ ctx }) => {
      const service = getOnboardingService(ctx.db);
      await service.skipTour(ctx.workspaceId);
      return { success: true };
    })
  ),

  /**
   * Reset onboarding to allow re-running the wizard
   */
  resetOnboarding: publicProcedure.mutation(
    withErrorHandler(async ({ ctx }) => {
      const service = getOnboardingService(ctx.db);
      await service.resetOnboarding(ctx.workspaceId);
      return { success: true };
    })
  ),
});
