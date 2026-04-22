/**
 * Category Suggester Service for Import Cleanup
 *
 * Two-stage pipeline:
 *   1. ML (`SmartCategoryService`) produces top-K category candidates
 *      per row with a 0–1 confidence score.
 *   2. For rows whose top ML confidence is below
 *      `llmFallbackThreshold`, a single batched LLM call (see
 *      `llm-category-refiner.ts`) refines the suggestion.
 *
 * Activation of step 2 is coordinator-gated: the refiner no-ops if
 * the workspace LLM master toggle is off, `categorySuggestion` mode
 * is `disabled`, or no provider is configured. In those cases the
 * pipeline collapses to the original ML-only path.
 */

import type { LLMPreferences } from "$core/schema/workspaces";
import type { CategorySuggestion, CategorySuggestionOption } from "$core/types/import";
import {
  createSmartCategoryService,
  type SmartCategoryService,
} from "$core/server/domains/ml/smart-categories/service";
import { getCategoryAliasService } from "$core/server/domains/categories/alias-service";
import { createMLModelStore } from "$core/server/domains/ml/model-store";
import { serviceFactory } from "$core/server/shared/container/service-factory";
import { refineWithLLM, type UncertainRow } from "./llm-category-refiner";

/**
 * Configuration for category suggestions
 */
export interface CategorySuggesterConfig {
  /** Minimum confidence to include a suggestion */
  minConfidence: number;
  /** Confidence threshold for auto-fill */
  autoFillThreshold: number;
  /** Maximum suggestions per transaction */
  maxSuggestions: number;
  /**
   * When top ML confidence is below this threshold AND the workspace
   * has LLM enabled for categorySuggestion, the row is batched to the
   * LLM refiner. Above this threshold the ML result is considered
   * good enough. Default 0.5 is deliberately conservative — half the
   * uncertain rows get LLM attention, saving tokens on clear-cut ones.
   */
  llmFallbackThreshold: number;
}

const DEFAULT_CONFIG: CategorySuggesterConfig = {
  minConfidence: 0.1,
  autoFillThreshold: 0.7,
  maxSuggestions: 3,
  llmFallbackThreshold: 0.5,
};

/**
 * Input row for category suggestions
 */
export interface CategorySuggestInput {
  rowIndex: number;
  payeeName: string;
  rawPayeeString?: string;
  amount: number;
  date: string;
  memo?: string;
}

/**
 * Result of category suggestion analysis
 */
export interface CategorySuggesterResult {
  suggestions: CategorySuggestion[];
  stats: {
    totalRows: number;
    withSuggestions: number;
    autoFilled: number;
    needsReview: number;
    /** How many rows went through the LLM refiner and got a usable
     *  answer back. Exposed so the UI can surface "AI confirmed N
     *  categories" in the import summary without guessing. */
    llmRefined: number;
  };
}

/**
 * Map reason codes from SmartCategoryService to import types
 */
function mapReasonCode(reasonCode: string): CategorySuggestionOption["reason"] {
  const mapping: Record<string, CategorySuggestionOption["reason"]> = {
    payee_match: "payee_match",
    amount_pattern: "amount_pattern",
    time_pattern: "time_pattern",
    historical_pattern: "similar_transaction",
    default_income: "payee_history",
    default_expense: "payee_history",
    subscription_pattern: "amount_pattern",
    paycheck_pattern: "amount_pattern",
  };
  return mapping[reasonCode] || "ml_prediction";
}

export class CategorySuggester {
  private config: CategorySuggesterConfig;
  private smartCategoryService: SmartCategoryService | null = null;

  constructor(config: Partial<CategorySuggesterConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...Object.fromEntries(
        Object.entries(config ?? {}).filter(([, v]) => v !== undefined),
      ),
    };
  }

  /**
   * Get or create the smart category service
   */
  private getSmartCategoryService(): SmartCategoryService {
    if (!this.smartCategoryService) {
      const modelStore = createMLModelStore();
      this.smartCategoryService = createSmartCategoryService(modelStore);
    }
    return this.smartCategoryService;
  }

  /**
   * Get category suggestions for multiple rows.
   *
   * @param workspaceId   Workspace whose categories / payees / aliases
   *   feed the ML services.
   * @param inputs        The transactions to categorize.
   * @param llmPreferences Optional workspace LLM preferences. When
   *   provided, rows with low ML confidence get a batched LLM
   *   refinement pass. Omit (or leave LLM disabled) to fall back to
   *   the original ML-only behaviour.
   */
  async suggestCategories(
    workspaceId: number,
    inputs: CategorySuggestInput[],
    llmPreferences?: LLMPreferences,
  ): Promise<CategorySuggesterResult> {
    const service = this.getSmartCategoryService();
    const suggestions: CategorySuggestion[] = [];
    let autoFilled = 0;
    let withSuggestions = 0;

    // Prefetch all category aliases for in-memory matching (eliminates N+1 queries)
    const aliasService = getCategoryAliasService();
    const aliasCache = await aliasService.getAllAliases(workspaceId);

    // Collect uncertain rows for a batched LLM pass. We build the
    // ML-only suggestions first in a pass-1 loop, then refine. This
    // keeps the ML baseline as the canonical "what would have
    // happened without AI" answer.
    const uncertainRows: UncertainRow[] = [];

    for (const input of inputs) {
      const context = {
        description: input.memo || input.payeeName,
        amount: input.amount,
        date: input.date,
        payeeName: input.payeeName,
        memo: input.memo,
        rawPayeeString: input.rawPayeeString,
      };

      const smartSuggestions = await service.suggestCategories(
        workspaceId,
        context,
        this.config.maxSuggestions,
        aliasCache,
      );

      const options: CategorySuggestionOption[] = smartSuggestions
        .filter((s) => s.confidence >= this.config.minConfidence)
        .map((s) => ({
          categoryId: s.categoryId,
          categoryName: s.categoryName,
          confidence: s.confidence,
          reason: mapReasonCode(s.reasonCode),
        }));

      if (options.length > 0) {
        withSuggestions++;
      }

      const topConfidence = options[0]?.confidence ?? 0;
      const shouldAutoFill =
        options.length > 0 && topConfidence >= this.config.autoFillThreshold;

      if (shouldAutoFill) {
        autoFilled++;
      }

      suggestions.push({
        rowIndex: input.rowIndex,
        suggestions: options,
        selectedCategoryId: shouldAutoFill ? options[0]!.categoryId : undefined,
        userOverride: false,
      });

      // Queue rows for refinement — anything under the fallback
      // threshold (including rows with zero ML candidates) can
      // benefit from a second look.
      if (topConfidence < this.config.llmFallbackThreshold) {
        uncertainRows.push({
          rowIndex: input.rowIndex,
          payee: input.payeeName,
          amount: input.amount,
          date: input.date,
          memo: input.memo,
          mlCandidates: options,
        });
      }
    }

    // Pass 2: LLM refinement for uncertain rows, batched.
    const llmRefined = await this.applyLLMRefinement(
      workspaceId,
      suggestions,
      uncertainRows,
      llmPreferences,
    );

    // Recompute auto-fill count — LLM may have promoted some rows
    // above the auto-fill threshold that ML alone couldn't.
    autoFilled = suggestions.filter(
      (s) =>
        s.selectedCategoryId !== undefined &&
        (s.suggestions[0]?.confidence ?? 0) >= this.config.autoFillThreshold,
    ).length;

    return {
      suggestions,
      stats: {
        totalRows: inputs.length,
        withSuggestions,
        autoFilled,
        needsReview: inputs.length - autoFilled,
        llmRefined,
      },
    };
  }

  /**
   * Call the LLM refiner for uncertain rows and merge its output
   * back into `suggestions` in place. Returns how many rows were
   * actually modified. Silent no-op when the coordinator says LLM
   * shouldn't run.
   */
  private async applyLLMRefinement(
    workspaceId: number,
    suggestions: CategorySuggestion[],
    uncertainRows: UncertainRow[],
    llmPreferences: LLMPreferences | undefined,
  ): Promise<number> {
    if (!llmPreferences || uncertainRows.length === 0) return 0;

    // Workspace categories — loaded once per batch, not per row.
    let categories: Array<{ id: number; name: string }>;
    try {
      const categoryRepository = serviceFactory.getCategoryRepository();
      const rows = await categoryRepository.findAllCategories(workspaceId);
      // Filter out any categories with null names; the LLM prompt
      // needs human-readable identifiers to reason over.
      categories = rows
        .filter((c): c is typeof c & { name: string } => typeof c.name === "string")
        .map((c) => ({ id: c.id, name: c.name }));
    } catch (error) {
      console.error(
        "CategorySuggester: failed to load categories for LLM refinement",
        error,
      );
      return 0;
    }
    if (categories.length === 0) return 0;

    const { outcomes } = await refineWithLLM(uncertainRows, categories, llmPreferences);
    if (outcomes.size === 0) return 0;

    // Splice LLM output into the pre-built suggestions. An LLM
    // refinement replaces the top suggestion; the original ML
    // suggestions drop to slots 2+ so the user can still see what
    // ML thought.
    let refinedCount = 0;
    for (const row of suggestions) {
      const outcome = outcomes.get(row.rowIndex);
      if (!outcome || !outcome.refined) continue;
      const refined = outcome.refined;
      // Remove any duplicate of the refined option from the ML list
      // to avoid showing the same category twice.
      const ml = row.suggestions.filter((s) => s.categoryId !== refined.categoryId);
      row.suggestions = [refined, ...ml].slice(0, this.config.maxSuggestions);
      if (refined.confidence >= this.config.autoFillThreshold) {
        row.selectedCategoryId = refined.categoryId;
      }
      refinedCount++;
    }
    return refinedCount;
  }

  /**
   * Get category suggestion for a single row
   */
  async suggestCategoryForRow(
    workspaceId: number,
    input: CategorySuggestInput,
    llmPreferences?: LLMPreferences,
  ): Promise<CategorySuggestion> {
    const result = await this.suggestCategories(workspaceId, [input], llmPreferences);
    return result.suggestions[0]!;
  }
}

/**
 * Create a default category suggester instance
 */
export function createCategorySuggester(
  config?: Partial<CategorySuggesterConfig>,
): CategorySuggester {
  return new CategorySuggester(config);
}
