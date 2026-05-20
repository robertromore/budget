/**
 * AI Telemetry Queries
 *
 * Read-side query helpers for the ai_tool_call observability table.
 */

import { trpc } from "$core/trpc/client-factory";
import { cachePatterns, queryClient } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

export const aiTelemetryKeys = createQueryKeys("ai-telemetry", {
  recentActivity: (hours: number) => ["ai-telemetry", "recentActivity", hours] as const,
  recentFeedback: (hours: number) => ["ai-telemetry", "recentFeedback", hours] as const,
  recentLLMCalls: (hours: number) => ["ai-telemetry", "recentLLMCalls", hours] as const,
  externalAgent: (hours: number) => ["ai-telemetry", "externalAgent", hours] as const,
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

/**
 * Aggregate counts and rates from prediction_feedback over a window.
 * Used by the Activity page to surface accept/reject + accuracy
 * alongside tool-call data.
 */
export const getRecentFeedbackStats = (hours = 24) =>
  defineQuery({
    queryKey: aiTelemetryKeys.recentFeedback(hours),
    queryFn: () => trpc().aiRoutes.getRecentFeedbackStats.query({ hours }),
    options: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
    },
  });

/**
 * Per-key activity for external (MCP) agents. Surfaces which API
 * keys are calling tools, how often, and their success rate. Used by
 * the Activity page's "External agents" section.
 */
export const getRecentExternalAgentActivity = (hours = 24) =>
  defineQuery({
    queryKey: aiTelemetryKeys.externalAgent(hours),
    queryFn: () => trpc().aiRoutes.getRecentExternalAgentActivity.query({ hours }),
    options: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
    },
  });

/**
 * Per-feature LLM call stats (counts + token usage + latency).
 */
export const getRecentLLMCallStats = (hours = 24) =>
  defineQuery({
    queryKey: aiTelemetryKeys.recentLLMCalls(hours),
    queryFn: () => trpc().aiRoutes.getRecentLLMCallStats.query({ hours }),
    options: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
    },
  });

/**
 * Prune old telemetry rows. Defaults to opportunistic (cooldown-gated);
 * pass `force: true` for an immediate cleanup button.
 */
export const pruneTelemetry = () =>
  defineMutation<
    { force?: boolean; toolCallRetentionDays?: number; feedbackRetentionDays?: number } | undefined,
    {
      ran: boolean;
      reason: "manual" | "scheduled" | "cooldown";
      toolCallsDeleted: number;
      llmCallsDeleted: number;
      feedbackDeleted: number;
      toolCallRetentionDays?: number;
      feedbackRetentionDays?: number;
      nextEligibleAt?: string;
    }
  >({
    mutationFn: (input) => trpc().aiRoutes.pruneTelemetry.mutate(input ?? {}),
    onSuccess: (result) => {
      if (result.ran) {
        // Refresh the activity surface since rows just changed.
        queryClient.invalidateQueries({ queryKey: aiTelemetryKeys.recentActivity(24) });
        cachePatterns.invalidatePrefix(["ai-telemetry"]);
      }
    },
    successMessage: (data) =>
      data.ran
        ? `Cleaned up ${data.toolCallsDeleted} tool-call rows, ${data.llmCallsDeleted} LLM rows, and ${data.feedbackDeleted} feedback rows.`
        : "Telemetry cleanup already ran recently.",
    errorMessage: "Cleanup failed",
  });
