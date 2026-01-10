/**
 * Category Suggester Service for Import Cleanup
 *
 * Provides category recommendations for imported transactions
 * using the smart category service.
 */

import type { CategorySuggestion, CategorySuggestionOption } from "$lib/types/import";
import { createSmartCategoryService, type SmartCategoryService } from "$lib/server/domains/ml/smart-categories/service";
import { createMLModelStore } from "$lib/server/domains/ml/model-store";

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
}

const DEFAULT_CONFIG: CategorySuggesterConfig = {
  minConfidence: 0.1, // Lowered from 0.3 to show suggestions for new workspaces
  autoFillThreshold: 0.7,
  maxSuggestions: 3,
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
  };
}

/**
 * Map reason codes from SmartCategoryService to import types
 */
function mapReasonCode(
  reasonCode: string
): CategorySuggestionOption["reason"] {
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
    this.config = { ...DEFAULT_CONFIG, ...config };
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
   * Get category suggestions for multiple rows
   */
  async suggestCategories(
    workspaceId: number,
    inputs: CategorySuggestInput[]
  ): Promise<CategorySuggesterResult> {
    const service = this.getSmartCategoryService();
    const suggestions: CategorySuggestion[] = [];
    let autoFilled = 0;
    let withSuggestions = 0;

    // Debug: Log first few inputs
    if (inputs.length > 0) {
      console.log('[CategorySuggester] Processing', inputs.length, 'rows for workspace', workspaceId);
      console.log('[CategorySuggester] Sample input:', inputs[0]);
    }

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
        this.config.maxSuggestions
      );

      // Debug: Log first suggestion result
      if (input.rowIndex === inputs[0].rowIndex) {
        console.log('[CategorySuggester] First row smart suggestions:', smartSuggestions.length, smartSuggestions);
      }

      const options: CategorySuggestionOption[] = smartSuggestions
        .filter((s) => s.confidence >= this.config.minConfidence)
        .map((s) => ({
          categoryId: s.categoryId,
          categoryName: s.categoryName,
          confidence: s.confidence,
          reason: mapReasonCode(s.reasonCode),
        }));

      // Determine if we should auto-fill
      const shouldAutoFill =
        options.length > 0 && options[0].confidence >= this.config.autoFillThreshold;

      if (options.length > 0) {
        withSuggestions++;
      }

      if (shouldAutoFill) {
        autoFilled++;
      }

      suggestions.push({
        rowIndex: input.rowIndex,
        suggestions: options,
        selectedCategoryId: shouldAutoFill ? options[0].categoryId : undefined,
        userOverride: false,
      });
    }

    return {
      suggestions,
      stats: {
        totalRows: inputs.length,
        withSuggestions,
        autoFilled,
        needsReview: inputs.length - autoFilled,
      },
    };
  }

  /**
   * Get category suggestion for a single row
   */
  async suggestCategoryForRow(
    workspaceId: number,
    input: CategorySuggestInput
  ): Promise<CategorySuggestion> {
    const result = await this.suggestCategories(workspaceId, [input]);
    return result.suggestions[0];
  }
}

/**
 * Create a default category suggester instance
 */
export function createCategorySuggester(
  config?: Partial<CategorySuggesterConfig>
): CategorySuggester {
  return new CategorySuggester(config);
}
