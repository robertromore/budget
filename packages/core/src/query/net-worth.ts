import { trpc } from "$core/trpc/client-factory";
import { cachePatterns } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

export const netWorthKeys = createQueryKeys("netWorth", {
  history: (months: number) => ["history", months] as const,
});

export type NetWorthHistoryItem = {
  id: number;
  workspaceId: number;
  snapshotDate: string;
  totalNetWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  byAccountType: Record<string, number>;
  createdAt: string;
};

export const getNetWorthHistory = (months: number = 12) =>
  defineQuery<NetWorthHistoryItem[]>({
    queryKey: netWorthKeys.history(months),
    queryFn: () => trpc().netWorthRoutes.history.query({ months }),
    options: {
      staleTime: 30 * 60 * 1000, // 30 min — snapshots are captured at most once per day
    },
  });

export type SnapshotResult = {
  snapshotDate: string;
  totalNetWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  byAccountType: Record<string, number>;
};

export const captureNetWorthSnapshot = defineMutation<undefined, SnapshotResult>({
  mutationFn: () => trpc().netWorthRoutes.captureSnapshot.mutate(),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(netWorthKeys.all());
  },
  errorMessage: "Failed to capture net worth snapshot",
});
