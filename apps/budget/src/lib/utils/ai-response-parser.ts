/**
 * AI Response Parser
 *
 * Parses AI responses that contain structured JSON blocks within markdown.
 * Supports three block types:
 * - suggestions: Array of clickable suggestion buttons
 * - insight: Alert-style insight/notification
 * - action: Clickable action button with navigation
 */

export type SuggestionType = "info" | "warning" | "success";
export type InsightType = "info" | "warning" | "success" | "error";

export interface SuggestionItem {
	text: string;
	type?: SuggestionType;
}

export interface InsightBlock {
	type: InsightType;
	title: string;
	message: string;
}

export interface ActionBlock {
	label: string;
	target: string;
	icon?: string;
}

export type ResponsePart =
	| { type: "text"; content: string }
	| { type: "suggestions"; items: SuggestionItem[] }
	| { type: "insight"; data: InsightBlock }
	| { type: "action"; data: ActionBlock };

export interface ParsedResponse {
	parts: ResponsePart[];
	hasStructuredContent: boolean;
}

/**
 * Parse an AI response containing markdown and structured blocks
 */
export function parseAIResponse(content: string): ParsedResponse {
	const parts: ResponsePart[] = [];
	let hasStructuredContent = false;

	// Regex to match code blocks with our special languages
	const blockRegex = /```(suggestions|insight|action)\s*\n([\s\S]*?)```/g;

	let lastIndex = 0;
	let match;

	while ((match = blockRegex.exec(content)) !== null) {
		// Add any text before this block
		const textBefore = content.slice(lastIndex, match.index).trim();
		if (textBefore) {
			parts.push({ type: "text", content: textBefore });
		}

		const blockType = match[1] as "suggestions" | "insight" | "action";
		const jsonContent = match[2].trim();

		try {
			const parsed = JSON.parse(jsonContent);
			hasStructuredContent = true;

			switch (blockType) {
				case "suggestions":
					if (Array.isArray(parsed)) {
						parts.push({
							type: "suggestions",
							items: parsed.map((item) => ({
								text: typeof item === "string" ? item : item.text,
								type: (item.type as SuggestionType) ?? "info",
							})),
						});
					}
					break;

				case "insight":
					parts.push({
						type: "insight",
						data: {
							type: (parsed.type as InsightType) ?? "info",
							title: parsed.title ?? "Insight",
							message: parsed.message ?? "",
						},
					});
					break;

				case "action":
					parts.push({
						type: "action",
						data: {
							label: parsed.label ?? "Action",
							target: parsed.target ?? "/",
							icon: parsed.icon,
						},
					});
					break;
			}
		} catch (e) {
			// If JSON parsing fails, treat it as regular text
			console.warn(`Failed to parse ${blockType} block:`, e);
			parts.push({ type: "text", content: match[0] });
		}

		lastIndex = match.index + match[0].length;
	}

	// Add any remaining text after the last block
	const remainingText = content.slice(lastIndex).trim();
	if (remainingText) {
		parts.push({ type: "text", content: remainingText });
	}

	// If no parts were created, treat the entire content as text
	if (parts.length === 0 && content.trim()) {
		parts.push({ type: "text", content: content.trim() });
	}

	return { parts, hasStructuredContent };
}

/**
 * Extract plain text from a parsed response (useful for accessibility)
 */
export function extractPlainText(parsed: ParsedResponse): string {
	return parsed.parts
		.map((part) => {
			switch (part.type) {
				case "text":
					return part.content;
				case "suggestions":
					return part.items.map((s) => s.text).join(", ");
				case "insight":
					return `${part.data.title}: ${part.data.message}`;
				case "action":
					return part.data.label;
				default:
					return "";
			}
		})
		.filter(Boolean)
		.join("\n\n");
}
