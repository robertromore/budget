import type {
  Budget,
  BudgetPeriodInstance,
  BudgetPeriodTemplate,
  BudgetTemplate,
  BudgetTransaction,
} from "$lib/schema/budgets";
import type {
  BudgetRecommendationWithRelations,
  RecommendationPriority,
  RecommendationStatus,
  RecommendationType,
} from "$lib/schema/recommendations";
import type { BudgetWithRelations } from "$lib/server/domains/budgets";
import type { BudgetRecommendationDraft } from "$lib/server/domains/budgets/budget-analysis-service";
import type { PeriodAnalytics, PeriodComparison } from "$lib/server/domains/budgets/period-manager";
import type {
  AllocationValidationResult,
  ContributionPlan,
  CreateBudgetRequest,
  EnsurePeriodInstanceOptions,
  GoalProgress,
  UpdateBudgetRequest,
} from "$lib/server/domains/budgets/services";
import { BudgetState } from "$lib/states/budgets.svelte";
import { trpc } from "$lib/trpc/client";
import { cachePatterns, queryPresets } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

export const budgetKeys = createQueryKeys("budgets", {
  lists: () => ["budgets", "list"] as const,
  list: (status?: Budget["status"]) => ["budgets", "list", status ?? "all"] as const,
  count: () => ["budgets", "count"] as const,
  byAccount: (accountId: number) => ["budgets", "account", accountId] as const,
  details: () => ["budgets", "detail"] as const,
  detail: (id: number) => ["budgets", "detail", id] as const,
  detailBySlug: (slug: string) => ["budgets", "detail", "slug", slug] as const,
  periodInstances: (templateId: number) => ["budgets", "periods", templateId] as const,
  periodAnalytics: (periodId: number) => ["budgets", "periods", "analytics", periodId] as const,
  periodComparison: (currentId: number, previousId: number) =>
    ["budgets", "periods", "comparison", currentId, previousId] as const,
  periodHistory: (budgetId: number, limit: number) =>
    ["budgets", "periods", "history", budgetId, limit] as const,
  periodTemplates: () => ["budgets", "period-templates"] as const,
  periodTemplateDetail: (id: number) => ["budgets", "period-templates", "detail", id] as const,
  periodTemplateList: (budgetId: number) =>
    ["budgets", "period-templates", "list", budgetId] as const,
  allocationValidation: (transactionId: number, amount: number, excludeId: number | null) =>
    ["budgets", "allocation", transactionId, amount, excludeId] as const,
  applicableBudgets: (accountId?: number, categoryId?: number) =>
    ["budgets", "applicable", accountId ?? null, categoryId ?? null] as const,
  groups: () => ["budgets", "groups"] as const,
  groupDetail: (id: number) => ["budgets", "groups", "detail", id] as const,
  groupList: (parentId?: number | null) =>
    ["budgets", "groups", "list", parentId ?? "all"] as const,
  rootGroups: () => ["budgets", "groups", "root"] as const,
  goalProgress: (budgetId: number) => ["budgets", "goal", "progress", budgetId] as const,
  goalContributionPlan: (budgetId: number, frequency: string) =>
    ["budgets", "goal", "contribution-plan", budgetId, frequency] as const,
  templatesAll: () => ["budgets", "templates"] as const,
  templatesList: (includeSystem: boolean) =>
    ["budgets", "templates", "list", includeSystem] as const,
  templatesDetail: (id: number) => ["budgets", "templates", "detail", id] as const,
  suggestions: (params: {
    accountId: number;
    categoryId?: number | null;
    payeeId?: number | null;
    amount: number;
    date: string;
  }) => ["budgets", "suggestions", params] as const,
  recommendations: () => ["budgets", "recommendations"] as const,
  recommendationsList: (filters?: Record<string, unknown>) =>
    ["budgets", "recommendations", "list", filters ?? "all"] as const,
  recommendationDetail: (id: number) => ["budgets", "recommendations", "detail", id] as const,
  recommendationsCount: () => ["budgets", "recommendations", "count"] as const,
  recommendationsPendingCount: () => ["budgets", "recommendations", "count", "pending"] as const,
  analysisHistory: (params?: Record<string, unknown>) =>
    ["budgets", "analysis", "history", params ?? "all"] as const,
  automationSettings: () => ["budgets", "automation", "settings"] as const,
  automationActivity: (filters?: Record<string, unknown>) =>
    ["budgets", "automation", "activity", filters ?? "all"] as const,
});

function getState(): BudgetState | null {
  return BudgetState.safeGet();
}

export const getBudgetCount = () =>
  defineQuery<{ count: number }>({
    queryKey: budgetKeys["count"](),
    queryFn: () => trpc().budgetRoutes.count.query(),
    options: {
      ...queryPresets.static,
    },
  });

export const listBudgets = (status?: Budget["status"]) =>
  defineQuery<BudgetWithRelations[]>({
    queryKey: budgetKeys["list"](status),
    queryFn: () => trpc().budgetRoutes.list.query(status ? { status } : {}),
    options: {
      ...queryPresets.static,
    },
  });

export const getBudgetDetail = (idOrSlug: number | string) =>
  defineQuery<BudgetWithRelations>({
    queryKey:
      typeof idOrSlug === "number"
        ? budgetKeys["detail"](idOrSlug)
        : budgetKeys["detailBySlug"](idOrSlug),
    queryFn: () =>
      typeof idOrSlug === "number"
        ? trpc().budgetRoutes.get.query({ id: idOrSlug })
        : trpc().budgetRoutes.getBySlug.query({ slug: idOrSlug }),
    options: {
      staleTime: 60 * 1000,
    },
  });

export const getByAccount = (accountId: number) =>
  defineQuery<BudgetWithRelations[]>({
    queryKey: budgetKeys["byAccount"](accountId),
    queryFn: () => trpc().budgetRoutes.getByAccount.query({ accountId }),
    options: {
      staleTime: 60 * 1000,
    },
  });

export const listPeriodInstances = (templateId: number) =>
  defineQuery<BudgetPeriodInstance[]>({
    queryKey: budgetKeys["periodInstances"](templateId),
    queryFn: () => trpc().budgetRoutes.listPeriodInstances.query({ templateId }),
    options: {
      staleTime: 30 * 1000, // 30 seconds - periods can change when new months roll over
    },
  });

export const validateAllocation = (
  transactionId: number,
  amount: number,
  excludeAllocationId?: number
) =>
  defineQuery<AllocationValidationResult>({
    queryKey: budgetKeys["allocationValidation"](
      transactionId,
      amount,
      excludeAllocationId ?? null
    ),
    queryFn: () =>
      trpc().budgetRoutes.validateAllocation.query({
        transactionId,
        amount,
        excludeAllocationId,
      }),
    options: {
      staleTime: 0,
    },
  });

export const createBudget = defineMutation<CreateBudgetRequest, BudgetWithRelations>({
  mutationFn: (input) => trpc().budgetRoutes.create.mutate(input),
  onSuccess: (budget, variables) => {
    const state = getState();
    if (state) {
      state.upsertBudget(budget);
    }

    // Update cache with new budget optimistically
    cachePatterns.updateQueriesWithCondition<BudgetWithRelations[]>(
      (queryKey) => queryKey[0] === "budgets" && queryKey[1] === "list",
      (oldData) => [...oldData, budget]
    );

    cachePatterns.invalidatePrefix(budgetKeys["lists"]());
  },
  successMessage: "Budget created",
  errorMessage: "Failed to create budget",
});

export const updateBudget = defineMutation<
  { id: number; data: UpdateBudgetRequest },
  BudgetWithRelations
>({
  mutationFn: ({ id, data }) => trpc().budgetRoutes.update.mutate({ id, ...data }),
  onSuccess: (budget) => {
    getState()?.upsertBudget(budget);
    cachePatterns.invalidatePrefix(budgetKeys.detail(budget.id));
    cachePatterns.invalidatePrefix(budgetKeys.lists());
  },
  successMessage: "Budget updated",
  errorMessage: "Failed to update budget",
});

export const deleteBudget = defineMutation<number, { success: boolean }>({
  mutationFn: (id) => trpc().budgetRoutes.delete.mutate({ id }),
  onSuccess: (_, id) => {
    getState()?.removeBudget(id);
    cachePatterns.removeQuery(budgetKeys.detail(id));

    // Optimistically remove the budget from all budget list queries immediately
    // This includes both list queries ["budgets", "list", ...] and account queries ["budgets", "account", ...]
    cachePatterns.updateQueriesWithCondition<BudgetWithRelations[]>(
      (queryKey) =>
        queryKey[0] === "budgets" && (queryKey[1] === "list" || queryKey[1] === "account"),
      (oldData) => oldData.filter((budget) => budget.id !== id)
    );

    // Also invalidate to ensure consistency with server
    cachePatterns.invalidatePrefix(budgetKeys.lists());
    cachePatterns.invalidatePrefix(["budgets", "account"]);

    // Invalidate recommendations since a budget created from a recommendation may have been deleted
    cachePatterns.invalidatePrefix(budgetKeys.recommendations());
  },
  successMessage: "Budget deleted",
  errorMessage: "Failed to delete budget",
});

export const duplicateBudget = defineMutation<
  { id: number; newName?: string },
  BudgetWithRelations
>({
  mutationFn: ({ id, newName }) => trpc().budgetRoutes.duplicate.mutate({ id, newName }),
  onSuccess: (budget) => {
    getState()?.upsertBudget(budget);
    cachePatterns.invalidatePrefix(budgetKeys.lists());
  },
  successMessage: "Budget duplicated",
  errorMessage: "Failed to duplicate budget",
});

export const bulkArchiveBudgets = defineMutation<
  number[],
  { success: number; failed: number; errors: Array<{ id: number; error: string }> }
>({
  mutationFn: (ids) => trpc().budgetRoutes.bulkArchive.mutate({ ids }),
  onSuccess: (_result, ids) => {
    // Invalidate all budgets cache since multiple budgets changed
    cachePatterns.invalidatePrefix(budgetKeys.lists());
    ids.forEach((id) => cachePatterns.invalidatePrefix(budgetKeys.detail(id)));
  },
  successMessage: (result) =>
    `${result.success} budget(s) archived${result.failed > 0 ? `, ${result.failed} failed` : ""}`,
  errorMessage: "Failed to archive budgets",
});

export const bulkDeleteBudgets = defineMutation<
  number[],
  { success: number; failed: number; errors: Array<{ id: number; error: string }> }
>({
  mutationFn: (ids) => trpc().budgetRoutes.bulkDelete.mutate({ ids }),
  onSuccess: (_result, ids) => {
    // Remove deleted budgets from state and cache
    ids.forEach((id) => {
      getState()?.removeBudget(id);
      cachePatterns.removeQuery(budgetKeys.detail(id));
    });

    // Optimistically remove budgets from all budget list queries immediately
    // This includes both list queries and account-specific queries
    const idSet = new Set(ids);
    cachePatterns.updateQueriesWithCondition<BudgetWithRelations[]>(
      (queryKey) =>
        queryKey[0] === "budgets" && (queryKey[1] === "list" || queryKey[1] === "account"),
      (oldData) => oldData.filter((budget) => !idSet.has(budget.id))
    );

    // Also invalidate to ensure consistency with server
    cachePatterns.invalidatePrefix(budgetKeys.lists());
    cachePatterns.invalidatePrefix(["budgets", "account"]);

    // Invalidate recommendations since budgets created from recommendations may have been deleted
    cachePatterns.invalidatePrefix(budgetKeys.recommendations());
  },
  successMessage: (result) =>
    `${result.success} budget(s) deleted${result.failed > 0 ? `, ${result.failed} failed` : ""}`,
  errorMessage: "Failed to delete budgets",
});

export const ensurePeriodInstance = defineMutation<
  { templateId: number; options?: EnsurePeriodInstanceOptions },
  BudgetPeriodInstance
>({
  mutationFn: ({ templateId, options }) => {
    const payload = options ? { templateId, ...options } : { templateId };
    return trpc().budgetRoutes.ensurePeriodInstance.mutate(payload);
  },
  onSuccess: (instance) => {
    getState()?.recordPeriodInstance(instance);
    cachePatterns.invalidatePrefix(budgetKeys.periodInstances(instance.templateId));
  },
  successMessage: "Period instance ensured",
  errorMessage: "Failed to create budget period",
});

export const createAllocation = defineMutation<
  {
    transactionId: number;
    budgetId: number;
    allocatedAmount: number;
    autoAssigned?: boolean;
    assignedBy?: string;
  },
  BudgetTransaction
>({
  mutationFn: (input) => trpc().budgetRoutes.createAllocation.mutate(input),
  onSuccess: (allocation) => {
    cachePatterns.invalidatePrefix(budgetKeys.detail(allocation.budgetId));
    cachePatterns.invalidatePrefix(budgetKeys.lists());
  },
  successMessage: "Allocation created",
  errorMessage: "Failed to create allocation",
});

export const updateAllocation = defineMutation<
  {
    id: number;
    allocatedAmount: number;
    autoAssigned?: boolean;
    assignedBy?: string;
  },
  BudgetTransaction
>({
  mutationFn: (input) => trpc().budgetRoutes.updateAllocation.mutate(input),
  onSuccess: (allocation) => {
    cachePatterns.invalidatePrefix(budgetKeys.detail(allocation.budgetId));
    cachePatterns.invalidatePrefix(budgetKeys.lists());
  },
  successMessage: "Allocation updated",
  errorMessage: "Failed to update allocation",
});

export const clearAllocation = defineMutation<number, BudgetTransaction>({
  mutationFn: (id) => trpc().budgetRoutes.clearAllocation.mutate({ id }),
  onSuccess: (allocation) => {
    cachePatterns.invalidatePrefix(budgetKeys.detail(allocation.budgetId));
  },
  successMessage: "Allocation cleared",
  errorMessage: "Failed to clear allocation",
});

export const deleteAllocation = defineMutation<number, { success: boolean }>({
  mutationFn: (id) => trpc().budgetRoutes.deleteAllocation.mutate({ id }),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(budgetKeys.all());
  },
  successMessage: "Allocation removed",
  errorMessage: "Failed to delete allocation",
});

// Envelope operations
export const getEnvelopeAllocations = (budgetId: number) =>
  defineQuery({
    queryKey: [...budgetKeys.all(), "envelopes", budgetId],
    queryFn: () => trpc().budgetRoutes.getEnvelopeAllocations.query({ budgetId }),
    options: {
      staleTime: 60 * 1000,
      enabled: !!budgetId,
    },
  });

export const createEnvelopeAllocation = defineMutation<
  {
    budgetId: number;
    categoryId: number;
    periodInstanceId: number;
    allocatedAmount: number;
    rolloverMode?: "unlimited" | "reset" | "limited";
    metadata?: Record<string, unknown>;
  },
  any
>({
  mutationFn: (input) => trpc().budgetRoutes.createEnvelopeAllocation.mutate(input),
  onSuccess: (_, variables) => {
    cachePatterns.invalidatePrefix([...budgetKeys.all(), "envelopes", variables.budgetId]);
    cachePatterns.invalidatePrefix(budgetKeys.detail(variables.budgetId));
  },
  successMessage: "Envelope allocation created",
  errorMessage: "Failed to create envelope allocation",
});

export const updateEnvelopeAllocation = defineMutation<
  { envelopeId: number; allocatedAmount: number; metadata?: Record<string, unknown> },
  any
>({
  mutationFn: (input) => trpc().budgetRoutes.updateEnvelopeAllocation.mutate(input),
  onSuccess: () => {
    // Invalidate all envelope data since we don't know the budgetId from the envelope ID alone
    cachePatterns.invalidatePrefix([...budgetKeys.all(), "envelopes"]);
  },
  successMessage: "Envelope allocation updated",
  errorMessage: "Failed to update envelope allocation",
});

export const updateEnvelopeSettings = defineMutation<
  {
    envelopeId: number;
    rolloverMode?: "unlimited" | "limited" | "reset";
    metadata?: Record<string, unknown>;
  },
  any
>({
  mutationFn: (input) => trpc().budgetRoutes.updateEnvelopeSettings.mutate(input),
  onSuccess: () => {
    // Invalidate all envelope data
    cachePatterns.invalidatePrefix([...budgetKeys.all(), "envelopes"]);
  },
  successMessage: "Envelope settings updated successfully",
  errorMessage: "Failed to update envelope settings",
});

export const transferEnvelopeFunds = defineMutation<
  {
    fromEnvelopeId: number;
    toEnvelopeId: number;
    amount: number;
    reason?: string;
    transferredBy?: string;
  },
  any
>({
  mutationFn: (input) => trpc().budgetRoutes.transferEnvelopeFunds.mutate(input),
  onSuccess: () => {
    // Invalidate all envelope data since transfers affect multiple envelopes
    cachePatterns.invalidatePrefix([...budgetKeys.all(), "envelopes"]);
  },
  successMessage: "Funds transferred successfully",
  errorMessage: "Failed to transfer funds",
});

export const processEnvelopeRollover = defineMutation<
  { fromPeriodId: number; toPeriodId: number },
  any
>({
  mutationFn: (input) => trpc().budgetRoutes.processEnvelopeRollover.mutate(input),
  onSuccess: (data) => {
    // Invalidate envelopes and rollover history to reflect the completed rollover
    cachePatterns.invalidatePrefix([...budgetKeys.all(), "envelopes"]);
    cachePatterns.invalidatePrefix([...budgetKeys.all(), "budget-rollover-history"]);
  },
  successMessage: (data) => {
    if (data && Array.isArray(data) && data.length > 0) {
      const totalRolledOver = data.reduce(
        (sum: number, item: any) => sum + (item.rolledAmount || 0),
        0
      );
      const resetCount = data.filter((item: any) => item.resetAmount > 0).length;

      let message = `✓ Rollover completed: ${data.length} envelope${data.length !== 1 ? "s" : ""} processed`;
      if (totalRolledOver > 0) {
        message += ` • $${totalRolledOver.toFixed(2)} rolled over`;
      }
      if (resetCount > 0) {
        message += ` • ${resetCount} envelope${resetCount !== 1 ? "s" : ""} reset`;
      }
      return message;
    }
    return "✓ Rollover processed successfully";
  },
  errorMessage: "Failed to process rollover",
});

export const previewEnvelopeRollover = (fromPeriodId: number, toPeriodId: number) =>
  defineQuery({
    queryKey: [...budgetKeys.all(), "rollover-preview", fromPeriodId, toPeriodId],
    queryFn: () => trpc().budgetRoutes.previewEnvelopeRollover.query({ fromPeriodId, toPeriodId }),
    options: {
      staleTime: 30 * 1000,
      enabled: !!fromPeriodId && !!toPeriodId,
    },
  });

export const getRolloverSummary = (periodId: number) =>
  defineQuery({
    queryKey: [...budgetKeys.all(), "rollover-summary", periodId],
    queryFn: () => trpc().budgetRoutes.getRolloverSummary.query({ periodId }),
    options: {
      staleTime: 60 * 1000,
      enabled: !!periodId,
    },
  });

export const getRolloverHistory = (envelopeId: number, limit?: number) =>
  defineQuery({
    queryKey: [...budgetKeys.all(), "rollover-history", envelopeId, limit ?? null],
    queryFn: () => trpc().budgetRoutes.getRolloverHistory.query({ envelopeId, limit }),
    options: {
      staleTime: 60 * 1000,
      enabled: !!envelopeId,
    },
  });

export const getBudgetRolloverHistory = (budgetId: number, limit?: number) =>
  defineQuery({
    queryKey: [...budgetKeys.all(), "budget-rollover-history", budgetId, limit ?? null],
    queryFn: () => trpc().budgetRoutes.getBudgetRolloverHistory.query({ budgetId, limit }),
    options: {
      staleTime: 60 * 1000,
      enabled: !!budgetId,
    },
  });

export const estimateRolloverImpact = (fromPeriodId: number, toPeriodId: number) =>
  defineQuery({
    queryKey: [...budgetKeys.all(), "rollover-estimate", fromPeriodId, toPeriodId],
    queryFn: () => trpc().budgetRoutes.estimateRolloverImpact.query({ fromPeriodId, toPeriodId }),
    options: {
      staleTime: 30 * 1000,
      enabled: !!fromPeriodId && !!toPeriodId,
    },
  });

export const previewRollover = (fromPeriodId: number, toPeriodId: number) =>
  defineQuery({
    queryKey: [...budgetKeys.all(), "rollover-preview", fromPeriodId, toPeriodId],
    queryFn: () => trpc().budgetRoutes.previewRollover.query({ fromPeriodId, toPeriodId }),
    options: {
      staleTime: 30 * 1000,
      enabled: !!fromPeriodId && !!toPeriodId,
    },
  });

export const updateRolloverSettings = defineMutation<
  {
    budgetId: number;
    settings: {
      enabled?: boolean;
      maxRolloverPercentage?: number;
      rolloverLimitMonths?: number;
      deficitRecoveryMode?: "immediate" | "gradual" | "manual";
      autoTransition?: boolean;
      notificationEnabled?: boolean;
    };
  },
  any
>({
  mutationFn: (input) => trpc().budgetRoutes.updateRolloverSettings.mutate(input),
  onSuccess: (_, variables) => {
    cachePatterns.invalidatePrefix([...budgetKeys.detail(variables.budgetId)]);
  },
  successMessage: "Rollover settings updated successfully",
  errorMessage: "Failed to update rollover settings",
});

export const getDeficitEnvelopes = (budgetId: number) =>
  defineQuery({
    queryKey: [...budgetKeys.all(), "deficit-envelopes", budgetId],
    queryFn: () => trpc().budgetRoutes.getDeficitEnvelopes.query({ budgetId }),
    options: {
      staleTime: 30 * 1000,
      enabled: !!budgetId,
    },
  });

export const getSurplusEnvelopes = (budgetId: number, minimumSurplus?: number) =>
  defineQuery({
    queryKey: [...budgetKeys.all(), "surplus-envelopes", budgetId, minimumSurplus ?? null],
    queryFn: () => trpc().budgetRoutes.getSurplusEnvelopes.query({ budgetId, minimumSurplus }),
    options: {
      staleTime: 30 * 1000,
      enabled: !!budgetId,
    },
  });

export const analyzeEnvelopeDeficit = (envelopeId: number) =>
  defineQuery({
    queryKey: [...budgetKeys.all(), "analyze-deficit", envelopeId],
    queryFn: () => trpc().budgetRoutes.analyzeEnvelopeDeficit.query({ envelopeId }),
    options: {
      staleTime: 10 * 1000,
      enabled: !!envelopeId,
    },
  });

export const createDeficitRecoveryPlan = (envelopeId: number) =>
  defineQuery({
    queryKey: [...budgetKeys.all(), "deficit-recovery-plan", envelopeId],
    queryFn: () => trpc().budgetRoutes.createDeficitRecoveryPlan.query({ envelopeId }),
    options: {
      staleTime: 0,
      enabled: !!envelopeId,
    },
  });

export const executeDeficitRecovery = defineMutation<{ plan: any; executedBy?: string }, any>({
  mutationFn: (input) => trpc().budgetRoutes.executeDeficitRecovery.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix([...budgetKeys.all(), "envelopes"]);
    cachePatterns.invalidatePrefix([...budgetKeys.all(), "deficit-envelopes"]);
  },
  successMessage: "Deficit recovery executed successfully",
  errorMessage: "Failed to execute deficit recovery",
});

export const generateBulkDeficitRecovery = defineMutation<{ budgetId: number }, any>({
  mutationFn: (input) => trpc().budgetRoutes.generateBulkDeficitRecovery.mutate(input),
  onSuccess: (_, variables) => {
    cachePatterns.invalidatePrefix([...budgetKeys.all(), "envelopes", variables.budgetId]);
    cachePatterns.invalidatePrefix([...budgetKeys.all(), "deficit-envelopes", variables.budgetId]);
  },
  successMessage: "Bulk deficit recovery generated",
  errorMessage: "Failed to generate bulk deficit recovery",
});

export const getApplicableBudgets = (accountId?: number, categoryId?: number) =>
  defineQuery<BudgetWithRelations[]>({
    queryKey: budgetKeys.applicableBudgets(accountId, categoryId),
    queryFn: () => trpc().budgetRoutes.getApplicableBudgets.query({ accountId, categoryId }),
    options: {
      staleTime: 60 * 1000,
      enabled: !!accountId || !!categoryId,
    },
  });

export const validateTransactionStrict = (
  amount: number,
  accountId?: number,
  categoryId?: number,
  transactionId?: number
) =>
  defineQuery<{
    allowed: boolean;
    violations: Array<{ budgetId: number; budgetName: string; exceeded: number }>;
  }>({
    queryKey: [
      ...budgetKeys.all(),
      "validate-strict",
      amount,
      accountId ?? null,
      categoryId ?? null,
      transactionId ?? null,
    ],
    queryFn: () =>
      trpc().budgetRoutes.validateTransactionStrict.query({
        amount,
        accountId,
        categoryId,
        transactionId,
      }),
    options: {
      staleTime: 0,
      enabled: (!!accountId || !!categoryId) && amount !== 0,
    },
  });

// Budget group operations
export const getBudgetGroup = (id: number) =>
  defineQuery({
    queryKey: budgetKeys.groupDetail(id),
    queryFn: () => trpc().budgetRoutes.getGroup.query({ id }),
    options: {
      staleTime: 60 * 1000,
    },
  });

export const listBudgetGroups = (parentId?: number | null) =>
  defineQuery({
    queryKey: budgetKeys.groupList(parentId),
    queryFn: () =>
      trpc().budgetRoutes.listGroups.query(parentId !== undefined ? { parentId } : undefined),
    options: {
      staleTime: 60 * 1000,
    },
  });

export const getRootBudgetGroups = () =>
  defineQuery({
    queryKey: budgetKeys.rootGroups(),
    queryFn: () => trpc().budgetRoutes.getRootGroups.query(),
    options: {
      staleTime: 60 * 1000,
    },
  });

export const createBudgetGroup = defineMutation<
  {
    name: string;
    description?: string | null;
    parentId?: number | null;
    spendingLimit?: number | null;
  },
  any
>({
  mutationFn: (input) => trpc().budgetRoutes.createGroup.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(budgetKeys.groups());
  },
  successMessage: "Budget group created",
  errorMessage: "Failed to create budget group",
});

export const updateBudgetGroup = defineMutation<
  {
    id: number;
    name?: string;
    description?: string | null;
    parentId?: number | null;
    spendingLimit?: number | null;
  },
  any
>({
  mutationFn: (input) => trpc().budgetRoutes.updateGroup.mutate(input),
  onSuccess: (_, variables) => {
    cachePatterns.invalidatePrefix(budgetKeys.groupDetail(variables.id));
    cachePatterns.invalidatePrefix(budgetKeys.groups());
  },
  successMessage: "Budget group updated",
  errorMessage: "Failed to update budget group",
});

export const deleteBudgetGroup = defineMutation<number, { success: boolean }>({
  mutationFn: (id) => trpc().budgetRoutes.deleteGroup.mutate({ id }),
  onSuccess: (_, id) => {
    cachePatterns.removeQuery(budgetKeys.groupDetail(id));
    cachePatterns.invalidatePrefix(budgetKeys.groups());
  },
  successMessage: "Budget group deleted",
  errorMessage: "Failed to delete budget group",
});

// Analytics queries

export const getSpendingTrends = (budgetId: number, limit?: number) =>
  defineQuery({
    queryKey: [...budgetKeys.detail(budgetId), "analytics", "spending-trends", limit ?? 6],
    queryFn: () => trpc().budgetRoutes.getSpendingTrends.query({ budgetId, limit }),
    options: {
      staleTime: 60 * 1000, // 1 minute
      enabled: !!budgetId,
    },
  });

export const getCategoryBreakdown = (budgetId: number) =>
  defineQuery({
    queryKey: [...budgetKeys.detail(budgetId), "analytics", "category-breakdown"],
    queryFn: () => trpc().budgetRoutes.getCategoryBreakdown.query({ budgetId }),
    options: {
      staleTime: 60 * 1000, // 1 minute
      enabled: !!budgetId,
    },
  });

export const getDailySpending = (budgetId: number, startDate: string, endDate: string) =>
  defineQuery({
    queryKey: [...budgetKeys.detail(budgetId), "analytics", "daily-spending", startDate, endDate],
    queryFn: () => trpc().budgetRoutes.getDailySpending.query({ budgetId, startDate, endDate }),
    options: {
      staleTime: 60 * 1000, // 1 minute
      enabled: !!budgetId && !!startDate && !!endDate,
    },
  });

export const getBudgetSummaryStats = (budgetId: number) =>
  defineQuery({
    queryKey: [...budgetKeys.detail(budgetId), "analytics", "summary-stats"],
    queryFn: () => trpc().budgetRoutes.getSummaryStats.query({ budgetId }),
    options: {
      staleTime: 60 * 1000, // 1 minute
      enabled: !!budgetId,
    },
  });

// Forecast & Schedule Integration

export const getBudgetForecast = (budgetId: number, daysAhead: number = 30) =>
  defineQuery({
    queryKey: [...budgetKeys.detail(budgetId), "forecast", daysAhead],
    queryFn: () => trpc().budgetRoutes.getBudgetForecast.query({ budgetId, daysAhead }),
    options: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      enabled: !!budgetId,
    },
  });

export const autoAllocateBudget = () =>
  defineMutation({
    mutationFn: (budgetId: number) => trpc().budgetRoutes.autoAllocateBudget.mutate({ budgetId }),
    onSuccess: (_, budgetId) => {
      cachePatterns.invalidatePrefix(budgetKeys.detail(budgetId));
      cachePatterns.invalidatePrefix([...budgetKeys.detail(budgetId), "forecast"]);
    },
  });

// Period Template Operations

export const getPeriodTemplate = (id: number) =>
  defineQuery<BudgetPeriodTemplate>({
    queryKey: budgetKeys.periodTemplateDetail(id),
    queryFn: () => trpc().budgetRoutes.getPeriodTemplate.query({ id }),
    options: {
      staleTime: 60 * 1000,
    },
  });

export const listPeriodTemplates = (budgetId: number) =>
  defineQuery<BudgetPeriodTemplate[]>({
    queryKey: budgetKeys.periodTemplateList(budgetId),
    queryFn: () => trpc().budgetRoutes.listPeriodTemplates.query({ budgetId }),
    options: {
      staleTime: 60 * 1000,
      enabled: !!budgetId,
    },
  });

export const createPeriodTemplate = defineMutation<
  {
    budgetId: number;
    type: BudgetPeriodTemplate["type"];
    intervalCount?: number;
    startDayOfWeek?: number;
    startDayOfMonth?: number;
    startMonth?: number;
    timezone?: string;
  },
  BudgetPeriodTemplate
>({
  mutationFn: (input) => trpc().budgetRoutes.createPeriodTemplate.mutate(input),
  onSuccess: (template) => {
    // Invalidate period template list
    cachePatterns.invalidatePrefix(budgetKeys.periodTemplateList(template.budgetId));
    // Invalidate period instances list
    cachePatterns.invalidateDomain("budgets");
  },
  successMessage: "Period template created",
  errorMessage: "Failed to create period template",
});

export const updatePeriodTemplate = defineMutation<
  {
    id: number;
    type?: BudgetPeriodTemplate["type"];
    intervalCount?: number;
    startDayOfWeek?: number;
    startDayOfMonth?: number;
    startMonth?: number;
    timezone?: string;
  },
  BudgetPeriodTemplate
>({
  mutationFn: (input) => trpc().budgetRoutes.updatePeriodTemplate.mutate(input),
  onSuccess: (template) => {
    cachePatterns.invalidatePrefix(budgetKeys.periodTemplateDetail(template.id));
    cachePatterns.invalidatePrefix(budgetKeys.periodTemplateList(template.budgetId));
    cachePatterns.invalidatePrefix(budgetKeys.detail(template.budgetId));
  },
  successMessage: "Period template updated",
  errorMessage: "Failed to update period template",
});

export const deletePeriodTemplate = defineMutation<number, { success: boolean }>({
  mutationFn: (id) => trpc().budgetRoutes.deletePeriodTemplate.mutate({ id }),
  onSuccess: (_, id) => {
    cachePatterns.removeQuery(budgetKeys.periodTemplateDetail(id));
    cachePatterns.invalidatePrefix(budgetKeys.periodTemplates());
    // Invalidate all budget queries to refresh the page
    cachePatterns.invalidateDomain("budgets");
  },
  successMessage: "Period template deleted",
  errorMessage: "Failed to delete period template",
});

export const getPeriodAnalytics = (periodId: number) =>
  defineQuery<PeriodAnalytics>({
    queryKey: budgetKeys.periodAnalytics(periodId),
    queryFn: () => trpc().budgetRoutes.getPeriodAnalytics.query({ periodId }),
    options: {
      staleTime: 2 * 60 * 1000, // 2 minutes
      enabled: !!periodId,
    },
  });

export const comparePeriods = (currentPeriodId: number, previousPeriodId: number) =>
  defineQuery<PeriodComparison>({
    queryKey: budgetKeys.periodComparison(currentPeriodId, previousPeriodId),
    queryFn: () => trpc().budgetRoutes.comparePeriods.query({ currentPeriodId, previousPeriodId }),
    options: {
      staleTime: 5 * 60 * 1000,
      enabled: !!currentPeriodId && !!previousPeriodId,
    },
  });

export const getPeriodHistory = (budgetId: number, limit = 10) =>
  defineQuery<PeriodAnalytics[]>({
    queryKey: budgetKeys.periodHistory(budgetId, limit),
    queryFn: () => trpc().budgetRoutes.getPeriodHistory.query({ budgetId, limit }),
    options: {
      staleTime: 5 * 60 * 1000,
      enabled: !!budgetId,
    },
  });

export const generateNextPeriod = defineMutation<number, BudgetPeriodInstance | null>({
  mutationFn: (templateId) => trpc().budgetRoutes.generateNextPeriod.mutate({ templateId }),
  onSuccess: (instance, templateId) => {
    if (instance) {
      cachePatterns.invalidatePrefix(budgetKeys.periodInstances(templateId));
    }
  },
  successMessage: "Next period generated successfully",
  errorMessage: "Failed to generate next period",
});

export const schedulePeriodMaintenance = defineMutation<
  number,
  { created: number; rolledOver: number; cleaned: number }
>({
  mutationFn: (budgetId) => trpc().budgetRoutes.schedulePeriodMaintenance.mutate({ budgetId }),
  onSuccess: (_result, budgetId) => {
    cachePatterns.invalidatePrefix(budgetKeys.detail(budgetId));
    cachePatterns.invalidatePrefix(budgetKeys.periodTemplates());
  },
  successMessage: (result) =>
    `Period maintenance complete: ${result.created} created, ${result.rolledOver} rolled over, ${result.cleaned} cleaned`,
  errorMessage: "Failed to run period maintenance",
});

// Goal Tracking Queries and Mutations

export const getGoalProgress = (budgetId: number) =>
  defineQuery<GoalProgress>({
    queryKey: budgetKeys.goalProgress(budgetId),
    queryFn: () => trpc().budgetRoutes.getGoalProgress.query({ budgetId }),
    options: {
      staleTime: 30 * 1000, // 30 seconds
    },
  });

export const getGoalContributionPlan = (
  budgetId: number,
  frequency: "weekly" | "monthly" | "quarterly" | "yearly",
  customAmount?: number
) =>
  defineQuery<ContributionPlan>({
    queryKey: budgetKeys.goalContributionPlan(budgetId, frequency),
    queryFn: () =>
      trpc().budgetRoutes.createGoalContributionPlan.query({
        budgetId,
        frequency,
        customAmount,
      }),
    options: {
      staleTime: 60 * 1000, // 1 minute
    },
  });

export const linkScheduleToGoal = defineMutation<
  { budgetId: number; scheduleId: number },
  BudgetWithRelations
>({
  mutationFn: (input) => trpc().budgetRoutes.linkScheduleToGoal.mutate(input),
  onSuccess: (_result, { budgetId }) => {
    cachePatterns.invalidatePrefix(budgetKeys.detail(budgetId));
    cachePatterns.invalidatePrefix(budgetKeys.goalProgress(budgetId));
  },
  successMessage: "Schedule linked to goal budget",
  errorMessage: "Failed to link schedule to goal",
});

export const linkScheduleToScheduledExpense = defineMutation<
  { budgetId: number; scheduleId: number },
  BudgetWithRelations
>({
  mutationFn: (input) => trpc().budgetRoutes.linkScheduleToScheduledExpense.mutate(input),
  onSuccess: (_result, { budgetId }) => {
    cachePatterns.invalidatePrefix(budgetKeys.detail(budgetId));
    cachePatterns.invalidatePrefix(budgetKeys.lists());
  },
  successMessage: "Schedule linked to scheduled-expense budget",
  errorMessage: "Failed to link schedule to budget",
});

// Budget Template Queries and Mutations

export const listBudgetTemplates = (includeSystem: boolean = true) =>
  defineQuery<BudgetTemplate[]>({
    queryKey: budgetKeys["templatesList"](includeSystem),
    queryFn: () => trpc().budgetRoutes.listBudgetTemplates.query({ includeSystem }),
    options: {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  });

export const getBudgetTemplate = (id: number) =>
  defineQuery<BudgetTemplate>({
    queryKey: budgetKeys["templatesDetail"](id),
    queryFn: () => trpc().budgetRoutes.getBudgetTemplate.query({ id }),
    options: {
      staleTime: 5 * 60 * 1000,
    },
  });

export const createBudgetTemplate = defineMutation<
  {
    name: string;
    description?: string | null;
    type: BudgetTemplate["type"];
    scope: BudgetTemplate["scope"];
    icon?: string;
    suggestedAmount?: number;
    enforcementLevel?: BudgetTemplate["enforcementLevel"];
    metadata?: Record<string, unknown>;
  },
  BudgetTemplate
>({
  mutationFn: (input) => trpc().budgetRoutes.createBudgetTemplate.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(budgetKeys["templatesAll"]());
  },
  successMessage: "Budget template created successfully",
  errorMessage: "Failed to create budget template",
});

export const updateBudgetTemplate = defineMutation<
  {
    id: number;
    name?: string;
    description?: string | null;
    icon?: string;
    suggestedAmount?: number;
    enforcementLevel?: BudgetTemplate["enforcementLevel"];
    metadata?: Record<string, unknown>;
  },
  BudgetTemplate
>({
  mutationFn: (input) => trpc().budgetRoutes.updateBudgetTemplate.mutate(input),
  onSuccess: (_result, variables) => {
    cachePatterns.invalidatePrefix(budgetKeys["templatesAll"]());
    cachePatterns.invalidatePrefix(budgetKeys["templatesDetail"](variables.id));
  },
  successMessage: "Budget template updated successfully",
  errorMessage: "Failed to update budget template",
});

export const deleteBudgetTemplate = defineMutation<number, void>({
  mutationFn: (id) => trpc().budgetRoutes.deleteBudgetTemplate.mutate({ id }),
  onSuccess: (_result, id) => {
    cachePatterns.invalidatePrefix(budgetKeys["templatesAll"]());
    cachePatterns.invalidatePrefix(budgetKeys["templatesDetail"](id));
  },
  successMessage: "Budget template deleted successfully",
  errorMessage: "Failed to delete budget template",
});

export const duplicateBudgetTemplate = defineMutation<
  { id: number; newName?: string },
  BudgetTemplate
>({
  mutationFn: ({ id, newName }) =>
    trpc().budgetRoutes.duplicateBudgetTemplate.mutate({ id, newName }),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(budgetKeys["templatesAll"]());
  },
  successMessage: "Budget template duplicated successfully",
  errorMessage: "Failed to duplicate budget template",
});

/**
 * Get budget suggestions for a transaction
 */
export interface BudgetSuggestion {
  budgetId: number;
  budgetName: string;
  confidence: number;
  reason: string;
  reasonText?: string;
}

export const getBudgetSuggestions = defineQuery<
  {
    accountId: number;
    categoryId?: number | null;
    payeeId?: number | null;
    amount: number;
    date: string;
  },
  BudgetSuggestion[]
>({
  queryKey: (params) => budgetKeys.suggestions(params),
  queryFn: (params) => trpc().budgetRoutes.suggestBudgets.query(params),
  enabled: (params) => params.accountId > 0,
});

// Budget Intelligence & Recommendations

export const analyzeSpendingHistory = (params?: {
  accountIds?: number[];
  months?: number;
  minTransactions?: number;
  minConfidence?: number;
}) =>
  defineQuery<BudgetRecommendationDraft[]>({
    queryKey: budgetKeys.analysisHistory(params),
    queryFn: () => trpc().budgetRoutes.analyzeSpendingHistory.query(params ?? {}),
    options: {
      staleTime: 5 * 60 * 1000, // 5 minutes - analysis is expensive
    },
  });

export const generateRecommendations = defineMutation<
  {
    accountIds?: number[];
    months?: number;
    minTransactions?: number;
    minConfidence?: number;
  },
  BudgetRecommendationWithRelations[]
>({
  mutationFn: (input) => trpc().budgetRoutes.generateRecommendations.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(budgetKeys.recommendations());
  },
  successMessage: (result) =>
    `Generated ${result.length} recommendation${result.length !== 1 ? "s" : ""}`,
  errorMessage: "Failed to generate recommendations",
});

export const listRecommendations = (filters?: {
  status?: RecommendationStatus | RecommendationStatus[];
  type?: RecommendationType | RecommendationType[];
  priority?: RecommendationPriority | RecommendationPriority[];
  budgetId?: number;
  accountId?: number;
  categoryId?: number;
  includeExpired?: boolean;
}) =>
  defineQuery<BudgetRecommendationWithRelations[]>({
    queryKey: budgetKeys.recommendationsList(filters),
    queryFn: () => trpc().budgetRoutes.listRecommendations.query(filters ?? {}),
    options: {
      staleTime: 30 * 1000, // 30 seconds
    },
  });

export const getRecommendation = (id: number) =>
  defineQuery<BudgetRecommendationWithRelations>({
    queryKey: budgetKeys.recommendationDetail(id),
    queryFn: () => trpc().budgetRoutes.getRecommendation.query({ id }),
    options: {
      staleTime: 30 * 1000,
      enabled: !!id,
    },
  });

export const dismissRecommendation = defineMutation<number, BudgetRecommendationWithRelations>({
  mutationFn: (id) => trpc().budgetRoutes.dismissRecommendation.mutate({ id }),
  onSuccess: (_, id) => {
    cachePatterns.invalidatePrefix(budgetKeys.recommendations());
    cachePatterns.invalidatePrefix(budgetKeys.recommendationDetail(id));
  },
  successMessage: "Recommendation dismissed",
  errorMessage: "Failed to dismiss recommendation",
});

export const restoreRecommendation = defineMutation<number, BudgetRecommendationWithRelations>({
  mutationFn: (id) => trpc().budgetRoutes.restoreRecommendation.mutate({ id }),
  onSuccess: (_, id) => {
    cachePatterns.invalidatePrefix(budgetKeys.recommendations());
    cachePatterns.invalidatePrefix(budgetKeys.recommendationDetail(id));
  },
  successMessage: "Recommendation restored",
  errorMessage: "Failed to restore recommendation",
});

export const applyRecommendation = defineMutation<number, BudgetWithRelations>({
  mutationFn: (id) => trpc().budgetRoutes.applyRecommendation.mutate({ id }),
  onSuccess: (budget, id) => {
    // Update state if available
    getState()?.upsertBudget(budget);

    // Optimistically add the new budget to all budget queries immediately
    // This includes both list queries and account-specific queries
    cachePatterns.updateQueriesWithCondition<BudgetWithRelations[]>(
      (queryKey) =>
        queryKey[0] === "budgets" && (queryKey[1] === "list" || queryKey[1] === "account"),
      (oldData) => {
        // Check if budget already exists (update case) or needs to be added (create case)
        const existingIndex = oldData.findIndex((b) => b.id === budget.id);
        if (existingIndex >= 0) {
          // Update existing budget
          const newData = [...oldData];
          newData[existingIndex] = budget;
          return newData;
        }
        // Add new budget
        return [...oldData, budget];
      }
    );

    cachePatterns.invalidatePrefix(budgetKeys.recommendations());
    cachePatterns.invalidatePrefix(budgetKeys.recommendationDetail(id));
    cachePatterns.invalidatePrefix(budgetKeys.lists());
    cachePatterns.invalidatePrefix(["budgets", "account"]);
  },
  successMessage: "Recommendation applied successfully",
  errorMessage: "Failed to apply recommendation",
});

export const deleteRecommendation = defineMutation<number, { success: boolean }>({
  mutationFn: (id) => trpc().budgetRoutes.deleteRecommendation.mutate({ id }),
  onSuccess: (_, id) => {
    cachePatterns.invalidatePrefix(budgetKeys.recommendations());
    cachePatterns.removeQuery(budgetKeys.recommendationDetail(id));
  },
  successMessage: "Recommendation deleted",
  errorMessage: "Failed to delete recommendation",
});

export const clearAllRecommendations = defineMutation<void, { deleted: number }>({
  mutationFn: () => trpc().budgetRoutes.clearAllRecommendations.mutate(),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(budgetKeys.recommendations());
  },
  successMessage: (result) => `Cleared ${result.deleted} recommendation(s)`,
  errorMessage: "Failed to clear recommendations",
});

export const getPendingRecommendationsCount = () =>
  defineQuery<number>({
    queryKey: budgetKeys.recommendationsPendingCount(),
    queryFn: () => trpc().budgetRoutes.getPendingRecommendationsCount.query(),
    options: {
      ...queryPresets.static,
    },
  });

export const getRecommendationCounts = () =>
  defineQuery<{
    pending: number;
    dismissed: number;
    applied: number;
    expired: number;
  }>({
    queryKey: budgetKeys.recommendationsCount(),
    queryFn: () => trpc().budgetRoutes.getRecommendationCounts.query(),
    options: {
      ...queryPresets.static,
    },
  });

// ==================== Budget Group Automation ====================

export const getAutomationSettings = () =>
  defineQuery<{
    id: number;
    autoCreateGroups: boolean;
    autoAssignToGroups: boolean;
    autoAdjustGroupLimits: boolean;
    requireConfirmationThreshold: "high" | "medium" | "low";
    enableSmartGrouping: boolean;
    groupingStrategy: "category-based" | "account-based" | "spending-pattern" | "hybrid";
    minSimilarityScore: number;
    minGroupSize: number;
    createdAt: string;
    updatedAt: string;
  }>({
    queryKey: budgetKeys.automationSettings(),
    queryFn: () => trpc().budgetRoutes.getAutomationSettings.query(),
    options: {
      ...queryPresets.static,
    },
  });

export const updateAutomationSettings = defineMutation<
  Partial<{
    autoCreateGroups: boolean;
    autoAssignToGroups: boolean;
    autoAdjustGroupLimits: boolean;
    requireConfirmationThreshold: "high" | "medium" | "low";
    enableSmartGrouping: boolean;
    groupingStrategy: "category-based" | "account-based" | "spending-pattern" | "hybrid";
    minSimilarityScore: number;
    minGroupSize: number;
  }>,
  any
>({
  mutationFn: (updates) => trpc().budgetRoutes.updateAutomationSettings.mutate(updates),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(budgetKeys.automationSettings());
  },
  successMessage: "Automation settings updated",
  errorMessage: "Failed to update automation settings",
});

export const listAutomationActivity = (filters?: {
  status?: "pending" | "success" | "failed" | "rolled_back";
  actionType?: "create_group" | "assign_to_group" | "adjust_limit" | "merge_groups";
  limit?: number;
}) =>
  defineQuery<
    Array<{
      id: number;
      actionType: "create_group" | "assign_to_group" | "adjust_limit" | "merge_groups";
      recommendationId: number | null;
      groupId: number | null;
      budgetIds: number[] | null;
      status: "pending" | "success" | "failed" | "rolled_back";
      errorMessage: string | null;
      metadata: Record<string, unknown> | null;
      createdAt: string;
      rolledBackAt: string | null;
    }>
  >({
    queryKey: budgetKeys.automationActivity(filters),
    queryFn: () => trpc().budgetRoutes.listAutomationActivity.query(filters ?? {}),
    options: {
      staleTime: 10 * 1000, // 10 seconds
    },
  });

export const rollbackAutomation = defineMutation<number, { success: boolean }>({
  mutationFn: (activityId) => trpc().budgetRoutes.rollbackAutomation.mutate({ activityId }),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(budgetKeys.automationActivity());
    cachePatterns.invalidatePrefix(budgetKeys.lists()); // Budgets/groups may have changed
    cachePatterns.invalidatePrefix(budgetKeys.groups());
  },
  successMessage: "Automation rolled back successfully",
  errorMessage: "Failed to rollback automation",
});

export const autoApplyGroupRecommendation = defineMutation<
  number,
  { success: boolean; activityId?: number }
>({
  mutationFn: (recommendationId) =>
    trpc().budgetRoutes.autoApplyGroupRecommendation.mutate({ recommendationId }),
  onSuccess: (_, recommendationId) => {
    cachePatterns.invalidatePrefix(budgetKeys.recommendations());
    cachePatterns.invalidatePrefix(budgetKeys.recommendationDetail(recommendationId));
    cachePatterns.invalidatePrefix(budgetKeys.automationActivity());
    cachePatterns.invalidatePrefix(budgetKeys.groups());
    cachePatterns.invalidatePrefix(budgetKeys.lists());
  },
  successMessage: "Group recommendation applied",
  errorMessage: "Failed to apply group recommendation",
});
