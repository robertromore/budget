import { trpc } from "$core/trpc/client-factory";
import type { PeriodKind } from "$core/server/domains/insights";
import { createQueryKeys, defineQuery } from "./_factory";

export const insightsKeys = createQueryKeys("insights", {
  periodBrief: (period: PeriodKind, asOf?: string) =>
    ["insights", "periodBrief", period, asOf ?? "now"] as const,
});

export const getPeriodBrief = (period: PeriodKind = "week", asOf?: string) =>
  defineQuery({
    queryKey: insightsKeys.periodBrief(period, asOf),
    queryFn: () =>
      trpc().insightsRoutes.getPeriodBrief.query({ period, ...(asOf ? { asOf } : {}) }),
    options: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  });
