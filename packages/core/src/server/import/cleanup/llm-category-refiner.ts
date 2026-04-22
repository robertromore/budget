/**
 * LLM Category Refiner
 *
 * Second-pass refinement for rows where the ML category suggester
 * produced low-confidence output. Runs one batched structured-output
 * LLM call against a whole collection of uncertain rows so a 500-row
 * import doesn't balloon into 500 LLM calls.
 *
 * Pipeline shape (Batch C of the ML/LLM de-duplication plan):
 *
 *   SmartCategoryService → top-K candidates per row
 *   → CategorySuggester collects rows with top confidence < threshold
 *   → this module batches them to the LLM
 *   → LLM picks a category (or returns null) per row
 *   → CategorySuggester merges LLM output back over the ML baseline
 *
 * Activation is coordinator-gated: workspace LLM master toggle off,
 * feature disabled, or no provider configured = this module returns
 * the ML suggestions unchanged.
 */

import type { LLMPreferences } from "$core/schema/workspaces";
import type { Category } from "$core/schema/categories";
import { createIntelligenceCoordinator } from "$core/server/ai/intelligence-coordinator";
import type { CategorySuggestionOption } from "$core/types/import";
import { generateText, Output } from "ai";
import { z } from "zod";

/**
 * One row's worth of context for the LLM. Carries the ML top-K so
 * the model can agree / pick the right one instead of guessing from
 * scratch — same information a human would scan.
 */
export interface UncertainRow {
  rowIndex: number;
  payee: string;
  amount: number;
  date: string;
  memo?: string | undefined;
  mlCandidates: CategorySuggestionOption[];
}

export interface CategoryOption {
  id: number;
  name: string;
}

export interface LlmRefinementOutcome {
  /** The refined option to surface at the top of the row's
   *  suggestions. Null means the LLM declined to commit, in which
   *  case the caller should keep the ML-only suggestions. */
  refined: CategorySuggestionOption | null;
  /** Whether the LLM actually ran for this row (vs skipped for some
   *  reason — schema mismatch, API error, etc.). Useful for UI
   *  affordance "LLM confirmed" vs "ML only". */
  llmRan: boolean;
}

export interface LlmRefinementResult {
  outcomes: Map<number, LlmRefinementOutcome>;
  /** Non-null iff the LLM call was attempted but failed before
   *  producing any outcomes. Surfaced for import logs. */
  error?: string;
}

/**
 * Zod schema for the LLM response. One entry per input row (keyed by
 * `rowIndex`). `categoryId` null means "I don't have enough signal".
 */
const RefinementItemSchema = z.object({
  rowIndex: z.number().int(),
  categoryId: z
    .number()
    .int()
    .nullable()
    .describe(
      "The category ID from the provided list, or null if no category is a good fit.",
    ),
  confidence: z.number().min(0).max(1),
  reason: z
    .string()
    .max(200)
    .describe("One short sentence explaining the choice."),
});

const RefinementSchema = z.object({
  items: z.array(RefinementItemSchema),
});

const SYSTEM_PROMPT = `You are a precise transaction categorizer. For each transaction, pick the best category from the provided list — or return null if none fit.

Rules:
- Only use category IDs from the provided list. Never invent IDs.
- If the ML baseline candidates (provided per row) already include a clearly correct answer, confirm it.
- If none of the ML candidates fit, scan the full category list for a better match.
- Return null categoryId when the transaction is too ambiguous (utilities with no context, generic fees, etc.).
- Be conservative with confidence — use 0.9+ only when the match is unambiguous.`;

const DEFAULT_CONFIDENCE_THRESHOLD = 0.5;
const DEFAULT_MAX_ROWS_PER_CALL = 40;

export interface RefineOptions {
  /**
   * Rows whose top ML confidence is below this threshold are sent to
   * the LLM. Anything at or above is considered good enough.
   */
  confidenceThreshold?: number;
  /**
   * Cap on how many rows ship to the LLM in one structured-output
   * call. Beyond this we split into multiple calls. The AI SDK
   * handles each call independently; on error we fall back to
   * ML-only for the affected chunk.
   */
  maxRowsPerCall?: number;
}

/**
 * Run the refiner. Always resolves — failures produce an empty map
 * + an `error` so the caller can decide whether to log or show.
 */
export async function refineWithLLM(
  uncertainRows: UncertainRow[],
  workspaceCategories: Pick<Category, "id" | "name">[],
  preferences: LLMPreferences,
  options: RefineOptions = {},
): Promise<LlmRefinementResult> {
  const outcomes = new Map<number, LlmRefinementOutcome>();
  if (uncertainRows.length === 0) return { outcomes };

  // Coordinator check — master toggle, feature mode, provider. The
  // `ml_then_llm` and `llm_only` strategies both mean "call the LLM
  // when ML is uncertain"; `ml_only`, `disabled`, `none` skip.
  const coordinator = createIntelligenceCoordinator({ llm: preferences });
  const strategy = coordinator.getStrategy("categorySuggestion");
  if (!strategy.useLLM || !strategy.llmProvider) {
    return { outcomes };
  }

  const provider = strategy.llmProvider;
  const maxRowsPerCall = options.maxRowsPerCall ?? DEFAULT_MAX_ROWS_PER_CALL;
  const categoryById = new Map(workspaceCategories.map((c) => [c.id, c.name]));

  // Render a compact category list once so each chunk reuses it.
  const categoryListText = workspaceCategories
    .map((c) => `- ${c.id}: ${c.name}`)
    .join("\n");

  let firstError: string | undefined;

  for (let offset = 0; offset < uncertainRows.length; offset += maxRowsPerCall) {
    const chunk = uncertainRows.slice(offset, offset + maxRowsPerCall);
    const chunkPrompt = buildChunkPrompt(chunk, categoryListText);

    try {
      const { output } = await generateText({
        model: provider.provider(provider.model),
        output: Output.object({ schema: RefinementSchema }),
        system: SYSTEM_PROMPT,
        prompt: chunkPrompt,
      });

      for (const item of output.items) {
        if (item.categoryId == null) {
          outcomes.set(item.rowIndex, { refined: null, llmRan: true });
          continue;
        }
        const name = categoryById.get(item.categoryId);
        if (!name) {
          // LLM returned an ID we don't recognize — treat as "no
          // refinement" so the ML baseline stays. Safer than
          // trusting a hallucinated ID.
          outcomes.set(item.rowIndex, { refined: null, llmRan: true });
          continue;
        }
        outcomes.set(item.rowIndex, {
          refined: {
            categoryId: item.categoryId,
            categoryName: name,
            confidence: Math.min(1, Math.max(0, item.confidence)),
            reason: "ml_prediction",
          },
          llmRan: true,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown LLM error";
      console.error(`LLM category refiner chunk ${offset} failed: ${message}`);
      if (!firstError) firstError = message;
      // Leave this chunk's rows without outcomes — caller falls
      // back to ML-only for them.
    }
  }

  return firstError ? { outcomes, error: firstError } : { outcomes };
}

function buildChunkPrompt(
  chunk: UncertainRow[],
  categoryListText: string,
): string {
  const rowBlocks = chunk.map((row) => {
    const mlLines = row.mlCandidates
      .slice(0, 3)
      .map(
        (c) =>
          `    - ${c.categoryId}: ${c.categoryName} (ml confidence ${c.confidence.toFixed(2)})`,
      )
      .join("\n");
    return [
      `Row ${row.rowIndex}:`,
      `  Payee: ${row.payee}`,
      `  Amount: ${row.amount}`,
      `  Date: ${row.date}`,
      row.memo ? `  Memo: ${row.memo}` : null,
      mlLines ? `  ML top candidates:\n${mlLines}` : "  ML top candidates: (none)",
    ]
      .filter(Boolean)
      .join("\n");
  });

  return [
    "Categories available (id: name):",
    categoryListText,
    "",
    "Transactions to categorize:",
    ...rowBlocks,
  ].join("\n\n");
}

export const _internals = {
  DEFAULT_CONFIDENCE_THRESHOLD,
  DEFAULT_MAX_ROWS_PER_CALL,
};
