/**
 * DuckDuckGo HTML Scraper Adapter
 * Scrapes search results from DuckDuckGo's HTML endpoint (no API key required)
 */

import type { SearchAdapter, SearchResult } from "../types";

export class DuckDuckGoAdapter implements SearchAdapter {
	private readonly baseUrl = "https://html.duckduckgo.com/html/";
	private readonly userAgent =
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

	async search(query: string): Promise<SearchResult[]> {
		const url = `${this.baseUrl}?q=${encodeURIComponent(query)}`;

		const response = await fetch(url, {
			method: "POST",
			headers: {
				"User-Agent": this.userAgent,
				Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
				"Accept-Language": "en-US,en;q=0.5",
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: `q=${encodeURIComponent(query)}`,
		});

		if (!response.ok) {
			throw new Error(`DuckDuckGo search failed: ${response.status}`);
		}

		const html = await response.text();
		return this.parseSearchResults(html);
	}

	private parseSearchResults(html: string): SearchResult[] {
		const results: SearchResult[] = [];

		// Match result blocks - DuckDuckGo uses class="result" or class="web-result"
		// Each result contains: title in <a class="result__a">, snippet in <a class="result__snippet">
		// URL is in the href of the title link

		// Pattern for result links with titles
		const titleRegex =
			/<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*(?:<[^>]*>[^<]*)*)<\/a>/gi;

		// Pattern for snippets
		const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([^<]*(?:<[^>]*>[^<]*)*)<\/a>/gi;

		// Find all title matches first
		const titles: { url: string; title: string }[] = [];
		let titleMatch;
		while ((titleMatch = titleRegex.exec(html)) !== null) {
			const url = this.decodeRedirectUrl(titleMatch[1]);
			const title = this.stripHtml(titleMatch[2]);
			if (url && title && !url.includes("duckduckgo.com")) {
				titles.push({ url, title });
			}
		}

		// Find all snippets
		const snippets: string[] = [];
		let snippetMatch;
		while ((snippetMatch = snippetRegex.exec(html)) !== null) {
			snippets.push(this.stripHtml(snippetMatch[1]));
		}

		// Combine titles and snippets (they should be in order)
		for (let i = 0; i < Math.min(titles.length, 10); i++) {
			results.push({
				title: titles[i].title,
				url: titles[i].url,
				snippet: snippets[i] || "",
			});
		}

		return results;
	}

	private decodeRedirectUrl(href: string): string {
		// DuckDuckGo wraps URLs in a redirect, extract the actual URL
		// Format: //duckduckgo.com/l/?uddg=ENCODED_URL&rut=...
		if (href.includes("uddg=")) {
			const match = href.match(/uddg=([^&]*)/);
			if (match) {
				try {
					return decodeURIComponent(match[1]);
				} catch {
					return href;
				}
			}
		}
		// Handle direct URLs
		if (href.startsWith("//")) {
			return "https:" + href;
		}
		return href;
	}

	private stripHtml(text: string): string {
		return text
			.replace(/<[^>]*>/g, "") // Remove HTML tags
			.replace(/&amp;/g, "&")
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'")
			.replace(/&nbsp;/g, " ")
			.replace(/\s+/g, " ")
			.trim();
	}
}
