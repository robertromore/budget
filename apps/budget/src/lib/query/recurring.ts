import { trpc } from "$lib/trpc/client";
import type { PatternType } from "$lib/server/domains/shared/recurring-detection/types";
import { createQueryKeys, defineQuery } from "./_factory";

/**
 * Query Keys for recurring pattern detection
 */
export const recurringKeys = createQueryKeys("recurring", {
  detection: (options?: DetectionFilters) => ["recurring", "detection", options] as const,
  summary: () => ["recurring", "summary"] as const,
});

interface DetectionFilters {
  accountIds?: number[];
  months?: number;
  minTransactions?: number;
  minConfidence?: number;
  minPredictability?: number;
  includeExisting?: boolean;
  patternTypes?: PatternType[];
}

/**
 * Detect recurring payment patterns in transactions.
 * Uses the unified detection service that analyzes intervals, amounts, and payee patterns.
 */
export const detectPatterns = (options?: DetectionFilters) =>
  defineQuery({
    queryKey: recurringKeys.detection(options),
    queryFn: () => trpc().recurringRoutes.detect.query(options),
    options: {
      staleTime: 5 * 60 * 1000, // 5 minutes - detection is expensive
      gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    },
  });

/**
 * Get summary statistics about recurring patterns
 */
export const getSummary = () =>
  defineQuery({
    queryKey: recurringKeys.summary(),
    queryFn: () => trpc().recurringRoutes.summary.query(),
    options: {
      staleTime: 5 * 60 * 1000,
    },
  });
