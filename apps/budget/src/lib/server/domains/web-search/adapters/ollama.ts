/**
 * Ollama Web Search Adapter
 * Uses Ollama's cloud-based web search API
 * https://ollama.com/blog/web-search
 */

import type { SearchAdapter, SearchResult } from "../types";

interface OllamaWebSearchResult {
	title: string;
	url: string;
	content: string;
}

interface OllamaWebSearchResponse {
	results?: OllamaWebSearchResult[];
}

export class OllamaWebSearchAdapter implements SearchAdapter {
	private readonly baseUrl = "https://ollama.com/api/web_search";

	constructor(private apiKey: string) {
		if (!apiKey) {
			throw new Error("Ollama API key is required for web search");
		}
	}

	async search(query: string): Promise<SearchResult[]> {
		const response = await fetch(this.baseUrl, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ query }),
		});

		if (!response.ok) {
			if (response.status === 401) {
				throw new Error("Invalid Ollama API key");
			}
			if (response.status === 429) {
				throw new Error("Ollama web search rate limit exceeded");
			}
			throw new Error(`Ollama web search failed: ${response.status}`);
		}

		const data: OllamaWebSearchResponse = await response.json();

		if (!data.results) {
			return [];
		}

		return data.results.slice(0, 10).map((result) => ({
			title: result.title,
			url: result.url,
			snippet: result.content,
		}));
	}
}
