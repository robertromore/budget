import type { InvestmentValueSnapshot } from "$core/schema/investment-value-snapshots";
import { trpc } from "$core/trpc/client-factory";
import { cachePatterns } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

export type { InvestmentValueSnapshot } from "$core/schema/investment-value-snapshots";

export const investmentSnapshotKeys = createQueryKeys("investmentSnapshots", {
  list: (accountId: number) => ["investmentSnapshots", "list", accountId] as const,
});

export const listSnapshots = (accountId: number) =>
  defineQuery<InvestmentValueSnapshot[]>({
    queryKey: investmentSnapshotKeys.list(accountId),
    queryFn: () =>
      trpc().investmentSnapshotsRoutes.list.query({ accountId }),
    options: {
      staleTime: 60 * 1000, // 1 min — snapshots change only on manual entry
    },
  });

export type SaveSnapshotInput = {
  accountId: number;
  snapshotDate: string;
  value: number;
  notes?: string | null;
};

export const saveSnapshot = defineMutation<
  SaveSnapshotInput,
  InvestmentValueSnapshot
>({
  mutationFn: (input) =>
    trpc().investmentSnapshotsRoutes.save.mutate(input),
  onSuccess: (_, vars) => {
    cachePatterns.invalidatePrefix(
      investmentSnapshotKeys.list(vars.accountId)
    );
  },
  successMessage: "Snapshot saved",
  errorMessage: "Failed to save snapshot",
});

export const deleteSnapshot = defineMutation<
  { id: number; accountId: number },
  { success: boolean }
>({
  mutationFn: ({ id, accountId }) =>
    trpc().investmentSnapshotsRoutes.delete.mutate({ id, accountId }),
  onSuccess: (_, vars) => {
    cachePatterns.invalidatePrefix(
      investmentSnapshotKeys.list(vars.accountId)
    );
  },
  successMessage: "Snapshot deleted",
  errorMessage: "Failed to delete snapshot",
});
