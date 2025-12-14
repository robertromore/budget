import type { DetectedPattern } from "$lib/schema/detected-patterns";
import type { DetectedPatternData, DetectionCriteria } from "$lib/server/domains/patterns/types";
import { trpc } from "$lib/trpc/client";
import { cachePatterns } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

type PatternStatus = "pending" | "accepted" | "dismissed" | "converted";

export const patternKeys = createQueryKeys("patterns", {
  all: () => ["patterns", "all"] as const,
  byAccount: (accountId: number) => ["patterns", "account", accountId] as const,
  byStatus: (status: PatternStatus) => ["patterns", "status", status] as const,
  byAccountAndStatus: (accountId: number, status: PatternStatus) =>
    ["patterns", "account", accountId, "status", status] as const,
});

/**
 * List all detected patterns with optional filtering
 */
export const listPatterns = (accountId?: number, status?: PatternStatus) =>
  defineQuery<DetectedPattern[]>({
    queryKey:
      accountId && status
        ? patternKeys.byAccountAndStatus(accountId, status)
        : accountId
          ? patternKeys.byAccount(accountId)
          : status
            ? patternKeys.byStatus(status)
            : patternKeys.all(),
    queryFn: () => trpc().patternRoutes.list.query({ accountId, status }),
  });

/**
 * Run pattern detection for specific account or all accounts
 */
export const detectPatterns = defineMutation<
  { accountId?: number; criteria?: Partial<DetectionCriteria> },
  DetectedPatternData[]
>({
  mutationFn: (input) => trpc().patternRoutes.detect.mutate(input),
  onSuccess: () => {
    // Invalidate all pattern queries (not just "all" key)
    cachePatterns.invalidatePrefix(["patterns"]);
  },
  // No successMessage - the UI handles custom toasts with pattern counts
  errorMessage: "Failed to detect patterns",
});

/**
 * Convert a detected pattern to a schedule
 */
export const convertPatternToSchedule = defineMutation<{ patternId: number }, number>({
  mutationFn: (input) => trpc().patternRoutes.convertToSchedule.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(["patterns"]);
    // Also invalidate schedule cache when patterns are converted
    cachePatterns.invalidatePrefix(["schedules"]);
  },
  successMessage: "Pattern converted to schedule",
  errorMessage: "Failed to convert pattern",
});

/**
 * Dismiss a detected pattern
 */
export const dismissPattern = defineMutation<{ patternId: number }, { success: boolean }>({
  mutationFn: (input) => trpc().patternRoutes.dismiss.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(["patterns"]);
  },
  successMessage: "Pattern dismissed",
  errorMessage: "Failed to dismiss pattern",
});

/**
 * Expire stale patterns that haven't matched recently
 */
export const expireStalePatterns = defineMutation<
  { daysSinceLastMatch?: number },
  { count: number }
>({
  mutationFn: (input) => trpc().patternRoutes.expireStale.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(["patterns"]);
  },
  successMessage: "Stale patterns expired",
  errorMessage: "Failed to expire patterns",
});

/**
 * Delete all patterns (optionally filtered by status)
 */
export const deleteAllPatterns = defineMutation<
  { status?: "pending" | "accepted" | "dismissed" | "converted" },
  { count: number }
>({
  mutationFn: (input) => trpc().patternRoutes.deleteAll.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(["patterns"]);
  },
  successMessage: "Patterns deleted",
  errorMessage: "Failed to delete patterns",
});
