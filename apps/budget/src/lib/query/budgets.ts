import { defineQuery, defineMutation } from "./_factory";
import { cachePatterns } from "./_client";
import { trpc } from "$lib/trpc/client";
import type {
  Budget,
  BudgetGroup,
  CreateBudgetData,
  UpdateBudgetData,
  BudgetFilters,
  PaginationParams
} from "$lib/server/domains/budgets/types";

// Budget queries
export const getAllBudgets = defineQuery({
  queryKey: ["budgets"],
  queryFn: () => trpc().budgetRoutes.getAll.query({}),
});

export const getBudgetById = defineQuery({
  queryKey: (id: number, includeRelations: boolean = false) => ["budgets", id, includeRelations],
  queryFn: async (trpc, id: number, includeRelations: boolean = false) => {
    return trpc.budgetRoutes.getById.query({ id, includeRelations });
  },
});

export const getBudgetsFiltered = defineQuery({
  queryKey: (filters: BudgetFilters, pagination?: PaginationParams) => [
    "budgets",
    "filtered",
    filters,
    pagination
  ],
  queryFn: async (trpc, filters: BudgetFilters, pagination?: PaginationParams) => {
    return trpc.budgetRoutes.getAll.query({ filters, pagination });
  },
});

export const getBudgetProgress = defineQuery({
  queryKey: (budgetId: number, periodId?: number, date?: string) => [
    "budgets",
    "progress",
    budgetId,
    periodId,
    date
  ],
  queryFn: async (trpc, budgetId: number, periodId?: number, date?: string) => {
    return trpc.budgetRoutes.progress.query({ budgetId, periodId, date });
  },
});

export const getBudgetSummary = defineQuery({
  queryKey: (budgetId: number, date?: string) => ["budgets", "summary", budgetId, date],
  queryFn: async (trpc, budgetId: number, date?: string) => {
    return trpc.budgetRoutes.progress.query({ budgetId, date });
  },
});

// Budget groups queries
export const getAllBudgetGroups = defineQuery({
  queryKey: ["budget-groups"],
  queryFn: async (trpc) => {
    return trpc.budgetRoutes.groups.list.query();
  },
});

// Budget periods queries
export const getBudgetPeriodTemplates = defineQuery({
  queryKey: (budgetId: number) => ["budget-period-templates", budgetId],
  queryFn: async (trpc, budgetId: number) => {
    return trpc.budgetRoutes.periodTemplates.list.query({ budgetId });
  },
});

export const getBudgetPeriodInstances = defineQuery({
  queryKey: (filters: any = {}, pagination: any = {}) => [
    "budget-period-instances",
    filters,
    pagination
  ],
  queryFn: async (trpc, filters: any = {}, pagination: any = {}) => {
    return trpc.budgetRoutes.periods.list.query({ filters, pagination });
  },
});

// Budget transactions queries
export const getBudgetTransactionsByBudget = defineQuery({
  queryKey: (budgetId: number, filters: any = {}) => [
    "budget-transactions",
    "by-budget",
    budgetId,
    filters
  ],
  queryFn: async (trpc, budgetId: number, filters: any = {}) => {
    return trpc.budgetRoutes.transactions.byBudget.query({ budgetId, filters });
  },
});

export const getBudgetTransactionsByTransaction = defineQuery({
  queryKey: (transactionId: number) => ["budget-transactions", "by-transaction", transactionId],
  queryFn: async (trpc, transactionId: number) => {
    return trpc.budgetRoutes.transactions.byTransaction.query({ transactionId });
  },
});

export const validateProposedAllocation = defineQuery({
  queryKey: (transactionId: number, proposedAmount: number, excludeAllocationId?: number) => [
    "budget-allocations",
    "validate",
    transactionId,
    proposedAmount,
    excludeAllocationId
  ],
  queryFn: async (trpc, transactionId: number, proposedAmount: number, excludeAllocationId?: number) => {
    return trpc.budgetRoutes.validateAllocation.query({
      transactionId,
      proposedAmount,
      excludeAllocationId
    });
  },
});

export const isTransactionFullyAllocated = defineQuery({
  queryKey: (transactionId: number) => ["budget-allocations", "fully-allocated", transactionId],
  queryFn: async (trpc, transactionId: number) => {
    return trpc.budgetRoutes.transactions.isTransactionFullyAllocated.query({ transactionId });
  },
});

// Budget mutations
export const createBudget = defineMutation<CreateBudgetData, Budget>({
  mutationFn: (data) => trpc().budgetRoutes.create.mutate(data),
  onSuccess: (newBudget, variables) => {
    // Invalidate budget queries to refresh the list
    cachePatterns.invalidateDomain("budgets");
  },
  successMessage: "Budget created successfully",
  errorMessage: "Failed to create budget",
});

export const updateBudget = defineMutation<{ id: number; data: UpdateBudgetData }, Budget>({
  mutationFn: ({ id, data }) => trpc().budgetRoutes.update.mutate({ id, data }),
  onSuccess: (updatedBudget, { id }) => {
    // Invalidate budget queries to refresh the list and details
    cachePatterns.invalidateDomain("budgets");
  },
  successMessage: "Budget updated successfully",
  errorMessage: "Failed to update budget",
});

export const deleteBudget = defineMutation<number, void>({
  mutationFn: (id) => trpc().budgetRoutes.delete.mutate({ id }),
  onSuccess: (result, id) => {
    // Invalidate budget queries to refresh the list
    cachePatterns.invalidateDomain("budgets");
  },
  successMessage: "Budget deleted successfully",
  errorMessage: "Failed to delete budget",
});

// Budget group mutations
export const createBudgetGroup = defineMutation({
  mutationFn: async (trpc, data: any) => {
    return trpc.budgetRoutes.groups.create.mutate(data);
  },
  onSuccess: (queryClient) => {
    queryClient.invalidateQueries({ queryKey: ["budget-groups"] });
  },
});

export const updateBudgetGroup = defineMutation({
  mutationFn: async (trpc, { id, data }: { id: number; data: any }) => {
    return trpc.budgetRoutes.groups.update.mutate({ id, data });
  },
  onSuccess: (queryClient) => {
    queryClient.invalidateQueries({ queryKey: ["budget-groups"] });
  },
});

export const deleteBudgetGroup = defineMutation({
  mutationFn: async (trpc, id: number) => {
    return trpc.budgetRoutes.groups.delete.mutate({ id });
  },
  onSuccess: (queryClient) => {
    queryClient.invalidateQueries({ queryKey: ["budget-groups"] });
  },
});

// Account and category association mutations
export const addAccountToBudget = defineMutation({
  mutationFn: async (trpc, { budgetId, accountId }: { budgetId: number; accountId: number }) => {
    return trpc.budgetRoutes.addAccount.mutate({ budgetId, accountId });
  },
  onSuccess: (queryClient, { budgetId }) => {
    queryClient.invalidateQueries({ queryKey: ["budgets", budgetId] });
  },
});

export const removeAccountFromBudget = defineMutation({
  mutationFn: async (trpc, { budgetId, accountId }: { budgetId: number; accountId: number }) => {
    return trpc.budgetRoutes.removeAccount.mutate({ budgetId, accountId });
  },
  onSuccess: (queryClient, { budgetId }) => {
    queryClient.invalidateQueries({ queryKey: ["budgets", budgetId] });
  },
});

export const addCategoryToBudget = defineMutation({
  mutationFn: async (trpc, { budgetId, categoryId, allocatedAmount }: {
    budgetId: number;
    categoryId: number;
    allocatedAmount?: number;
  }) => {
    return trpc.budgetRoutes.addCategory.mutate({ budgetId, categoryId, allocatedAmount });
  },
  onSuccess: (queryClient, { budgetId }) => {
    queryClient.invalidateQueries({ queryKey: ["budgets", budgetId] });
  },
});

export const removeCategoryFromBudget = defineMutation({
  mutationFn: async (trpc, { budgetId, categoryId }: { budgetId: number; categoryId: number }) => {
    return trpc.budgetRoutes.removeCategory.mutate({ budgetId, categoryId });
  },
  onSuccess: (queryClient, { budgetId }) => {
    queryClient.invalidateQueries({ queryKey: ["budgets", budgetId] });
  },
});

// Budget transaction mutations
export const createBudgetTransaction = defineMutation({
  mutationFn: async (trpc, data: any) => {
    return trpc.budgetRoutes.transactions.create.mutate(data);
  },
  onSuccess: (queryClient, data) => {
    queryClient.invalidateQueries({ queryKey: ["budget-transactions"] });
    queryClient.invalidateQueries({ queryKey: ["budget-transactions", "by-budget", data.budgetId] });
    queryClient.invalidateQueries({ queryKey: ["budget-transactions", "by-transaction", data.transactionId] });
  },
});

export const updateBudgetTransaction = defineMutation({
  mutationFn: async (trpc, { id, data }: { id: number; data: any }) => {
    return trpc.budgetRoutes.transactions.update.mutate({ id, data });
  },
  onSuccess: (queryClient) => {
    queryClient.invalidateQueries({ queryKey: ["budget-transactions"] });
  },
});

export const deleteBudgetTransaction = defineMutation({
  mutationFn: async (trpc, id: number) => {
    return trpc.budgetRoutes.transactions.delete.mutate({ id });
  },
  onSuccess: (queryClient) => {
    queryClient.invalidateQueries({ queryKey: ["budget-transactions"] });
  },
});