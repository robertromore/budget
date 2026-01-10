import type { Account } from "$lib/schema/accounts";
import { trpc } from "$lib/trpc/client";
import { cachePatterns, queryPresets } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

export const accountKeys = createQueryKeys("accounts", {
  lists: () => ["accounts", "list"] as const,
  list: () => ["accounts", "list"] as const,
  details: () => ["accounts", "detail"] as const,
  detail: (id: number) => ["accounts", "detail", id] as const,
  detailBySlug: (slug: string) => ["accounts", "detail", "slug", slug] as const,
  defaultAccountsStatus: () => ["accounts", "defaults", "status"] as const,
  availableDefaults: () => ["accounts", "defaults", "available"] as const,
});

export const listAccounts = () =>
  defineQuery<Account[]>({
    queryKey: accountKeys.list(),
    queryFn: () => trpc().accountRoutes.all.query() as Promise<Account[]>,
    options: {
      ...queryPresets.static,
    },
  });

export const getAccountDetail = (idOrSlug: number | string) =>
  defineQuery<Account>({
    queryKey:
      typeof idOrSlug === "number"
        ? accountKeys.detail(idOrSlug)
        : accountKeys.detailBySlug(idOrSlug),
    queryFn: () =>
      (typeof idOrSlug === "number"
        ? trpc().accountRoutes.load.query({ id: idOrSlug })
        : trpc().accountRoutes.getBySlug.query({ slug: idOrSlug })) as Promise<Account>,
    options: {
      staleTime: 60 * 1000,
    },
  });

export const getDefaultAccountsStatus = () =>
  defineQuery<{
    total: number;
    installed: number;
    available: number;
    accounts: Array<{
      name: string;
      slug: string;
      accountType: string;
      accountIcon: string;
      accountColor: string;
      description: string;
      onBudget: boolean;
      sortOrder: number;
      installed: boolean;
    }>;
  }>({
    queryKey: accountKeys.defaultAccountsStatus(),
    queryFn: () => trpc().accountRoutes.defaultAccountsStatus.query(),
  });

export const seedDefaultAccounts = defineMutation<{ slugs: string[] }, Account[]>({
  mutationFn: (input) =>
    trpc().accountRoutes.seedDefaultAccounts.mutate(input) as Promise<Account[]>,
  onSuccess: () => {
    cachePatterns.invalidatePrefix(accountKeys.all());
    cachePatterns.invalidatePrefix(accountKeys.defaultAccountsStatus());
  },
  successMessage: (data) => {
    if (data.length > 0) {
      return `Added ${data.length} default ${data.length === 1 ? "account" : "accounts"}`;
    }
    return "No new accounts to add";
  },
  errorMessage: "Failed to add default accounts",
});

export const deleteAccount = defineMutation<{ id: number }, any>({
  mutationFn: async (input) => {
    await trpc().accountRoutes.remove.mutate(input);
  },
  onSuccess: () => {
    cachePatterns.invalidatePrefix(accountKeys.all());
    cachePatterns.invalidatePrefix(accountKeys.defaultAccountsStatus());
  },
  successMessage: "Account deleted successfully",
  errorMessage: "Failed to delete account",
});

/**
 * Save (create or update) an account
 */
export const saveAccount = defineMutation({
  mutationFn: (data: Parameters<ReturnType<typeof trpc>["accountRoutes"]["save"]["mutate"]>[0]) =>
    trpc().accountRoutes.save.mutate(data),
  onSuccess: (savedAccount) => {
    cachePatterns.invalidatePrefix(accountKeys.all());
    if (savedAccount?.id) {
      cachePatterns.invalidatePrefix(accountKeys.detail(savedAccount.id));
    }
  },
  successMessage: "Account saved",
  errorMessage: "Failed to save account",
});

// ==================== Balance Management Queries ====================

/**
 * Get balance management info for an account
 */
export const getBalanceManagementInfo = (accountId: number) =>
  defineQuery<{
    balanceResetDate: string | null;
    balanceAtResetDate: number | null;
    reconciledBalance: number | null;
    reconciledDate: string | null;
    archivedTransactionCount: number;
    transactionsBeforeResetDate: number;
  }>({
    queryKey: [...accountKeys.detail(accountId), "balanceManagement"] as const,
    queryFn: () => trpc().accountRoutes.getBalanceManagementInfo.query({ accountId }),
    options: {
      staleTime: 30 * 1000,
    },
  });

/**
 * Set balance reset date (Option 1)
 */
export const setBalanceResetDate = defineMutation<
  { accountId: number; resetDate: string; balanceAtDate: number },
  any
>({
  mutationFn: (input) => trpc().accountRoutes.setBalanceResetDate.mutate(input),
  onSuccess: (_, { accountId }) => {
    cachePatterns.invalidatePrefix(accountKeys.detail(accountId));
    cachePatterns.invalidatePrefix(accountKeys.list());
    // Also invalidate transactions as balances will be recalculated
    cachePatterns.invalidatePrefix(["transactions", "account", accountId]);
  },
  successMessage: "Balance reset date set",
  errorMessage: "Failed to set balance reset date",
});

/**
 * Clear balance reset date
 */
export const clearBalanceResetDate = defineMutation<{ accountId: number }, any>({
  mutationFn: (input) => trpc().accountRoutes.clearBalanceResetDate.mutate(input),
  onSuccess: (_, { accountId }) => {
    cachePatterns.invalidatePrefix(accountKeys.detail(accountId));
    cachePatterns.invalidatePrefix(accountKeys.list());
    cachePatterns.invalidatePrefix(["transactions", "account", accountId]);
  },
  successMessage: "Balance reset date cleared",
  errorMessage: "Failed to clear balance reset date",
});

/**
 * Set reconciled balance (Option 3)
 */
export const setReconciledBalance = defineMutation<
  { accountId: number; reconciledDate: string; reconciledBalance: number },
  any
>({
  mutationFn: (input) => trpc().accountRoutes.setReconciledBalance.mutate(input),
  onSuccess: (_, { accountId }) => {
    cachePatterns.invalidatePrefix(accountKeys.detail(accountId));
    cachePatterns.invalidatePrefix(accountKeys.list());
    cachePatterns.invalidatePrefix(["transactions", "account", accountId]);
  },
  successMessage: "Reconciled balance set",
  errorMessage: "Failed to set reconciled balance",
});

/**
 * Clear reconciled balance
 */
export const clearReconciledBalance = defineMutation<{ accountId: number }, any>({
  mutationFn: (input) => trpc().accountRoutes.clearReconciledBalance.mutate(input),
  onSuccess: (_, { accountId }) => {
    cachePatterns.invalidatePrefix(accountKeys.detail(accountId));
    cachePatterns.invalidatePrefix(accountKeys.list());
    cachePatterns.invalidatePrefix(["transactions", "account", accountId]);
  },
  successMessage: "Reconciled balance cleared",
  errorMessage: "Failed to clear reconciled balance",
});
