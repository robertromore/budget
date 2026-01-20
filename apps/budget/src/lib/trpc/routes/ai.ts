/**
 * AI Chat tRPC Routes
 *
 * Provides endpoints for the AI chat assistant feature.
 * Supports tool calling for read/write operations on user data.
 */

import { aiConversations, aiConversationMessages } from "$lib/schema/ai-conversations";
import { DEFAULT_LLM_PREFERENCES, workspaces } from "$lib/schema/workspaces";
import { fetchFinancialContext } from "$lib/server/ai/financial-context";
import { buildContextualPrompt, QUICK_SUGGESTIONS } from "$lib/server/ai/prompts/chat-assistant";
import { getActiveProvider, type ProviderInstance } from "$lib/server/ai/providers";
import { createAITools } from "$lib/server/ai/tools";
import { db } from "$lib/server/db";
import { formatCurrency } from "$lib/server/utils/formatters";
import { publicProcedure, t } from "$lib/trpc";
import { translateDomainError } from "$lib/trpc/shared/errors";
import { parseSlashCommand, formatCommandResult, SLASH_COMMANDS } from "$lib/server/ai/commands";
import { TRPCError } from "@trpc/server";
import { generateText } from "ai";
import { and, asc, desc, eq, isNull, lt, sql } from "drizzle-orm";
import { z } from "zod/v4";

// Input schemas
const chatContextSchema = z
	.object({
		page: z.string(),
		entityType: z
			.enum(["account", "payee", "transaction", "category", "budget"])
			.optional(),
		entityId: z.number().optional(),
		data: z.record(z.string(), z.unknown()).optional(),
	})
	.optional();

const chatMessageSchema = z.object({
	role: z.enum(["user", "assistant", "system"]),
	content: z.string(),
});

const chatInputSchema = z.object({
	message: z.string().min(1).max(4000),
	context: chatContextSchema,
	history: z.array(chatMessageSchema).optional(),
	conversationId: z.number().optional(), // Existing conversation to continue
});

/**
 * Generate a title from the first message (truncated to ~50 chars)
 */
function generateTitle(message: string): string {
	const cleaned = message.trim().replace(/\s+/g, " ");
	if (cleaned.length <= 50) return cleaned;
	// Find a good break point
	const truncated = cleaned.slice(0, 50);
	const lastSpace = truncated.lastIndexOf(" ");
	if (lastSpace > 30) {
		return truncated.slice(0, lastSpace) + "...";
	}
	return truncated + "...";
}

/**
 * Format a single tool result for display
 */
function formatToolResult(toolName: string, result: unknown): string {
	const res = result as {
		success?: boolean;
		message?: string;
		count?: number;
		transactions?: unknown[];
		accounts?: unknown[];
		categories?: unknown[];
		budgets?: unknown[];
		payees?: unknown[];
	};

	if (res.success === false) {
		return `${toolName}: ${res.message || "Operation failed"}`;
	}

	switch (toolName) {
		case "getRecentTransactions":
		case "searchTransactions":
			return `${toolName}: Found ${res.count ?? res.transactions?.length ?? 0} transaction(s)`;
		case "getAccountBalance":
			return `${toolName}: Retrieved ${res.accounts?.length ?? 1} account(s)`;
		case "getCategorySpending":
			return `${toolName}: Retrieved spending for ${res.categories?.length ?? 0} category(ies)`;
		case "getBudgetStatus":
			return `${toolName}: Retrieved ${res.budgets?.length ?? 0} budget(s)`;
		case "getPayeeSpending":
			return `${toolName}: Retrieved spending for ${res.payees?.length ?? 0} payee(s)`;
		case "listCategories":
			return `${toolName}: Found ${res.count ?? res.categories?.length ?? 0} category(ies)`;
		default:
			return `${toolName}: ${res.message || "Completed"}`;
	}
}

/**
 * Format tool results into a human-readable response when the model doesn't generate text.
 * This is a fallback for models that call tools but don't produce a final response.
 */
function formatToolResultsAsResponse(
	toolResults: Array<{ toolName: string; result: unknown }>
): string {
	const responses: string[] = [];

	for (const { toolName, result } of toolResults) {
		const res = result as Record<string, unknown>;

		if (res.success === false) {
			responses.push(`I couldn't complete that request: ${res.message || "Unknown error"}`);
			continue;
		}

		switch (toolName) {
			case "getRecentTransactions":
			case "searchTransactions": {
				const transactions = (res.transactions as Array<{
					date: string;
					payeeName: string;
					amount: number;
					categoryName?: string;
				}>) || [];
				if (transactions.length === 0) {
					responses.push("I didn't find any transactions matching your criteria.");
				} else {
					const total = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
					const spending = transactions.filter(t => t.amount < 0);
					const spendingTotal = spending.reduce((sum, t) => sum + Math.abs(t.amount), 0);

					responses.push(`I found **${transactions.length} transactions** totaling **${formatCurrency(spendingTotal)}** in spending.`);

					if (transactions.length <= 10) {
						responses.push("\n| Date | Payee | Amount | Category |\n|------|-------|--------|----------|");
						for (const t of transactions) {
							responses.push(`| ${t.date} | ${t.payeeName || "Unknown"} | ${formatCurrency(t.amount)} | ${t.categoryName || "Uncategorized"} |`);
						}
					}
				}
				break;
			}

			case "getAccountBalance": {
				const accounts = (res.accounts as Array<{
					name: string;
					balance: number;
					type: string;
				}>) || [];
				if (accounts.length === 0) {
					responses.push("I couldn't find that account.");
				} else {
					for (const acc of accounts) {
						responses.push(`**${acc.name}** (${acc.type}): **${formatCurrency(acc.balance)}**`);
					}
				}
				break;
			}

			case "getCategorySpending": {
				const categories = (res.categories as Array<{
					name: string;
					total: number;
					transactionCount: number;
				}>) || [];
				if (categories.length === 0) {
					responses.push("No spending found for the specified period.");
				} else {
					responses.push("### Spending by Category\n");
					for (const cat of categories.slice(0, 10)) {
						responses.push(`- **${cat.name}**: ${formatCurrency(Math.abs(cat.total))} (${cat.transactionCount} transactions)`);
					}
				}
				break;
			}

			case "getBudgetStatus": {
				const budgets = (res.budgets as Array<{
					name: string;
					allocated: number;
					spent: number;
					remaining: number;
				}>) || [];
				if (budgets.length === 0) {
					responses.push("No budgets found.");
				} else {
					responses.push("### Budget Status\n");
					for (const b of budgets) {
						const pct = b.allocated > 0 ? Math.round((b.spent / b.allocated) * 100) : 0;
						const status = pct > 100 ? "over budget" : pct > 80 ? "near limit" : "on track";
						responses.push(`- **${b.name}**: ${formatCurrency(b.spent)} / ${formatCurrency(b.allocated)} (${pct}% - ${status})`);
					}
				}
				break;
			}

			case "getPayeeSpending": {
				const payees = (res.payees as Array<{
					name: string;
					total: number;
					transactionCount: number;
				}>) || [];
				if (payees.length === 0) {
					responses.push("No spending found for that payee.");
				} else {
					for (const p of payees) {
						responses.push(`**${p.name}**: ${formatCurrency(Math.abs(p.total))} across ${p.transactionCount} transactions`);
					}
				}
				break;
			}

			default:
				if (res.message) {
					responses.push(String(res.message));
				}
		}
	}

	return responses.join("\n") || "I completed the request but couldn't generate a summary.";
}

/**
 * Clean up response text by removing raw tool call JSON that some models output as text.
 * Some local models (especially Ollama) sometimes output tool calls as text instead of
 * using the proper structured format.
 */
function cleanupResponseText(text: string): string {
	// Remove JSON-like tool call patterns that models sometimes output as text
	// Pattern: {"name": "toolName", "parameters": {...}} or similar variations
	let cleaned = text;

	// Remove tool call JSON blocks (complete or incomplete)
	cleaned = cleaned.replace(/\{[\s\n]*"name"[\s\n]*:[\s\n]*"[^"]*"[\s\n]*,[\s\n]*"(parameters|arguments)"[\s\n]*:[\s\n]*\{[^}]*\}?\s*\}?/g, '');

	// Remove incomplete JSON that starts with tool call pattern but gets cut off
	cleaned = cleaned.replace(/\{[\s\n]*"name"[\s\n]*:[\s\n]*"[^"]*"[\s\n]*,[\s\n]*"(parameters|arguments)"[\s\n]*:[\s\n]*\{[^}]*$/g, '');

	// Remove common tool call text patterns that models output
	cleaned = cleaned.replace(/```(json|tool_call)?\s*\{[\s\S]*?"name"[\s\S]*?\}?\s*```/g, '');

	// Remove leading/trailing whitespace and normalize multiple newlines
	cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

	return cleaned;
}

/**
 * Generate a response using the configured LLM provider with tool support
 */
async function generateChatResponse(
	provider: ProviderInstance,
	systemPrompt: string,
	userMessage: string,
	history: Array<{ role: "user" | "assistant" | "system"; content: string }> = [],
	tools?: ReturnType<typeof createAITools>
): Promise<{ content: string; reasoning?: string; toolsUsed?: string[]; toolResultsSummary?: string[] }> {
	// Build messages array
	const messages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [
		...history,
		{ role: "user" as const, content: userMessage },
	];

	console.log("[AI Chat] Using provider:", provider.providerType, "model:", provider.model);

	// Use AI SDK with tool support
	const result = await generateText({
		model: provider.provider(provider.model),
		system: systemPrompt,
		messages: messages.map((m) => ({
			role: m.role,
			content: m.content,
		})),
		tools,
		maxSteps: 5, // Allow up to 5 tool call steps per request
	});

	// Collect tool usage info
	const toolsUsed: string[] = [];
	const toolResults: Array<{ toolName: string; result: unknown }> = [];

	console.log("[AI Chat] Steps count:", result.steps?.length ?? 0);
	console.log("[AI Chat] Tool calls in response:", result.toolCalls?.length ?? 0);

	for (const step of result.steps || []) {
		console.log("[AI Chat] Step - toolCalls:", step.toolCalls?.length ?? 0, "toolResults:", step.toolResults?.length ?? 0);
		if (step.toolCalls?.length) {
			for (const tc of step.toolCalls) {
				console.log("[AI Chat] Tool call:", tc.toolName, "input:", JSON.stringify(tc.input));
			}
		}

		for (const toolResult of step.toolResults || []) {
			console.log("[AI Chat] Tool result:", toolResult.toolName, "output:", JSON.stringify(toolResult.output));
			toolsUsed.push(toolResult.toolName);
			toolResults.push({
				toolName: toolResult.toolName,
				result: toolResult.output,
			});
		}
	}

	// Clean up the response text (removes raw tool call JSON that some models output)
	let content = cleanupResponseText(result.text);

	// If the model called tools but didn't generate text, create a response from the tool results
	if (!content.trim() && toolResults.length > 0) {
		content = formatToolResultsAsResponse(toolResults);
	}

	// Format tool results for tooltip display
	const toolResultsSummary = toolResults.map((tr) => formatToolResult(tr.toolName, tr.result));

	return {
		content,
		reasoning: typeof result.reasoning === "string" ? result.reasoning : undefined,
		toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
		toolResultsSummary: toolResultsSummary.length > 0 ? toolResultsSummary : undefined,
	};
}

export const aiRoutes = t.router({
	/**
	 * Send a chat message and get a response
	 */
	chat: publicProcedure.input(chatInputSchema).mutation(async ({ ctx, input }) => {
		try {
			// Get workspace preferences
			const [workspace] = await db
				.select({ preferences: workspaces.preferences })
				.from(workspaces)
				.where(eq(workspaces.id, ctx.workspaceId))
				.limit(1);

			const parsed = workspace?.preferences ? JSON.parse(workspace.preferences) : {};
			const llm = parsed.llm ?? DEFAULT_LLM_PREFERENCES;

			if (!llm.enabled) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message:
						"AI features are not enabled. Please configure an LLM provider in Settings > Intelligence.",
				});
			}

			const provider = getActiveProvider(llm);

			if (!provider) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message:
						"No LLM provider is configured. Please set up a provider in Settings > Intelligence.",
				});
			}

			// Create or get conversation
			let conversationId = input.conversationId;

			if (!conversationId) {
				// Create new conversation
				const [newConversation] = await db
					.insert(aiConversations)
					.values({
						workspaceId: ctx.workspaceId,
						title: generateTitle(input.message),
						context: input.context ?? null,
						messageCount: 0,
					})
					.returning();
				conversationId = newConversation!.id;
			}

			// Save user message
			await db.insert(aiConversationMessages).values({
				conversationId,
				role: "user",
				content: input.message,
			});

			// Fetch comprehensive financial context for the AI
			const financialContext = await fetchFinancialContext(ctx.workspaceId);

			// Build context-aware system prompt with real financial data
			const systemPrompt = buildContextualPrompt(financialContext, input.context);

			// Create tools for this workspace
			const tools = createAITools(ctx.workspaceId);

			// Generate response with tool support
			const response = await generateChatResponse(
				provider,
				systemPrompt,
				input.message,
				input.history,
				tools
			);

			// Save assistant response
			await db.insert(aiConversationMessages).values({
				conversationId,
				role: "assistant",
				content: response.content,
				reasoning: response.reasoning,
				toolsUsed: response.toolsUsed,
			});

			// Update conversation message count
			await db
				.update(aiConversations)
				.set({
					messageCount: sql`${aiConversations.messageCount} + 2`,
					updatedAt: new Date().toISOString(),
				})
				.where(eq(aiConversations.id, conversationId));

			return { ...response, conversationId };
		} catch (error) {
			if (error instanceof TRPCError) {
				throw error;
			}
			throw translateDomainError(error);
		}
	}),

	/**
	 * Get quick suggestion prompts for the chat interface
	 */
	getSuggestions: publicProcedure.query(() => {
		return QUICK_SUGGESTIONS;
	}),

	/**
	 * Check if AI chat is available (LLM is configured)
	 */
	isAvailable: publicProcedure.query(async ({ ctx }) => {
		try {
			const [workspace] = await db
				.select({ preferences: workspaces.preferences })
				.from(workspaces)
				.where(eq(workspaces.id, ctx.workspaceId))
				.limit(1);

			const parsed = workspace?.preferences ? JSON.parse(workspace.preferences) : {};
			const llm = parsed.llm ?? DEFAULT_LLM_PREFERENCES;

			if (!llm.enabled) {
				return { available: false, reason: "AI features are disabled" };
			}

			const provider = getActiveProvider(llm);

			if (!provider) {
				return { available: false, reason: "No LLM provider configured" };
			}

			return { available: true, provider: provider.providerType };
		} catch {
			return { available: false, reason: "Failed to check configuration" };
		}
	}),

	/**
	 * Execute a slash command directly (bypasses LLM)
	 * Returns formatted markdown result or error message
	 */
	executeCommand: publicProcedure
		.input(z.object({ input: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const parsed = parseSlashCommand(input.input);

			// Not a slash command
			if (!parsed) {
				return { isCommand: false as const };
			}

			// Invalid command
			if (!parsed.isValid) {
				return {
					isCommand: true as const,
					error: parsed.error,
				};
			}

			// Handle special /help command
			if (parsed.command === "help") {
				const result = formatCommandResult("help", parsed.parsedArgs);
				return {
					isCommand: true as const,
					command: "help",
					result,
				};
			}

			// Get the command definition
			const command = SLASH_COMMANDS[parsed.command];
			if (!command || command.tool === "help") {
				return {
					isCommand: true as const,
					error: `Unknown command: /${parsed.command}`,
				};
			}

			try {
				// Create tools for this workspace and get the tool
				const tools = createAITools(ctx.workspaceId);
				const toolFn = tools[command.tool as keyof typeof tools];

				if (!toolFn || typeof toolFn.execute !== "function") {
					return {
						isCommand: true as const,
						error: `Tool not found: ${command.tool}`,
					};
				}

				// Execute the tool with parsed arguments
				// Type assertion needed because tool.execute expects specific types but we're invoking dynamically
				console.log(`[Slash Command] Executing /${parsed.command} with args:`, parsed.parsedArgs);
				const result = await (toolFn.execute as (args: Record<string, unknown>, options: { abortSignal: undefined }) => Promise<unknown>)(
					parsed.parsedArgs ?? {},
					{ abortSignal: undefined }
				);
				console.log(`[Slash Command] Result:`, JSON.stringify(result).slice(0, 200));

				// Format the result for display
				const formatted = formatCommandResult(parsed.command, result);

				return {
					isCommand: true as const,
					command: parsed.command,
					result: formatted,
					rawResult: result,
				};
			} catch (error) {
				console.error(`[Slash Command] Error executing /${parsed.command}:`, error);
				return {
					isCommand: true as const,
					error: `Failed to execute /${parsed.command}: ${error instanceof Error ? error.message : "Unknown error"}`,
				};
			}
		}),

	/**
	 * Get available slash commands (for autocomplete)
	 */
	getCommands: publicProcedure.query(() => {
		return Object.values(SLASH_COMMANDS).map((cmd) => ({
			name: cmd.name,
			description: cmd.description,
			usage: cmd.usage,
		}));
	}),

	// =========================================================================
	// Conversation Management
	// =========================================================================

	/**
	 * List conversations for the workspace
	 */
	listConversations: publicProcedure
		.input(
			z.object({
				limit: z.number().min(1).max(50).default(20),
				cursor: z.number().optional(), // For pagination
			})
		)
		.query(async ({ ctx, input }) => {
			const conversations = await db
				.select({
					id: aiConversations.id,
					title: aiConversations.title,
					summary: aiConversations.summary,
					messageCount: aiConversations.messageCount,
					updatedAt: aiConversations.updatedAt,
					context: aiConversations.context,
				})
				.from(aiConversations)
				.where(
					and(
						eq(aiConversations.workspaceId, ctx.workspaceId),
						isNull(aiConversations.deletedAt),
						input.cursor ? lt(aiConversations.id, input.cursor) : undefined
					)
				)
				.orderBy(desc(aiConversations.updatedAt))
				.limit(input.limit + 1);

			const hasMore = conversations.length > input.limit;
			const items = hasMore ? conversations.slice(0, -1) : conversations;

			return {
				items,
				nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
			};
		}),

	/**
	 * Get a conversation with its messages
	 */
	getConversation: publicProcedure
		.input(z.object({ id: z.number() }))
		.query(async ({ ctx, input }) => {
			const [conversation] = await db
				.select()
				.from(aiConversations)
				.where(
					and(
						eq(aiConversations.id, input.id),
						eq(aiConversations.workspaceId, ctx.workspaceId),
						isNull(aiConversations.deletedAt)
					)
				)
				.limit(1);

			if (!conversation) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
			}

			const messages = await db
				.select()
				.from(aiConversationMessages)
				.where(eq(aiConversationMessages.conversationId, input.id))
				.orderBy(asc(aiConversationMessages.createdAt));

			return { conversation, messages };
		}),

	/**
	 * Delete a conversation (soft delete)
	 */
	deleteConversation: publicProcedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ ctx, input }) => {
			await db
				.update(aiConversations)
				.set({ deletedAt: new Date().toISOString() })
				.where(
					and(
						eq(aiConversations.id, input.id),
						eq(aiConversations.workspaceId, ctx.workspaceId)
					)
				);

			return { success: true };
		}),

	/**
	 * Update conversation title
	 */
	updateConversationTitle: publicProcedure
		.input(
			z.object({
				id: z.number(),
				title: z.string().min(1).max(100),
			})
		)
		.mutation(async ({ ctx, input }) => {
			await db
				.update(aiConversations)
				.set({ title: input.title, updatedAt: new Date().toISOString() })
				.where(
					and(
						eq(aiConversations.id, input.id),
						eq(aiConversations.workspaceId, ctx.workspaceId)
					)
				);

			return { success: true };
		}),
});
