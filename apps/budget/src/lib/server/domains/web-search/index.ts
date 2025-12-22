/**
 * Web Search Domain
 * Provides web search capabilities for enriching business contact information
 */

export { BraveSearchAdapter } from "./adapters/brave";
export { DuckDuckGoAdapter } from "./adapters/duckduckgo";
export { OllamaWebSearchAdapter } from "./adapters/ollama";
export { WebSearchService } from "./service";
export * from "./types";

import { BraveSearchAdapter } from "./adapters/brave";
import { DuckDuckGoAdapter } from "./adapters/duckduckgo";
import { OllamaWebSearchAdapter } from "./adapters/ollama";
import type { SearchAdapter, SearchAdapterConfig, WebSearchProvider } from "./types";

/**
 * Factory function to create the appropriate search adapter based on provider
 */
export function createSearchAdapter(
	provider: WebSearchProvider,
	config: SearchAdapterConfig = {}
): SearchAdapter {
	switch (provider) {
		case "brave":
			if (!config.braveApiKey) {
				throw new Error("Brave Search API key is required");
			}
			return new BraveSearchAdapter(config.braveApiKey);

		case "ollama":
			if (!config.ollamaApiKey) {
				throw new Error("Ollama API key is required for web search");
			}
			return new OllamaWebSearchAdapter(config.ollamaApiKey);

		case "duckduckgo":
		default:
			return new DuckDuckGoAdapter();
	}
}
