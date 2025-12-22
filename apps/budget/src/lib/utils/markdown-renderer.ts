/**
 * Simple Markdown Renderer
 *
 * Converts basic markdown to HTML for help documentation.
 * Supports: headings, paragraphs, lists, code blocks, inline code,
 * bold, italic, and links.
 */

type MarkdownToken =
  | { type: "heading"; level: number; content: string }
  | { type: "paragraph"; content: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "code-block"; language: string; content: string }
  | { type: "hr" };

/**
 * Parse markdown content into tokens
 */
function tokenize(markdown: string): MarkdownToken[] {
  const lines = markdown.split("\n");
  const tokens: MarkdownToken[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      tokens.push({ type: "hr" });
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      tokens.push({
        type: "heading",
        level: headingMatch[1].length,
        content: headingMatch[2],
      });
      i++;
      continue;
    }

    // Code blocks (fenced)
    if (line.startsWith("```")) {
      const language = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      tokens.push({
        type: "code-block",
        language,
        content: codeLines.join("\n"),
      });
      i++; // Skip closing ```
      continue;
    }

    // Unordered lists
    if (/^[-*+]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*+]\s/, ""));
        i++;
      }
      tokens.push({ type: "list", ordered: false, items });
      continue;
    }

    // Ordered lists
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      tokens.push({ type: "list", ordered: true, items });
      continue;
    }

    // Paragraph (collect consecutive non-empty lines)
    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith("```") &&
      !/^[-*+]\s/.test(lines[i]) &&
      !/^\d+\.\s/.test(lines[i]) &&
      !/^(-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim())
    ) {
      paragraphLines.push(lines[i]);
      i++;
    }
    if (paragraphLines.length > 0) {
      tokens.push({ type: "paragraph", content: paragraphLines.join(" ") });
    }
  }

  return tokens;
}

/**
 * Process inline markdown syntax
 */
function processInline(text: string): string {
  let result = text;

  // Escape HTML
  result = result
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Links [text](url)
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-primary underline underline-offset-4 hover:text-primary/80" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // Bold **text** or __text__
  result = result.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  result = result.replace(/__([^_]+)__/g, "<strong>$1</strong>");

  // Italic *text* or _text_
  result = result.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  result = result.replace(/(?<!\w)_([^_]+)_(?!\w)/g, "<em>$1</em>");

  // Inline code `text`
  result = result.replace(
    /`([^`]+)`/g,
    '<code class="bg-muted rounded px-1.5 py-0.5 font-mono text-sm">$1</code>'
  );

  // Keyboard shortcuts <kbd>
  result = result.replace(
    /\[\[([^\]]+)\]\]/g,
    '<kbd class="bg-muted border-border rounded border px-1.5 py-0.5 font-mono text-xs">$1</kbd>'
  );

  return result;
}

/**
 * Render tokens to HTML
 */
function renderTokens(tokens: MarkdownToken[]): string {
  return tokens
    .map((token) => {
      switch (token.type) {
        case "heading": {
          const classes = {
            1: "text-2xl font-bold tracking-tight",
            2: "text-xl font-semibold tracking-tight mt-6 mb-3",
            3: "text-lg font-semibold mt-4 mb-2",
            4: "text-base font-semibold mt-3 mb-2",
            5: "text-sm font-semibold mt-2 mb-1",
            6: "text-sm font-medium mt-2 mb-1",
          };
          const cls = classes[token.level as keyof typeof classes] || classes[4];
          return `<h${token.level} class="${cls}">${processInline(token.content)}</h${token.level}>`;
        }

        case "paragraph":
          return `<p class="text-muted-foreground mb-4 leading-relaxed">${processInline(token.content)}</p>`;

        case "list": {
          const tag = token.ordered ? "ol" : "ul";
          const listClass = token.ordered
            ? "list-decimal list-inside space-y-1 mb-4"
            : "list-disc list-inside space-y-1 mb-4";
          const items = token.items
            .map((item) => `<li class="text-muted-foreground">${processInline(item)}</li>`)
            .join("");
          return `<${tag} class="${listClass}">${items}</${tag}>`;
        }

        case "code-block": {
          const escapedContent = token.content
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
          return `<pre class="bg-muted rounded-md p-4 mb-4 overflow-x-auto"><code class="font-mono text-sm">${escapedContent}</code></pre>`;
        }

        case "hr":
          return '<hr class="border-border my-6" />';

        default:
          return "";
      }
    })
    .join("\n");
}

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
 * Render markdown content to HTML
 */
export function renderMarkdown(content: string): {
  html: string;
  frontmatter: MarkdownFrontmatter;
} {
  const { frontmatter, body } = parseFrontmatter(content);
  const tokens = tokenize(body);
  const html = renderTokens(tokens);
  return { html, frontmatter };
}

/**
 * Simple markdown to HTML conversion (without frontmatter parsing)
 */
export function markdownToHtml(content: string): string {
  const tokens = tokenize(content);
  return renderTokens(tokens);
}
