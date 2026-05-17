/**
 * AI Telemetry Queries
 *
 * Read-side query helpers for the ai_tool_call observability table.
 */

import { trpc } from "$core/trpc/client-factory";
import { createQueryKeys, defineQuery } from "./_factory";

export const aiTelemetryKeys = createQueryKeys("ai-telemetry", {
  recentActivity: (hours: number) => ["ai-telemetry", "recentActivity", hours] as const,
});

export const getRecentToolActivity = (hours = 24) =>
  defineQuery({
    queryKey: aiTelemetryKeys.recentActivity(hours),
    queryFn: () => trpc().aiRoutes.getRecentToolActivity.query({ hours }),
    options: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
    },
  });
