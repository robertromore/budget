import type {
  Budget,
  BudgetPeriodInstance,
  BudgetPeriodTemplate,
  BudgetTransaction,
  BudgetTemplate,
} from "$lib/schema/budgets";
import type { BudgetWithRelations } from "$lib/server/domains/budgets";
import type {
  AllocationValidationResult,
  CreateBudgetRequest,
  EnsurePeriodInstanceOptions,
  UpdateBudgetRequest,
  GoalProgress,
  ContributionPlan,
} from "$lib/server/domains/budgets/services";
import type {
  PeriodAnalytics,
  PeriodComparison,
} from "$lib/server/domains/budgets/period-manager";
import { BudgetState } from "$lib/states/budgets.svelte";
import { trpc } from "$lib/trpc/client";
import { cachePatterns, queryPresets } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

export const budgetKeys = createQueryKeys("budgets", {
  lists: () => ["budgets", "list"] as const,
  list: (status?: Budget["status"]) => ["budgets", "list", status ?? "all"] as const,
  count: () => ["budgets", "count"] as const,
  details: () => ["budgets", "detail"] as const,
  detail: (id: number) => ["budgets", "detail", id] as const,
  detailBySlug: (slug: string) => ["budgets", "detail", "slug", slug] as const,
  periodInstances: (templateId: number) => ["budgets", "periods", templateId] as const,
  periodAnalytics: (periodId: number) => ["budgets", "periods", "analytics", periodId] as const,
  periodComparison: (currentId: number, previousId: number) => ["budgets", "periods", "comparison", currentId, previousId] as const,
  periodHistory: (budgetId: number, limit: number) => ["budgets", "periods", "history", budgetId, limit] as const,
  periodTemplates: () => ["budgets", "period-templates"] as const,
  periodTemplateDetail: (id: number) => ["budgets", "period-templates", "detail", id] as const,
  periodTemplateList: (budgetId: number) => ["budgets", "period-templates", "list", budgetId] as const,
  allocationValidation: (transactionId: number, amount: number, excludeId: number | null) =>
    ["budgets", "allocation", transactionId, amount, excludeId] as const,
  applicableBudgets: (accountId?: number, categoryId?: number) =>
    ["budgets", "applicable", accountId ?? null, categoryId ?? null] as const,
  groups: () => ["budgets", "groups"] as const,
  groupDetail: (id: number) => ["budgets", "groups", "detail", id] as const,
  groupList: (parentId?: number | null) => ["budgets", "groups", "list", parentId ?? "all"] as const,
  rootGroups: () => ["budgets", "groups", "root"] as const,
  goalProgress: (budgetId: number) => ["budgets", "goal", "progress", budgetId] as const,
  goalContributionPlan: (budgetId: number, frequency: string) =>
    ["budgets", "goal", "contribution-plan", budgetId, frequency] as const,
  templates: {
    all: () => ["budgets", "templates"] as const,
    list: (includeSystem: boolean) => ["budgets", "templates", "list", includeSystem] as const,
    detail: (id: number) => ["budgets", "templates", "detail", id] as const,
  },
  suggestions: (params: {
    accountId: number;
    categoryId?: number | null;
    payeeId?: number | null;
    amount: number;
    date: string;
  }) => ["budgets", "suggestions", params] as const,
});

function getState(): BudgetState | null {
  return BudgetState.safeGet();
}

export const getBudgetCount = () =>
  defineQuery<{count: number}>({
    queryKey: budgetKeys.count(),
    queryFn: () => trpc().budgetRoutes.count.query(),
    options: {
      ...queryPresets.static,
    },
  });

export const listBudgets = (status?: Budget["status"]) =>
  defineQuery<BudgetWithRelations[]>({
    queryKey: budgetKeys.list(status),
    queryFn: () => trpc().budgetRoutes.list.query(status ? {status} : {}),
    options: {
      ...queryPresets.static,
    },
  });

export const getBudgetDetail = (idOrSlug: number | string) =>
  defineQuery<BudgetWithRelations>({
    queryKey: typeof idOrSlug === "number" ? budgetKeys.detail(idOrSlug) : budgetKeys.detailBySlug(idOrSlug),
    queryFn: () => typeof idOrSlug === "number"
      ? trpc().budgetRoutes.get.query({id: idOrSlug})
      : trpc().budgetRoutes.getBySlug.query({slug: idOrSlug}),
    options: {
      staleTime: 60 * 1000,
    },
  });

export const listPeriodInstances = (templateId: number) =>
  defineQuery<BudgetPeriodInstance[]>({
    queryKey: budgetKeys.periodInstances(templateId),
    queryFn: () => trpc().budgetRoutes.listPeriodInstances.query({templateId}),
    options: {
      staleTime: 5 * 60 * 1000,
    },
  });

export const validateAllocation = (
  transactionId: number,
  amount: number,
  excludeAllocationId?: number
) =>
  defineQuery<AllocationValidationResult>({
    queryKey: budgetKeys.allocationValidation(transactionId, amount, excludeAllocationId ?? null),
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
  onSuccess: (budget, variables, context) => {
    const state = getState();
    if (state) {
      state.upsertBudget(budget);
    }

    // Update cache with new budget optimistically
    cachePatterns.updateQueriesWithCondition<BudgetWithRelations[]>(
      (queryKey) => queryKey[0] === 'budgets' && queryKey[1] === 'list',
      (oldData) => [...oldData, budget]
    );

    cachePatterns.invalidatePrefix(budgetKeys.lists());
  },
  successMessage: "Budget created",
  errorMessage: "Failed to create budget",
});

export const updateBudget = defineMutation<
  {id: number; data: UpdateBudgetRequest},
  BudgetWithRelations
>({
  mutationFn: ({id, data}) => trpc().budgetRoutes.update.mutate({id, ...data}),
  onSuccess: (budget) => {
    getState()?.upsertBudget(budget);
    cachePatterns.invalidatePrefix(budgetKeys.detail(budget.id));
  },
  successMessage: "Budget updated",
  errorMessage: "Failed to update budget",
});

export const deleteBudget = defineMutation<number, {success: boolean}>({
  mutationFn: (id) => trpc().budgetRoutes.delete.mutate({id}),
  onSuccess: (_, id) => {
    getState()?.removeBudget(id);
    cachePatterns.removeQuery(budgetKeys.detail(id));
    cachePatterns.invalidatePrefix(budgetKeys.lists());
  },
  successMessage: "Budget deleted",
  errorMessage: "Failed to delete budget",
});

export const duplicateBudget = defineMutation<
  {id: number; newName?: string},
  BudgetWithRelations
>({
  mutationFn: ({id, newName}) => trpc().budgetRoutes.duplicate.mutate({id, newName}),
  onSuccess: (budget) => {
    getState()?.upsertBudget(budget);
    cachePatterns.invalidatePrefix(budgetKeys.lists());
  },
  successMessage: "Budget duplicated",
  errorMessage: "Failed to duplicate budget",
});

export const bulkArchiveBudgets = defineMutation<
  number[],
  {success: number; failed: number; errors: Array<{id: number; error: string}>}
>({
  mutationFn: (ids) => trpc().budgetRoutes.bulkArchive.mutate({ids}),
  onSuccess: (_result, ids) => {
    // Invalidate all budgets cache since multiple budgets changed
    cachePatterns.invalidatePrefix(budgetKeys.lists());
    ids.forEach(id => cachePatterns.invalidatePrefix(budgetKeys.detail(id)));
  },
  successMessage: (result) => `${result.success} budget(s) archived${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
  errorMessage: "Failed to archive budgets",
});

export const bulkDeleteBudgets = defineMutation<
  number[],
  {success: number; failed: number; errors: Array<{id: number; error: string}>}
>({
  mutationFn: (ids) => trpc().budgetRoutes.bulkDelete.mutate({ids}),
  onSuccess: (_result, ids) => {
    // Remove deleted budgets from state and cache
    ids.forEach(id => {
      getState()?.removeBudget(id);
      cachePatterns.removeQuery(budgetKeys.detail(id));
    });
    cachePatterns.invalidatePrefix(budgetKeys.lists());
  },
  successMessage: (result) => `${result.success} budget(s) deleted${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
  errorMessage: "Failed to delete budgets",
});

export const ensurePeriodInstance = defineMutation<
  {templateId: number; options?: EnsurePeriodInstanceOptions},
  BudgetPeriodInstance
>({
  mutationFn: ({templateId, options}) => {
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
  mutationFn: (id) => trpc().budgetRoutes.clearAllocation.mutate({id}),
  onSuccess: (allocation) => {
    cachePatterns.invalidatePrefix(budgetKeys.detail(allocation.budgetId));
  },
  successMessage: "Allocation cleared",
  errorMessage: "Failed to clear allocation",
});

export const deleteAllocation = defineMutation<number, {success: boolean}>({
  mutationFn: (id) => trpc().budgetRoutes.deleteAllocation.mutate({id}),
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
    queryFn: () => trpc().budgetRoutes.getEnvelopeAllocations.query({budgetId}),
    options: {
      staleTime: 60 * 1000,
      enabled: !!budgetId,
    },
  });

export const createEnvelopeAllocation = defineMutation<
  {budgetId: number; categoryId: number; periodInstanceId: number; allocatedAmount: number; rolloverMode?: "unlimited" | "reset" | "limited"; metadata?: Record<string, unknown>},
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
  {envelopeId: number; allocatedAmount: number; metadata?: Record<string, unknown>},
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
    rolloverMode?: 'unlimited' | 'limited' | 'reset';
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
  {fromEnvelopeId: number; toEnvelopeId: number; amount: number; reason?: string; transferredBy?: string},
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
  {fromPeriodId: number; toPeriodId: number},
  any
>({
  mutationFn: (input) => trpc().budgetRoutes.processEnvelopeRollover.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix([...budgetKeys.all(), "envelopes"]);
  },
  successMessage: "Rollover processed successfully",
  errorMessage: "Failed to process rollover",
});

export const previewEnvelopeRollover = (fromPeriodId: number, toPeriodId: number) =>
  defineQuery({
    queryKey: [...budgetKeys.all(), "rollover-preview", fromPeriodId, toPeriodId],
    queryFn: () => trpc().budgetRoutes.previewEnvelopeRollover.query({fromPeriodId, toPeriodId}),
    options: {
      staleTime: 30 * 1000,
      enabled: !!fromPeriodId && !!toPeriodId,
    },
  });

export const getRolloverSummary = (periodId: number) =>
  defineQuery({
    queryKey: [...budgetKeys.all(), "rollover-summary", periodId],
    queryFn: () => trpc().budgetRoutes.getRolloverSummary.query({periodId}),
    options: {
      staleTime: 60 * 1000,
      enabled: !!periodId,
    },
  });

export const getRolloverHistory = (envelopeId: number, limit?: number) =>
  defineQuery({
    queryKey: [...budgetKeys.all(), "rollover-history", envelopeId, limit ?? null],
    queryFn: () => trpc().budgetRoutes.getRolloverHistory.query({envelopeId, limit}),
    options: {
      staleTime: 60 * 1000,
      enabled: !!envelopeId,
    },
  });

export const getBudgetRolloverHistory = (budgetId: number, limit?: number) =>
  defineQuery({
    queryKey: [...budgetKeys.all(), "budget-rollover-history", budgetId, limit ?? null],
    queryFn: () => trpc().budgetRoutes.getBudgetRolloverHistory.query({budgetId, limit}),
    options: {
      staleTime: 60 * 1000,
      enabled: !!budgetId,
    },
  });

export const estimateRolloverImpact = (fromPeriodId: number, toPeriodId: number) =>
  defineQuery({
    queryKey: [...budgetKeys.all(), "rollover-estimate", fromPeriodId, toPeriodId],
    queryFn: () => trpc().budgetRoutes.estimateRolloverImpact.query({fromPeriodId, toPeriodId}),
    options: {
      staleTime: 30 * 1000,
      enabled: !!fromPeriodId && !!toPeriodId,
    },
  });

export const previewRollover = (fromPeriodId: number, toPeriodId: number) =>
  defineQuery({
    queryKey: [...budgetKeys.all(), "rollover-preview", fromPeriodId, toPeriodId],
    queryFn: () => trpc().budgetRoutes.previewRollover.query({fromPeriodId, toPeriodId}),
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
      deficitRecoveryMode?: 'immediate' | 'gradual' | 'manual';
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
    queryFn: () => trpc().budgetRoutes.getDeficitEnvelopes.query({budgetId}),
    options: {
      staleTime: 30 * 1000,
      enabled: !!budgetId,
    },
  });

export const getSurplusEnvelopes = (budgetId: number, minimumSurplus?: number) =>
  defineQuery({
    queryKey: [...budgetKeys.all(), "surplus-envelopes", budgetId, minimumSurplus ?? null],
    queryFn: () => trpc().budgetRoutes.getSurplusEnvelopes.query({budgetId, minimumSurplus}),
    options: {
      staleTime: 30 * 1000,
      enabled: !!budgetId,
    },
  });

export const analyzeEnvelopeDeficit = (envelopeId: number) =>
  defineQuery({
    queryKey: [...budgetKeys.all(), "analyze-deficit", envelopeId],
    queryFn: () => trpc().budgetRoutes.analyzeEnvelopeDeficit.query({envelopeId}),
    options: {
      staleTime: 10 * 1000,
      enabled: !!envelopeId,
    },
  });

export const createDeficitRecoveryPlan = (envelopeId: number) =>
  defineQuery({
    queryKey: [...budgetKeys.all(), "deficit-recovery-plan", envelopeId],
    queryFn: () => trpc().budgetRoutes.createDeficitRecoveryPlan.query({envelopeId}),
    options: {
      staleTime: 0,
      enabled: !!envelopeId,
    },
  });

export const executeDeficitRecovery = defineMutation<
  {plan: any; executedBy?: string},
  any
>({
  mutationFn: (input) => trpc().budgetRoutes.executeDeficitRecovery.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix([...budgetKeys.all(), "envelopes"]);
    cachePatterns.invalidatePrefix([...budgetKeys.all(), "deficit-envelopes"]);
  },
  successMessage: "Deficit recovery executed successfully",
  errorMessage: "Failed to execute deficit recovery",
});

export const generateBulkDeficitRecovery = defineMutation<
  {budgetId: number},
  any
>({
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
    queryFn: () => trpc().budgetRoutes.getApplicableBudgets.query({accountId, categoryId}),
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
  defineQuery<{allowed: boolean; violations: Array<{budgetId: number; budgetName: string; exceeded: number}>}>({
    queryKey: [...budgetKeys.all(), "validate-strict", amount, accountId ?? null, categoryId ?? null, transactionId ?? null],
    queryFn: () => trpc().budgetRoutes.validateTransactionStrict.query({
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
    queryFn: () => trpc().budgetRoutes.getGroup.query({id}),
    options: {
      staleTime: 60 * 1000,
    },
  });

export const listBudgetGroups = (parentId?: number | null) =>
  defineQuery({
    queryKey: budgetKeys.groupList(parentId),
    queryFn: () => trpc().budgetRoutes.listGroups.query(parentId !== undefined ? {parentId} : undefined),
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
  {name: string; description?: string | null; parentId?: number | null; spendingLimit?: number | null},
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
  {id: number; name?: string; description?: string | null; parentId?: number | null; spendingLimit?: number | null},
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

export const deleteBudgetGroup = defineMutation<number, {success: boolean}>({
  mutationFn: (id) => trpc().budgetRoutes.deleteGroup.mutate({id}),
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
    queryFn: () => trpc().budgetRoutes.getSpendingTrends.query({budgetId, limit}),
    options: {
      staleTime: 60 * 1000, // 1 minute
      enabled: !!budgetId,
    },
  });

export const getCategoryBreakdown = (budgetId: number) =>
  defineQuery({
    queryKey: [...budgetKeys.detail(budgetId), "analytics", "category-breakdown"],
    queryFn: () => trpc().budgetRoutes.getCategoryBreakdown.query({budgetId}),
    options: {
      staleTime: 60 * 1000, // 1 minute
      enabled: !!budgetId,
    },
  });

export const getDailySpending = (budgetId: number, startDate: string, endDate: string) =>
  defineQuery({
    queryKey: [...budgetKeys.detail(budgetId), "analytics", "daily-spending", startDate, endDate],
    queryFn: () => trpc().budgetRoutes.getDailySpending.query({budgetId, startDate, endDate}),
    options: {
      staleTime: 60 * 1000, // 1 minute
      enabled: !!budgetId && !!startDate && !!endDate,
    },
  });

export const getBudgetSummaryStats = (budgetId: number) =>
  defineQuery({
    queryKey: [...budgetKeys.detail(budgetId), "analytics", "summary-stats"],
    queryFn: () => trpc().budgetRoutes.getSummaryStats.query({budgetId}),
    options: {
      staleTime: 60 * 1000, // 1 minute
      enabled: !!budgetId,
    },
  });

// Forecast & Schedule Integration

export const getBudgetForecast = (budgetId: number, daysAhead: number = 30) =>
  defineQuery({
    queryKey: [...budgetKeys.detail(budgetId), "forecast", daysAhead],
    queryFn: () => trpc().budgetRoutes.getBudgetForecast.query({budgetId, daysAhead}),
    options: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      enabled: !!budgetId,
    },
  });

export const autoAllocateBudget = () =>
  defineMutation({
    mutationFn: (budgetId: number) => trpc().budgetRoutes.autoAllocateBudget.mutate({budgetId}),
    onSuccess: (_, budgetId) => {
      cachePatterns.invalidatePrefix(budgetKeys.detail(budgetId));
      cachePatterns.invalidatePrefix([...budgetKeys.detail(budgetId), "forecast"]);
    },
  });

// Period Template Operations

export const getPeriodTemplate = (id: number) =>
  defineQuery<BudgetPeriodTemplate>({
    queryKey: budgetKeys.periodTemplateDetail(id),
    queryFn: () => trpc().budgetRoutes.getPeriodTemplate.query({id}),
    options: {
      staleTime: 60 * 1000,
    },
  });

export const listPeriodTemplates = (budgetId: number) =>
  defineQuery<BudgetPeriodTemplate[]>({
    queryKey: budgetKeys.periodTemplateList(budgetId),
    queryFn: () => trpc().budgetRoutes.listPeriodTemplates.query({budgetId}),
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
    cachePatterns.invalidatePrefix(budgetKeys.periodTemplateList(template.budgetId));
    cachePatterns.invalidatePrefix(budgetKeys.detail(template.budgetId));
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

export const deletePeriodTemplate = defineMutation<number, {success: boolean}>({
  mutationFn: (id) => trpc().budgetRoutes.deletePeriodTemplate.mutate({id}),
  onSuccess: (_, id) => {
    cachePatterns.removeQuery(budgetKeys.periodTemplateDetail(id));
    cachePatterns.invalidatePrefix(budgetKeys.periodTemplates());
  },
  successMessage: "Period template deleted",
  errorMessage: "Failed to delete period template",
});

export const getPeriodAnalytics = (periodId: number) =>
  defineQuery<PeriodAnalytics>({
    queryKey: budgetKeys.periodAnalytics(periodId),
    queryFn: () => trpc().budgetRoutes.getPeriodAnalytics.query({periodId}),
    options: {
      staleTime: 2 * 60 * 1000, // 2 minutes
      enabled: !!periodId,
    },
  });

export const comparePeriods = (currentPeriodId: number, previousPeriodId: number) =>
  defineQuery<PeriodComparison>({
    queryKey: budgetKeys.periodComparison(currentPeriodId, previousPeriodId),
    queryFn: () =>
      trpc().budgetRoutes.comparePeriods.query({currentPeriodId, previousPeriodId}),
    options: {
      staleTime: 5 * 60 * 1000,
      enabled: !!currentPeriodId && !!previousPeriodId,
    },
  });

export const getPeriodHistory = (budgetId: number, limit = 10) =>
  defineQuery<PeriodAnalytics[]>({
    queryKey: budgetKeys.periodHistory(budgetId, limit),
    queryFn: () => trpc().budgetRoutes.getPeriodHistory.query({budgetId, limit}),
    options: {
      staleTime: 5 * 60 * 1000,
      enabled: !!budgetId,
    },
  });

export const generateNextPeriod = defineMutation<number, BudgetPeriodInstance | null>({
  mutationFn: (templateId) => trpc().budgetRoutes.generateNextPeriod.mutate({templateId}),
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
  {created: number; rolledOver: number; cleaned: number}
>({
  mutationFn: (budgetId) => trpc().budgetRoutes.schedulePeriodMaintenance.mutate({budgetId}),
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
    queryFn: () => trpc().budgetRoutes.getGoalProgress.query({budgetId}),
    options: {
      staleTime: 30 * 1000, // 30 seconds
    },
  });

export const getGoalContributionPlan = (
  budgetId: number,
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly',
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
  {budgetId: number; scheduleId: number},
  BudgetWithRelations
>({
  mutationFn: (input) => trpc().budgetRoutes.linkScheduleToGoal.mutate(input),
  onSuccess: (_result, {budgetId}) => {
    cachePatterns.invalidatePrefix(budgetKeys.detail(budgetId));
    cachePatterns.invalidatePrefix(budgetKeys.goalProgress(budgetId));
  },
  successMessage: "Schedule linked to goal budget",
  errorMessage: "Failed to link schedule to goal",
});

// Budget Template Queries and Mutations

export const listBudgetTemplates = (includeSystem: boolean = true) =>
  defineQuery<BudgetTemplate[]>({
    queryKey: budgetKeys.templates.list(includeSystem),
    queryFn: () => trpc().budgetRoutes.listBudgetTemplates.query({includeSystem}),
    options: {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  });

export const getBudgetTemplate = (id: number) =>
  defineQuery<BudgetTemplate>({
    queryKey: budgetKeys.templates.detail(id),
    queryFn: () => trpc().budgetRoutes.getBudgetTemplate.query({id}),
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
    cachePatterns.invalidatePrefix(budgetKeys.templates.all());
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
    cachePatterns.invalidatePrefix(budgetKeys.templates.all());
    cachePatterns.invalidatePrefix(budgetKeys.templates.detail(variables.id));
  },
  successMessage: "Budget template updated successfully",
  errorMessage: "Failed to update budget template",
});

export const deleteBudgetTemplate = defineMutation<number, void>({
  mutationFn: (id) => trpc().budgetRoutes.deleteBudgetTemplate.mutate({id}),
  onSuccess: (_result, id) => {
    cachePatterns.invalidatePrefix(budgetKeys.templates.all());
    cachePatterns.invalidatePrefix(budgetKeys.templates.detail(id));
  },
  successMessage: "Budget template deleted successfully",
  errorMessage: "Failed to delete budget template",
});

export const duplicateBudgetTemplate = defineMutation<
  {id: number; newName?: string},
  BudgetTemplate
>({
  mutationFn: ({id, newName}) =>
    trpc().budgetRoutes.duplicateBudgetTemplate.mutate({id, newName}),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(budgetKeys.templates.all());
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
  reason: "payee_default" | "category_link" | "account_scope" | "historical_pattern" | "smart_fallback";
  reasonText: string;
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
