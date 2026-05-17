/**
 * AI Chat tRPC Routes
 *
 * Provides endpoints for the AI chat assistant feature.
 * Supports tool calling for read/write operations on user data.
 */

import { aiConversations, aiConversationMessages } from "$core/schema/ai-conversations";
import { aiLlmCalls } from "$core/schema/ai-llm-calls";
import { aiToolCalls } from "$core/schema/ai-tool-calls";
import { predictionFeedback } from "$core/schema/prediction-feedback";
import { DEFAULT_LLM_PREFERENCES, workspaces } from "$core/schema/workspaces";
import { fetchFinancialContext } from "$core/server/ai/financial-context";
import { buildContextualPrompt, QUICK_SUGGESTIONS } from "$core/server/ai/prompts/chat-assistant";
import { getActiveProvider, type ProviderInstance } from "$core/server/ai/providers";
import { createAITools } from "$core/server/ai/tools";
import { AIToolCallCollector, recordLLMCall } from "$core/server/ai/telemetry";
import { db } from "$core/server/db";
import { formatCurrency } from "$core/utils/formatters-core";
import { publicProcedure, t } from "$core/trpc";
import { translateDomainError } from "$core/trpc/shared/errors";
import { nowISOString } from "$core/utils/dates-core";
import { parseSlashCommand, formatCommandResult, SLASH_COMMANDS } from "$core/server/ai/commands";
import { TRPCError } from "@trpc/server";
import { generateText, stepCountIs } from "ai";
import { and, asc, desc, eq, isNull, lt, sql } from "drizzle-orm";
import { z } from "zod/v4";

// Input schemas
const chatContextSchema = z
  .object({
    page: z.string(),
    entityType: z.enum(["account", "payee", "transaction", "category", "budget"]).optional(),
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
        const transactions =
          (res.transactions as Array<{
            date: string;
            payeeName: string;
            amount: number;
            categoryName?: string;
          }>) || [];
        if (transactions.length === 0) {
          responses.push("I didn't find any transactions matching your criteria.");
        } else {
          const total = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
          const spending = transactions.filter((t) => t.amount < 0);
          const spendingTotal = spending.reduce((sum, t) => sum + Math.abs(t.amount), 0);

          responses.push(
            `I found **${transactions.length} transactions** totaling **${formatCurrency(spendingTotal)}** in spending.`
          );

          if (transactions.length <= 10) {
            responses.push(
              "\n| Date | Payee | Amount | Category |\n|------|-------|--------|----------|"
            );
            for (const t of transactions) {
              responses.push(
                `| ${t.date} | ${t.payeeName || "Unknown"} | ${formatCurrency(t.amount)} | ${t.categoryName || "Uncategorized"} |`
              );
            }
          }
        }
        break;
      }

      case "getAccountBalance": {
        const accounts =
          (res.accounts as Array<{
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
        const categories =
          (res.categories as Array<{
            name: string;
            total: number;
            transactionCount: number;
          }>) || [];
        if (categories.length === 0) {
          responses.push("No spending found for the specified period.");
        } else {
          responses.push("### Spending by Category\n");
          for (const cat of categories.slice(0, 10)) {
            responses.push(
              `- **${cat.name}**: ${formatCurrency(Math.abs(cat.total))} (${cat.transactionCount} transactions)`
            );
          }
        }
        break;
      }

      case "getBudgetStatus": {
        const budgets =
          (res.budgets as Array<{
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
            responses.push(
              `- **${b.name}**: ${formatCurrency(b.spent)} / ${formatCurrency(b.allocated)} (${pct}% - ${status})`
            );
          }
        }
        break;
      }

      case "getPayeeSpending": {
        const payees =
          (res.payees as Array<{
            name: string;
            total: number;
            transactionCount: number;
          }>) || [];
        if (payees.length === 0) {
          responses.push("No spending found for that payee.");
        } else {
          for (const p of payees) {
            responses.push(
              `**${p.name}**: ${formatCurrency(Math.abs(p.total))} across ${p.transactionCount} transactions`
            );
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
  cleaned = cleaned.replace(
    /\{[\s\n]*"name"[\s\n]*:[\s\n]*"[^"]*"[\s\n]*,[\s\n]*"(parameters|arguments)"[\s\n]*:[\s\n]*\{[^}]*\}?\s*\}?/g,
    ""
  );

  // Remove incomplete JSON that starts with tool call pattern but gets cut off
  cleaned = cleaned.replace(
    /\{[\s\n]*"name"[\s\n]*:[\s\n]*"[^"]*"[\s\n]*,[\s\n]*"(parameters|arguments)"[\s\n]*:[\s\n]*\{[^}]*$/g,
    ""
  );

  // Remove common tool call text patterns that models output
  cleaned = cleaned.replace(/```(json|tool_call)?\s*\{[\s\S]*?"name"[\s\S]*?\}?\s*```/g, "");

  // Remove leading/trailing whitespace and normalize multiple newlines
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();

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
  tools?: ReturnType<typeof createAITools>,
  maxToolSteps = 5,
  workspaceId?: number
): Promise<{
  content: string;
  reasoning?: string;
  toolsUsed?: string[];
  toolResultsSummary?: string[];
}> {
  // Build messages array
  const messages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [
    ...history,
    { role: "user" as const, content: userMessage },
  ];

  // Use AI SDK with tool support. maxToolSteps comes from workspace
  // preferences so heavy users can bump it without code changes.
  const startedAt = Date.now();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let result: any;
  try {
    result = await generateText({
      model: provider.provider(provider.model),
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      tools,
      stopWhen: stepCountIs(maxToolSteps),
    });
  } catch (error) {
    if (workspaceId !== undefined) {
      void recordLLMCall({
        workspaceId,
        feature: "chat",
        provider: provider.providerType,
        model: provider.model,
        latencyMs: Date.now() - startedAt,
        success: false,
        errorCode: error instanceof Error ? error.name : "unknown",
      });
    }
    throw error;
  }
  if (workspaceId !== undefined) {
    void recordLLMCall({
      workspaceId,
      feature: "chat",
      provider: provider.providerType,
      model: provider.model,
      inputTokens: result.usage?.inputTokens ?? null,
      outputTokens: result.usage?.outputTokens ?? null,
      reasoningTokens: result.usage?.reasoningTokens ?? null,
      latencyMs: Date.now() - startedAt,
      success: true,
    });
  }

  // Collect tool usage info — per-call telemetry (latency, success,
  // input/output shape) lands in ai_tool_call via the wrapper installed
  // in createAITools.
  const toolsUsed: string[] = [];
  const toolResults: Array<{ toolName: string; result: unknown }> = [];

  for (const step of result.steps || []) {
    for (const toolResult of step.toolResults || []) {
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
      } else {
        // Per-conversation rolling rate limit. A single chat() invocation
        // can fan out through up to 5 tool-call steps (stopWhen above);
        // a hostile or runaway client could chain many such invocations
        // against the same conversation. Cap rolling 10-minute tool-call
        // count per conversation as defense in depth.
        const TOOL_CALL_WINDOW_MS = 10 * 60 * 1000;
        const TOOL_CALL_LIMIT = 100;
        const windowStart = new Date(Date.now() - TOOL_CALL_WINDOW_MS).toISOString();
        const [{ count } = { count: 0 }] = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(aiToolCalls)
          .where(
            and(
              eq(aiToolCalls.conversationId, conversationId),
              sql`${aiToolCalls.createdAt} >= ${windowStart}`
            )
          );
        if (Number(count) >= TOOL_CALL_LIMIT) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: `Conversation has used ${count} tool calls in the last 10 minutes. Wait a few minutes or start a new conversation.`,
          });
        }
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

      // Create tools for this workspace with telemetry wired up. The
      // collector buffers tool-call observations and we flush once at
      // the end of the request so the chat path takes only a single
      // bulk insert hit.
      const toolCallCollector = new AIToolCallCollector();
      const tools = createAITools(ctx.workspaceId, toolCallCollector);

      // Workspace-configurable tool-call ceiling. Falls back to the
      // historical default of 5 when unset.
      const maxToolSteps = Number(llm.chat?.maxToolSteps) || 5;

      // Generate response with tool support
      const response = await generateChatResponse(
        provider,
        systemPrompt,
        input.message,
        input.history,
        tools,
        maxToolSteps,
        ctx.workspaceId
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
          updatedAt: nowISOString(),
        })
        .where(eq(aiConversations.id, conversationId));

      // Flush telemetry after the user-facing response is finalized so a
      // telemetry write failure can't break the chat.
      await toolCallCollector.flush({ workspaceId: ctx.workspaceId, conversationId });

      return { ...response, conversationId };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      // Provide helpful error messages for common LLM failures
      const errMsg = error instanceof Error ? error.message : String(error);
      if (
        errMsg.includes("ECONNREFUSED") ||
        errMsg.includes("fetch failed") ||
        errMsg.includes("connect ETIMEDOUT")
      ) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Cannot connect to LLM provider. Please ensure your provider (e.g. Ollama) is running and accessible.`,
        });
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

      const toolCallCollector = new AIToolCallCollector();
      try {
        // Create tools for this workspace and get the tool
        const tools = createAITools(ctx.workspaceId, toolCallCollector);
        const toolFn = tools[command.tool as keyof typeof tools];

        if (!toolFn || typeof toolFn.execute !== "function") {
          return {
            isCommand: true as const,
            error: `Tool not found: ${command.tool}`,
          };
        }

        // Execute the tool with parsed arguments
        // Type assertion needed because tool.execute expects specific types but we're invoking dynamically
        const result = await (
          toolFn.execute as (
            args: Record<string, unknown>,
            options: { abortSignal: undefined }
          ) => Promise<unknown>
        )(parsed.parsedArgs ?? {}, { abortSignal: undefined });

        // Format the result for display
        const formatted = formatCommandResult(parsed.command, result);

        await toolCallCollector.flush({ workspaceId: ctx.workspaceId });

        return {
          isCommand: true as const,
          command: parsed.command,
          result: formatted,
          rawResult: result,
        };
      } catch (error) {
        await toolCallCollector.flush({ workspaceId: ctx.workspaceId });
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
        .set({ deletedAt: nowISOString() })
        .where(
          and(eq(aiConversations.id, input.id), eq(aiConversations.workspaceId, ctx.workspaceId))
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
        .set({ title: input.title, updatedAt: nowISOString() })
        .where(
          and(eq(aiConversations.id, input.id), eq(aiConversations.workspaceId, ctx.workspaceId))
        );

      return { success: true };
    }),

  // =========================================================================
  // Document Explanation
  // =========================================================================

  /**
   * Generate an AI explanation of a document's contents
   */
  explainDocument: publicProcedure
    .input(
      z.object({
        documentId: z.number().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
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

        // Fetch the document (workspace-scoped to prevent cross-tenant access)
        const { serviceFactory } = await import("$core/server/shared/container/service-factory");
        const documentService = serviceFactory.getAccountDocumentService();
        const document = await documentService.getDocument(input.documentId, ctx.workspaceId);

        if (!document) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Document not found",
          });
        }

        // Build prompt based on document content
        const documentInfo = [
          `Document: ${document.title || document.fileName}`,
          `Type: ${document.documentType || "Unknown"}`,
          `Tax Year: ${document.taxYear}`,
        ];

        if (document.description) {
          documentInfo.push(`Description: ${document.description}`);
        }

        let contentToAnalyze = "";
        if (document.extractedText) {
          contentToAnalyze = document.extractedText;
        } else if (document.extractedData) {
          contentToAnalyze = `Extracted data: ${document.extractedData}`;
        }

        if (!contentToAnalyze) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "This document has no extracted text content to analyze. Please ensure OCR has been run on this document.",
          });
        }

        const systemPrompt = `You are a helpful financial document analyst. Your task is to explain the contents of financial documents in clear, understandable terms.

When analyzing a document:
1. Summarize the key information (amounts, dates, parties involved)
2. Explain what the document type means and its purpose
3. Highlight any important tax implications or action items
4. Use simple language accessible to non-experts
5. If there are specific numbers or values, clearly explain what they represent

Keep your explanation concise but comprehensive. Format using markdown for readability.`;

        const userMessage = `Please explain the following document:

${documentInfo.join("\n")}

Document Content:
${contentToAnalyze.slice(0, 10000)}${contentToAnalyze.length > 10000 ? "\n\n[Content truncated...]" : ""}`;

        // Generate the explanation
        const result = await generateText({
          model: provider.provider(provider.model),
          system: systemPrompt,
          prompt: userMessage,
        });

        return {
          explanation: result.text,
          documentTitle: document.title || document.fileName,
          documentType: document.documentType,
          taxYear: document.taxYear,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        // Provide helpful error messages for common LLM failures
        const errMsg = error instanceof Error ? error.message : String(error);
        if (
          errMsg.includes("ECONNREFUSED") ||
          errMsg.includes("fetch failed") ||
          errMsg.includes("connect ETIMEDOUT")
        ) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Cannot connect to LLM provider. Please ensure your provider (e.g. Ollama) is running and accessible.`,
          });
        }

        throw translateDomainError(error);
      }
    }),

  /**
   * Recent tool-call activity for the AI assistant. Surfaces what the
   * chat actually did in the last `hours` window (default 24): which
   * tools fired, how long they took, what error rate they hit. Used
   * by the Intelligence > Activity settings page.
   */
  getRecentToolActivity: publicProcedure
    .input(
      z
        .object({
          hours: z.number().min(1).max(24 * 30).default(24),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const hours = input?.hours ?? 24;
      const sinceMs = Date.now() - hours * 60 * 60 * 1000;
      const since = new Date(sinceMs).toISOString();

      // Aggregate per tool — counts, average latency, error rate.
      const summary = await db
        .select({
          toolName: aiToolCalls.toolName,
          callCount: sql<number>`COUNT(*)`,
          successCount: sql<number>`SUM(CASE WHEN ${aiToolCalls.success} = 1 THEN 1 ELSE 0 END)`,
          avgLatencyMs: sql<number>`ROUND(AVG(${aiToolCalls.latencyMs}))`,
          p95LatencyMs: sql<number>`MAX(${aiToolCalls.latencyMs})`,
        })
        .from(aiToolCalls)
        .where(
          and(
            eq(aiToolCalls.workspaceId, ctx.workspaceId),
            sql`${aiToolCalls.createdAt} >= ${since}`
          )
        )
        .groupBy(aiToolCalls.toolName)
        .orderBy(desc(sql`COUNT(*)`));

      // Recent failures — drilldown for debugging without dumping the
      // full table to the client.
      const recentFailures = await db
        .select({
          id: aiToolCalls.id,
          toolName: aiToolCalls.toolName,
          latencyMs: aiToolCalls.latencyMs,
          errorCode: aiToolCalls.errorCode,
          createdAt: aiToolCalls.createdAt,
        })
        .from(aiToolCalls)
        .where(
          and(
            eq(aiToolCalls.workspaceId, ctx.workspaceId),
            sql`${aiToolCalls.success} = 0`,
            sql`${aiToolCalls.createdAt} >= ${since}`
          )
        )
        .orderBy(desc(aiToolCalls.createdAt))
        .limit(20);

      const totals = summary.reduce(
        (acc, row) => {
          acc.callCount += Number(row.callCount) || 0;
          acc.successCount += Number(row.successCount) || 0;
          return acc;
        },
        { callCount: 0, successCount: 0 }
      );

      return {
        windowHours: hours,
        totals: {
          calls: totals.callCount,
          successes: totals.successCount,
          failures: totals.callCount - totals.successCount,
        },
        byTool: summary.map((row) => ({
          toolName: row.toolName,
          callCount: Number(row.callCount) || 0,
          successCount: Number(row.successCount) || 0,
          failureCount: (Number(row.callCount) || 0) - (Number(row.successCount) || 0),
          avgLatencyMs: Number(row.avgLatencyMs) || 0,
          maxLatencyMs: Number(row.p95LatencyMs) || 0,
        })),
        recentFailures,
      };
    }),

  /**
   * Aggregate per-feature LLM call stats. Token counts come from the
   * AI SDK's usage object when the provider reports them (Ollama
   * often doesn't). Drives the "LLM usage" section on the Activity
   * page so users can see what each feature costs in tokens.
   */
  getRecentLLMCallStats: publicProcedure
    .input(
      z
        .object({
          hours: z.number().min(1).max(24 * 30).default(24),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const hours = input?.hours ?? 24;
      const sinceMs = Date.now() - hours * 60 * 60 * 1000;
      const since = new Date(sinceMs).toISOString();

      const rows = await db
        .select({
          feature: aiLlmCalls.feature,
          callCount: sql<number>`COUNT(*)`,
          successCount: sql<number>`SUM(CASE WHEN ${aiLlmCalls.success} = 1 THEN 1 ELSE 0 END)`,
          inputTokens: sql<number>`COALESCE(SUM(${aiLlmCalls.inputTokens}), 0)`,
          outputTokens: sql<number>`COALESCE(SUM(${aiLlmCalls.outputTokens}), 0)`,
          avgLatencyMs: sql<number>`ROUND(AVG(${aiLlmCalls.latencyMs}))`,
        })
        .from(aiLlmCalls)
        .where(
          and(
            eq(aiLlmCalls.workspaceId, ctx.workspaceId),
            sql`${aiLlmCalls.createdAt} >= ${since}`
          )
        )
        .groupBy(aiLlmCalls.feature)
        .orderBy(desc(sql`COUNT(*)`));

      const totals = rows.reduce(
        (acc, row) => {
          acc.callCount += Number(row.callCount) || 0;
          acc.successCount += Number(row.successCount) || 0;
          acc.inputTokens += Number(row.inputTokens) || 0;
          acc.outputTokens += Number(row.outputTokens) || 0;
          return acc;
        },
        { callCount: 0, successCount: 0, inputTokens: 0, outputTokens: 0 }
      );

      return {
        windowHours: hours,
        totals,
        byFeature: rows.map((row) => ({
          feature: row.feature,
          callCount: Number(row.callCount) || 0,
          successCount: Number(row.successCount) || 0,
          failureCount: (Number(row.callCount) || 0) - (Number(row.successCount) || 0),
          inputTokens: Number(row.inputTokens) || 0,
          outputTokens: Number(row.outputTokens) || 0,
          avgLatencyMs: Number(row.avgLatencyMs) || 0,
        })),
      };
    }),

  /**
   * Feedback signals from prediction_feedback. Surfaces what users
   * told us about anomalies, PDF extractions, etc. so the Activity
   * page can show acceptance / rejection / accuracy alongside the
   * tool-call timing data.
   */
  getRecentFeedbackStats: publicProcedure
    .input(
      z
        .object({
          hours: z.number().min(1).max(24 * 30).default(24),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const hours = input?.hours ?? 24;
      const sinceMs = Date.now() - hours * 60 * 60 * 1000;
      const since = new Date(sinceMs).toISOString();

      // Aggregate by predictionType + rating. SQLite CASE-WHEN keeps
      // this to one query instead of three.
      const rows = await db
        .select({
          predictionType: predictionFeedback.predictionType,
          total: sql<number>`COUNT(*)`,
          positive: sql<number>`SUM(CASE WHEN ${predictionFeedback.rating} = 'positive' THEN 1 ELSE 0 END)`,
          negative: sql<number>`SUM(CASE WHEN ${predictionFeedback.rating} = 'negative' THEN 1 ELSE 0 END)`,
          accurate: sql<number>`SUM(CASE WHEN ${predictionFeedback.wasAccurate} = 1 THEN 1 ELSE 0 END)`,
          accuracyJudged: sql<number>`SUM(CASE WHEN ${predictionFeedback.wasAccurate} IS NOT NULL THEN 1 ELSE 0 END)`,
          avgConfidence: sql<number>`AVG(${predictionFeedback.originalConfidence})`,
        })
        .from(predictionFeedback)
        .where(
          and(
            eq(predictionFeedback.workspaceId, ctx.workspaceId),
            sql`${predictionFeedback.createdAt} >= ${since}`
          )
        )
        .groupBy(predictionFeedback.predictionType)
        .orderBy(desc(sql`COUNT(*)`));

      return {
        windowHours: hours,
        byType: rows.map((row) => {
          const total = Number(row.total) || 0;
          const positive = Number(row.positive) || 0;
          const negative = Number(row.negative) || 0;
          const accurate = Number(row.accurate) || 0;
          const accuracyJudged = Number(row.accuracyJudged) || 0;
          return {
            predictionType: row.predictionType,
            total,
            positive,
            negative,
            // Accuracy is "wasAccurate=true" / "wasAccurate set" — so a
            // PDF row that wasn't edited counts as accurate, an edited
            // row counts as inaccurate, and rows without a wasAccurate
            // verdict (e.g. anomaly dismisses) are excluded from the
            // ratio.
            accuracyRate: accuracyJudged > 0 ? accurate / accuracyJudged : null,
            accuracyJudgedCount: accuracyJudged,
            avgConfidence:
              row.avgConfidence !== null ? Number(row.avgConfidence) : null,
          };
        }),
      };
    }),

  /**
   * Telemetry retention. ai_tool_call and prediction_feedback both
   * grow without bound otherwise. Retention defaults match what's
   * useful for debugging vs analytics:
   *   - ai_tool_call: 90 days (debugging horizon)
   *   - prediction_feedback: 365 days (long-term ML signal)
   *
   * Two modes:
   *   - Pass `force: true` to run immediately (manual cleanup
   *     button).
   *   - Pass nothing for an opportunistic check — only runs if the
   *     workspace's lastCleanupAt is older than 7 days, otherwise
   *     short-circuits.
   *
   * Returns the row counts deleted from each table so the caller
   * can show a toast or summary.
   */
  pruneTelemetry: publicProcedure
    .input(
      z
        .object({
          force: z.boolean().optional(),
          toolCallRetentionDays: z.number().min(7).max(365).optional(),
          feedbackRetentionDays: z.number().min(30).max(730).optional(),
        })
        .optional()
    )
    .mutation(async ({ ctx, input }) => {
      const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
      const force = input?.force ?? false;
      const toolCallRetentionDays = input?.toolCallRetentionDays ?? 90;
      const feedbackRetentionDays = input?.feedbackRetentionDays ?? 365;

      // Cooldown gate (skipped when force=true). Stored on workspace
      // preferences so concurrent requests can't double-fire and so
      // the cooldown survives server restarts.
      const [workspace] = await db
        .select({ preferences: workspaces.preferences })
        .from(workspaces)
        .where(eq(workspaces.id, ctx.workspaceId))
        .limit(1);
      const parsed = workspace?.preferences ? JSON.parse(workspace.preferences) : {};
      const lastAt: string | undefined = parsed?.aiTelemetry?.lastCleanupAt;

      if (!force && lastAt) {
        const elapsed = Date.now() - new Date(lastAt).getTime();
        if (elapsed < COOLDOWN_MS) {
          return {
            ran: false,
            reason: "cooldown" as const,
            toolCallsDeleted: 0,
            llmCallsDeleted: 0,
            feedbackDeleted: 0,
            nextEligibleAt: new Date(new Date(lastAt).getTime() + COOLDOWN_MS).toISOString(),
          };
        }
      }

      const toolCallCutoff = new Date(
        Date.now() - toolCallRetentionDays * 24 * 60 * 60 * 1000
      ).toISOString();
      const feedbackCutoff = new Date(
        Date.now() - feedbackRetentionDays * 24 * 60 * 60 * 1000
      ).toISOString();

      const toolCallsDeleted = await db
        .delete(aiToolCalls)
        .where(
          and(
            eq(aiToolCalls.workspaceId, ctx.workspaceId),
            lt(aiToolCalls.createdAt, toolCallCutoff)
          )
        )
        .returning({ id: aiToolCalls.id });

      // LLM-call rows share the tool-call retention horizon — both are
      // debugging observability and don't need to outlive the same
      // window.
      const llmCallsDeleted = await db
        .delete(aiLlmCalls)
        .where(
          and(
            eq(aiLlmCalls.workspaceId, ctx.workspaceId),
            lt(aiLlmCalls.createdAt, toolCallCutoff)
          )
        )
        .returning({ id: aiLlmCalls.id });

      const feedbackDeleted = await db
        .delete(predictionFeedback)
        .where(
          and(
            eq(predictionFeedback.workspaceId, ctx.workspaceId),
            lt(predictionFeedback.createdAt, feedbackCutoff)
          )
        )
        .returning({ id: predictionFeedback.id });

      // Persist the run time for the cooldown.
      const nowIso = new Date().toISOString();
      const nextPrefs = {
        ...parsed,
        aiTelemetry: { ...(parsed?.aiTelemetry ?? {}), lastCleanupAt: nowIso },
      };
      await db
        .update(workspaces)
        .set({ preferences: JSON.stringify(nextPrefs) })
        .where(eq(workspaces.id, ctx.workspaceId));

      return {
        ran: true,
        reason: (force ? "manual" : "scheduled") as "manual" | "scheduled",
        toolCallsDeleted: toolCallsDeleted.length,
        llmCallsDeleted: llmCallsDeleted.length,
        feedbackDeleted: feedbackDeleted.length,
        toolCallRetentionDays,
        feedbackRetentionDays,
      };
    }),
});
