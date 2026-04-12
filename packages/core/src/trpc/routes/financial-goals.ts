import {
  deleteGoal,
  getGoal,
  listGoals,
  markGoalComplete,
  saveGoal,
} from "$core/server/domains/financial-goals";
import { goalTypeEnum } from "$core/schema/financial-goals";
import { publicProcedure, rateLimitedProcedure, t } from "$core/trpc";
import { translateDomainError } from "$core/trpc/shared/errors";
import { z } from "zod";

const saveGoalInput = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(1).max(200),
  goalType: z.enum(goalTypeEnum),
  targetAmount: z.number().positive(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD").nullable().optional(),
  accountId: z.number().int().positive().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const financialGoalsRoutes = t.router({
  // List goals for the workspace. Pass includeCompleted=true to include finished goals.
  list: publicProcedure
    .input(z.object({ includeCompleted: z.boolean().optional().default(false) }))
    .query(async ({ input, ctx }) => {
      try {
        return await listGoals(ctx.workspaceId, input.includeCompleted);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  // Fetch a single goal with live progress metrics.
  get: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      try {
        return await getGoal(ctx.workspaceId, input.id);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  // Create or update a goal. Omit id to create; include id to update.
  save: rateLimitedProcedure
    .input(saveGoalInput)
    .mutation(async ({ input, ctx }) => {
      try {
        return await saveGoal(ctx.workspaceId, input);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  // Soft-delete a goal.
  delete: rateLimitedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await deleteGoal(ctx.workspaceId, input.id);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  // Mark a goal as completed.
  markComplete: rateLimitedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await markGoalComplete(ctx.workspaceId, input.id);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),
});
