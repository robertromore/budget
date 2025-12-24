/**
 * Markdown Renderer using marked library
 *
 * Converts markdown to HTML for help documentation.
 * Supports: headings, paragraphs, lists, code blocks, inline code,
 * bold, italic, links, tables, and more.
 */

import { marked } from "marked";

/**
 * Parse frontmatter from markdown content
 */
export interface MarkdownFrontmatter {
  title?: string;
  description?: string;
  related?: string[];
  navigateTo?: string;
  modalId?: string;
  parent?: string;
  type?: string;
}

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

  // Parse simple YAML-like frontmatter
  for (const line of frontmatterStr.split("\n")) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      const [, key, value] = match;
      if (key === "related") {
        // Parse array notation [item1, item2]
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
 * Process keyboard shortcut syntax [[key]]
 */
function processKeyboardShortcuts(html: string): string {
  return html.replace(
    /\[\[([^\]]+)\]\]/g,
    '<kbd class="bg-muted border-border rounded border px-1.5 py-0.5 font-mono text-xs">$1</kbd>'
  );
}

/**
 * Add Tailwind classes to HTML elements via post-processing
 */
function addTailwindClasses(html: string): string {
  return html
    // Headings
    .replace(/<h1>/g, '<h1 class="text-2xl font-bold tracking-tight">')
    .replace(/<h2>/g, '<h2 class="text-xl font-semibold tracking-tight mt-6 mb-3">')
    .replace(/<h3>/g, '<h3 class="text-lg font-semibold mt-4 mb-2">')
    .replace(/<h4>/g, '<h4 class="text-base font-semibold mt-3 mb-2">')
    .replace(/<h5>/g, '<h5 class="text-sm font-semibold mt-2 mb-1">')
    .replace(/<h6>/g, '<h6 class="text-sm font-medium mt-2 mb-1">')
    // Paragraphs
    .replace(/<p>/g, '<p class="text-muted-foreground mb-4 leading-relaxed">')
    // Lists
    .replace(/<ul>/g, '<ul class="list-disc list-inside space-y-1 mb-4 ml-4">')
    .replace(/<ol>/g, '<ol class="list-decimal list-inside space-y-1 mb-4 ml-4">')
    .replace(/<li>/g, '<li class="text-muted-foreground">')
    // Code blocks
    .replace(/<pre>/g, '<pre class="bg-muted rounded-md p-4 mb-4 overflow-x-auto">')
    .replace(/<code>/g, '<code class="font-mono text-sm">')
    // Inline code (not inside pre)
    .replace(/<code class="font-mono text-sm">(?![^<]*<\/pre>)/g, '<code class="bg-muted rounded px-1.5 py-0.5 font-mono text-sm">')
    // Links
    .replace(/<a href="/g, '<a class="text-primary underline underline-offset-4 hover:text-primary/80" target="_blank" rel="noopener noreferrer" href="')
    // Horizontal rules
    .replace(/<hr>/g, '<hr class="border-border my-6">')
    .replace(/<hr\/>/g, '<hr class="border-border my-6" />')
    // Tables
    .replace(/<table>/g, '<div class="overflow-x-auto mb-4"><table class="w-full border-collapse text-sm">')
    .replace(/<\/table>/g, '</table></div>')
    .replace(/<thead>/g, '<thead class="bg-muted/50">')
    .replace(/<tr>/g, '<tr class="border-b border-border">')
    .replace(/<th>/g, '<th class="px-3 py-2 text-left font-medium text-foreground">')
    .replace(/<td>/g, '<td class="px-3 py-2 text-muted-foreground">')
    // Blockquotes
    .replace(/<blockquote>/g, '<blockquote class="border-l-4 border-primary/30 pl-4 italic text-muted-foreground mb-4">');
}

/**
 * Render markdown content to HTML
 */
export function renderMarkdown(content: string): {
  html: string;
  frontmatter: MarkdownFrontmatter;
} {
  const { frontmatter, body } = parseFrontmatter(content);
  let html = marked.parse(body) as string;
  html = addTailwindClasses(html);
  html = processKeyboardShortcuts(html);
  return { html, frontmatter };
}

/**
 * Simple markdown to HTML conversion (without frontmatter parsing)
 */
export function markdownToHtml(content: string): string {
  let html = marked.parse(content) as string;
  html = addTailwindClasses(html);
  html = processKeyboardShortcuts(html);
  return html;
}
