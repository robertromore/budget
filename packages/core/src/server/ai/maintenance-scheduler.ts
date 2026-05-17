/**
 * Auto-scheduler for periodic AI maintenance tasks.
 *
 * Two jobs run on a single interval:
 *  - Telemetry cleanup: prunes ai_tool_call / ai_llm_call rows older
 *    than 90 days and prediction_feedback older than 365 days.
 *    Per-workspace 7-day cooldown lives in
 *    `workspaces.preferences.aiTelemetry.lastCleanupAt`.
 *  - Smart-category auto-retrain: checks drift and queues a retrain
 *    when the model looks stale. Per-workspace 7-day cooldown lives
 *    in `workspaces.preferences.smartCategory.lastAutoRetrainAt`.
 *
 * Both jobs are individually idempotent thanks to their cooldowns —
 * this scheduler just gives us a way to fire them for workspaces
 * whose users haven't visited the relevant pages recently. Same
 * pattern as `price-watcher/auto-check.ts`.
 */

import { aiToolCalls } from "$core/schema/ai-tool-calls";
import { aiLlmCalls } from "$core/schema/ai-llm-calls";
import { predictionFeedback } from "$core/schema/prediction-feedback";
import { payeeCategoryCorrections } from "$core/schema/payee-category-corrections";
import {
  DEFAULT_LLM_PREFERENCES,
  workspaces,
  type LLMPreferences,
} from "$core/schema/workspaces";
import { db } from "$core/server/db";
import { getUnifiedMLCoordinator } from "$core/server/domains/ml/unified-coordinator";
import { and, eq, gte, isNull, lt, sql } from "drizzle-orm";

let started = false;

/**
 * Start the AI maintenance scheduler. Safe to call multiple times —
 * only starts once.
 *
 * @param intervalMinutes - How often to sweep all workspaces.
 *   Default 6 hours. Lower won't help (the per-workspace cooldowns
 *   are 7 days), higher leaves users who never visit /intelligence
 *   without auto-retrain for too long.
 */
export function startAIMaintenanceScheduler(intervalMinutes = 6 * 60): void {
  if (started) return;
  started = true;

  // Initial sweep after 60s so the server is warm before we start
  // touching the DB.
  setTimeout(() => runMaintenance(), 60_000);
  setInterval(() => runMaintenance(), intervalMinutes * 60 * 1000);
}

async function runMaintenance(): Promise<void> {
  try {
    // Only sweep workspaces that have AI features enabled. A
    // workspace with LLM off doesn't produce ai_tool_call rows or
    // smart-category corrections worth retraining on.
    const candidates = await db
      .select({ id: workspaces.id, preferences: workspaces.preferences })
      .from(workspaces)
      .where(isNull(workspaces.deletedAt));

    for (const workspace of candidates) {
      try {
        await runOneWorkspace(workspace.id, workspace.preferences);
      } catch (error) {
        console.error(
          `[AI Maintenance] Workspace ${workspace.id} failed:`,
          error instanceof Error ? error.message : error
        );
      }
    }
  } catch (error) {
    // DB-level error — log and let the next interval retry.
    console.error("[AI Maintenance] Sweep failed:", error);
  }
}

async function runOneWorkspace(
  workspaceId: number,
  rawPreferences: string | null
): Promise<void> {
  const parsed = rawPreferences ? JSON.parse(rawPreferences) : {};
  const llm: LLMPreferences = parsed?.llm ?? DEFAULT_LLM_PREFERENCES;

  await maybePruneTelemetry(workspaceId, parsed);
  if (llm.enabled) {
    await maybeAutoRetrainSmartCategories(workspaceId, parsed);
  }
}

const TELEMETRY_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const TOOL_CALL_RETENTION_DAYS = 90;
const FEEDBACK_RETENTION_DAYS = 365;

async function maybePruneTelemetry(
  workspaceId: number,
  prefs: Record<string, unknown>
): Promise<void> {
  const aiTelemetryPrefs = (prefs?.aiTelemetry as { lastCleanupAt?: string } | undefined) ?? {};
  if (aiTelemetryPrefs.lastCleanupAt) {
    const elapsed = Date.now() - new Date(aiTelemetryPrefs.lastCleanupAt).getTime();
    if (elapsed < TELEMETRY_COOLDOWN_MS) return;
  }

  const toolCallCutoff = new Date(
    Date.now() - TOOL_CALL_RETENTION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  const feedbackCutoff = new Date(
    Date.now() - FEEDBACK_RETENTION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  await db
    .delete(aiToolCalls)
    .where(
      and(eq(aiToolCalls.workspaceId, workspaceId), lt(aiToolCalls.createdAt, toolCallCutoff))
    );
  await db
    .delete(aiLlmCalls)
    .where(and(eq(aiLlmCalls.workspaceId, workspaceId), lt(aiLlmCalls.createdAt, toolCallCutoff)));
  await db
    .delete(predictionFeedback)
    .where(
      and(
        eq(predictionFeedback.workspaceId, workspaceId),
        lt(predictionFeedback.createdAt, feedbackCutoff)
      )
    );

  const nextPrefs = {
    ...prefs,
    aiTelemetry: { ...aiTelemetryPrefs, lastCleanupAt: new Date().toISOString() },
  };
  await db
    .update(workspaces)
    .set({ preferences: JSON.stringify(nextPrefs) })
    .where(eq(workspaces.id, workspaceId));
}

const RETRAIN_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_SIGNAL = 25;
const ACCEPT_THRESHOLD = 0.5;
const DRIFT_WINDOW_DAYS = 30;

async function maybeAutoRetrainSmartCategories(
  workspaceId: number,
  prefs: Record<string, unknown>
): Promise<void> {
  const smartCategoryPrefs =
    (prefs?.smartCategory as { lastAutoRetrainAt?: string } | undefined) ?? {};
  if (smartCategoryPrefs.lastAutoRetrainAt) {
    const elapsed = Date.now() - new Date(smartCategoryPrefs.lastAutoRetrainAt).getTime();
    if (elapsed < RETRAIN_COOLDOWN_MS) return;
  }

  const sinceMs = Date.now() - DRIFT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const since = new Date(sinceMs).toISOString();
  const rows = await db
    .select({
      trigger: payeeCategoryCorrections.correctionTrigger,
      count: sql<number>`COUNT(*)`,
    })
    .from(payeeCategoryCorrections)
    .where(
      and(
        eq(payeeCategoryCorrections.workspaceId, workspaceId),
        gte(payeeCategoryCorrections.createdAt, since)
      )
    )
    .groupBy(payeeCategoryCorrections.correctionTrigger);

  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.trigger] = Number(row.count) || 0;
  const accepted = counts["ai_suggestion_accepted"] ?? 0;
  const overridden = counts["import_category_override"] ?? 0;
  const dismissed = counts["import_dismissal"] ?? 0;
  const manualCorrections = counts["manual_user_correction"] ?? 0;
  const total = accepted + overridden + dismissed + manualCorrections;
  const acceptRate = total > 0 ? accepted / total : null;
  const shouldRetrain =
    total >= MIN_SIGNAL && acceptRate !== null && acceptRate < ACCEPT_THRESHOLD;

  if (!shouldRetrain) return;

  // Stamp the cooldown before the retrain so a long-running rebuild
  // can't be fired twice from concurrent sweeps.
  const nextPrefs = {
    ...prefs,
    smartCategory: {
      ...smartCategoryPrefs,
      lastAutoRetrainAt: new Date().toISOString(),
    },
  };
  await db
    .update(workspaces)
    .set({ preferences: JSON.stringify(nextPrefs) })
    .where(eq(workspaces.id, workspaceId));

  const coordinator = getUnifiedMLCoordinator();
  try {
    await coordinator.retrainModels(workspaceId);
  } catch (error) {
    console.error(
      `[AI Maintenance] Retrain failed for workspace ${workspaceId}:`,
      error instanceof Error ? error.message : error
    );
  }
}
