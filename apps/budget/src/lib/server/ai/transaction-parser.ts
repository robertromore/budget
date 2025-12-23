import { generateText, Output } from 'ai';
import { z } from 'zod';
import { TRANSACTION_PARSER_PROMPT } from './prompts/transaction-parser';
import { defaultModel, isAIEnabled } from './provider';

/**
 * Merchant categories for transaction classification.
 */
export const MERCHANT_CATEGORIES = [
	'groceries',
	'dining',
	'gas',
	'shopping',
	'entertainment',
	'utilities',
	'transportation',
	'healthcare',
	'subscriptions',
	'transfers',
	'other'
] as const;

export type MerchantCategory = (typeof MERCHANT_CATEGORIES)[number];

/**
 * Transaction types for classification.
 */
export const TRANSACTION_TYPES = ['purchase', 'refund', 'subscription', 'transfer'] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

/**
 * Parsed transaction data structure.
 */
export interface ParsedTransaction {
	merchantName: string;
	merchantCategory: MerchantCategory;
	transactionType: TransactionType;
	isRecurring: boolean;
	confidence: number;
}

/**
 * Zod schema for AI SDK structured output.
 */
const ParsedTransactionSchema = z.object({
	merchantName: z.string().describe('Clean merchant/payee name without codes or location suffixes'),
	merchantCategory: z.enum(MERCHANT_CATEGORIES).describe('Category of the merchant'),
	transactionType: z.enum(TRANSACTION_TYPES).describe('Type of transaction'),
	isRecurring: z.boolean().describe('Whether this appears to be a recurring charge'),
	confidence: z.number().min(0).max(1).describe('Confidence score from 0.0 to 1.0')
});

/**
 * Result of a parse operation, including the original description.
 */
export interface ParseResult {
	original: string;
	parsed: ParsedTransaction | null;
	error?: string;
}

/**
 * Parse a single transaction description using AI.
 *
 * @param description - Raw bank transaction description
 * @returns Parsed transaction data or null if parsing fails
 *
 * @example
 * ```typescript
 * const result = await parseTransactionDescription('SQ *COFFEE ROASTER CH');
 * // { merchantName: 'Coffee Roaster', merchantCategory: 'dining', ... }
 * ```
 */
export async function parseTransactionDescription(
	description: string
): Promise<ParsedTransaction | null> {
	if (!isAIEnabled()) {
		console.warn('AI features are disabled. Set OPENAI_API_KEY to enable.');
		return null;
	}

	if (!description || description.trim().length === 0) {
		return null;
	}

	try {
		const { output } = await generateText({
			model: defaultModel,
			output: Output.object({ schema: ParsedTransactionSchema }),
			system: TRANSACTION_PARSER_PROMPT,
			prompt: `Parse this bank transaction description: "${description}"`
		});

		return output;
	} catch (error) {
		console.error('Failed to parse transaction description:', error);
		return null;
	}
}

/**
 * Parse multiple transaction descriptions in batch.
 * Processes in parallel for efficiency during imports.
 *
 * @param descriptions - Array of raw bank transaction descriptions
 * @param options - Batch processing options
 * @returns Array of parse results
 *
 * @example
 * ```typescript
 * const results = await batchParseTransactions([
 *   'SQ *COFFEE ROASTER CH',
 *   'AMZN MKTP US*123',
 *   'NETFLIX.COM'
 * ]);
 * ```
 */
export async function batchParseTransactions(
	descriptions: string[],
	options: {
		/** Maximum concurrent requests (default: 5) */
		concurrency?: number;
		/** Skip already parsed descriptions */
		skipEmpty?: boolean;
	} = {}
): Promise<ParseResult[]> {
	const { concurrency = 5, skipEmpty = true } = options;

	if (!isAIEnabled()) {
		console.warn('AI features are disabled. Set OPENAI_API_KEY to enable.');
		return descriptions.map((original) => ({ original, parsed: null }));
	}

	// Filter out empty descriptions if requested
	const toProcess = skipEmpty
		? descriptions.filter((d) => d && d.trim().length > 0)
		: descriptions;

	// Process in batches to respect rate limits
	const results: ParseResult[] = [];

	for (let i = 0; i < toProcess.length; i += concurrency) {
		const batch = toProcess.slice(i, i + concurrency);

		const batchResults = await Promise.all(
			batch.map(async (description): Promise<ParseResult> => {
				try {
					const parsed = await parseTransactionDescription(description);
					return { original: description, parsed };
				} catch (error) {
					return {
						original: description,
						parsed: null,
						error: error instanceof Error ? error.message : 'Unknown error'
					};
				}
			})
		);

		results.push(...batchResults);
	}

	return results;
}

/**
 * Simple cache for parsed transactions to reduce API calls.
 * Uses normalized description as key.
 */
const parseCache = new Map<string, ParsedTransaction>();

/**
 * Parse a transaction description with caching.
 * Useful for repeated descriptions during import.
 *
 * @param description - Raw bank transaction description
 * @returns Parsed transaction data or null
 */
export async function parseTransactionWithCache(
	description: string
): Promise<ParsedTransaction | null> {
	const normalizedKey = description.trim().toUpperCase();

	// Check cache first
	const cached = parseCache.get(normalizedKey);
	if (cached) {
		return cached;
	}

	// Parse and cache result
	const parsed = await parseTransactionDescription(description);
	if (parsed) {
		parseCache.set(normalizedKey, parsed);
	}

	return parsed;
}

/**
 * Clear the parse cache.
 * Call this periodically or when memory is a concern.
 */
export function clearParseCache(): void {
	parseCache.clear();
}

/**
 * Get the current cache size.
 */
export function getParseCacheSize(): number {
	return parseCache.size;
}
