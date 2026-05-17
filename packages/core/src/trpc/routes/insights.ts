import { cachedNarratives } from "$core/schema/cached-narratives";
import { DEFAULT_LLM_PREFERENCES, workspaces } from "$core/schema/workspaces";
import { PeriodBriefService } from "$core/server/domains/insights";
import { getProviderForFeature } from "$core/server/ai/providers";
import { db } from "$core/server/db";
import { lazyService } from "$core/server/shared/container/lazy-service";
import { serviceFactory } from "$core/server/shared/container/service-factory";
import { publicProcedure, t } from "$core/trpc";
import { withErrorHandler } from "$core/trpc/shared/errors";
import { generateText } from "ai";
import { createHash } from "crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const transactionService = lazyService(() => serviceFactory.getTransactionService());

let serviceSingleton: PeriodBriefService | null = null;
function getService(): PeriodBriefService {
  if (!serviceSingleton) serviceSingleton = new PeriodBriefService();
  return serviceSingleton;
}

const periodBriefInput = z.object({
  period: z.enum(["week", "month"]).default("week"),
  asOf: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

/**
 * Local YYYY-MM-DD for cache keying. Uses the server's wall clock — we
 * don't try to handle multi-timezone workspaces here; the cache is
 * coarse-grained enough that a single boundary skew is fine.
 */
function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface DailyBriefInputs {
  totalReceived: number;
  totalSpent: number;
  txCount: number;
  topCategoryName: string | null;
  topCategoryAmount: number;
}

function hashInputs(inputs: DailyBriefInputs): string {
  return createHash("md5")
    .update(
      JSON.stringify({
        // Round to whole dollars so cents-level drift doesn't bust the
        // cache. The narrative is coarse-grained anyway.
        r: Math.round(inputs.totalReceived),
        s: Math.round(inputs.totalSpent),
        n: inputs.txCount,
        c: inputs.topCategoryName ?? "",
        a: Math.round(inputs.topCategoryAmount),
      })
    )
    .digest("hex")
    .slice(0, 16);
}

function heuristicPhrase(inputs: DailyBriefInputs): string {
  if (inputs.totalReceived === 0) return "a quiet month so far";
  const ratio = inputs.totalSpent / inputs.totalReceived;
  if (ratio < 0.5) return "running light — plenty of room in the budget";
  if (ratio < 0.75) return "pacing about where you usually land";
  if (ratio < 1) return "spending a little heavier than usual";
  return "outspending what's come in";
}

export const insightsRoutes = t.router({
  getPeriodBrief: publicProcedure.input(periodBriefInput).query(
    withErrorHandler(async ({ ctx, input }) => {
      return getService().getPeriodBrief(ctx.workspaceId, {
        period: input.period,
        asOf: input.asOf,
      });
    })
  ),

  /**
   * Daily one-sentence dashboard summary. LLM-generated when the
   * narrative feature is enabled; otherwise falls back to the
   * heuristic phrase the widget used before.
   *
   * The result is cached per workspace per day per model so we
   * make at most one LLM call per day, and we invalidate on the
   * fly when the underlying numbers change materially (inputHash).
   */
  getDailyBrief: publicProcedure.query(
    withErrorHandler(async ({ ctx }) => {
      const [summary, topCategories] = await Promise.all([
        transactionService.getWorkspaceSummary(ctx.workspaceId),
        transactionService.getWorkspaceTopCategories(ctx.workspaceId, { limit: 1 }),
      ]);

      const top = (topCategories as Array<{ categoryName?: string; totalAmount?: number }>)[0];
      const inputs: DailyBriefInputs = {
        totalReceived: Number(summary.totalReceived30d) || 0,
        totalSpent: Number(summary.totalSpent30d) || 0,
        txCount: Number(summary.transactionCount30d) || 0,
        topCategoryName: top?.categoryName ?? null,
        topCategoryAmount: Math.abs(Number(top?.totalAmount) || 0),
      };

      const fallback = {
        phrase: heuristicPhrase(inputs),
        source: "heuristic" as const,
      };

      // Read LLM preferences to decide if we should call out at all.
      const [workspace] = await db
        .select({ preferences: workspaces.preferences })
        .from(workspaces)
        .where(eq(workspaces.id, ctx.workspaceId))
        .limit(1);
      const parsed = workspace?.preferences ? JSON.parse(workspace.preferences) : {};
      const llm = parsed.llm ?? DEFAULT_LLM_PREFERENCES;
      const { provider, mode } = getProviderForFeature(llm, "narrative");

      if (mode === "disabled" || !provider) return fallback;

      const dateKey = todayKey();
      const modelKey = `${provider.providerType}:${provider.model}`;
      const inputHash = hashInputs(inputs);

      // Cache hit?
      const [cached] = await db
        .select()
        .from(cachedNarratives)
        .where(
          and(
            eq(cachedNarratives.workspaceId, ctx.workspaceId),
            eq(cachedNarratives.kind, "monthly-brief"),
            eq(cachedNarratives.dateKey, dateKey),
            eq(cachedNarratives.model, modelKey)
          )
        )
        .limit(1);
      if (cached && cached.inputHash === inputHash) {
        return { phrase: cached.content, source: "llm" as const };
      }

      // Generate. Tight prompt: one short phrase, no quotes/punctuation,
      // ~5-15 words. We do not pass raw tx data, just aggregates.
      const systemPrompt = [
        "You write one short dashboard summary phrase about the current month's finances.",
        "Return ONE phrase, 5 to 15 words, lowercase except proper nouns.",
        "No leading 'You', no quotes, no trailing punctuation.",
        "Tone: calm, factual, mildly conversational. Avoid hyperbole.",
      ].join(" ");

      const userPrompt = [
        `30-day income: $${inputs.totalReceived.toFixed(0)}`,
        `30-day spending: $${inputs.totalSpent.toFixed(0)}`,
        `transactions: ${inputs.txCount}`,
        inputs.topCategoryName
          ? `top category: ${inputs.topCategoryName} ($${inputs.topCategoryAmount.toFixed(0)})`
          : "",
      ]
        .filter(Boolean)
        .join("\n");

      let phrase: string;
      try {
        const result = await generateText({
          model: provider.provider(provider.model),
          system: systemPrompt,
          prompt: userPrompt,
          maxOutputTokens: 60,
        });
        phrase = result.text.trim().replace(/^["']|["']$/g, "").replace(/[.!?]$/g, "");
        if (!phrase) phrase = fallback.phrase;
      } catch (error) {
        console.error("[Daily Brief] LLM call failed:", error);
        return fallback;
      }

      // Upsert (unique on workspaceId+kind+dateKey+model).
      try {
        if (cached) {
          await db
            .update(cachedNarratives)
            .set({ content: phrase, inputHash })
            .where(eq(cachedNarratives.id, cached.id));
        } else {
          await db.insert(cachedNarratives).values({
            workspaceId: ctx.workspaceId,
            kind: "monthly-brief",
            dateKey,
            model: modelKey,
            inputHash,
            content: phrase,
          });
        }
      } catch (error) {
        console.error("[Daily Brief] Failed to persist cache:", error);
      }

      return { phrase, source: "llm" as const };
    })
  ),
});
