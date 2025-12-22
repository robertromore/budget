/**
 * Web Search Types
 * Types for the web search service that fetches business contact information
 */

export type WebSearchProvider = "duckduckgo" | "brave" | "ollama";

export interface SearchResult {
	title: string;
	url: string;
	snippet: string;
}

export interface SearchAdapter {
	search(query: string): Promise<SearchResult[]>;
}

export interface ContactEnrichmentResult {
	website: string | null;
	phone: string | null;
	email: string | null;
	address: string | null;
}

export interface CachedSearchResult {
	results: SearchResult[];
	timestamp: number;
}

export interface SearchAdapterConfig {
	braveApiKey?: string;
	ollamaApiKey?: string;
}
