/**
 * Real Data Training Generator
 *
 * Generates personalized training examples from actual user data.
 * Creates a model that understands YOUR specific finances.
 *
 * WARNING: The resulting training data contains personal financial information.
 * Do not share the generated files or the resulting fine-tuned model.
 *
 * Usage:
 *   bun run src/lib/server/ai/fine-tuning/export-real-data.ts --workspace 1
 */

import { db } from "$lib/server/db";
import { accounts, budgets, budgetCategories, categories, payees, transactions } from "$lib/schema";
import { formatPercent } from "$lib/server/utils/formatters";
import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import {
	BUDGET_ASSISTANT_SYSTEM_PROMPT,
	type TrainingCategory,
	type TrainingDataset,
	type TrainingExample,
} from "./types";

/**
 * Fetch real financial data for a workspace
 */
async function fetchWorkspaceData(workspaceId: number) {
	// Get accounts with calculated balance from transactions
	const accountData = await db
		.select({
			id: accounts.id,
			name: accounts.name,
			accountType: accounts.accountType,
			initialBalance: accounts.initialBalance,
			// Calculate current balance from transactions
			transactionSum: sql<number>`coalesce(sum(${transactions.amount}), 0)`.as("transactionSum"),
		})
		.from(accounts)
		.leftJoin(
			transactions,
			and(eq(transactions.accountId, accounts.id), isNull(transactions.deletedAt))
		)
		.where(and(eq(accounts.workspaceId, workspaceId), isNull(accounts.deletedAt)))
		.groupBy(accounts.id);

	// Get categories
	const categoryData = await db
		.select({
			id: categories.id,
			name: categories.name,
			categoryType: categories.categoryType,
		})
		.from(categories)
		.where(and(eq(categories.workspaceId, workspaceId), isNull(categories.deletedAt)));

	// Get payees with transaction counts
	const payeeData = await db
		.select({
			id: payees.id,
			name: payees.name,
			transactionCount: sql<number>`count(${transactions.id})`.as("transactionCount"),
			totalSpent: sql<number>`sum(case when ${transactions.amount} < 0 then abs(${transactions.amount}) else 0 end)`.as(
				"totalSpent"
			),
		})
		.from(payees)
		.leftJoin(
			transactions,
			and(eq(transactions.payeeId, payees.id), isNull(transactions.deletedAt))
		)
		.where(and(eq(payees.workspaceId, workspaceId), isNull(payees.deletedAt)))
		.groupBy(payees.id)
		.orderBy(desc(sql`totalSpent`))
		.limit(50);

	// Get recent transactions
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	const recentTransactions = await db
		.select({
			id: transactions.id,
			date: transactions.date,
			amount: transactions.amount,
			payeeName: payees.name,
			categoryName: categories.name,
			accountName: accounts.name,
		})
		.from(transactions)
		.innerJoin(accounts, eq(transactions.accountId, accounts.id))
		.leftJoin(payees, eq(transactions.payeeId, payees.id))
		.leftJoin(categories, eq(transactions.categoryId, categories.id))
		.where(
			and(
				eq(accounts.workspaceId, workspaceId),
				isNull(transactions.deletedAt),
				gte(transactions.date, thirtyDaysAgo.toISOString().split("T")[0]!)
			)
		)
		.orderBy(desc(transactions.date))
		.limit(100);

	// Get budgets with their categories through junction table
	const budgetData = await db
		.select({
			id: budgets.id,
			name: budgets.name,
			metadata: budgets.metadata,
			categoryId: budgetCategories.categoryId,
			categoryName: categories.name,
		})
		.from(budgets)
		.leftJoin(budgetCategories, eq(budgetCategories.budgetId, budgets.id))
		.leftJoin(categories, eq(categories.id, budgetCategories.categoryId))
		.where(and(eq(budgets.workspaceId, workspaceId), isNull(budgets.deletedAt)));

	// Calculate spending by category
	const categorySpending = await db
		.select({
			categoryId: transactions.categoryId,
			categoryName: categories.name,
			totalSpent: sql<number>`sum(case when ${transactions.amount} < 0 then abs(${transactions.amount}) else 0 end)`.as(
				"totalSpent"
			),
			transactionCount: sql<number>`count(*)`.as("transactionCount"),
		})
		.from(transactions)
		.innerJoin(accounts, eq(transactions.accountId, accounts.id))
		.leftJoin(categories, eq(transactions.categoryId, categories.id))
		.where(
			and(
				eq(accounts.workspaceId, workspaceId),
				isNull(transactions.deletedAt),
				gte(transactions.date, thirtyDaysAgo.toISOString().split("T")[0]!)
			)
		)
		.groupBy(transactions.categoryId, categories.name)
		.orderBy(desc(sql`totalSpent`));

	return {
		accounts: accountData,
		categories: categoryData,
		payees: payeeData,
		recentTransactions,
		budgets: budgetData,
		categorySpending,
	};
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(amount / 100); // Assuming amounts are stored in cents
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
	return new Date(dateStr).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
}

/**
 * Generate account balance examples from real data
 */
function generateRealAccountExamples(data: Awaited<ReturnType<typeof fetchWorkspaceData>>): TrainingExample[] {
	const examples: TrainingExample[] = [];

	if (data.accounts.length === 0) return examples;

	// Helper to calculate balance from initialBalance + transactionSum
	const getBalance = (a: (typeof data.accounts)[0]) =>
		(a.initialBalance ?? 0) + (a.transactionSum ?? 0);

	// All accounts overview
	const accountsList = data.accounts
		.map((a) => `- ${a.name} (${a.accountType}): ${formatCurrency(getBalance(a))}`)
		.join("\n");

	const totalBalance = data.accounts.reduce((sum, a) => sum + getBalance(a), 0);

	examples.push({
		id: `real_accounts_001`,
		category: "account_balance",
		source: "real",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "What are my account balances?" },
			{
				role: "assistant",
				content: `Here are your current account balances:\n\n${accountsList}\n\n**Total: ${formatCurrency(totalBalance)}**`,
			},
		],
	});

	// Individual account queries
	for (const account of data.accounts.slice(0, 5)) {
		examples.push({
			id: `real_account_${account.id}`,
			category: "account_balance",
			source: "real",
			quality: 4,
			messages: [
				{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
				{ role: "user", content: `What's my ${account.name} balance?` },
				{
					role: "assistant",
					content: `Your ${account.name} (${account.accountType}) has a balance of **${formatCurrency(getBalance(account))}**.`,
				},
			],
		});
	}

	return examples;
}

/**
 * Generate spending analysis examples from real data
 */
function generateRealSpendingExamples(data: Awaited<ReturnType<typeof fetchWorkspaceData>>): TrainingExample[] {
	const examples: TrainingExample[] = [];

	if (data.categorySpending.length === 0) return examples;

	// Overall spending breakdown
	const totalSpent = data.categorySpending.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
	const topCategories = data.categorySpending
		.filter((c) => c.categoryName && c.totalSpent)
		.slice(0, 5)
		.map((c, i) => {
			const pct = formatPercent(c.totalSpent! / totalSpent, 0);
			return `${i + 1}. **${c.categoryName}**: ${formatCurrency(c.totalSpent!)} (${pct})`;
		})
		.join("\n");

	examples.push({
		id: "real_spending_001",
		category: "spending_analysis",
		source: "real",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "How much did I spend this month?" },
			{
				role: "assistant",
				content: `This month you've spent **${formatCurrency(totalSpent)}** across ${data.recentTransactions.length} transactions.\n\n**Top Categories:**\n${topCategories}`,
			},
		],
	});

	// Category-specific queries
	for (const cat of data.categorySpending.slice(0, 5)) {
		if (!cat.categoryName || !cat.totalSpent) continue;

		examples.push({
			id: `real_category_${cat.categoryId}`,
			category: "spending_analysis",
			source: "real",
			quality: 4,
			messages: [
				{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
				{ role: "user", content: `How much did I spend on ${cat.categoryName}?` },
				{
					role: "assistant",
					content: `Your ${cat.categoryName} spending this month: **${formatCurrency(cat.totalSpent)}** across ${cat.transactionCount} transactions.`,
				},
			],
		});
	}

	return examples;
}

/**
 * Generate payee examples from real data
 */
function generateRealPayeeExamples(data: Awaited<ReturnType<typeof fetchWorkspaceData>>): TrainingExample[] {
	const examples: TrainingExample[] = [];

	if (data.payees.length === 0) return examples;

	// Top merchants
	const topPayees = data.payees
		.filter((p) => p.totalSpent && p.totalSpent > 0)
		.slice(0, 10)
		.map((p, i) => `${i + 1}. **${p.name}**: ${formatCurrency(p.totalSpent!)} (${p.transactionCount} transactions)`)
		.join("\n");

	if (topPayees) {
		examples.push({
			id: "real_payees_001",
			category: "payee_management",
			source: "real",
			quality: 5,
			messages: [
				{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
				{ role: "user", content: "Where do I spend the most money?" },
				{
					role: "assistant",
					content: `Here are your top merchants by spending:\n\n${topPayees}`,
				},
			],
		});
	}

	// Individual payee queries
	for (const payee of data.payees.slice(0, 5)) {
		if (!payee.totalSpent || payee.totalSpent === 0) continue;

		examples.push({
			id: `real_payee_${payee.id}`,
			category: "spending_analysis",
			source: "real",
			quality: 4,
			messages: [
				{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
				{ role: "user", content: `How much have I spent at ${payee.name}?` },
				{
					role: "assistant",
					content: `You've spent **${formatCurrency(payee.totalSpent)}** at ${payee.name} across ${payee.transactionCount} transactions.`,
				},
			],
		});
	}

	return examples;
}

/**
 * Generate transaction search examples from real data
 */
function generateRealTransactionExamples(data: Awaited<ReturnType<typeof fetchWorkspaceData>>): TrainingExample[] {
	const examples: TrainingExample[] = [];

	if (data.recentTransactions.length === 0) return examples;

	// Recent transactions table
	const recentRows = data.recentTransactions
		.slice(0, 10)
		.map(
			(t) =>
				`| ${formatDate(t.date)} | ${t.payeeName || "Unknown"} | ${t.categoryName || "Uncategorized"} | ${formatCurrency(t.amount)} |`
		)
		.join("\n");

	examples.push({
		id: "real_transactions_001",
		category: "transaction_search",
		source: "real",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "Show me my recent transactions" },
			{
				role: "assistant",
				content: `Here are your last 10 transactions:\n\n| Date | Payee | Category | Amount |\n|------|-------|----------|--------|\n${recentRows}`,
			},
		],
	});

	// Search by specific payee (if we have repeated payees)
	const payeeCounts = new Map<string, number>();
	for (const t of data.recentTransactions) {
		if (t.payeeName) {
			payeeCounts.set(t.payeeName, (payeeCounts.get(t.payeeName) || 0) + 1);
		}
	}

	for (const [payeeName, count] of payeeCounts) {
		if (count >= 2) {
			const payeeTransactions = data.recentTransactions
				.filter((t) => t.payeeName === payeeName)
				.slice(0, 5);

			const rows = payeeTransactions
				.map((t) => `| ${formatDate(t.date)} | ${formatCurrency(t.amount)} | ${t.categoryName || "Uncategorized"} |`)
				.join("\n");

			examples.push({
				id: `real_search_${payeeName.replace(/\s+/g, "_").toLowerCase()}`,
				category: "transaction_search",
				source: "real",
				quality: 4,
				messages: [
					{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
					{ role: "user", content: `Find my ${payeeName} transactions` },
					{
						role: "assistant",
						content: `Found ${count} ${payeeName} transactions:\n\n| Date | Amount | Category |\n|------|--------|----------|\n${rows}`,
					},
				],
			});

			// Only generate a few of these
			if (examples.filter((e) => e.id.startsWith("real_search_")).length >= 5) break;
		}
	}

	return examples;
}

/**
 * Generate budget examples from real data
 */
function generateRealBudgetExamples(data: Awaited<ReturnType<typeof fetchWorkspaceData>>): TrainingExample[] {
	const examples: TrainingExample[] = [];

	if (data.budgets.length === 0) return examples;

	// Helper to get budget amount from metadata
	const getBudgetAmount = (b: (typeof data.budgets)[0]) =>
		(b.metadata?.allocatedAmount as number | undefined) ?? 0;

	// Budget status overview
	const budgetLines = data.budgets
		.map((b) => {
			const amount = getBudgetAmount(b);
			const spent = data.categorySpending.find((c) => c.categoryId === b.categoryId)?.totalSpent || 0;
			const pct = amount > 0 ? Math.round((spent / amount) * 100) : 0;
			const status = pct > 100 ? "🔴" : pct > 80 ? "⚠️" : "✅";
			return `${status} **${b.categoryName || b.name}**: ${formatCurrency(spent)}/${formatCurrency(amount)} (${pct}%)`;
		})
		.join("\n");

	examples.push({
		id: "real_budgets_001",
		category: "budget_management",
		source: "real",
		quality: 5,
		messages: [
			{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
			{ role: "user", content: "How am I doing on my budgets?" },
			{
				role: "assistant",
				content: `Here's your budget status:\n\n${budgetLines}`,
			},
		],
	});

	// Individual budget queries
	for (const budget of data.budgets.slice(0, 3)) {
		const amount = getBudgetAmount(budget);
		const spent = data.categorySpending.find((c) => c.categoryId === budget.categoryId)?.totalSpent || 0;
		const remaining = amount - spent;
		const pct = amount > 0 ? Math.round((spent / amount) * 100) : 0;

		examples.push({
			id: `real_budget_${budget.id}`,
			category: "budget_management",
			source: "real",
			quality: 4,
			messages: [
				{ role: "system", content: BUDGET_ASSISTANT_SYSTEM_PROMPT },
				{ role: "user", content: `How's my ${budget.categoryName || budget.name} budget?` },
				{
					role: "assistant",
					content: `Your ${budget.categoryName || budget.name} budget:\n\n- Budget: ${formatCurrency(amount)}\n- Spent: ${formatCurrency(spent)} (${pct}%)\n- Remaining: ${formatCurrency(remaining)}`,
				},
			],
		});
	}

	return examples;
}

/**
 * Generate a training dataset from real user data
 */
export async function generateRealDataset(workspaceId: number): Promise<TrainingDataset> {
	console.log(`Fetching data for workspace ${workspaceId}...`);
	const data = await fetchWorkspaceData(workspaceId);

	console.log(`Found: ${data.accounts.length} accounts, ${data.payees.length} payees, ${data.recentTransactions.length} recent transactions`);

	const examples: TrainingExample[] = [
		...generateRealAccountExamples(data),
		...generateRealSpendingExamples(data),
		...generateRealPayeeExamples(data),
		...generateRealTransactionExamples(data),
		...generateRealBudgetExamples(data),
	];

	// Calculate category distribution
	const categoryCount = examples.reduce(
		(acc, e) => {
			acc[e.category] = (acc[e.category] || 0) + 1;
			return acc;
		},
		{} as Record<TrainingCategory, number>
	);

	return {
		version: "1.0.0-personal",
		createdAt: new Date().toISOString(),
		count: examples.length,
		categories: categoryCount,
		baseModel: "qwen2.5:3b",
		examples,
	};
}

/**
 * Export real dataset to JSONL format
 */
export function exportRealToJSONL(dataset: TrainingDataset): string {
	return dataset.examples
		.map((example) => {
			return JSON.stringify({
				messages: example.messages.map((m) => ({
					role: m.role,
					content: m.content,
				})),
			});
		})
		.join("\n");
}
