/**
 * Help Content Search
 *
 * Full-text search for help documentation using Fuse.js.
 * Searches titles, descriptions, and full content with highlighting.
 */

import Fuse from "fuse.js";
import type { MarkdownFrontmatter } from "$lib/utils/markdown-renderer";

// =============================================================================
// Types
// =============================================================================

export interface HelpSearchDocument {
  id: string;
  title: string;
  description: string;
  content: string; // Plain text content (markdown stripped)
  related: string[];
}

export interface HelpSearchResult {
  id: string;
  title: string;
  description: string;
  snippet: string; // Highlighted content preview
  score: number;
}

// =============================================================================
// Frontmatter Parsing (simplified from markdown-renderer)
// =============================================================================

function parseFrontmatter(content: string): {
  frontmatter: MarkdownFrontmatter;
  body: string;
} {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!frontmatterMatch) {
    return { frontmatter: {}, body: content };
  }

  const frontmatterStr = frontmatterMatch[1];
  const body = frontmatterMatch[2];

  const frontmatter: MarkdownFrontmatter = {};

  for (const line of frontmatterStr.split("\n")) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      const [, key, value] = match;
      if (key === "related") {
        const arrayMatch = value.match(/^\[([^\]]*)\]$/);
        if (arrayMatch) {
          frontmatter.related = arrayMatch[1].split(",").map((s) => s.trim());
        }
      } else if (
        key === "title" ||
        key === "description" ||
        key === "navigateTo" ||
        key === "modalId" ||
        key === "parent" ||
        key === "type"
      ) {
        frontmatter[key] = value;
      }
    }
  }

  return { frontmatter, body };
}

/**
 * Strip markdown formatting to get plain text
 */
function stripMarkdown(markdown: string): string {
  let text = markdown;

  // Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, "");

  // Remove headings markers
  text = text.replace(/^#{1,6}\s+/gm, "");

  // Remove bold/italic markers
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");
  text = text.replace(/\*([^*]+)\*/g, "$1");
  text = text.replace(/_([^_]+)_/g, "$1");

  // Remove inline code
  text = text.replace(/`([^`]+)`/g, "$1");

  // Remove links but keep text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Remove keyboard shortcuts markup
  text = text.replace(/\[\[([^\]]+)\]\]/g, "$1");

  // Remove list markers
  text = text.replace(/^[-*+]\s+/gm, "");
  text = text.replace(/^\d+\.\s+/gm, "");

  // Remove horizontal rules
  text = text.replace(/^(-{3,}|\*{3,}|_{3,})$/gm, "");

  // Normalize whitespace
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

// =============================================================================
// Search Index
// =============================================================================

let searchIndex: Fuse<HelpSearchDocument> | null = null;
let documents: HelpSearchDocument[] = [];

/**
 * Build the search index from raw help content
 */
export function buildSearchIndex(
  helpContent: Record<string, string>
): Fuse<HelpSearchDocument> {
  documents = Object.entries(helpContent).map(([id, rawContent]) => {
    const { frontmatter, body } = parseFrontmatter(rawContent);
    const plainContent = stripMarkdown(body);

    return {
      id,
      title: frontmatter.title ?? id.replace(/-/g, " "),
      description: frontmatter.description ?? "",
      content: plainContent,
      related: frontmatter.related ?? [],
    };
  });

  searchIndex = new Fuse(documents, {
    keys: [
      { name: "title", weight: 3 },
      { name: "description", weight: 2 },
      { name: "content", weight: 1 },
    ],
    threshold: 0.4,
    includeScore: true,
    includeMatches: true,
    minMatchCharLength: 2,
    ignoreLocation: true,
    findAllMatches: true,
  });

  return searchIndex;
}

/**
 * Get or create the search index
 */
export function getSearchIndex(
  helpContent: Record<string, string>
): Fuse<HelpSearchDocument> {
  if (!searchIndex) {
    return buildSearchIndex(helpContent);
  }
  return searchIndex;
}

// =============================================================================
// Highlighting
// =============================================================================

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Highlight matching terms in text
 */
export function highlightMatches(text: string, query: string): string {
  if (!query.trim()) return text;

  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 2);

  let result = text;

  for (const term of terms) {
    const regex = new RegExp(`(${escapeRegex(term)})`, "gi");
    result = result.replace(regex, "<mark>$1</mark>");
  }

  return result;
}

/**
 * Get a content snippet around the first match
 */
export function getSnippet(
  content: string,
  query: string,
  maxLength = 150
): string {
  if (!content) return "";

  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 2);

  if (terms.length === 0) {
    // No valid terms, return start of content
    return content.length > maxLength
      ? content.slice(0, maxLength) + "…"
      : content;
  }

  // Find the first matching term position
  const lowerContent = content.toLowerCase();
  let firstMatchPos = -1;

  for (const term of terms) {
    const pos = lowerContent.indexOf(term);
    if (pos !== -1 && (firstMatchPos === -1 || pos < firstMatchPos)) {
      firstMatchPos = pos;
    }
  }

  if (firstMatchPos === -1) {
    // No match found, return start of content
    return content.length > maxLength
      ? content.slice(0, maxLength) + "…"
      : content;
  }

  // Extract context around the match
  const contextBefore = 40;
  const start = Math.max(0, firstMatchPos - contextBefore);
  const end = Math.min(content.length, start + maxLength);

  let snippet = content.slice(start, end);

  // Add ellipsis if truncated
  if (start > 0) {
    snippet = "…" + snippet;
  }
  if (end < content.length) {
    snippet = snippet + "…";
  }

  // Apply highlighting
  return highlightMatches(snippet, query);
}

// =============================================================================
// Search Function
// =============================================================================

/**
 * Search help documentation
 */
export function searchHelp(
  query: string,
  helpContent: Record<string, string>,
  limit = 10
): HelpSearchResult[] {
  if (!query.trim()) return [];

  const index = getSearchIndex(helpContent);
  const results = index.search(query, { limit });

  return results.map((result) => ({
    id: result.item.id,
    title: result.item.title,
    description: result.item.description,
    snippet: getSnippet(result.item.content, query),
    score: result.score ?? 1,
  }));
}

/**
 * Get all help documents for browsing (no search query)
 */
export function getAllHelpDocuments(
  helpContent: Record<string, string>
): HelpSearchDocument[] {
  // Ensure documents are built
  if (documents.length === 0) {
    buildSearchIndex(helpContent);
  }
  return documents;
}
