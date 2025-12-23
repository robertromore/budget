/**
 * Fine-tuning Types and Schemas
 *
 * Defines the data format for training a specialized budget assistant model.
 * Supports both conversation format (for chat) and tool-calling format (for actions).
 */

/**
 * A single message in a conversation
 */
export interface TrainingMessage {
	role: "system" | "user" | "assistant";
	content: string;
}

/**
 * Tool call format for function-calling training
 */
export interface TrainingToolCall {
	name: string;
	arguments: Record<string, unknown>;
}

/**
 * Tool result format
 */
export interface TrainingToolResult {
	name: string;
	result: unknown;
}

/**
 * A training example with optional tool usage
 */
export interface TrainingExample {
	/** Unique identifier for this example */
	id: string;
	/** The conversation messages */
	messages: TrainingMessage[];
	/** Tool calls made by the assistant (if any) */
	toolCalls?: TrainingToolCall[];
	/** Results from tool calls (if any) */
	toolResults?: TrainingToolResult[];
	/** Category for filtering/analysis */
	category: TrainingCategory;
	/** Quality score (1-5) for filtering training data */
	quality?: number;
	/** Source of this example */
	source: "synthetic" | "real" | "augmented";
}

/**
 * Categories of training examples
 */
export type TrainingCategory =
	| "account_balance" // Asking about account balances
	| "spending_analysis" // Analyzing spending patterns
	| "budget_management" // Creating/managing budgets
	| "transaction_search" // Finding specific transactions
	| "payee_management" // Creating/managing payees
	| "category_suggestion" // Suggesting transaction categories
	| "financial_advice" // General financial advice
	| "forecasting" // Predicting future spending
	| "anomaly_detection" // Identifying unusual transactions
	| "general_chat"; // General conversation

/**
 * System prompt template for the budget assistant
 */
export const BUDGET_ASSISTANT_SYSTEM_PROMPT = `You are a helpful personal finance assistant integrated into a budget tracking application. Your role is to help users understand their finances, manage their budgets, and make informed financial decisions.

You have access to the user's financial data including:
- Account balances (checking, savings, credit cards, investments)
- Transaction history
- Budget allocations and spending
- Payees and merchants
- Categories

When asked about finances, use the available tools to fetch real data. Be specific with numbers and dates.
When giving advice, be practical and actionable. Avoid generic financial advice.
Always respect user privacy - never share or reference data from other users.

Available actions:
- Check account balances
- Search transactions by various criteria
- Get budget status and spending breakdowns
- Analyze spending by payee or category
- Create new budgets or payees
- Categorize transactions

Be concise but helpful. Use markdown formatting for clarity when presenting data.`;

/**
 * Training dataset metadata
 */
export interface TrainingDataset {
	/** Dataset version */
	version: string;
	/** When the dataset was created */
	createdAt: string;
	/** Number of examples */
	count: number;
	/** Category distribution */
	categories: Record<TrainingCategory, number>;
	/** Base model this is intended for */
	baseModel: string;
	/** Training examples */
	examples: TrainingExample[];
}

/**
 * Export formats supported
 */
export type ExportFormat =
	| "jsonl" // Standard JSONL for most fine-tuning
	| "alpaca" // Alpaca/Stanford format
	| "sharegpt" // ShareGPT format
	| "ollama"; // Ollama Modelfile format

/**
 * Convert training example to Alpaca format
 */
export function toAlpacaFormat(example: TrainingExample): {
	instruction: string;
	input: string;
	output: string;
} {
	const systemMsg = example.messages.find((m) => m.role === "system");
	const userMsg = example.messages.find((m) => m.role === "user");
	const assistantMsg = example.messages.find((m) => m.role === "assistant");

	return {
		instruction: systemMsg?.content || BUDGET_ASSISTANT_SYSTEM_PROMPT,
		input: userMsg?.content || "",
		output: assistantMsg?.content || "",
	};
}

/**
 * Convert training example to ShareGPT format
 */
export function toShareGPTFormat(example: TrainingExample): {
	conversations: Array<{ from: string; value: string }>;
} {
	return {
		conversations: example.messages.map((m) => ({
			from: m.role === "assistant" ? "gpt" : m.role === "user" ? "human" : "system",
			value: m.content,
		})),
	};
}

/**
 * Convert training example to JSONL chat format (OpenAI-compatible)
 */
export function toJSONLFormat(example: TrainingExample): {
	messages: Array<{ role: string; content: string }>;
} {
	return {
		messages: example.messages.map((m) => ({
			role: m.role,
			content: m.content,
		})),
	};
}
