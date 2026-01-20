/**
 * Web Search Service
 * Orchestrates web search and LLM-based contact extraction
 */

import type {
  CachedSearchResult,
  ContactEnrichmentResult,
  SearchAdapter,
  SearchResult,
} from "./types";
import { normalize } from "$lib/utils/string-utilities";

// In-memory cache for search results (24-hour TTL)
const searchCache = new Map<string, CachedSearchResult>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export class WebSearchService {
	constructor(private adapter: SearchAdapter) {}

	/**
	 * Enrich business contact information using web search + LLM extraction
	 */
	async enrichBusinessContact(
		businessName: string,
		generateText: (prompt: string) => Promise<string>
	): Promise<ContactEnrichmentResult> {
		const cacheKey = `contact:${normalize(businessName)}`;

		// Check cache first
		const cached = searchCache.get(cacheKey);
		if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
			return this.extractWithLLM(businessName, cached.results, generateText);
		}

		// Search for business contact info
		const query = `${businessName} official website contact phone email address`;
		const results = await this.adapter.search(query);

		// Cache results
		searchCache.set(cacheKey, {
			results,
			timestamp: Date.now(),
		});

		return this.extractWithLLM(businessName, results, generateText);
	}

	/**
	 * Extract structured contact data from search results using LLM
	 */
	private async extractWithLLM(
		businessName: string,
		results: SearchResult[],
		generateText: (prompt: string) => Promise<string>
	): Promise<ContactEnrichmentResult> {
		if (results.length === 0) {
			return {
				website: null,
				phone: null,
				email: null,
				address: null,
			};
		}

		// Format search results for LLM
		const context = results
			.slice(0, 5) // Use top 5 results to keep context manageable
			.map((r, i) => `[${i + 1}] Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}`)
			.join("\n\n");

		const prompt = `Extract contact information for the business "${businessName}" from these search results.

Search Results:
${context}

Instructions:
1. Find the official website URL (the main company website, not social media or third-party sites)
2. Find the official phone number if mentioned
3. Find the official contact email if mentioned
4. Find the business address if mentioned

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{"website": "url or null", "phone": "phone or null", "email": "email or null", "address": "address or null"}

If you cannot find a field with high confidence, use null. Do not guess or make up information.`;

		try {
			const response = await generateText(prompt);

			// Extract JSON from response (handle markdown, conversational text, etc.)
			const jsonStr = this.extractJson(response);
			if (!jsonStr) {
				console.warn("No JSON found in LLM response:", response.substring(0, 200));
				return {
					website: null,
					phone: null,
					email: null,
					address: null,
				};
			}

			const parsed = JSON.parse(jsonStr);

			return {
				website: this.normalizeUrl(parsed.website),
				phone: this.normalizePhone(parsed.phone),
				email: this.normalizeEmail(parsed.email),
				address: this.normalizeAddress(parsed.address),
			};
		} catch (error) {
			console.error("Failed to parse LLM response:", error);
			return {
				website: null,
				phone: null,
				email: null,
				address: null,
			};
		}
	}

	/**
	 * Extract JSON from LLM response that may contain markdown or conversational text
	 */
	private extractJson(response: string): string | null {
		const trimmed = response.trim();

		// If response starts with {, try to use it directly
		if (trimmed.startsWith("{")) {
			// Find matching closing brace
			const lastBrace = trimmed.lastIndexOf("}");
			if (lastBrace !== -1) {
				return trimmed.substring(0, lastBrace + 1);
			}
		}

		// Handle markdown code blocks
		const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
		if (codeBlockMatch) {
			const inner = codeBlockMatch[1].trim();
			if (inner.startsWith("{")) {
				return inner;
			}
		}

		// Find JSON object anywhere in the response
		const jsonMatch = trimmed.match(/\{[\s\S]*"website"[\s\S]*"phone"[\s\S]*"email"[\s\S]*"address"[\s\S]*\}/);
		if (jsonMatch) {
			return jsonMatch[0];
		}

		// Last resort: find first { and last }
		const firstBrace = trimmed.indexOf("{");
		const lastBrace = trimmed.lastIndexOf("}");
		if (firstBrace !== -1 && lastBrace > firstBrace) {
			return trimmed.substring(firstBrace, lastBrace + 1);
		}

		return null;
	}

	private normalizeUrl(url: unknown): string | null {
		if (typeof url !== "string" || !url || url === "null") return null;
		const trimmed = url.trim();
		if (!trimmed) return null;
		// Add https:// if missing
		if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
			return `https://${trimmed}`;
		}
		return trimmed;
	}

	private normalizePhone(phone: unknown): string | null {
		if (typeof phone !== "string" || !phone || phone === "null") return null;
		const trimmed = phone.trim();
		if (!trimmed) return null;
		return trimmed;
	}

	private normalizeEmail(email: unknown): string | null {
		if (typeof email !== "string" || !email || email === "null") return null;
		const trimmed = email.trim().toLowerCase();
		if (!trimmed || !trimmed.includes("@")) return null;
		return trimmed;
	}

	private normalizeAddress(address: unknown): string | null {
		if (typeof address !== "string" || !address || address === "null") return null;
		const trimmed = address.trim();
		if (!trimmed) return null;
		return trimmed;
	}

	/**
	 * Clear the search cache (for testing or manual refresh)
	 */
	static clearCache(): void {
		searchCache.clear();
	}

	/**
	 * Clear a specific entry from the cache
	 */
	static clearCacheEntry(businessName: string): void {
		const cacheKey = `contact:${normalize(businessName)}`;
		searchCache.delete(cacheKey);
	}
}
