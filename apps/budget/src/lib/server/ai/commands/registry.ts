/**
 * Slash Command Registry
 *
 * Defines all available slash commands that users can type in the chat
 * to directly invoke AI tools without going through the LLM.
 */

import type { AIToolName } from "../tools";

export interface SlashCommand {
	name: string;
	description: string;
	usage: string;
	examples: string[];
	tool: AIToolName | "help"; // Maps to AI_TOOL_NAMES or special commands
	parseArgs: (args: string) => Record<string, unknown>;
}

/**
 * All available slash commands
 */
export const SLASH_COMMANDS: Record<string, SlashCommand> = {
	// ============================================
	// READ-ONLY COMMANDS
	// ============================================

	balance: {
		name: "balance",
		description: "Get account balance",
		usage: "/balance [account-name]",
		examples: ["/balance", "/balance checking", "/balance savings"],
		tool: "getAccountBalance",
		parseArgs: (args) => {
			const trimmed = args.trim();
			return trimmed ? { accountName: trimmed } : {};
		},
	},

	transactions: {
		name: "transactions",
		description: "Show recent transactions",
		usage: "/transactions [count]",
		examples: ["/transactions", "/transactions 10", "/transactions 25"],
		tool: "getRecentTransactions",
		parseArgs: (args) => {
			const count = parseInt(args.trim(), 10);
			return isNaN(count) ? {} : { limit: count };
		},
	},

	search: {
		name: "search",
		description: "Search transactions",
		usage: "/search <query> [options]",
		examples: ["/search amazon", "/search groceries", "/search netflix"],
		tool: "searchTransactions",
		parseArgs: (args) => {
			const trimmed = args.trim();
			if (!trimmed) return {};

			// Simple parsing: if it looks like a number range, treat as amount filter
			const amountMatch = trimmed.match(/^(\d+)-(\d+)$/);
			if (amountMatch) {
				return {
					minAmount: parseInt(amountMatch[1]!, 10),
					maxAmount: parseInt(amountMatch[2]!, 10),
				};
			}

			// Check if it looks like a category or payee by context
			// For simplicity, we'll search payee name
			return { payeeName: trimmed };
		},
	},

	budget: {
		name: "budget",
		description: "Check budget status",
		usage: "/budget [name]",
		examples: ["/budget", "/budget groceries", "/budget entertainment"],
		tool: "getBudgetStatus",
		parseArgs: (args) => {
			const trimmed = args.trim();
			return trimmed ? { budgetName: trimmed } : {};
		},
	},

	spending: {
		name: "spending",
		description: "Get payee spending summary",
		usage: "/spending <payee>",
		examples: ["/spending netflix", "/spending amazon", "/spending whole foods"],
		tool: "getPayeeSpending",
		parseArgs: (args) => {
			const trimmed = args.trim();
			return trimmed ? { payeeName: trimmed } : {};
		},
	},

	category: {
		name: "category",
		description: "Get category spending breakdown",
		usage: "/category [name]",
		examples: ["/category", "/category dining", "/category utilities"],
		tool: "getCategorySpending",
		parseArgs: () => {
			// getCategorySpending doesn't take a category name, just date range
			// Return empty to get all categories
			return {};
		},
	},

	categories: {
		name: "categories",
		description: "List available categories",
		usage: "/categories [search]",
		examples: ["/categories", "/categories food", "/categories bills"],
		tool: "listCategories",
		parseArgs: (args) => {
			const trimmed = args.trim();
			return trimmed ? { search: trimmed } : {};
		},
	},

	// ============================================
	// ML-POWERED COMMANDS
	// ============================================

	savings: {
		name: "savings",
		description: "Find savings opportunities",
		usage: "/savings [type]",
		examples: ["/savings", "/savings unused_subscription", "/savings price_increase"],
		tool: "findSavingsOpportunities",
		parseArgs: (args) => {
			const trimmed = args.trim().toLowerCase();
			const validTypes = ["unused_subscription", "price_increase", "duplicate_service", "negotiation_candidate"];
			if (validTypes.includes(trimmed)) {
				return { type: trimmed };
			}
			return { type: "all" };
		},
	},

	recurring: {
		name: "recurring",
		description: "List recurring bills and subscriptions",
		usage: "/recurring [frequency]",
		examples: ["/recurring", "/recurring monthly", "/recurring yearly"],
		tool: "detectRecurringPatterns",
		parseArgs: (args) => {
			const trimmed = args.trim().toLowerCase();
			const validFrequencies = ["daily", "weekly", "biweekly", "monthly", "quarterly", "yearly"];
			if (validFrequencies.includes(trimmed)) {
				return { frequency: trimmed };
			}
			return { frequency: "all" };
		},
	},

	forecast: {
		name: "forecast",
		description: "Predict future cash flow",
		usage: "/forecast [months]",
		examples: ["/forecast", "/forecast 3", "/forecast 6"],
		tool: "predictCashFlow",
		parseArgs: (args) => {
			const months = parseInt(args.trim(), 10);
			return {
				granularity: "monthly",
				horizon: isNaN(months) ? 3 : months,
			};
		},
	},

	anomalies: {
		name: "anomalies",
		description: "Check for unusual transactions",
		usage: "/anomalies [days]",
		examples: ["/anomalies", "/anomalies 7", "/anomalies 30"],
		tool: "checkForAnomalies",
		parseArgs: (args) => {
			const days = parseInt(args.trim(), 10);
			return {
				days: isNaN(days) ? 7 : Math.min(days, 30),
				minRiskLevel: "medium",
			};
		},
	},

	// ============================================
	// SPECIAL COMMANDS
	// ============================================

	help: {
		name: "help",
		description: "List all available commands",
		usage: "/help [command]",
		examples: ["/help", "/help balance", "/help forecast"],
		tool: "help",
		parseArgs: (args) => ({ command: args.trim() || undefined }),
	},
};

/**
 * Get command names for autocomplete
 */
export const COMMAND_NAMES = Object.keys(SLASH_COMMANDS);

/**
 * Check if a string is a valid command name
 */
export function isValidCommand(name: string): boolean {
	return name.toLowerCase() in SLASH_COMMANDS;
}

/**
 * Get a command by name
 */
export function getCommand(name: string): SlashCommand | undefined {
	return SLASH_COMMANDS[name.toLowerCase()];
}
