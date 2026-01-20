/**
 * Result Formatters
 *
 * Convert tool output into human-readable markdown for display in chat.
 */

import { SLASH_COMMANDS } from "./registry";
import { formatCurrency } from "$lib/server/utils/formatters";

type ToolResult = { success: true } | { success: false; message: string };

/**
 * Format a command result for display
 */
export function formatCommandResult(command: string, result: unknown): string {
	// Handle errors
	if (result && typeof result === "object" && "success" in result) {
		const typedResult = result as ToolResult;
		if (!typedResult.success && "message" in typedResult) {
			return `**Error**: ${typedResult.message}`;
		}
	}

	// Format based on command
	switch (command) {
		case "balance":
			return formatBalanceResult(result);
		case "transactions":
			return formatTransactionsResult(result);
		case "search":
			return formatTransactionsResult(result);
		case "budget":
			return formatBudgetResult(result);
		case "spending":
			return formatSpendingResult(result);
		case "category":
			return formatCategorySpendingResult(result);
		case "categories":
			return formatCategoriesResult(result);
		case "savings":
			return formatSavingsResult(result);
		case "recurring":
			return formatRecurringResult(result);
		case "forecast":
			return formatForecastResult(result);
		case "anomalies":
			return formatAnomaliesResult(result);
		case "help":
			return formatHelpResult(result);
		default:
			return formatGenericResult(result);
	}
}

// ============================================
// INDIVIDUAL FORMATTERS
// ============================================

interface AccountResult {
	id: number;
	name: string;
	type: string;
	balance: number;
	institution: string | null;
}

function formatBalanceResult(result: unknown): string {
	const data = result as { success: boolean; accounts?: AccountResult[] };
	if (!data.accounts || data.accounts.length === 0) {
		return "No accounts found.";
	}

	let output = "## Account Balances\n\n";

	for (const account of data.accounts) {
		const balanceFormatted = formatCurrency(account.balance);
		const balanceClass = account.balance >= 0 ? "" : " (negative)";
		output += `### ${account.name}\n`;
		output += `- **Balance**: ${balanceFormatted}${balanceClass}\n`;
		output += `- **Type**: ${account.type}\n`;
		if (account.institution) {
			output += `- **Institution**: ${account.institution}\n`;
		}
		output += "\n";
	}

	return output.trim();
}

interface TransactionResult {
	id: number;
	date: string;
	amount: number;
	notes: string | null;
	payee: string | null;
	category: string | null;
	account: string;
}

function formatTransactionsResult(result: unknown): string {
	const data = result as { success: boolean; count: number; transactions: TransactionResult[] };
	if (!data.transactions || data.transactions.length === 0) {
		return "No transactions found.";
	}

	let output = `## Recent Transactions (${data.count})\n\n`;
	output += "| Date | Payee | Amount | Category |\n";
	output += "|------|-------|--------|----------|\n";

	for (const txn of data.transactions.slice(0, 15)) {
		const date = txn.date;
		const payee = txn.payee || "Unknown";
		const amount = formatCurrency(txn.amount);
		const category = txn.category || "-";
		output += `| ${date} | ${payee} | ${amount} | ${category} |\n`;
	}

	if (data.transactions.length > 15) {
		output += `\n*...and ${data.transactions.length - 15} more*`;
	}

	return output;
}

interface BudgetResult {
	id: number;
	name: string;
	type: string;
	status: string;
	allocated: number;
	spent: number;
	remaining: number;
	percentUsed: number;
	period: { start: string; end: string } | null;
}

function formatBudgetResult(result: unknown): string {
	const data = result as { success: boolean; budgets?: BudgetResult[] };
	if (!data.budgets || data.budgets.length === 0) {
		return "No budgets found.";
	}

	let output = "## Budget Status\n\n";

	for (const budget of data.budgets) {
		const statusIcon = budget.percentUsed > 100 ? "🔴" : budget.percentUsed > 80 ? "🟡" : "🟢";
		output += `### ${statusIcon} ${budget.name}\n`;
		output += `- **Allocated**: ${formatCurrency(budget.allocated)}\n`;
		output += `- **Spent**: ${formatCurrency(budget.spent)} (${budget.percentUsed}%)\n`;
		output += `- **Remaining**: ${formatCurrency(budget.remaining)}\n`;
		if (budget.period) {
			output += `- **Period**: ${budget.period.start} to ${budget.period.end}\n`;
		}
		output += "\n";
	}

	return output.trim();
}

interface PayeeSpendingResult {
	name: string;
	totalSpent: number;
	transactionCount: number;
}

function formatSpendingResult(result: unknown): string {
	const data = result as { success: boolean; payees?: PayeeSpendingResult[] };
	if (!data.payees || data.payees.length === 0) {
		return "No spending found for that payee.";
	}

	let output = "## Payee Spending\n\n";
	output += "| Payee | Total Spent | Transactions |\n";
	output += "|-------|-------------|-------------|\n";

	for (const payee of data.payees) {
		output += `| ${payee.name} | ${formatCurrency(payee.totalSpent)} | ${payee.transactionCount} |\n`;
	}

	return output;
}

interface CategorySpendingResult {
	name: string;
	totalSpent: number;
	transactionCount: number;
	percentOfTotal: number;
}

function formatCategorySpendingResult(result: unknown): string {
	const data = result as { success: boolean; categories: CategorySpendingResult[]; totalSpending: number };
	if (!data.categories || data.categories.length === 0) {
		return "No category spending found.";
	}

	let output = `## Category Spending\n\n`;
	output += `**Total**: ${formatCurrency(data.totalSpending)}\n\n`;
	output += "| Category | Amount | % of Total |\n";
	output += "|----------|--------|------------|\n";

	for (const cat of data.categories) {
		output += `| ${cat.name} | ${formatCurrency(cat.totalSpent)} | ${cat.percentOfTotal}% |\n`;
	}

	return output;
}

interface CategoryListResult {
	id: number;
	name: string;
	type: string;
}

function formatCategoriesResult(result: unknown): string {
	const data = result as { success: boolean; count: number; categories: CategoryListResult[] };
	if (!data.categories || data.categories.length === 0) {
		return "No categories found.";
	}

	let output = `## Categories (${data.count})\n\n`;

	// Group by type
	const grouped = new Map<string, string[]>();
	for (const cat of data.categories) {
		const type = cat.type || "Other";
		if (!grouped.has(type)) {
			grouped.set(type, []);
		}
		grouped.get(type)!.push(cat.name);
	}

	for (const [type, names] of grouped) {
		output += `### ${type}\n`;
		output += names.map((n) => `- ${n}`).join("\n") + "\n\n";
	}

	return output.trim();
}

interface SavingsOpportunity {
	title: string;
	type: string;
	priority: string;
	estimatedMonthlySavings: number;
	estimatedAnnualSavings: number;
	description: string;
	payeeName?: string;
	suggestedActions: string[];
	confidence: number;
}

function formatSavingsResult(result: unknown): string {
	const data = result as {
		success: boolean;
		totalMonthlyPotential: number;
		totalAnnualPotential: number;
		count: number;
		opportunities: SavingsOpportunity[];
	};

	if (!data.opportunities || data.opportunities.length === 0) {
		return "No savings opportunities found. Your spending looks optimized!";
	}

	let output = `## Savings Opportunities\n\n`;
	output += `**Potential Monthly Savings**: ${formatCurrency(data.totalMonthlyPotential)}\n`;
	output += `**Potential Annual Savings**: ${formatCurrency(data.totalAnnualPotential)}\n\n`;

	for (const opp of data.opportunities) {
		const priorityIcon = opp.priority === "high" ? "🔴" : opp.priority === "medium" ? "🟡" : "🟢";
		output += `### ${priorityIcon} ${opp.title}\n`;
		output += `**Save**: ${formatCurrency(opp.estimatedMonthlySavings)}/month\n\n`;
		output += `${opp.description}\n\n`;
		if (opp.suggestedActions.length > 0) {
			output += "**Actions**:\n";
			for (const action of opp.suggestedActions) {
				output += `- ${action}\n`;
			}
		}
		output += "\n";
	}

	return output.trim();
}

interface RecurringPattern {
	payeeName: string;
	frequency: string;
	averageAmount: number;
	nextPredicted: string;
	confidence: number;
	occurrenceCount: number;
	isActive: boolean;
	categoryName?: string;
	lastOccurrence: string;
}

function formatRecurringResult(result: unknown): string {
	const data = result as {
		success: boolean;
		count: number;
		totalMonthlyValue: number;
		patterns: RecurringPattern[];
		summary: { subscriptions: number; bills: number; income: number };
	};

	if (!data.patterns || data.patterns.length === 0) {
		return "No recurring transactions detected yet.";
	}

	let output = `## Recurring Transactions\n\n`;
	output += `**Total Monthly Value**: ${formatCurrency(data.totalMonthlyValue)}\n`;
	output += `**Found**: ${data.summary.subscriptions} subscriptions, ${data.summary.bills} bills\n\n`;
	output += "| Payee | Amount | Frequency | Next Due |\n";
	output += "|-------|--------|-----------|----------|\n";

	for (const p of data.patterns) {
		const status = p.isActive ? "" : " (inactive)";
		output += `| ${p.payeeName}${status} | ${formatCurrency(p.averageAmount)} | ${p.frequency} | ${p.nextPredicted || "-"} |\n`;
	}

	return output;
}

interface Prediction {
	date: string;
	predictedAmount: number;
	lowerBound?: number;
	upperBound?: number;
}

function formatForecastResult(result: unknown): string {
	const data = result as {
		success: boolean;
		confidence: number;
		predictionCount: number;
		predictions: Prediction[];
		incomePredictions: Prediction[];
		expensePredictions: Prediction[];
		summary: {
			avgPredictedCashFlow: number;
			totalPredictedIncome: number;
			totalPredictedExpenses: number;
		};
		message?: string;
	};

	if (data.message) {
		return data.message;
	}

	if (!data.predictions || data.predictions.length === 0) {
		return "Not enough data to generate forecast. Need more transaction history.";
	}

	let output = `## Cash Flow Forecast\n\n`;
	output += `**Confidence**: ${data.confidence}%\n\n`;
	output += `### Summary\n`;
	output += `- **Avg Monthly Cash Flow**: ${formatCurrency(data.summary.avgPredictedCashFlow)}\n`;
	output += `- **Expected Income**: ${formatCurrency(data.summary.totalPredictedIncome)}\n`;
	output += `- **Expected Expenses**: ${formatCurrency(data.summary.totalPredictedExpenses)}\n\n`;
	output += "### Predictions\n\n";
	output += "| Period | Predicted | Range |\n";
	output += "|--------|-----------|-------|\n";

	for (const p of data.predictions) {
		const range =
			p.lowerBound !== undefined && p.upperBound !== undefined
				? `${formatCurrency(p.lowerBound)} - ${formatCurrency(p.upperBound)}`
				: "-";
		output += `| ${p.date} | ${formatCurrency(p.predictedAmount)} | ${range} |\n`;
	}

	return output;
}

interface AnomalyDimension {
	score: number;
	reason: string;
}

interface Anomaly {
	transactionId: number;
	riskLevel: string;
	overallScore: number;
	explanation: string;
	recommendedActions: string[];
	dimensions: {
		amount: AnomalyDimension;
		timing: AnomalyDimension;
		payee: AnomalyDimension;
	};
}

function formatAnomaliesResult(result: unknown): string {
	const data = result as {
		success: boolean;
		count: number;
		riskSummary?: { critical: number; high: number; medium: number; low: number };
		anomalies: Anomaly[];
		message?: string;
	};

	if (data.message) {
		return `**${data.message}**`;
	}

	if (!data.anomalies || data.anomalies.length === 0) {
		return "No suspicious transactions found. Everything looks normal!";
	}

	let output = `## Anomaly Detection Results\n\n`;
	output += `**Found**: ${data.count} unusual transactions\n`;
	if (data.riskSummary) {
		const { critical, high, medium } = data.riskSummary;
		output += `**Risk Summary**: `;
		if (critical > 0) output += `🔴 ${critical} critical `;
		if (high > 0) output += `🟠 ${high} high `;
		if (medium > 0) output += `🟡 ${medium} medium`;
		output += "\n\n";
	}

	for (const a of data.anomalies) {
		const icon = a.riskLevel === "critical" ? "🔴" : a.riskLevel === "high" ? "🟠" : "🟡";
		output += `### ${icon} Transaction #${a.transactionId}\n`;
		output += `**Risk Level**: ${a.riskLevel} (${a.overallScore}%)\n\n`;
		output += `${a.explanation}\n\n`;
		if (a.recommendedActions.length > 0) {
			output += "**Recommended**:\n";
			for (const action of a.recommendedActions) {
				output += `- ${action}\n`;
			}
		}
		output += "\n";
	}

	return output.trim();
}

function formatHelpResult(result: unknown): string {
	const data = result as { command?: string };

	if (data.command) {
		const cmd = SLASH_COMMANDS[data.command.toLowerCase()];
		if (cmd) {
			let output = `## /${cmd.name}\n\n`;
			output += `${cmd.description}\n\n`;
			output += `**Usage**: \`${cmd.usage}\`\n\n`;
			output += "**Examples**:\n";
			for (const example of cmd.examples) {
				output += `- \`${example}\`\n`;
			}
			return output;
		}
		return `Unknown command: /${data.command}. Type /help for a list of commands.`;
	}

	// List all commands
	let output = "## Available Commands\n\n";

	const commandsByCategory = {
		"Account & Transactions": ["balance", "transactions", "search"],
		"Budgets & Categories": ["budget", "category", "categories", "spending"],
		"ML Insights": ["savings", "recurring", "forecast", "anomalies"],
		"Help": ["help"],
	};

	for (const [category, commands] of Object.entries(commandsByCategory)) {
		output += `### ${category}\n`;
		for (const cmdName of commands) {
			const cmd = SLASH_COMMANDS[cmdName];
			if (cmd) {
				output += `- **/${cmd.name}** - ${cmd.description}\n`;
			}
		}
		output += "\n";
	}

	return output.trim();
}

function formatGenericResult(result: unknown): string {
	if (result && typeof result === "object") {
		return "```json\n" + JSON.stringify(result, null, 2) + "\n```";
	}
	return String(result);
}

// ============================================
// UTILITIES
// ============================================

// Note: formatCurrency is imported from $lib/server/utils/formatters
