import { createOpenAI } from '@ai-sdk/openai';

/**
 * OpenAI provider instance for Vercel AI SDK.
 *
 * Usage:
 * ```typescript
 * import { openai } from '$lib/server/ai/provider';
 * import { generateText } from 'ai';
 *
 * const { text } = await generateText({
 *   model: openai('gpt-3.5-turbo'),
 *   prompt: 'Hello!'
 * });
 * ```
 */
export const openai = createOpenAI({
	apiKey: process.env['OPENAI_API_KEY']
});

/**
 * Default model for simple text generation tasks.
 * GPT-3.5-turbo offers good quality at ~$0.002/1K tokens.
 */
export const defaultModel = openai('gpt-3.5-turbo');

/**
 * Model for complex reasoning tasks.
 * GPT-4 offers better accuracy at ~$0.03/1K tokens.
 */
export const reasoningModel = openai('gpt-4-turbo');

/**
 * Check if AI features are enabled (API key is configured).
 */
export function isAIEnabled(): boolean {
	return !!process.env['OPENAI_API_KEY'];
}
