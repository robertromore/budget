import type {
  Budget,
  BudgetPeriodInstance,
  BudgetTransaction,
} from "$lib/schema/budgets";
import type { BudgetWithRelations } from "$lib/server/domains/budgets";
import type {
  AllocationValidationResult,
  CreateBudgetRequest,
  EnsurePeriodInstanceOptions,
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
  details: () => ["budgets", "detail"] as const,
  detail: (id: number) => ["budgets", "detail", id] as const,
  periodInstances: (templateId: number) => ["budgets", "periods", templateId] as const,
  allocationValidation: (transactionId: number, amount: number, excludeId: number | null) =>
    ["budgets", "allocation", transactionId, amount, excludeId] as const,
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

export const getBudgetDetail = (id: number) =>
  defineQuery<BudgetWithRelations>({
    queryKey: budgetKeys.detail(id),
    queryFn: () => trpc().budgetRoutes.get.query({id}),
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
  onSuccess: (budget) => {
    getState()?.upsertBudget(budget);
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
  onSuccess: (_, id) => {
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

