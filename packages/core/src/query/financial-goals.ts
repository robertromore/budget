import { trpc } from "$core/trpc/client-factory";
import { cachePatterns } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";
import type { GoalWithProgress } from "$core/server/domains/financial-goals";
import type { FinancialGoal } from "$core/schema/financial-goals";

export { GOAL_TYPE_LABELS } from "$core/schema/financial-goals";
export type { GoalType } from "$core/schema/financial-goals";
export type { GoalWithProgress } from "$core/server/domains/financial-goals";

export const financialGoalKeys = createQueryKeys("financialGoals", {
  list: (includeCompleted: boolean) => ["list", includeCompleted] as const,
  detail: (id: number) => ["detail", id] as const,
});

export const listGoals = (includeCompleted = false) =>
  defineQuery<GoalWithProgress[]>({
    queryKey: financialGoalKeys.list(includeCompleted),
    queryFn: () =>
      trpc().financialGoalsRoutes.list.query({ includeCompleted }),
    options: {
      staleTime: 5 * 60 * 1000, // 5 min — progress is live but not millisecond-sensitive
    },
  });

export const getGoal = (id: number) =>
  defineQuery<GoalWithProgress | null>({
    queryKey: financialGoalKeys.detail(id),
    queryFn: () => trpc().financialGoalsRoutes.get.query({ id }),
    options: {
      staleTime: 5 * 60 * 1000,
    },
  });

export type SaveGoalInput = {
  id?: number;
  name: string;
  goalType: FinancialGoal["goalType"];
  targetAmount: number;
  targetDate?: string | null;
  accountId?: number | null;
  notes?: string | null;
  sortOrder?: number;
};

export const saveGoal = defineMutation<SaveGoalInput, GoalWithProgress>({
  mutationFn: (input) => trpc().financialGoalsRoutes.save.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(financialGoalKeys.all());
  },
  successMessage: (_, vars) => (vars.id ? "Goal updated" : "Goal created"),
  errorMessage: "Failed to save goal",
});

export const deleteGoal = defineMutation<{ id: number }, void>({
  mutationFn: ({ id }) => trpc().financialGoalsRoutes.delete.mutate({ id }),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(financialGoalKeys.all());
  },
  successMessage: "Goal deleted",
  errorMessage: "Failed to delete goal",
});

export const markGoalComplete = defineMutation<{ id: number }, GoalWithProgress>({
  mutationFn: ({ id }) =>
    trpc().financialGoalsRoutes.markComplete.mutate({ id }),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(financialGoalKeys.all());
  },
  successMessage: "Goal completed!",
  errorMessage: "Failed to mark goal complete",
});
