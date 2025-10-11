import {defineQuery, defineMutation, createQueryKeys} from "./_factory";
import {cachePatterns} from "./_client";
import {trpc} from "$lib/trpc/client";
import type {DetectedPattern} from "$lib/schema/detected-patterns";
import type {DetectedPatternData, DetectionCriteria} from "$lib/server/domains/patterns/types";

export const patternKeys = createQueryKeys("patterns", {
  all: () => ["patterns", "all"] as const,
  byAccount: (accountId: number) => ["patterns", "account", accountId] as const,
  byStatus: (status: string) => ["patterns", "status", status] as const,
  byAccountAndStatus: (accountId: number, status: string) =>
    ["patterns", "account", accountId, "status", status] as const,
});

/**
 * List all detected patterns with optional filtering
 */
export const listPatterns = (accountId?: number, status?: string) =>
  defineQuery<DetectedPattern[]>({
    queryKey: accountId && status
      ? patternKeys.byAccountAndStatus(accountId, status)
      : accountId
        ? patternKeys.byAccount(accountId)
        : status
          ? patternKeys.byStatus(status)
          : patternKeys.all(),
    queryFn: () => trpc().patternRoutes.list.query({accountId, status}),
  });

/**
 * Run pattern detection for specific account or all accounts
 */
export const detectPatterns = defineMutation<
  {accountId?: number; criteria?: Partial<DetectionCriteria>},
  DetectedPatternData[]
>({
  mutationFn: (input) => trpc().patternRoutes.detect.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(patternKeys.all());
  },
  successMessage: "Pattern detection complete",
  errorMessage: "Failed to detect patterns",
});

/**
 * Convert a detected pattern to a schedule
 */
export const convertPatternToSchedule = defineMutation<{patternId: number}, number>({
  mutationFn: (input) => trpc().patternRoutes.convertToSchedule.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(patternKeys.all());
    // Also invalidate schedule cache when patterns are converted
    cachePatterns.invalidatePrefix(["schedules"]);
  },
  successMessage: "Pattern converted to schedule",
  errorMessage: "Failed to convert pattern",
});

/**
 * Dismiss a detected pattern
 */
export const dismissPattern = defineMutation<{patternId: number}, {success: boolean}>({
  mutationFn: (input) => trpc().patternRoutes.dismiss.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(patternKeys.all());
  },
  successMessage: "Pattern dismissed",
  errorMessage: "Failed to dismiss pattern",
});

/**
 * Expire stale patterns that haven't matched recently
 */
export const expireStalePatterns = defineMutation<{daysSinceLastMatch?: number}, {count: number}>({
  mutationFn: (input) => trpc().patternRoutes.expireStale.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(patternKeys.all());
  },
  successMessage: "Stale patterns expired",
  errorMessage: "Failed to expire patterns",
});

/**
 * Delete all patterns (optionally filtered by status)
 */
export const deleteAllPatterns = defineMutation<
  {status?: "pending" | "accepted" | "dismissed" | "converted"},
  {count: number}
>({
  mutationFn: (input) => trpc().patternRoutes.deleteAll.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(patternKeys.all());
  },
  successMessage: "Patterns deleted",
  errorMessage: "Failed to delete patterns",
});
