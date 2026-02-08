import type { LLMPreferences, LLMProvider } from "$lib/schema/workspaces";
import { createProvider, getActiveProvider } from "$lib/server/ai/providers";
import { generateText } from "ai";
import { readFile } from "fs/promises";

export interface AiVisionExtractionResult {
  text: string;
  confidence: number; // AI-based extraction is typically high confidence
  provider: LLMProvider;
  model: string;
}

const EXTRACTION_PROMPT = `Extract ALL text from this document image.

Instructions:
- Extract every piece of text visible in the document
- Preserve the original structure and formatting as much as possible
- Include headers, footers, tables, and any other text elements
- For tables, try to maintain column alignment using spaces or tabs
- If text is unclear or partially visible, include it with [unclear] notation
- Do not add any commentary or interpretation - only extract the text

Return ONLY the extracted text, nothing else.`;

/**
 * Extract text from a document using AI vision capabilities
 * Supports images (JPEG, PNG, WebP) and PDFs (first page)
 */
export async function extractWithAiVision(
  filePath: string,
  mimeType: string,
  preferences: LLMPreferences,
  specificProvider?: LLMProvider | null
): Promise<AiVisionExtractionResult> {
  // Get provider instance
  let providerInstance = null;

  if (specificProvider) {
    const config = preferences.providers[specificProvider];
    if (config?.enabled) {
      providerInstance = createProvider(specificProvider, config);
    }
  }

  if (!providerInstance) {
    providerInstance = getActiveProvider(preferences);
  }

  if (!providerInstance) {
    throw new Error("No LLM provider configured for AI vision extraction");
  }

  // Read file and convert to base64
  const fileBuffer = await readFile(filePath);
  const base64 = fileBuffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;

  // Generate text using vision capability
  const { text } = await generateText({
    model: providerInstance.provider(providerInstance.model),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            image: dataUrl,
          },
          {
            type: "text",
            text: EXTRACTION_PROMPT,
          },
        ],
      },
    ],
  });

  return {
    text: text.trim(),
    confidence: 0.95, // AI vision is typically high confidence
    provider: providerInstance.providerType,
    model: providerInstance.model,
  };
}

/**
 * Check if a provider supports vision capabilities
 * Note: Not all models support vision, but the major ones do
 */
export function supportsVision(provider: LLMProvider, model: string): boolean {
  // Most modern models from these providers support vision
  // This is a simplified check - in practice, you'd want a more detailed model list
  switch (provider) {
    case "openai":
      // GPT-4 Vision models
      return (
        model.includes("gpt-4") ||
        model.includes("gpt-4o") ||
        model.includes("gpt-4.1") ||
        model.includes("vision")
      );
    case "anthropic":
      // Claude 3+ models support vision
      return model.includes("claude-3") || model.includes("claude-haiku-4") || model.includes("claude-sonnet-4");
    case "google":
      // Gemini models support vision
      return model.includes("gemini");
    case "ollama":
      // Some Ollama models support vision (llava, bakllava, etc.)
      return model.includes("llava") || model.includes("vision");
    default:
      return false;
  }
}
