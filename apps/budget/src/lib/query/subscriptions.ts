import type { BillingCycle, SubscriptionStatus, SubscriptionType } from "$lib/schema/subscriptions";
import type {
  CreateSubscriptionInput,
  Subscription,
  SubscriptionAlert,
  SubscriptionPriceHistory,
  SubscriptionWithRelations,
  UpdateSubscriptionInput,
} from "$lib/schema/subscriptions-table";
import type {
  CalendarEntry,
  DetectionResult,
  PriceChange,
  SubscriptionAnalytics,
  TransactionBasedDetectionResult,
} from "$lib/server/domains/subscriptions";
import { trpc } from "$lib/trpc/client";
import { queryClient } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

// ==================== QUERY KEYS ====================

export const subscriptionKeys = createQueryKeys("subscriptions", {
  lists: () => ["subscriptions", "list"] as const,
  list: () => ["subscriptions", "list"] as const,
  byAccount: (accountId: number) => ["subscriptions", "account", accountId] as const,
  details: () => ["subscriptions", "detail"] as const,
  detail: (id: number) => ["subscriptions", "detail", id] as const,
  priceHistory: (id: number) => ["subscriptions", "priceHistory", id] as const,
  analytics: () => ["subscriptions", "analytics"] as const,
  alerts: () => ["subscriptions", "alerts"] as const,
  detection: () => ["subscriptions", "detection"] as const,
  transactionDetection: (accountIds?: number[]) =>
    ["subscriptions", "transactionDetection", accountIds ?? "all"] as const,
  upcomingRenewals: (days: number) => ["subscriptions", "upcoming", days] as const,
  calendarView: (start: string, end: string) => ["subscriptions", "calendar", start, end] as const,
  priceChanges: () => ["subscriptions", "priceChanges"] as const,
});

// ==================== FILTER TYPES ====================

interface SubscriptionFilters {
  status?: SubscriptionStatus | SubscriptionStatus[];
  type?: SubscriptionType | SubscriptionType[];
  billingCycle?: BillingCycle | BillingCycle[];
  accountId?: number;
  payeeId?: number;
  minAmount?: number;
  maxAmount?: number;
  isManuallyAdded?: boolean;
  isUserConfirmed?: boolean;
  search?: string;
}

interface SubscriptionSortOptions {
  field: "name" | "amount" | "renewalDate" | "createdAt" | "type" | "status";
  direction: "asc" | "desc";
}

// ==================== QUERIES ====================

/**
 * Get all subscriptions with optional filters and sorting
 */
export const getAll = (filters?: SubscriptionFilters, sort?: SubscriptionSortOptions) =>
  defineQuery<SubscriptionWithRelations[]>({
    queryKey: subscriptionKeys.list(),
    queryFn: () => trpc().subscriptionRoutes.all.query({ filters, sort }),
  });

/**
 * Get subscriptions for a specific account
 */
export const getByAccount = (accountId: number) =>
  defineQuery<SubscriptionWithRelations[]>({
    queryKey: subscriptionKeys.byAccount(accountId),
    queryFn: () => trpc().subscriptionRoutes.byAccount.query({ accountId }),
  });

/**
 * Get a single subscription by ID
 */
export const getById = (id: number) =>
  defineQuery<SubscriptionWithRelations>({
    queryKey: subscriptionKeys.detail(id),
    queryFn: () => trpc().subscriptionRoutes.byId.query({ id }),
  });

/**
 * Get price history for a subscription
 */
export const getPriceHistory = (subscriptionId: number) =>
  defineQuery<SubscriptionPriceHistory[]>({
    queryKey: subscriptionKeys.priceHistory(subscriptionId),
    queryFn: () => trpc().subscriptionRoutes.priceHistory.query({ subscriptionId }),
  });

/**
 * Get subscription analytics
 */
export const getAnalytics = () =>
  defineQuery<SubscriptionAnalytics>({
    queryKey: subscriptionKeys.analytics(),
    queryFn: () => trpc().subscriptionRoutes.analytics.query(),
    options: {
      staleTime: 60 * 1000, // 1 minute
    },
  });

/**
 * Get subscription alerts
 */
export const getAlerts = () =>
  defineQuery<Array<SubscriptionAlert & { subscription: Subscription }>>({
    queryKey: subscriptionKeys.alerts(),
    queryFn: () => trpc().subscriptionRoutes.alerts.query(),
  });

/**
 * Detect potential subscriptions
 */
export const detectSubscriptions = (options?: {
  payeeIds?: number[];
  includeAlreadyTracked?: boolean;
  minConfidence?: number;
  accountId?: number;
}) =>
  defineQuery<DetectionResult[]>({
    queryKey: subscriptionKeys.detection(),
    queryFn: () => trpc().subscriptionRoutes.detect.query(options),
  });

/**
 * Get upcoming renewals
 */
export const getUpcomingRenewals = (days: number = 30) =>
  defineQuery<SubscriptionWithRelations[]>({
    queryKey: subscriptionKeys.upcomingRenewals(days),
    queryFn: () => trpc().subscriptionRoutes.upcomingRenewals.query({ days }),
  });

/**
 * Get calendar view
 */
export const getCalendarView = (startDate: string, endDate: string) =>
  defineQuery<CalendarEntry[]>({
    queryKey: subscriptionKeys.calendarView(startDate, endDate),
    queryFn: () => trpc().subscriptionRoutes.calendarView.query({ startDate, endDate }),
  });

/**
 * Detect price changes
 */
export const detectPriceChanges = () =>
  defineQuery<PriceChange[]>({
    queryKey: subscriptionKeys.priceChanges(),
    queryFn: () => trpc().subscriptionRoutes.detectPriceChanges.query(),
  });

/**
 * Detect subscriptions from transaction patterns
 * Similar to how budgets analyze transactions for recurring expenses
 */
export const detectFromTransactions = (options?: {
  accountIds?: number[];
  months?: number;
  minTransactions?: number;
  minConfidence?: number;
  minPredictability?: number;
}) =>
  defineQuery<TransactionBasedDetectionResult[]>({
    queryKey: subscriptionKeys.transactionDetection(options?.accountIds),
    queryFn: () => trpc().subscriptionRoutes.detectFromTransactions.query(options),
    options: {
      staleTime: 5 * 60 * 1000, // 5 minutes - analysis is expensive
    },
  });

// ==================== MUTATIONS ====================

/**
 * Create a new subscription
 */
export const create = defineMutation<CreateSubscriptionInput, Subscription>({
  mutationFn: (data) => trpc().subscriptionRoutes.create.mutate(data),
  onSuccess: (subscription) => {
    queryClient.invalidateQueries({ queryKey: subscriptionKeys.lists() });
    queryClient.invalidateQueries({ queryKey: subscriptionKeys.analytics() });
    queryClient.setQueryData(subscriptionKeys.detail(subscription.id), subscription);
  },
  successMessage: "Subscription created",
  errorMessage: "Failed to create subscription",
  importance: "important",
});

/**
 * Update a subscription
 */
export const update = defineMutation<
  UpdateSubscriptionInput,
  Subscription
>({
  mutationFn: (data) => trpc().subscriptionRoutes.update.mutate(data),
  onSuccess: (subscription, variables) => {
    queryClient.setQueryData(subscriptionKeys.detail(variables.id), subscription);
    queryClient.invalidateQueries({ queryKey: subscriptionKeys.lists() });
    queryClient.invalidateQueries({ queryKey: subscriptionKeys.analytics() });
    if (variables.accountId) {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.byAccount(variables.accountId) });
    }
  },
  successMessage: "Subscription updated",
  errorMessage: "Failed to update subscription",
  importance: "important",
});

/**
 * Delete a subscription
 */
export const remove = defineMutation<number, { success: boolean }>({
  mutationFn: (id) => trpc().subscriptionRoutes.delete.mutate({ id }),
  onSuccess: (_data, id) => {
    queryClient.removeQueries({ queryKey: subscriptionKeys.detail(id) });
    queryClient.invalidateQueries({ queryKey: subscriptionKeys.lists() });
    queryClient.invalidateQueries({ queryKey: subscriptionKeys.analytics() });
    queryClient.invalidateQueries({ queryKey: ["subscriptions", "account"] });
  },
  successMessage: "Subscription deleted",
  errorMessage: "Failed to delete subscription",
  importance: "critical",
});

/**
 * Confirm a detected subscription
 */
export const confirm = defineMutation<
  {
    payeeId: number;
    name?: string;
    type?: SubscriptionType;
    billingCycle?: BillingCycle;
    amount?: number;
    accountId?: number;
    renewalDate?: string;
  },
  Subscription
>({
  mutationFn: (data) => trpc().subscriptionRoutes.confirm.mutate(data),
  onSuccess: (subscription) => {
    queryClient.invalidateQueries({ queryKey: subscriptionKeys.lists() });
    queryClient.invalidateQueries({ queryKey: subscriptionKeys.detection() });
    queryClient.invalidateQueries({ queryKey: ["subscriptions", "transactionDetection"] });
    queryClient.invalidateQueries({ queryKey: subscriptionKeys.analytics() });
    queryClient.setQueryData(subscriptionKeys.detail(subscription.id), subscription);
  },
  successMessage: "Subscription confirmed",
  errorMessage: "Failed to confirm subscription",
  importance: "important",
});

/**
 * Reject a detected subscription
 */
export const reject = defineMutation<{ payeeId: number }, { success: boolean }>({
  mutationFn: (data) => trpc().subscriptionRoutes.reject.mutate(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: subscriptionKeys.detection() });
    queryClient.invalidateQueries({ queryKey: ["subscriptions", "transactionDetection"] });
  },
  successMessage: "Detection rejected",
});

/**
 * Record a price change
 */
export const recordPriceChange = defineMutation<
  {
    subscriptionId: number;
    newAmount: number;
    effectiveDate?: string;
    transactionId?: number;
  },
  { success: boolean }
>({
  mutationFn: (data) => trpc().subscriptionRoutes.recordPriceChange.mutate(data),
  onSuccess: (_data, variables) => {
    queryClient.invalidateQueries({
      queryKey: subscriptionKeys.priceHistory(variables.subscriptionId),
    });
    queryClient.invalidateQueries({
      queryKey: subscriptionKeys.detail(variables.subscriptionId),
    });
    queryClient.invalidateQueries({ queryKey: subscriptionKeys.analytics() });
    queryClient.invalidateQueries({ queryKey: subscriptionKeys.priceChanges() });
  },
  successMessage: "Price change recorded",
  errorMessage: "Failed to record price change",
});

/**
 * Generate alerts
 */
export const generateAlerts = defineMutation<void, { created: number }>({
  mutationFn: () => trpc().subscriptionRoutes.generateAlerts.mutate(),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: subscriptionKeys.alerts() });
  },
  successMessage: (result) => `${result.created} alert(s) generated`,
});

/**
 * Dismiss an alert
 */
export const dismissAlert = defineMutation<{ alertId: number }, { success: boolean }>({
  mutationFn: (data) => trpc().subscriptionRoutes.dismissAlert.mutate(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: subscriptionKeys.alerts() });
  },
});

/**
 * Bulk delete subscriptions
 */
export const bulkDelete = defineMutation<
  number[],
  { success: number; failed: number; errors: Array<{ id: number; error: string }> }
>({
  mutationFn: (ids) => trpc().subscriptionRoutes.bulkDelete.mutate({ ids }),
  onSuccess: (_result, ids) => {
    ids.forEach((id) => {
      queryClient.removeQueries({ queryKey: subscriptionKeys.detail(id) });
    });
    queryClient.invalidateQueries({ queryKey: subscriptionKeys.lists() });
    queryClient.invalidateQueries({ queryKey: subscriptionKeys.analytics() });
    queryClient.invalidateQueries({ queryKey: ["subscriptions", "account"] });
  },
  successMessage: (result) =>
    `${result.success} subscription(s) deleted${result.failed > 0 ? `, ${result.failed} failed` : ""}`,
  errorMessage: "Failed to delete subscriptions",
  importance: "critical",
});

/**
 * Bulk update subscription status
 */
export const bulkUpdateStatus = defineMutation<
  { ids: number[]; status: SubscriptionStatus },
  { success: number; failed: number; errors: Array<{ id: number; error: string }> }
>({
  mutationFn: (data) => trpc().subscriptionRoutes.bulkUpdateStatus.mutate(data),
  onSuccess: (_result, variables) => {
    variables.ids.forEach((id) => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.detail(id) });
    });
    queryClient.invalidateQueries({ queryKey: subscriptionKeys.lists() });
    queryClient.invalidateQueries({ queryKey: subscriptionKeys.analytics() });
  },
  successMessage: (result) =>
    `${result.success} subscription(s) updated${result.failed > 0 ? `, ${result.failed} failed` : ""}`,
  errorMessage: "Failed to update subscriptions",
  importance: "important",
});
