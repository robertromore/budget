/**
 * AI Service Layer
 *
 * Provides LLM-powered features using Vercel AI SDK.
 *
 * @example
 * ```typescript
 * import { parseTransactionDescription, isAIEnabled } from '$lib/server/ai';
 *
 * if (isAIEnabled()) {
 *   const parsed = await parseTransactionDescription('SQ *COFFEE ROASTER');
 *   console.log(parsed?.merchantName); // 'Coffee Roaster'
 * }
 * ```
 */

// Provider
export { defaultModel, isAIEnabled, openai, reasoningModel } from './provider';

// Multi-provider support
export {
  createProvider,
  getActiveProvider,
  getFeatureProvider, getLLMMode, getProviderForFeature,
  isLLMAvailable, type FeatureProviderResult, type ProviderInstance
} from './providers';

// Intelligence Coordinator (ML + LLM integration)
export {
  createIntelligenceCoordinator,
  executeWithStrategy,
  IntelligenceCoordinator,
  type ExecutionStrategy,
  type IntelligenceFeature,
  type StrategyResult
} from './intelligence-coordinator';

// Transaction Parser
export {
  batchParseTransactions, clearParseCache,
  getParseCacheSize,
  MERCHANT_CATEGORIES, parseTransactionDescription, parseTransactionWithCache, TRANSACTION_TYPES,
  type MerchantCategory, type ParsedTransaction,
  type ParseResult, type TransactionType
} from './transaction-parser';

// Prompts (for customization/testing)
export {
  TRANSACTION_PARSER_EXAMPLES, TRANSACTION_PARSER_PROMPT
} from './prompts/transaction-parser';

