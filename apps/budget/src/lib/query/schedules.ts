import { trpc } from "$lib/trpc/client";
import { queryClient } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";
import { transactionKeys } from "./transactions";

import type {
  ScheduleSubscriptionStatus,
  ScheduleSubscriptionType,
} from "$lib/schema/schedules";

/**
 * Query Keys for schedule operations
 */
export const scheduleKeys = createQueryKeys("schedules", {
  lists: () => ["schedules", "list"] as const,
  list: () => ["schedules", "list"] as const,
  byAccount: (accountId: number) => ["schedules", "account", accountId] as const,
  details: () => ["schedules", "detail"] as const,
  detail: (id: number) => ["schedules", "detail", id] as const,
  skipHistory: (scheduleId: number) => ["schedules", "skips", scheduleId] as const,
  // Subscription-specific keys
  subscriptions: (filters?: SubscriptionFilters) => ["schedules", "subscriptions", filters] as const,
  subscriptionAnalytics: () => ["schedules", "subscription-analytics"] as const,
  priceHistory: (scheduleId: number) => ["schedules", "price-history", scheduleId] as const,
});

interface SubscriptionFilters {
  status?: ScheduleSubscriptionStatus;
  type?: ScheduleSubscriptionType;
  accountId?: number;
}

/**
 * Get all schedules
 */
export const getAll = () =>
  defineQuery({
    queryKey: scheduleKeys.list(),
    queryFn: () => trpc().scheduleRoutes.all.query(),
  });

/**
 * Get schedules for a specific account
 */
export const getByAccount = (accountId: number) =>
  defineQuery({
    queryKey: scheduleKeys.byAccount(accountId),
    queryFn: () => trpc().scheduleRoutes.getByAccount.query({ accountId }),
  });

/**
 * Get a single schedule by ID
 */
export const getById = (id: number) =>
  defineQuery({
    queryKey: scheduleKeys.detail(id),
    queryFn: () => trpc().scheduleRoutes.load.query({ id }),
  });

/**
 * Get skip history for a schedule
 */
export const getSkipHistory = (scheduleId: number) =>
  defineQuery({
    queryKey: scheduleKeys.skipHistory(scheduleId),
    queryFn: () => trpc().scheduleRoutes.getSkipHistory.query({ scheduleId }),
  });

/**
 * Skip an occurrence (single skip or push forward)
 */
export const skipOccurrence = () =>
  defineMutation({
    mutationFn: (input: {
      scheduleId: number;
      date: string;
      skipType: "single" | "push_forward";
      reason?: string;
    }) => trpc().scheduleRoutes.skipOccurrence.mutate(input),
    onSuccess: (_data, variables) => {
      // Invalidate skip history for this schedule
      queryClient.invalidateQueries({ queryKey: scheduleKeys.skipHistory(variables.scheduleId) });
      // Invalidate schedule detail to refresh upcoming dates
      queryClient.invalidateQueries({ queryKey: scheduleKeys.detail(variables.scheduleId) });
      // Invalidate transaction queries to refresh scheduled transaction preview
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
    },
  });

/**
 * Remove a skip (restore occurrence)
 */
export const removeSkip = () =>
  defineMutation({
    mutationFn: (input: { skipId: number; scheduleId: number }) =>
      trpc().scheduleRoutes.removeSkip.mutate({ skipId: input.skipId }),
    onSuccess: (_data, variables) => {
      // Invalidate skip history for this schedule
      queryClient.invalidateQueries({ queryKey: scheduleKeys.skipHistory(variables.scheduleId) });
      // Invalidate schedule detail to refresh upcoming dates
      queryClient.invalidateQueries({ queryKey: scheduleKeys.detail(variables.scheduleId) });
      // Invalidate transaction queries to refresh scheduled transaction preview
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
    },
  });

/**
 * Toggle schedule status (active/paused)
 */
export const toggleStatus = () =>
  defineMutation({
    mutationFn: (scheduleId: number) =>
      trpc().scheduleRoutes.toggleStatus.mutate({ scheduleId }),
    onSuccess: (updatedSchedule, scheduleId) => {
      queryClient.setQueryData(scheduleKeys.detail(scheduleId), updatedSchedule);
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.detail(scheduleId),
        refetchType: "active",
      });
    },
  });

/**
 * Execute auto-add for schedule (create pending transactions)
 */
export const executeAutoAdd = () =>
  defineMutation({
    mutationFn: (scheduleId: number) =>
      trpc().scheduleRoutes.executeAutoAdd.mutate({ scheduleId }),
    onSuccess: (_result, scheduleId) => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.detail(scheduleId) });
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
    },
  });

/**
 * Execute auto-add for all eligible schedules
 */
export const executeAutoAddAll = defineMutation<
  void,
  {
    totalSchedulesProcessed: number;
    totalTransactionsCreated: number;
    results: Array<{
      scheduleId: number;
      scheduleName: string;
      nextDueDate: string | null;
      transactionsCreated: number;
      errors: string[];
    }>;
    errors: string[];
  }
>({
  mutationFn: () => trpc().scheduleRoutes.executeAutoAddAll.mutate(),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() });
    queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
  },
});

/**
 * Delete a schedule
 */
export const remove = () =>
  defineMutation({
    mutationFn: (scheduleId: number) =>
      trpc().scheduleRoutes.remove.mutate({ id: scheduleId }),
    onSuccess: (_data, scheduleId) => {
      queryClient.removeQueries({ queryKey: scheduleKeys.detail(scheduleId) });
      // Invalidate all schedule list queries (both global and account-specific)
      queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ["schedules", "account"] });
      // Also invalidate transactions since scheduleId references are cleared
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
    },
  });

/**
 * Bulk delete schedules
 */
export const bulkRemove = defineMutation<
  number[],
  { success: number; failed: number; errors: Array<{ id: number; error: string }> }
>({
  mutationFn: (ids) => trpc().scheduleRoutes.bulkRemove.mutate({ ids }),
  onSuccess: (_result, ids) => {
    // Remove deleted schedules from cache
    ids.forEach((id) => {
      queryClient.removeQueries({ queryKey: scheduleKeys.detail(id) });
    });
    // Invalidate all schedule list queries (both global and account-specific)
    queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() });
    queryClient.invalidateQueries({ queryKey: ["schedules", "account"] });
    // Also invalidate transactions since scheduleId references are cleared
    queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
  },
  successMessage: (result) =>
    `${result.success} schedule(s) deleted${result.failed > 0 ? `, ${result.failed} failed` : ""}`,
  errorMessage: "Failed to delete schedules",
  importance: "critical",
});

/**
 * Duplicate a schedule
 */
export const duplicate = () =>
  defineMutation({
    mutationFn: (scheduleId: number) =>
      trpc().scheduleRoutes.duplicate.mutate({ id: scheduleId }),
    onSuccess: (duplicatedSchedule) => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() });
      queryClient.setQueryData(scheduleKeys.detail(duplicatedSchedule.id), duplicatedSchedule);
    },
  });

/**
 * Save (create or update) a schedule
 */
export const save = defineMutation({
  mutationFn: (data: Parameters<ReturnType<typeof trpc>["scheduleRoutes"]["save"]["mutate"]>[0]) =>
    trpc().scheduleRoutes.save.mutate(data),
  onSuccess: (savedSchedule) => {
    queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() });
    if (savedSchedule?.id) {
      queryClient.setQueryData(scheduleKeys.detail(savedSchedule.id), savedSchedule);
    }
  },
  successMessage: "Schedule saved",
  errorMessage: "Failed to save schedule",
  importance: "important",
});

// ==================== SUBSCRIPTION QUERIES ====================

/**
 * Get all schedules that are subscriptions
 */
export const getSubscriptions = (filters?: SubscriptionFilters) =>
  defineQuery({
    queryKey: scheduleKeys.subscriptions(filters),
    queryFn: () => trpc().scheduleRoutes.getSubscriptions.query(filters),
  });

/**
 * Get subscription analytics (totals, by type, etc.)
 */
export const getSubscriptionAnalytics = () =>
  defineQuery({
    queryKey: scheduleKeys.subscriptionAnalytics(),
    queryFn: () => trpc().scheduleRoutes.getSubscriptionAnalytics.query(),
  });

/**
 * Get price history for a schedule
 */
export const getPriceHistory = (scheduleId: number) =>
  defineQuery({
    queryKey: scheduleKeys.priceHistory(scheduleId),
    queryFn: () => trpc().scheduleRoutes.getPriceHistory.query({ scheduleId }),
  });

// ==================== SUBSCRIPTION MUTATIONS ====================

/**
 * Create a new schedule (used by detection UI)
 */
export const create = defineMutation({
  mutationFn: (data: Parameters<ReturnType<typeof trpc>["scheduleRoutes"]["create"]["mutate"]>[0]) =>
    trpc().scheduleRoutes.create.mutate(data),
  onSuccess: (newSchedule) => {
    queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() });
    queryClient.invalidateQueries({ queryKey: scheduleKeys.subscriptions() });
    if (newSchedule?.id) {
      queryClient.setQueryData(scheduleKeys.detail(newSchedule.id), newSchedule);
    }
  },
  successMessage: "Schedule created",
  errorMessage: "Failed to create schedule",
  importance: "important",
});

/**
 * Update subscription status
 */
export const updateSubscriptionStatus = defineMutation({
  mutationFn: (data: { scheduleId: number; status: ScheduleSubscriptionStatus }) =>
    trpc().scheduleRoutes.updateSubscriptionStatus.mutate(data),
  onSuccess: (updated, variables) => {
    queryClient.setQueryData(scheduleKeys.detail(variables.scheduleId), updated);
    queryClient.invalidateQueries({ queryKey: scheduleKeys.subscriptions() });
    queryClient.invalidateQueries({ queryKey: scheduleKeys.subscriptionAnalytics() });
  },
  successMessage: "Subscription status updated",
  errorMessage: "Failed to update subscription status",
});

/**
 * Record a price change for a subscription
 */
export const recordPriceChange = defineMutation({
  mutationFn: (data: {
    scheduleId: number;
    newAmount: number;
    effectiveDate?: string;
    transactionId?: number;
  }) => trpc().scheduleRoutes.recordPriceChange.mutate(data),
  onSuccess: (_data, variables) => {
    queryClient.invalidateQueries({ queryKey: scheduleKeys.detail(variables.scheduleId) });
    queryClient.invalidateQueries({ queryKey: scheduleKeys.priceHistory(variables.scheduleId) });
    queryClient.invalidateQueries({ queryKey: scheduleKeys.subscriptionAnalytics() });
  },
  successMessage: "Price change recorded",
  errorMessage: "Failed to record price change",
});

/**
 * Convert an existing schedule to a subscription
 */
export const convertToSubscription = defineMutation({
  mutationFn: (data: {
    scheduleId: number;
    subscriptionType: ScheduleSubscriptionType;
    subscriptionStatus?: ScheduleSubscriptionStatus;
  }) => trpc().scheduleRoutes.convertToSubscription.mutate(data),
  onSuccess: (updated, variables) => {
    queryClient.setQueryData(scheduleKeys.detail(variables.scheduleId), updated);
    queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() });
    queryClient.invalidateQueries({ queryKey: scheduleKeys.subscriptions() });
    queryClient.invalidateQueries({ queryKey: scheduleKeys.subscriptionAnalytics() });
  },
  successMessage: "Schedule converted to subscription",
  errorMessage: "Failed to convert schedule",
});
