import type { UtilityUsage, UsageUnit, UtilityRateTier } from "$lib/schema/utility-usage";
import type { UtilitySubtype } from "$lib/schema/accounts";
import { trpc } from "$lib/trpc/client";
import { cachePatterns } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

/**
 * Query Keys for utility usage operations
 */
export const utilityKeys = createQueryKeys("utility", {
  lists: () => ["utility", "list"] as const,
  details: () => ["utility", "detail"] as const,
  detail: (id: number) => ["utility", "detail", id] as const,
  byAccount: (accountId: number) => ["utility", "account", accountId] as const,
  byDateRange: (accountId: number, startDate: string, endDate: string) =>
    ["utility", "date-range", accountId, startDate, endDate] as const,
  analytics: (accountId: number, months: number) =>
    ["utility", "analytics", accountId, months] as const,
  yearOverYear: (accountId: number, year: number) =>
    ["utility", "year-over-year", accountId, year] as const,
  rateTiers: (accountId: number) => ["utility", "rate-tiers", accountId] as const,
});

// ============================================================================
// Utility Usage Queries
// ============================================================================

/**
 * Get utility usage records for an account
 */
export const getUsageRecords = (accountId: number) => {
  return defineQuery({
    queryKey: utilityKeys.byAccount(accountId),
    queryFn: () => trpc().utilityRoutes.getUsageRecords.query({ accountId }),
    options: {
      staleTime: 60 * 1000, // 1 minute
    },
  });
};

/**
 * Get single usage record by ID
 */
export const getUsageRecord = (id: number) => {
  return defineQuery({
    queryKey: utilityKeys.detail(id),
    queryFn: () => trpc().utilityRoutes.getUsageRecord.query({ id }),
    options: {
      staleTime: 60 * 1000, // 1 minute
    },
  });
};

/**
 * Get usage records by date range
 */
export const getUsageByDateRange = (accountId: number, startDate: string, endDate: string) => {
  return defineQuery({
    queryKey: utilityKeys.byDateRange(accountId, startDate, endDate),
    queryFn: () =>
      trpc().utilityRoutes.getUsageByDateRange.query({ accountId, startDate, endDate }),
    options: {
      staleTime: 60 * 1000, // 1 minute
    },
  });
};

/**
 * Get usage analytics (aggregated statistics)
 */
export const getUsageAnalytics = (accountId: number) => {
  return defineQuery({
    queryKey: utilityKeys.analytics(accountId, 12),
    queryFn: () => trpc().utilityRoutes.getUsageAnalytics.query({ accountId }),
    options: {
      staleTime: 60 * 1000, // 1 minute
    },
  });
};

/**
 * Get year over year comparison data
 */
export const getYearOverYearData = (accountId: number) => {
  const currentYear = new Date().getFullYear();
  return defineQuery({
    queryKey: utilityKeys.yearOverYear(accountId, currentYear),
    queryFn: () => trpc().utilityRoutes.getYearOverYearData.query({ accountId }),
    options: {
      staleTime: 60 * 1000, // 1 minute
    },
  });
};

/**
 * Get rate tiers for an account
 */
export const getRateTiers = (accountId: number) => {
  return defineQuery({
    queryKey: utilityKeys.rateTiers(accountId),
    queryFn: () => trpc().utilityRoutes.getRateTiers.query({ accountId }),
    options: {
      staleTime: 5 * 60 * 1000, // 5 minutes (rate tiers change infrequently)
    },
  });
};

// ============================================================================
// Utility Usage Mutations
// ============================================================================

/**
 * Create usage record
 */
export const createUsageRecord = defineMutation<
  {
    accountId: number;
    periodStart: string;
    periodEnd: string;
    usageAmount: number;
    usageUnit: UsageUnit;
    totalAmount: number;
    transactionId?: number;
    dueDate?: string;
    statementDate?: string;
    meterReadingStart?: number;
    meterReadingEnd?: number;
    ratePerUnit?: number;
    baseCharge?: number;
    usageCost?: number;
    taxes?: number;
    fees?: number;
    avgTemperature?: number;
    notes?: string;
  },
  UtilityUsage
>({
  mutationFn: (variables) => trpc().utilityRoutes.createUsageRecord.mutate(variables),
  onSuccess: (_newRecord, variables) => {
    // Invalidate all related queries
    cachePatterns.invalidatePrefix(utilityKeys.byAccount(variables.accountId));
    cachePatterns.invalidatePrefix(utilityKeys.analytics(variables.accountId, 12));
  },
  successMessage: "Usage record created successfully",
  errorMessage: "Failed to create usage record",
});

/**
 * Update usage record
 */
export const updateUsageRecord = defineMutation<
  {
    id: number;
    accountId: number;
    periodStart?: string;
    periodEnd?: string;
    usageAmount?: number;
    usageUnit?: UsageUnit;
    meterReadingStart?: number;
    meterReadingEnd?: number;
    ratePerUnit?: number;
    baseCharge?: number;
    usageCost?: number;
    taxes?: number;
    fees?: number;
    totalAmount?: number;
    transactionId?: number;
    notes?: string;
  },
  UtilityUsage
>({
  mutationFn: (variables) => trpc().utilityRoutes.updateUsageRecord.mutate(variables),
  onSuccess: (updatedRecord, variables) => {
    // Update the detail query cache
    cachePatterns.setQueryData(utilityKeys.detail(updatedRecord.id), updatedRecord);

    // Invalidate all related queries
    cachePatterns.invalidatePrefix(utilityKeys.byAccount(variables.accountId));
    cachePatterns.invalidatePrefix(utilityKeys.analytics(variables.accountId, 12));
  },
  successMessage: "Usage record updated successfully",
  errorMessage: "Failed to update usage record",
});

/**
 * Delete usage record
 */
export const deleteUsageRecord = defineMutation<
  { id: number; accountId: number },
  { success: boolean }
>({
  mutationFn: ({ id }) => trpc().utilityRoutes.deleteUsageRecord.mutate({ id }),
  onSuccess: (_result, variables) => {
    // Remove from detail cache
    cachePatterns.invalidateQueries(utilityKeys.detail(variables.id));

    // Invalidate list queries
    cachePatterns.invalidatePrefix(utilityKeys.byAccount(variables.accountId));
    cachePatterns.invalidatePrefix(utilityKeys.analytics(variables.accountId, 12));
  },
  successMessage: "Usage record deleted successfully",
  errorMessage: "Failed to delete usage record",
});

/**
 * Set rate tiers for an account
 */
export const setRateTiers = defineMutation<
  {
    accountId: number;
    tiers: Array<{
      tierName: string;
      tierOrder: number;
      usageMin: number;
      usageMax?: number;
      ratePerUnit: number;
      effectiveDate: string;
      expirationDate?: string;
    }>;
  },
  UtilityRateTier[]
>({
  mutationFn: (variables) => trpc().utilityRoutes.setRateTiers.mutate(variables),
  onSuccess: (_result, variables) => {
    // Invalidate rate tiers cache
    cachePatterns.invalidatePrefix(utilityKeys.rateTiers(variables.accountId));
  },
  successMessage: "Rate tiers updated successfully",
  errorMessage: "Failed to update rate tiers",
});

// ============================================================================
// Advanced Analytics Queries
// ============================================================================

/**
 * Get anomalies detected in usage patterns
 */
export const getAnomalies = (
  accountId: number,
  options?: {
    zScoreThreshold?: number;
    monthOverMonthThreshold?: number;
    potentialLeakDays?: number;
  }
) => {
  return defineQuery({
    queryKey: ["utility", "anomalies", accountId, options],
    queryFn: () =>
      trpc().utilityRoutes.getAnomalies.query({ accountId, options }),
    options: {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  });
};

/**
 * Get usage forecast for next period
 */
export const getForecast = (
  accountId: number,
  options?: {
    targetMonth?: number;
    useSeasonal?: boolean;
  }
) => {
  return defineQuery({
    queryKey: ["utility", "forecast", accountId, options?.targetMonth, options?.useSeasonal],
    queryFn: () =>
      trpc().utilityRoutes.getForecast.query({
        accountId,
        targetMonth: options?.targetMonth,
        useSeasonal: options?.useSeasonal,
      }),
    options: {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  });
};

/**
 * Get bill projection for next period
 */
export const getBillProjection = (
  accountId: number,
  options?: {
    projectedUsage?: number;
    targetMonth?: number;
  }
) => {
  return defineQuery({
    queryKey: ["utility", "bill-projection", accountId, options?.projectedUsage, options?.targetMonth],
    queryFn: () =>
      trpc().utilityRoutes.getBillProjection.query({
        accountId,
        projectedUsage: options?.projectedUsage,
        targetMonth: options?.targetMonth,
      }),
    options: {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  });
};

/**
 * Get comprehensive utility statistics
 */
export const getStats = (accountId: number) => {
  return defineQuery({
    queryKey: ["utility", "stats", accountId],
    queryFn: () => trpc().utilityRoutes.getStats.query({ accountId }),
    options: {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  });
};
