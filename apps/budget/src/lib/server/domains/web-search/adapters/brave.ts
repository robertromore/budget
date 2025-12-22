/**
 * Brave Search API Adapter
 * Uses Brave's Web Search API (requires API key, 2000 free searches/month)
 * https://brave.com/search/api/
 */

import type { SearchAdapter, SearchResult } from "../types";

interface BraveWebResult {
	title: string;
	url: string;
	description: string;
}

interface BraveSearchResponse {
	web?: {
		results?: BraveWebResult[];
	};
}

export class BraveSearchAdapter implements SearchAdapter {
	private readonly baseUrl = "https://api.search.brave.com/res/v1/web/search";

	constructor(private apiKey: string) {
		if (!apiKey) {
			throw new Error("Brave Search API key is required");
		}
	}

	async search(query: string): Promise<SearchResult[]> {
		const params = new URLSearchParams({
			q: query,
			count: "10",
			text_decorations: "false",
			search_lang: "en",
		});

		const response = await fetch(`${this.baseUrl}?${params}`, {
			method: "GET",
			headers: {
				Accept: "application/json",
				"Accept-Encoding": "gzip",
				"X-Subscription-Token": this.apiKey,
			},
		});

		if (!response.ok) {
			if (response.status === 401) {
				throw new Error("Invalid Brave Search API key");
			}
			if (response.status === 429) {
				throw new Error("Brave Search API rate limit exceeded");
			}
			throw new Error(`Brave Search failed: ${response.status}`);
		}

		const data: BraveSearchResponse = await response.json();

		if (!data.web?.results) {
			return [];
		}

		return data.web.results.map((result) => ({
			title: result.title,
			url: result.url,
			snippet: result.description,
		}));
	}
}
