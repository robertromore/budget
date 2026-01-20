/**
 * Financial Context for AI Chat
 *
 * Fetches and formats comprehensive financial data for the AI assistant.
 * Provides summarized context that allows the LLM to answer questions
 * about any aspect of the user's finances.
 */

import { accounts, categories, payees, transactions } from "$lib/schema";
import { isDebtAccount, type AccountType } from "$lib/schema/accounts";
import { budgets, envelopeAllocations } from "$lib/schema/budgets";
import { scheduleDates } from "$lib/schema/schedule-dates";
import { schedules } from "$lib/schema/schedules";
import { db } from "$lib/server/db";
import { formatCurrency } from "$lib/server/utils/formatters";
import { and, desc, eq, gte, isNull, lt, lte, sql } from "drizzle-orm";

// =============================================================================
// Types
// =============================================================================

export interface AccountSummary {
	id: number;
	name: string;
	type: AccountType;
	balance: number;
	onBudget: boolean;
	institution?: string | null;
	debtLimit?: number | null;
}

export interface CategorySpending {
	id: number;
	name: string;
	type: string;
	totalAmount: number;
	transactionCount: number;
	percentOfTotal: number;
}

export interface PayeeSpending {
	id: number;
	name: string;
	totalAmount: number;
	transactionCount: number;
	lastTransactionDate: string | null;
}

export interface BudgetSummary {
	id: number;
	name: string;
	categoryName: string | null;
	allocatedAmount: number;
	spentAmount: number;
	remainingAmount: number;
	percentUsed: number;
	status: "on_track" | "warning" | "over_budget" | "under_budget";
}

export interface ScheduledTransaction {
	id: number;
	payeeName: string | null;
	amount: number;
	nextDate: string;
	frequency: string;
}

export interface FinancialInsights {
	netWorth: number;
	totalAssets: number;
	totalLiabilities: number;
	monthlyIncome: number;
	monthlyExpenses: number;
	savingsRate: number;
}

export interface FinancialContext {
	accounts: AccountSummary[];
	topCategories: CategorySpending[];
	topPayees: PayeeSpending[];
	budgetStatus: BudgetSummary[];
	upcomingScheduled: ScheduledTransaction[];
	insights: FinancialInsights;
	dataAsOf: string;
}

// =============================================================================
// Data Fetching
// =============================================================================

/**
 * Get date range for last 30 days
 */
function getLast30DaysRange(): { startDate: string; endDate: string } {
	const endDate = new Date();
	const startDate = new Date();
	startDate.setDate(startDate.getDate() - 30);

	return {
		startDate: startDate.toISOString().split("T")[0],
		endDate: endDate.toISOString().split("T")[0],
	};
}

/**
 * Get date range for current month
 */
function getCurrentMonthRange(): { startDate: string; endDate: string } {
	const now = new Date();
	const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
	const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

	return {
		startDate: startDate.toISOString().split("T")[0],
		endDate: endDate.toISOString().split("T")[0],
	};
}

/**
 * Fetch all accounts with calculated balances
 */
async function fetchAccounts(workspaceId: number): Promise<AccountSummary[]> {
	// Get all active accounts
	const accountList = await db
		.select({
			id: accounts.id,
			name: accounts.name,
			type: accounts.accountType,
			initialBalance: accounts.initialBalance,
			onBudget: accounts.onBudget,
			institution: accounts.institution,
			debtLimit: accounts.debtLimit,
		})
		.from(accounts)
		.where(and(eq(accounts.workspaceId, workspaceId), isNull(accounts.deletedAt)))
		.orderBy(accounts.name);

	// Calculate balance for each account
	const accountsWithBalances: AccountSummary[] = [];

	for (const account of accountList) {
		// Sum cleared transactions
		const [balanceResult] = await db
			.select({
				sum: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
			})
			.from(transactions)
			.where(
				and(
					eq(transactions.accountId, account.id),
					eq(transactions.status, "cleared"),
					isNull(transactions.deletedAt)
				)
			);

		const transactionSum = Number(balanceResult?.sum ?? 0);
		const initialBalance = account.initialBalance ?? 0;

		// Default to 'other' if account type is null
		const accountType: AccountType = account.type ?? "other";

		// For debt accounts, only invert the initial balance
		// Transaction amounts already have correct signs (purchases negative, payments positive)
		const isDebt = isDebtAccount(accountType);
		const balance = isDebt
			? -initialBalance + transactionSum
			: initialBalance + transactionSum;

		accountsWithBalances.push({
			id: account.id,
			name: account.name,
			type: accountType,
			balance: Math.round(balance * 100) / 100,
			onBudget: account.onBudget ?? true,
			institution: account.institution,
			debtLimit: account.debtLimit,
		});
	}

	return accountsWithBalances;
}

/**
 * Fetch top spending categories for last 30 days
 */
async function fetchTopCategories(
	workspaceId: number,
	limit: number = 10
): Promise<CategorySpending[]> {
	const { startDate, endDate } = getLast30DaysRange();

	// Get spending by category (only expense transactions - negative amounts)
	const categorySpending = await db
		.select({
			categoryId: transactions.categoryId,
			categoryName: categories.name,
			categoryType: categories.categoryType,
			totalAmount: sql<number>`ABS(SUM(${transactions.amount}))`,
			transactionCount: sql<number>`COUNT(*)`,
		})
		.from(transactions)
		.leftJoin(categories, eq(transactions.categoryId, categories.id))
		.where(
			and(
				eq(categories.workspaceId, workspaceId),
				gte(transactions.date, startDate),
				lte(transactions.date, endDate),
				lt(transactions.amount, 0), // Only expenses
				isNull(transactions.deletedAt)
			)
		)
		.groupBy(transactions.categoryId, categories.name, categories.categoryType)
		.orderBy(desc(sql`ABS(SUM(${transactions.amount}))`))
		.limit(limit);

	// Calculate total expenses for percentage
	const totalExpenses = categorySpending.reduce(
		(sum, cat) => sum + Number(cat.totalAmount),
		0
	);

	return categorySpending
		.filter((cat) => cat.categoryId !== null)
		.map((cat) => ({
			id: cat.categoryId!,
			name: cat.categoryName ?? "Uncategorized",
			type: cat.categoryType ?? "expense",
			totalAmount: Math.round(Number(cat.totalAmount) * 100) / 100,
			transactionCount: Number(cat.transactionCount),
			percentOfTotal:
				totalExpenses > 0
					? Math.round((Number(cat.totalAmount) / totalExpenses) * 100)
					: 0,
		}));
}

/**
 * Fetch top payees for last 30 days
 */
async function fetchTopPayees(
	workspaceId: number,
	limit: number = 10
): Promise<PayeeSpending[]> {
	const { startDate, endDate } = getLast30DaysRange();

	const payeeSpending = await db
		.select({
			payeeId: transactions.payeeId,
			payeeName: payees.name,
			totalAmount: sql<number>`ABS(SUM(${transactions.amount}))`,
			transactionCount: sql<number>`COUNT(*)`,
			lastTransactionDate: sql<string>`MAX(${transactions.date})`,
		})
		.from(transactions)
		.leftJoin(payees, eq(transactions.payeeId, payees.id))
		.where(
			and(
				eq(payees.workspaceId, workspaceId),
				gte(transactions.date, startDate),
				lte(transactions.date, endDate),
				lt(transactions.amount, 0), // Only expenses
				isNull(transactions.deletedAt)
			)
		)
		.groupBy(transactions.payeeId, payees.name)
		.orderBy(desc(sql`ABS(SUM(${transactions.amount}))`))
		.limit(limit);

	return payeeSpending
		.filter((p) => p.payeeId !== null)
		.map((p) => ({
			id: p.payeeId!,
			name: p.payeeName ?? "Unknown",
			totalAmount: Math.round(Number(p.totalAmount) * 100) / 100,
			transactionCount: Number(p.transactionCount),
			lastTransactionDate: p.lastTransactionDate,
		}));
}

/**
 * Fetch active budget status
 */
async function fetchBudgetStatus(workspaceId: number): Promise<BudgetSummary[]> {
	// Get active budgets with their envelope allocations
	const budgetData = await db
		.select({
			budgetId: budgets.id,
			budgetName: budgets.name,
			categoryId: envelopeAllocations.categoryId,
			categoryName: categories.name,
			allocatedAmount: envelopeAllocations.allocatedAmount,
			spentAmount: envelopeAllocations.spentAmount,
			availableAmount: envelopeAllocations.availableAmount,
		})
		.from(budgets)
		.innerJoin(envelopeAllocations, eq(envelopeAllocations.budgetId, budgets.id))
		.leftJoin(categories, eq(envelopeAllocations.categoryId, categories.id))
		.where(and(eq(budgets.workspaceId, workspaceId), eq(budgets.status, "active")))
		.orderBy(desc(envelopeAllocations.spentAmount));

	return budgetData.map((b) => {
		const allocated = b.allocatedAmount ?? 0;
		const spent = Math.abs(b.spentAmount ?? 0);
		const remaining = b.availableAmount ?? allocated - spent;
		const percentUsed = allocated > 0 ? (spent / allocated) * 100 : 0;

		let status: BudgetSummary["status"] = "on_track";
		if (percentUsed > 100) {
			status = "over_budget";
		} else if (percentUsed > 85) {
			status = "warning";
		} else if (percentUsed < 50 && allocated > 0) {
			status = "under_budget";
		}

		return {
			id: b.budgetId,
			name: b.budgetName,
			categoryName: b.categoryName,
			allocatedAmount: Math.round(allocated * 100) / 100,
			spentAmount: Math.round(spent * 100) / 100,
			remainingAmount: Math.round(remaining * 100) / 100,
			percentUsed: Math.round(percentUsed),
			status,
		};
	});
}

/**
 * Fetch upcoming scheduled transactions (next 14 days)
 */
async function fetchUpcomingScheduled(
	workspaceId: number,
	limit: number = 10
): Promise<ScheduledTransaction[]> {
	const today = new Date().toISOString().split("T")[0];
	const twoWeeksLater = new Date();
	twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
	const endDate = twoWeeksLater.toISOString().split("T")[0];

	// Join schedules with scheduleDates to get frequency and start date
	const upcoming = await db
		.select({
			id: schedules.id,
			name: schedules.name,
			payeeName: payees.name,
			amount: schedules.amount,
			startDate: scheduleDates.start,
			frequency: scheduleDates.frequency,
		})
		.from(schedules)
		.leftJoin(payees, eq(schedules.payeeId, payees.id))
		.leftJoin(scheduleDates, eq(schedules.dateId, scheduleDates.id))
		.where(
			and(
				eq(schedules.workspaceId, workspaceId),
				eq(schedules.status, "active"),
				// Only get schedules that started before or during our date range
				lte(scheduleDates.start, endDate)
			)
		)
		.orderBy(scheduleDates.start)
		.limit(limit);

	return upcoming.map((s) => ({
		id: s.id,
		payeeName: s.payeeName ?? s.name,
		amount: Math.round((s.amount ?? 0) * 100) / 100,
		nextDate: s.startDate ?? today,
		frequency: s.frequency ?? "monthly",
	}));
}

/**
 * Calculate financial insights
 */
async function calculateInsights(
	accountsData: AccountSummary[],
	workspaceId: number
): Promise<FinancialInsights> {
	// Calculate net worth from accounts
	let totalAssets = 0;
	let totalLiabilities = 0;

	for (const account of accountsData) {
		if (isDebtAccount(account.type)) {
			// Only negative balances are liabilities (debt owed)
			// Positive balances on debt accounts are credits (overpayment)
			if (account.balance < 0) {
				totalLiabilities += Math.abs(account.balance);
			}
		} else {
			totalAssets += account.balance;
		}
	}

	const netWorth = totalAssets - totalLiabilities;

	// Get current month income and expenses
	const { startDate, endDate } = getCurrentMonthRange();

	const [incomeResult] = await db
		.select({
			sum: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
		})
		.from(transactions)
		.innerJoin(accounts, eq(transactions.accountId, accounts.id))
		.where(
			and(
				eq(accounts.workspaceId, workspaceId),
				gte(transactions.date, startDate),
				lte(transactions.date, endDate),
				eq(transactions.status, "cleared"),
				sql`${transactions.amount} > 0`, // Income is positive
				isNull(transactions.deletedAt)
			)
		);

	const [expenseResult] = await db
		.select({
			sum: sql<number>`COALESCE(ABS(SUM(${transactions.amount})), 0)`,
		})
		.from(transactions)
		.innerJoin(accounts, eq(transactions.accountId, accounts.id))
		.where(
			and(
				eq(accounts.workspaceId, workspaceId),
				gte(transactions.date, startDate),
				lte(transactions.date, endDate),
				eq(transactions.status, "cleared"),
				sql`${transactions.amount} < 0`, // Expenses are negative
				isNull(transactions.deletedAt)
			)
		);

	const monthlyIncome = Number(incomeResult?.sum ?? 0);
	const monthlyExpenses = Number(expenseResult?.sum ?? 0);
	const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;

	return {
		netWorth: Math.round(netWorth * 100) / 100,
		totalAssets: Math.round(totalAssets * 100) / 100,
		totalLiabilities: Math.round(totalLiabilities * 100) / 100,
		monthlyIncome: Math.round(monthlyIncome * 100) / 100,
		monthlyExpenses: Math.round(monthlyExpenses * 100) / 100,
		savingsRate: Math.round(savingsRate),
	};
}

// =============================================================================
// Main Export
// =============================================================================

/**
 * Fetch comprehensive financial context for AI chat
 */
export async function fetchFinancialContext(workspaceId: number): Promise<FinancialContext> {
	// Fetch all data in parallel
	const [accountsData, topCategories, topPayees, budgetStatus, upcomingScheduled] =
		await Promise.all([
			fetchAccounts(workspaceId),
			fetchTopCategories(workspaceId),
			fetchTopPayees(workspaceId),
			fetchBudgetStatus(workspaceId),
			fetchUpcomingScheduled(workspaceId),
		]);

	// Calculate insights (depends on accounts data)
	const insights = await calculateInsights(accountsData, workspaceId);

	return {
		accounts: accountsData,
		topCategories,
		topPayees,
		budgetStatus,
		upcomingScheduled,
		insights,
		dataAsOf: new Date().toISOString(),
	};
}

// =============================================================================
// Formatting for Prompt
// =============================================================================

// Note: formatCurrency is imported from $lib/server/utils/formatters

/**
 * Format financial context for inclusion in AI system prompt
 */
export function formatContextForPrompt(context: FinancialContext): string {
	const lines: string[] = [];

	lines.push("## Your Financial Data\n");

	// Accounts
	lines.push("### Accounts");
	if (context.accounts.length === 0) {
		lines.push("No accounts set up yet.\n");
	} else {
		for (const account of context.accounts) {
			const typeLabel = account.type.replace("_", " ");
			const institutionPart = account.institution ? ` (${account.institution})` : "";
			const debtLimitPart =
				account.debtLimit != null ? ` [limit: ${formatCurrency(account.debtLimit)}]` : "";
			lines.push(
				`- ${account.name}${institutionPart}: ${formatCurrency(account.balance)} (${typeLabel})${debtLimitPart}`
			);
		}
		lines.push("");
	}

	// Net Worth & Insights
	lines.push("### Financial Summary");
	lines.push(`- Net Worth: ${formatCurrency(context.insights.netWorth)}`);
	lines.push(`- Total Assets: ${formatCurrency(context.insights.totalAssets)}`);
	lines.push(`- Total Liabilities: ${formatCurrency(context.insights.totalLiabilities)}`);
	lines.push("");

	lines.push("### This Month");
	lines.push(`- Income: ${formatCurrency(context.insights.monthlyIncome)}`);
	lines.push(`- Expenses: ${formatCurrency(context.insights.monthlyExpenses)}`);
	lines.push(`- Savings Rate: ${context.insights.savingsRate}%`);
	lines.push("");

	// Top Categories
	lines.push("### Top Spending Categories (Last 30 Days)");
	if (context.topCategories.length === 0) {
		lines.push("No spending data available.\n");
	} else {
		for (let i = 0; i < context.topCategories.length; i++) {
			const cat = context.topCategories[i];
			lines.push(
				`${i + 1}. ${cat.name}: ${formatCurrency(cat.totalAmount)} (${cat.percentOfTotal}% of expenses, ${cat.transactionCount} transactions)`
			);
		}
		lines.push("");
	}

	// Top Payees
	lines.push("### Top Payees (Last 30 Days)");
	if (context.topPayees.length === 0) {
		lines.push("No payee data available.\n");
	} else {
		for (let i = 0; i < context.topPayees.length; i++) {
			const payee = context.topPayees[i];
			lines.push(
				`${i + 1}. ${payee.name}: ${formatCurrency(payee.totalAmount)} (${payee.transactionCount} transactions)`
			);
		}
		lines.push("");
	}

	// Budget Status
	lines.push("### Budget Status");
	if (context.budgetStatus.length === 0) {
		lines.push("No active budgets.\n");
	} else {
		for (const budget of context.budgetStatus) {
			const statusEmoji =
				budget.status === "over_budget"
					? "🔴"
					: budget.status === "warning"
						? "🟡"
						: budget.status === "under_budget"
							? "🟢"
							: "✓";
			const categoryPart = budget.categoryName ? ` (${budget.categoryName})` : "";
			lines.push(
				`- ${statusEmoji} ${budget.name}${categoryPart}: ${formatCurrency(budget.spentAmount)}/${formatCurrency(budget.allocatedAmount)} (${budget.percentUsed}%)`
			);
		}
		lines.push("");
	}

	// Upcoming Scheduled
	lines.push("### Upcoming Transactions (Next 14 Days)");
	if (context.upcomingScheduled.length === 0) {
		lines.push("No upcoming scheduled transactions.\n");
	} else {
		for (const scheduled of context.upcomingScheduled) {
			const payeePart = scheduled.payeeName ?? "Unknown payee";
			lines.push(`- ${scheduled.nextDate}: ${payeePart} (${formatCurrency(scheduled.amount)})`);
		}
		lines.push("");
	}

	return lines.join("\n");
}
