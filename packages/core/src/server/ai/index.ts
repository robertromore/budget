/**
 * AI Service Layer
 *
 * Provides LLM-powered features using the Vercel AI SDK, all routed
 * through the workspace-scoped provider system (see
 * `./providers/index.ts`). Per-feature provider + mode selection
 * lives under `LLMFeatureModes` in `$core/schema/workspaces`.
 */

// Multi-provider support
export {
  createProvider,
  getActiveProvider,
  getFeatureProvider,
  getLLMMode,
  getProviderForFeature,
  isLLMAvailable,
  type FeatureProviderResult,
  type ProviderInstance,
} from "./providers";

// Intelligence Coordinator (ML + LLM integration)
export {
  createIntelligenceCoordinator,
  executeWithStrategy,
  IntelligenceCoordinator,
  type ExecutionStrategy,
  type IntelligenceFeature,
  type StrategyResult,
} from "./intelligence-coordinator";
