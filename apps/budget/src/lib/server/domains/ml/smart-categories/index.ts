/**
 * Smart Category Suggestions Module
 *
 * Provides intelligent category suggestions based on:
 * - Payee/merchant name similarity
 * - Amount patterns (large deposits → Income, small recurring → Subscriptions)
 * - Time/day patterns (weekend spending, payday patterns, seasonal)
 * - Historical transaction patterns
 */

export { smartCategoryRoutes } from "./routes";
export {
  createSmartCategoryService, type CategoryTransactionContext, type SmartCategoryService,
  type SmartCategorySuggestion, type SuggestionFactor,
  type SuggestionReasonCode
} from "./service";

