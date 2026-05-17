import { trpc } from "$core/trpc/client-factory";
import type { PeriodKind } from "$core/server/domains/insights";
import { createQueryKeys, defineQuery } from "./_factory";

export const insightsKeys = createQueryKeys("insights", {
  periodBrief: (period: PeriodKind, asOf?: string) =>
    ["insights", "periodBrief", period, asOf ?? "now"] as const,
  dailyBrief: () => ["insights", "dailyBrief"] as const,
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

export const getDailyBrief = () =>
  defineQuery({
    queryKey: insightsKeys.dailyBrief(),
    queryFn: () => trpc().insightsRoutes.getDailyBrief.query(),
    options: {
      // Cache hits are cheap, but the LLM path is paid. Don't refetch
      // on focus and treat the result as fresh for an hour.
      staleTime: 60 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  });
