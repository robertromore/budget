/**
 * LLM Model Definitions
 *
 * Available models for each LLM provider with descriptions.
 * These are hardcoded fallbacks - providers may offer additional models.
 * Last updated: December 2025
 */

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  recommended?: boolean;
}

export const LLM_MODELS = {
  openai: [
    { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", description: "Best balance of speed, cost, and capability for most tasks", recommended: true },
    { id: "gpt-5.2", name: "GPT-5.2", description: "Most capable flagship model - highest accuracy but slower" },
    { id: "gpt-5-mini", name: "GPT-5 Mini", description: "Fast and affordable GPT-5 variant" },
    { id: "o4-mini", name: "o4 Mini", description: "Best for complex reasoning tasks like math and code" },
    { id: "o3", name: "o3", description: "Advanced reasoning model for difficult problems" },
    { id: "gpt-4.1", name: "GPT-4.1", description: "1M context window, ideal for large documents" },
    { id: "gpt-4o", name: "GPT-4o", description: "Legacy multimodal model" },
  ],
  anthropic: [
    { id: "claude-haiku-4-5-20251015", name: "Claude Haiku 4.5", description: "Best balance of speed and quality for most tasks", recommended: true },
    { id: "claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5", description: "Best for coding, complex analysis, and agents" },
    { id: "claude-opus-4-5-20251101", name: "Claude Opus 4.5", description: "Most capable flagship - use for difficult tasks" },
    { id: "claude-opus-4-1-20250805", name: "Claude Opus 4.1", description: "Previous generation, good for agentic tasks" },
  ],
  google: [
    { id: "gemini-3-flash", name: "Gemini 3 Flash", description: "Fast and capable, great for most use cases", recommended: true },
    { id: "gemini-3-pro", name: "Gemini 3 Pro", description: "Most powerful reasoning for complex tasks" },
    { id: "gemini-3-deep-think", name: "Gemini 3 Deep Think", description: "Extended reasoning for difficult problems" },
    { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite", description: "Fastest option, use for simple tasks" },
  ],
  ollama: [
    { id: "llama3.3", name: "Llama 3.3", description: "Great all-around model with 256k context", recommended: true },
    { id: "llama4", name: "Llama 4", description: "Latest with multimodal reasoning capabilities" },
    { id: "qwen3", name: "Qwen 3", description: "Excellent multilingual support" },
    { id: "mistral-small-3.1", name: "Mistral Small 3.1", description: "Fast and efficient for quick tasks" },
    { id: "qwen2.5-vl", name: "Qwen 2.5 VL", description: "Best for document OCR and vision tasks" },
    { id: "mixtral", name: "Mixtral 8x22B", description: "Mixture of experts, good for complex tasks" },
  ],
} as const satisfies Record<string, ModelInfo[]>;

export type LLMProviderModels = typeof LLM_MODELS;
