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
  /** Whether this model supports tool/function calling */
  supportsTools?: boolean;
  /** Whether this model is installed locally (Ollama only) */
  installed?: boolean;
}

/**
 * Ollama models known to support tool calling
 * Full list: https://ollama.com/search?c=tools
 */
export const OLLAMA_TOOL_MODELS = new Set([
  // Llama family
  "llama3.1", "llama3.2", "llama3.3", "llama4",
  // Qwen family
  "qwen2", "qwen2.5", "qwen2.5-coder", "qwen3", "qwen3-coder", "qwq", "qwen3-vl",
  // Mistral family
  "mistral", "mistral-nemo", "mistral-small", "mistral-large", "mixtral",
  "mistral-small3.1", "mistral-small3.2", "magistral",
  // DeepSeek
  "deepseek-r1", "deepseek-v3.1",
  // Command-R
  "command-r", "command-r-plus", "command-r7b", "command-a",
  // Others
  "hermes3", "nemotron", "nemotron-mini", "firefunction-v2",
  "phi4-mini", "smollm2", "cogito", "athene-v2", "aya-expanse",
  // Granite family
  "granite3.1-moe", "granite3.1-dense", "granite3.2", "granite3.2-vision",
  "granite3.3", "granite3-dense", "granite3-moe", "granite4",
  // Devstral
  "devstral", "devstral-small-2", "devstral-2",
]);

/**
 * Check if an Ollama model supports tools based on its name
 * Handles version suffixes like "llama3.1:latest" or "qwen2.5:7b"
 */
export function ollamaModelSupportsTools(modelId: string): boolean {
  // Extract base model name (before any colon for tags)
  const baseName = modelId.split(":")[0].toLowerCase();

  // Check exact match first
  if (OLLAMA_TOOL_MODELS.has(baseName)) return true;

  // Check if any known model is a prefix (handles variants like "llama3.1-8b")
  for (const toolModel of OLLAMA_TOOL_MODELS) {
    if (baseName.startsWith(toolModel)) return true;
  }

  return false;
}

export const LLM_MODELS = {
  // All OpenAI models support tools
  openai: [
    { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", description: "Best balance of speed, cost, and capability for most tasks", recommended: true, supportsTools: true },
    { id: "gpt-5.2", name: "GPT-5.2", description: "Most capable flagship model - highest accuracy but slower", supportsTools: true },
    { id: "gpt-5-mini", name: "GPT-5 Mini", description: "Fast and affordable GPT-5 variant", supportsTools: true },
    { id: "o4-mini", name: "o4 Mini", description: "Best for complex reasoning tasks like math and code", supportsTools: true },
    { id: "o3", name: "o3", description: "Advanced reasoning model for difficult problems", supportsTools: true },
    { id: "gpt-4.1", name: "GPT-4.1", description: "1M context window, ideal for large documents", supportsTools: true },
    { id: "gpt-4o", name: "GPT-4o", description: "Legacy multimodal model", supportsTools: true },
  ],
  // All Anthropic models support tools
  anthropic: [
    { id: "claude-haiku-4-5-20251015", name: "Claude Haiku 4.5", description: "Best balance of speed and quality for most tasks", recommended: true, supportsTools: true },
    { id: "claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5", description: "Best for coding, complex analysis, and agents", supportsTools: true },
    { id: "claude-opus-4-5-20251101", name: "Claude Opus 4.5", description: "Most capable flagship - use for difficult tasks", supportsTools: true },
    { id: "claude-opus-4-1-20250805", name: "Claude Opus 4.1", description: "Previous generation, good for agentic tasks", supportsTools: true },
  ],
  // All Google models support tools
  google: [
    { id: "gemini-3-flash", name: "Gemini 3 Flash", description: "Fast and capable, great for most use cases", recommended: true, supportsTools: true },
    { id: "gemini-3-pro", name: "Gemini 3 Pro", description: "Most powerful reasoning for complex tasks", supportsTools: true },
    { id: "gemini-3-deep-think", name: "Gemini 3 Deep Think", description: "Extended reasoning for difficult problems", supportsTools: true },
    { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite", description: "Fastest option, use for simple tasks", supportsTools: true },
  ],
  // Ollama - only some models support tools
  ollama: [
    { id: "llama3.3", name: "Llama 3.3", description: "Great all-around model with 256k context", recommended: true, supportsTools: true },
    { id: "llama4", name: "Llama 4", description: "Latest with multimodal reasoning capabilities", supportsTools: true },
    { id: "qwen3", name: "Qwen 3", description: "Excellent multilingual support", supportsTools: true },
    { id: "mistral-small3.1", name: "Mistral Small 3.1", description: "Fast and efficient for quick tasks", supportsTools: true },
    { id: "qwen2.5-vl", name: "Qwen 2.5 VL", description: "Best for document OCR and vision tasks", supportsTools: false },
    { id: "mixtral", name: "Mixtral 8x22B", description: "Mixture of experts, good for complex tasks", supportsTools: true },
  ],
} as const satisfies Record<string, ModelInfo[]>;

export type LLMProviderModels = typeof LLM_MODELS;
