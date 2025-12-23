/**
 * AI Tool Definitions
 *
 * Tools that the AI assistant can call to read data and perform actions
 * on behalf of the user.
 */

import { tool, jsonSchema } from "ai";
import { db } from "$lib/server/db";
import { accounts } from "$lib/schema/accounts";
import { transactions } from "$lib/schema/transactions";
import { categories } from "$lib/schema/categories";
import { payees } from "$lib/schema/payees";
import { budgets, budgetCategories, budgetPeriodInstances, budgetPeriodTemplates } from "$lib/schema/budgets";
import { and, eq, gte, lte, like, desc, sql, isNull, inArray } from "drizzle-orm";
import {
	createMLModelStore,
	createSavingsOpportunityService,
	createRecurringTransactionDetectionService,
	createTimeSeriesForecastingService,
	createAnomalyDetectionService,
	createFeatureEngineeringService,
} from "$lib/server/domains/ml";

/**
 * Create tool definitions for a specific workspace
 */
export function createAITools(workspaceId: number) {
	// Initialize ML services (lazy initialization via closures)
	const modelStore = createMLModelStore();
	const featureService = createFeatureEngineeringService();
	const savingsService = createSavingsOpportunityService(modelStore);
	const recurringService = createRecurringTransactionDetectionService(modelStore);
	const forecastingService = createTimeSeriesForecastingService(modelStore, featureService);
	const anomalyService = createAnomalyDetectionService(modelStore);

	return {
		// ============================================
		// READ-ONLY TOOLS
		// ============================================

		/**
		 * Get account details and balance
		 */
		getAccountBalance: tool({
			description: "Get the current balance and details for a specific account by name or ID",
			inputSchema: jsonSchema<{ accountName?: string; accountId?: number }>({
				type: "object",
				properties: {
					accountName: { type: "string", description: "The name of the account to look up" },
					accountId: { type: "number", description: "The ID of the account to look up" },
				},
			}),
			execute: async ({ accountName, accountId }) => {

				// Build conditions
				const conditions: ReturnType<typeof eq>[] = [
					eq(accounts.workspaceId, workspaceId),
					isNull(accounts.deletedAt),
				];

				if (accountId) {
					conditions.push(eq(accounts.id, accountId));
				}
				if (accountName) {
					conditions.push(like(accounts.name, `%${accountName}%`));
				}

				// Query accounts
				const results = await db
					.select({
						id: accounts.id,
						name: accounts.name,
						accountType: accounts.accountType,
						initialBalance: accounts.initialBalance,
						institution: accounts.institution,
					})
					.from(accounts)
					.where(and(...conditions))
					.limit(5);

				if (results.length === 0) {
					return { success: false as const, message: "No accounts found matching that criteria" };
				}

				// Calculate balances from transactions
				const accountIds = results.map((a) => a.id);
				const balances = await db
					.select({
						accountId: transactions.accountId,
						balance: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
					})
					.from(transactions)
					.where(
						and(
							inArray(transactions.accountId, accountIds),
							isNull(transactions.deletedAt)
						)
					)
					.groupBy(transactions.accountId);

				const balanceMap = new Map(balances.map((b) => [b.accountId, Number(b.balance)]));

				return {
					success: true as const,
					accounts: results.map((a) => {
						const txnBalance = balanceMap.get(a.id) || 0;
						const totalBalance = (a.initialBalance || 0) + txnBalance;
						return {
							id: a.id,
							name: a.name,
							type: a.accountType,
							balance: totalBalance, // Amounts are stored in dollars (real type)
							institution: a.institution,
						};
					}),
				};
			},
		}),

		/**
		 * Get recent transactions - use this for "last N transactions" queries
		 */
		getRecentTransactions: tool({
			description: "Get the most recent transactions. Use this when the user asks for 'last N transactions' or 'recent transactions'. No date filters needed - just specify how many transactions to return.",
			inputSchema: jsonSchema<{ limit?: number }>({
				type: "object",
				properties: {
					limit: { type: "number", description: "Number of transactions to return (default 10, max 50)" },
				},
			}),
			execute: async ({ limit = 10 }) => {
				console.log("[AI Tool] getRecentTransactions called with limit:", limit);

				const results = await db
					.select({
						id: transactions.id,
						date: transactions.date,
						amount: transactions.amount,
						notes: transactions.notes,
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
							isNull(transactions.deletedAt)
						)
					)
					.orderBy(desc(transactions.date))
					.limit(Math.min(limit, 50));

				console.log("[AI Tool] getRecentTransactions found:", results.length, "transactions");

				return {
					success: true as const,
					count: results.length,
					transactions: results.map((t) => ({
						id: t.id,
						date: t.date,
						amount: Number(t.amount), // Amounts are stored in dollars (real type)
						notes: t.notes,
						payee: t.payeeName,
						category: t.categoryName,
						account: t.accountName,
					})),
				};
			},
		}),

		/**
		 * Search transactions with filters
		 */
		searchTransactions: tool({
			description: "Search and filter transactions by payee, category, amount, or date range. Use getRecentTransactions instead if user just wants the last N transactions without filters.",
			inputSchema: jsonSchema<{
				payeeName?: string;
				categoryName?: string;
				minAmount?: number;
				maxAmount?: number;
				startDate?: string;
				endDate?: string;
				limit?: number;
			}>({
				type: "object",
				properties: {
					payeeName: { type: "string", description: "Filter by payee name (partial match)" },
					categoryName: { type: "string", description: "Filter by category name (partial match)" },
					minAmount: { type: "number", description: "Minimum transaction amount (absolute value in dollars)" },
					maxAmount: { type: "number", description: "Maximum transaction amount (absolute value in dollars)" },
					startDate: { type: "string", description: "Start date in YYYY-MM-DD format (only if user specifies a date range)" },
					endDate: { type: "string", description: "End date in YYYY-MM-DD format (only if user specifies a date range)" },
					limit: { type: "number", description: "Maximum number of results (default 20, max 50)" },
				},
			}),
			execute: async (params) => {
				const { payeeName, categoryName, minAmount, maxAmount, startDate, endDate, limit = 20 } = params;
				console.log("[AI Tool] searchTransactions called with:", JSON.stringify(params));

				// Filter through accounts since transactions don't have workspaceId directly
				const conditions: ReturnType<typeof eq>[] = [
					eq(accounts.workspaceId, workspaceId),
					isNull(transactions.deletedAt),
				];

				if (startDate) {
					conditions.push(gte(transactions.date, startDate));
				}
				if (endDate) {
					conditions.push(lte(transactions.date, endDate));
				}
				if (minAmount !== undefined) {
					conditions.push(
						sql`ABS(${transactions.amount}) >= ${minAmount}`
					);
				}
				if (maxAmount !== undefined) {
					conditions.push(
						sql`ABS(${transactions.amount}) <= ${maxAmount}`
					);
				}

				const results = await db
					.select({
						id: transactions.id,
						date: transactions.date,
						amount: transactions.amount,
						notes: transactions.notes,
						payeeName: payees.name,
						categoryName: categories.name,
						accountName: accounts.name,
					})
					.from(transactions)
					.innerJoin(accounts, eq(transactions.accountId, accounts.id))
					.leftJoin(payees, eq(transactions.payeeId, payees.id))
					.leftJoin(categories, eq(transactions.categoryId, categories.id))
					.where(and(...conditions))
					.orderBy(desc(transactions.date))
					.limit(Math.min(limit, 50));

				// Filter by payee/category name in memory if specified
				let filtered = results;
				if (payeeName) {
					const lowerPayee = payeeName.toLowerCase();
					filtered = filtered.filter((t) =>
						t.payeeName?.toLowerCase().includes(lowerPayee)
					);
				}
				if (categoryName) {
					const lowerCategory = categoryName.toLowerCase();
					filtered = filtered.filter((t) =>
						t.categoryName?.toLowerCase().includes(lowerCategory)
					);
				}

				return {
					success: true as const,
					count: filtered.length,
					transactions: filtered.map((t) => ({
						id: t.id,
						date: t.date,
						amount: Number(t.amount), // Amounts are stored in dollars (real type)
						notes: t.notes,
						payee: t.payeeName,
						category: t.categoryName,
						account: t.accountName,
					})),
				};
			},
		}),

		/**
		 * Get budget status and spending
		 */
		getBudgetStatus: tool({
			description: "Get the current status of a budget including allocated amount, spent amount, and remaining balance",
			inputSchema: jsonSchema<{ budgetName?: string; budgetId?: number }>({
				type: "object",
				properties: {
					budgetName: { type: "string", description: "The name of the budget to look up" },
					budgetId: { type: "number", description: "The ID of the budget to look up" },
				},
			}),
			execute: async ({ budgetName, budgetId }) => {

				const conditions: ReturnType<typeof eq>[] = [
					eq(budgets.workspaceId, workspaceId),
					isNull(budgets.deletedAt),
				];

				if (budgetId) {
					conditions.push(eq(budgets.id, budgetId));
				}

				const results = await db
					.select({
						id: budgets.id,
						name: budgets.name,
						type: budgets.type,
						status: budgets.status,
						metadata: budgets.metadata,
					})
					.from(budgets)
					.where(and(...conditions))
					.limit(10);

				// Filter by name in memory
				let filtered = results;
				if (budgetName) {
					const lowerName = budgetName.toLowerCase();
					filtered = filtered.filter((b) =>
						b.name.toLowerCase().includes(lowerName)
					);
				}

				if (filtered.length === 0) {
					return { success: false as const, message: "No budgets found matching that criteria" };
				}

				// Get period instances for spending data
				const budgetIds = filtered.map((b) => b.id);
				const periodData = await db
					.select({
						budgetId: budgetPeriodTemplates.budgetId,
						allocatedAmount: budgetPeriodInstances.allocatedAmount,
						actualAmount: budgetPeriodInstances.actualAmount,
						startDate: budgetPeriodInstances.startDate,
						endDate: budgetPeriodInstances.endDate,
					})
					.from(budgetPeriodInstances)
					.innerJoin(
						budgetPeriodTemplates,
						eq(budgetPeriodInstances.templateId, budgetPeriodTemplates.id)
					)
					.where(inArray(budgetPeriodTemplates.budgetId, budgetIds));

				const periodsByBudget = new Map<number, typeof periodData>();
				for (const p of periodData) {
					if (!periodsByBudget.has(p.budgetId)) {
						periodsByBudget.set(p.budgetId, []);
					}
					periodsByBudget.get(p.budgetId)!.push(p);
				}

				return {
					success: true as const,
					budgets: filtered.map((b) => {
						const periods = periodsByBudget.get(b.id) || [];
						const latestPeriod = periods[0];
						const metadata = b.metadata as { allocatedAmount?: number } | null;
						const allocated = latestPeriod?.allocatedAmount ?? metadata?.allocatedAmount ?? 0;
						const spent = Math.abs(latestPeriod?.actualAmount ?? 0);
						const remaining = allocated - spent;
						const percentUsed = allocated > 0 ? (spent / allocated) * 100 : 0;

						return {
							id: b.id,
							name: b.name,
							type: b.type,
							status: b.status,
							allocated: Number(allocated), // Amounts are stored in dollars (real type)
							spent: Number(spent),
							remaining: Number(remaining),
							percentUsed: Math.round(percentUsed),
							period: latestPeriod
								? { start: latestPeriod.startDate, end: latestPeriod.endDate }
								: null,
						};
					}),
				};
			},
		}),

		/**
		 * Get spending for a payee
		 */
		getPayeeSpending: tool({
			description: "Get total spending for a specific payee, optionally within a date range",
			inputSchema: jsonSchema<{ payeeName: string; startDate?: string; endDate?: string }>({
				type: "object",
				properties: {
					payeeName: { type: "string", description: "The name of the payee to look up" },
					startDate: { type: "string", description: "Start date in YYYY-MM-DD format" },
					endDate: { type: "string", description: "End date in YYYY-MM-DD format" },
				},
				required: ["payeeName"],
			}),
			execute: async ({ payeeName, startDate, endDate }) => {

				// Find matching payees
				const matchingPayees = await db
					.select({ id: payees.id, name: payees.name })
					.from(payees)
					.where(
						and(
							eq(payees.workspaceId, workspaceId),
							like(payees.name, `%${payeeName}%`),
							isNull(payees.deletedAt)
						)
					)
					.limit(5);

				if (matchingPayees.length === 0) {
					return { success: false as const, message: `No payees found matching "${payeeName}"` };
				}

				const payeeIds = matchingPayees.map((p) => p.id);

				// Filter through accounts since transactions don't have workspaceId directly
				const conditions: ReturnType<typeof eq>[] = [
					inArray(transactions.payeeId, payeeIds),
					eq(accounts.workspaceId, workspaceId),
					isNull(transactions.deletedAt),
				];

				if (startDate) {
					conditions.push(gte(transactions.date, startDate));
				}
				if (endDate) {
					conditions.push(lte(transactions.date, endDate));
				}

				const spending = await db
					.select({
						payeeId: transactions.payeeId,
						totalAmount: sql<number>`SUM(${transactions.amount})`,
						transactionCount: sql<number>`COUNT(*)`,
					})
					.from(transactions)
					.innerJoin(accounts, eq(transactions.accountId, accounts.id))
					.where(and(...conditions))
					.groupBy(transactions.payeeId);

				const payeeMap = new Map(matchingPayees.map((p) => [p.id, p.name]));

				return {
					success: true as const,
					payees: spending.map((s) => ({
						name: payeeMap.get(s.payeeId!) || "Unknown",
						totalSpent: Math.abs(Number(s.totalAmount)), // Amounts are stored in dollars (real type)
						transactionCount: Number(s.transactionCount),
					})),
				};
			},
		}),

		/**
		 * Get spending by category
		 */
		getCategorySpending: tool({
			description: "Get spending breakdown by category, optionally within a date range",
			inputSchema: jsonSchema<{ startDate?: string; endDate?: string; limit?: number }>({
				type: "object",
				properties: {
					startDate: { type: "string", description: "Start date in YYYY-MM-DD format" },
					endDate: { type: "string", description: "End date in YYYY-MM-DD format" },
					limit: { type: "number", description: "Maximum number of categories to return (default 10)" },
				},
			}),
			execute: async (params) => {
				const { startDate, endDate, limit = 10 } = params;

				// Filter through accounts since transactions don't have workspaceId directly
				const conditions: ReturnType<typeof eq>[] = [
					eq(accounts.workspaceId, workspaceId),
					isNull(transactions.deletedAt),
					sql`${transactions.amount} < 0`, // Only expenses
				];

				if (startDate) {
					conditions.push(gte(transactions.date, startDate));
				}
				if (endDate) {
					conditions.push(lte(transactions.date, endDate));
				}

				const spending = await db
					.select({
						categoryId: transactions.categoryId,
						categoryName: categories.name,
						totalAmount: sql<number>`SUM(ABS(${transactions.amount}))`,
						transactionCount: sql<number>`COUNT(*)`,
					})
					.from(transactions)
					.innerJoin(accounts, eq(transactions.accountId, accounts.id))
					.leftJoin(categories, eq(transactions.categoryId, categories.id))
					.where(and(...conditions))
					.groupBy(transactions.categoryId, categories.name)
					.orderBy(desc(sql`SUM(ABS(${transactions.amount}))`))
					.limit(limit);

				const total = spending.reduce((sum, s) => sum + Number(s.totalAmount), 0);

				return {
					success: true as const,
					categories: spending.map((s) => ({
						name: s.categoryName || "Uncategorized",
						totalSpent: Number(s.totalAmount), // Amounts are stored in dollars (real type)
						transactionCount: Number(s.transactionCount),
						percentOfTotal: total > 0 ? Math.round((Number(s.totalAmount) / total) * 100) : 0,
					})),
					totalSpending: total,
				};
			},
		}),

		// ============================================
		// WRITE TOOLS
		// ============================================

		/**
		 * Create a new budget
		 */
		createBudget: tool({
			description: "Create a new budget for tracking spending on a category",
			inputSchema: jsonSchema<{ name: string; categoryName: string; monthlyAmount: number }>({
				type: "object",
				properties: {
					name: { type: "string", description: "Name for the budget" },
					categoryName: { type: "string", description: "Category to track (must match an existing category)" },
					monthlyAmount: { type: "number", description: "Monthly budget amount in dollars" },
				},
				required: ["name", "categoryName", "monthlyAmount"],
			}),
			execute: async ({ name, categoryName, monthlyAmount }) => {

				// Find the category
				const matchingCategories = await db
					.select({ id: categories.id, name: categories.name })
					.from(categories)
					.where(
						and(
							eq(categories.workspaceId, workspaceId),
							like(categories.name, `%${categoryName}%`),
							isNull(categories.deletedAt)
						)
					)
					.limit(1);

				if (matchingCategories.length === 0) {
					return {
						success: false as const,
						message: `No category found matching "${categoryName}". Please check the category name.`,
					};
				}

				const category = matchingCategories[0]!;

				// Generate slug
				const slug = name
					.toLowerCase()
					.replace(/[^a-z0-9\s-]/g, "")
					.replace(/\s+/g, "-")
					.replace(/-+/g, "-")
					.trim();

				// Create the budget
				const [newBudget] = await db
					.insert(budgets)
					.values({
						workspaceId,
						name,
						slug,
						type: "category-envelope",
						scope: "category",
						status: "active",
						enforcementLevel: "warning",
						metadata: {
							allocatedAmount: monthlyAmount, // Amounts are stored in dollars (real type)
						},
					})
					.returning();

				if (!newBudget) {
					return { success: false as const, message: "Failed to create budget" };
				}

				// Link to category
				await db.insert(budgetCategories).values({
					budgetId: newBudget.id,
					categoryId: category.id,
				});

				// Create monthly period template
				await db.insert(budgetPeriodTemplates).values({
					budgetId: newBudget.id,
					type: "monthly",
					intervalCount: 1,
					startDayOfMonth: 1,
				});

				return {
					success: true as const,
					message: `Created budget "${name}" for ${category.name} with $${monthlyAmount}/month`,
					budget: {
						id: newBudget.id,
						name: newBudget.name,
						category: category.name,
						monthlyAmount,
					},
				};
			},
		}),

		/**
		 * Create a new payee
		 */
		createPayee: tool({
			description: "Create a new payee for tracking transactions",
			inputSchema: jsonSchema<{ name: string; defaultCategoryName?: string }>({
				type: "object",
				properties: {
					name: { type: "string", description: "Name of the payee/merchant" },
					defaultCategoryName: { type: "string", description: "Default category for transactions with this payee" },
				},
				required: ["name"],
			}),
			execute: async ({ name, defaultCategoryName }) => {
				try {
					console.log("[AI Tool] createPayee called with:", { name, defaultCategoryName, workspaceId });

					// Check if payee already exists
					const existing = await db
						.select({ id: payees.id })
						.from(payees)
						.where(
							and(
								eq(payees.workspaceId, workspaceId),
								eq(payees.name, name),
								isNull(payees.deletedAt)
							)
						)
						.limit(1);

					if (existing.length > 0) {
						console.log("[AI Tool] createPayee: Payee already exists");
						return {
							success: false as const,
							message: `Payee "${name}" already exists`,
						};
					}

					// Find default category if specified
					let defaultCategoryId: number | null = null;
					if (defaultCategoryName) {
						const matchingCategories = await db
							.select({ id: categories.id, name: categories.name })
							.from(categories)
							.where(
								and(
									eq(categories.workspaceId, workspaceId),
									like(categories.name, `%${defaultCategoryName}%`),
									isNull(categories.deletedAt)
								)
							)
							.limit(1);

						if (matchingCategories.length > 0) {
							defaultCategoryId = matchingCategories[0]!.id;
						}
					}

					// Generate slug
					const slug = name
						.toLowerCase()
						.replace(/[^a-z0-9\s-]/g, "")
						.replace(/\s+/g, "-")
						.replace(/-+/g, "-")
						.trim();

					console.log("[AI Tool] createPayee: Generated slug:", slug);

					// Create the payee
					const [newPayee] = await db
						.insert(payees)
						.values({
							workspaceId,
							name,
							slug,
							defaultCategoryId,
						})
						.returning();

					console.log("[AI Tool] createPayee: Insert result:", newPayee);

					if (!newPayee) {
						return { success: false as const, message: "Failed to create payee" };
					}

					return {
						success: true as const,
						message: `Created payee "${name}"${defaultCategoryId ? " with default category" : ""}`,
						payee: {
							id: newPayee.id,
							name: newPayee.name,
						},
					};
				} catch (error) {
					console.error("[AI Tool] createPayee error:", error);
					return {
						success: false as const,
						message: `Failed to create payee: ${error instanceof Error ? error.message : "Unknown error"}`,
					};
				}
			},
		}),

		/**
		 * Categorize a transaction
		 */
		categorizeTransaction: tool({
			description: "Update the category of a transaction",
			inputSchema: jsonSchema<{ transactionId: number; categoryName: string }>({
				type: "object",
				properties: {
					transactionId: { type: "number", description: "The ID of the transaction to categorize" },
					categoryName: { type: "string", description: "The name of the category to assign" },
				},
				required: ["transactionId", "categoryName"],
			}),
			execute: async ({ transactionId, categoryName }) => {

				// Verify transaction exists and belongs to workspace (via account)
				const txnResults = await db
					.select({
						id: transactions.id,
						payeeName: payees.name,
						currentCategory: categories.name,
					})
					.from(transactions)
					.innerJoin(accounts, eq(transactions.accountId, accounts.id))
					.leftJoin(payees, eq(transactions.payeeId, payees.id))
					.leftJoin(categories, eq(transactions.categoryId, categories.id))
					.where(
						and(
							eq(transactions.id, transactionId),
							eq(accounts.workspaceId, workspaceId),
							isNull(transactions.deletedAt)
						)
					)
					.limit(1);

				if (txnResults.length === 0) {
					return {
						success: false as const,
						message: `Transaction ${transactionId} not found`,
					};
				}

				const txn = txnResults[0]!;

				// Find the category
				const matchingCategories = await db
					.select({ id: categories.id, name: categories.name })
					.from(categories)
					.where(
						and(
							eq(categories.workspaceId, workspaceId),
							like(categories.name, `%${categoryName}%`),
							isNull(categories.deletedAt)
						)
					)
					.limit(1);

				if (matchingCategories.length === 0) {
					return {
						success: false as const,
						message: `No category found matching "${categoryName}"`,
					};
				}

				const category = matchingCategories[0]!;

				// Update the transaction
				await db
					.update(transactions)
					.set({ categoryId: category.id })
					.where(eq(transactions.id, transactionId));

				return {
					success: true as const,
					message: `Updated transaction from ${txn.currentCategory || "uncategorized"} to ${category.name}`,
					transaction: {
						id: transactionId,
						payee: txn.payeeName,
						previousCategory: txn.currentCategory,
						newCategory: category.name,
					},
				};
			},
		}),

		/**
		 * List available categories
		 */
		listCategories: tool({
			description: "List all available categories for categorizing transactions",
			inputSchema: jsonSchema<{ search?: string }>({
				type: "object",
				properties: {
					search: { type: "string", description: "Optional search term to filter categories" },
				},
			}),
			execute: async ({ search }) => {

				const conditions: ReturnType<typeof eq>[] = [
					eq(categories.workspaceId, workspaceId),
					isNull(categories.deletedAt),
				];

				if (search) {
					conditions.push(like(categories.name, `%${search}%`));
				}

				const results = await db
					.select({
						id: categories.id,
						name: categories.name,
						categoryType: categories.categoryType,
					})
					.from(categories)
					.where(and(...conditions))
					.orderBy(categories.categoryType, categories.name)
					.limit(50);

				return {
					success: true as const,
					count: results.length,
					categories: results.map((c) => ({
						id: c.id,
						name: c.name,
						type: c.categoryType,
					})),
				};
			},
		}),

		// ============================================
		// ML-POWERED INSIGHT TOOLS
		// ============================================

		/**
		 * Find opportunities to save money
		 */
		findSavingsOpportunities: tool({
			description: "Find opportunities to save money. Detects unused subscriptions, price increases on bills, duplicate streaming services, and bills that could be negotiated. Use when user asks about saving money, reducing expenses, or finding wasteful spending.",
			inputSchema: jsonSchema<{
				type?: "all" | "unused_subscription" | "price_increase" | "duplicate_service" | "negotiation_candidate";
			}>({
				type: "object",
				properties: {
					type: {
						type: "string",
						enum: ["all", "unused_subscription", "price_increase", "duplicate_service", "negotiation_candidate"],
						description: "Type of savings to look for (default: all)",
					},
				},
			}),
			execute: async ({ type = "all" }) => {
				try {
					console.log("[AI Tool] findSavingsOpportunities called with type:", type);

					const summary = await savingsService.getOpportunities(workspaceId);

					let opportunities = summary.opportunities;
					if (type !== "all") {
						opportunities = opportunities.filter((o) => o.type === type);
					}

					console.log("[AI Tool] findSavingsOpportunities found:", opportunities.length, "opportunities");

					return {
						success: true as const,
						totalMonthlyPotential: summary.totalMonthlyPotential,
						totalAnnualPotential: summary.totalAnnualPotential,
						count: opportunities.length,
						opportunities: opportunities.slice(0, 10).map((o) => ({
							title: o.title,
							type: o.type,
							priority: o.priority,
							estimatedMonthlySavings: o.estimatedMonthlySavings,
							estimatedAnnualSavings: o.estimatedAnnualSavings,
							description: o.description,
							payeeName: o.payeeName,
							suggestedActions: o.suggestedActions.slice(0, 3),
							confidence: o.confidence,
						})),
					};
				} catch (error) {
					console.error("[AI Tool] findSavingsOpportunities error:", error);
					return {
						success: false as const,
						message: `Failed to find savings opportunities: ${error instanceof Error ? error.message : "Unknown error"}`,
					};
				}
			},
		}),

		/**
		 * Detect recurring transactions like subscriptions and bills
		 */
		detectRecurringPatterns: tool({
			description: "Detect recurring transactions like subscriptions, bills, and regular payments. Use when user asks about subscriptions, recurring charges, regular payments, or 'what do I pay for monthly'.",
			inputSchema: jsonSchema<{
				payeeId?: number;
				frequency?: "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly" | "all";
			}>({
				type: "object",
				properties: {
					payeeId: { type: "number", description: "Optional: only check a specific payee" },
					frequency: {
						type: "string",
						enum: ["daily", "weekly", "biweekly", "monthly", "quarterly", "yearly", "all"],
						description: "Filter by frequency (default: all)",
					},
				},
			}),
			execute: async ({ payeeId, frequency = "all" }) => {
				try {
					console.log("[AI Tool] detectRecurringPatterns called with:", { payeeId, frequency });

					let patterns;
					if (payeeId) {
						patterns = await recurringService.detectForPayee(workspaceId, payeeId);
					} else {
						const result = await recurringService.detectPatterns(workspaceId, { minConfidence: 0.5 });
						patterns = result.patterns;
					}

					// Filter by frequency if specified
					if (frequency !== "all") {
						patterns = patterns.filter((p) => p.frequency === frequency);
					}

					console.log("[AI Tool] detectRecurringPatterns found:", patterns.length, "patterns");

					// Calculate summary stats
					const totalMonthlyValue = patterns.reduce((sum, p) => {
						const monthlyMultiplier = {
							daily: 30,
							weekly: 4.33,
							biweekly: 2.17,
							monthly: 1,
							quarterly: 0.33,
							yearly: 1 / 12,
							irregular: 30 / p.interval,
						}[p.frequency];
						return sum + Math.abs(p.averageAmount) * monthlyMultiplier;
					}, 0);

					return {
						success: true as const,
						count: patterns.length,
						totalMonthlyValue: Math.round(totalMonthlyValue * 100) / 100,
						patterns: patterns.slice(0, 15).map((p) => ({
							payeeName: p.payeeName,
							frequency: p.frequency,
							averageAmount: Math.abs(p.averageAmount),
							nextPredicted: p.nextPredicted,
							confidence: Math.round(p.confidence * 100),
							occurrenceCount: p.occurrenceCount,
							isActive: p.isActive,
							categoryName: p.categoryName,
							lastOccurrence: p.lastOccurrence,
						})),
						summary: {
							subscriptions: patterns.filter((p) => p.amountType === "exact" && Math.abs(p.averageAmount) < 100).length,
							bills: patterns.filter((p) => p.averageAmount < 0).length,
							income: patterns.filter((p) => p.averageAmount > 0).length,
						},
					};
				} catch (error) {
					console.error("[AI Tool] detectRecurringPatterns error:", error);
					return {
						success: false as const,
						message: `Failed to detect recurring patterns: ${error instanceof Error ? error.message : "Unknown error"}`,
					};
				}
			},
		}),

		/**
		 * Predict future cash flow
		 */
		predictCashFlow: tool({
			description: "Predict future cash flow based on historical spending patterns. Use when user asks about future finances, upcoming months, cash flow forecast, or 'will I have enough money'.",
			inputSchema: jsonSchema<{
				horizon?: number;
				granularity?: "daily" | "weekly" | "monthly";
			}>({
				type: "object",
				properties: {
					horizon: {
						type: "number",
						description: "Number of periods to predict (default: 30 for daily, 4 for weekly, 3 for monthly)",
					},
					granularity: {
						type: "string",
						enum: ["daily", "weekly", "monthly"],
						description: "Time granularity for predictions (default: monthly)",
					},
				},
			}),
			execute: async ({ horizon, granularity = "monthly" }) => {
				try {
					// Set default horizon based on granularity
					const defaultHorizon = granularity === "daily" ? 30 : granularity === "weekly" ? 4 : 3;
					const predictionHorizon = horizon ?? defaultHorizon;

					console.log("[AI Tool] predictCashFlow called with:", { horizon: predictionHorizon, granularity });

					const forecast = await forecastingService.predictCashFlow(workspaceId, {
						horizon: predictionHorizon,
						granularity,
					});

					console.log("[AI Tool] predictCashFlow generated:", forecast.predictions.length, "predictions");

					if (forecast.predictions.length === 0) {
						return {
							success: true as const,
							message: "Not enough historical data to generate predictions. Need at least 3 periods of transaction history.",
							predictions: [],
						};
					}

					return {
						success: true as const,
						confidence: Math.round(forecast.confidence * 100),
						predictionCount: forecast.predictions.length,
						predictions: forecast.predictions.map((p) => ({
							date: p.date,
							predictedAmount: Math.round(p.value * 100) / 100,
							lowerBound: Math.round(p.lowerBound * 100) / 100,
							upperBound: Math.round(p.upperBound * 100) / 100,
						})),
						incomePredictions: forecast.incomePredictions.slice(0, 5).map((p) => ({
							date: p.date,
							predictedAmount: Math.round(p.value * 100) / 100,
						})),
						expensePredictions: forecast.expensePredictions.slice(0, 5).map((p) => ({
							date: p.date,
							predictedAmount: Math.round(p.value * 100) / 100,
						})),
						summary: {
							avgPredictedCashFlow: Math.round(
								forecast.predictions.reduce((sum, p) => sum + p.value, 0) / forecast.predictions.length * 100
							) / 100,
							totalPredictedIncome: Math.round(
								forecast.incomePredictions.reduce((sum, p) => sum + p.value, 0) * 100
							) / 100,
							totalPredictedExpenses: Math.round(
								forecast.expensePredictions.reduce((sum, p) => sum + p.value, 0) * 100
							) / 100,
						},
					};
				} catch (error) {
					console.error("[AI Tool] predictCashFlow error:", error);
					return {
						success: false as const,
						message: `Failed to predict cash flow: ${error instanceof Error ? error.message : "Unknown error"}`,
					};
				}
			},
		}),

		/**
		 * Check for unusual or suspicious transactions
		 */
		checkForAnomalies: tool({
			description: "Check for unusual or potentially suspicious transactions. Use when user asks about suspicious activity, fraud detection, unusual spending, or anomalies.",
			inputSchema: jsonSchema<{
				days?: number;
				minRiskLevel?: "low" | "medium" | "high";
			}>({
				type: "object",
				properties: {
					days: {
						type: "number",
						description: "Number of days to scan (default: 7, max: 30)",
					},
					minRiskLevel: {
						type: "string",
						enum: ["low", "medium", "high"],
						description: "Minimum risk level to report (default: medium)",
					},
				},
			}),
			execute: async ({ days = 7, minRiskLevel = "medium" }) => {
				try {
					console.log("[AI Tool] checkForAnomalies called with:", { days, minRiskLevel });

					const anomalies = await anomalyService.scanRecentTransactions(workspaceId, {
						days: Math.min(days, 30),
						minRiskLevel,
						limit: 20,
					});

					console.log("[AI Tool] checkForAnomalies found:", anomalies.length, "anomalies");

					if (anomalies.length === 0) {
						return {
							success: true as const,
							message: `No ${minRiskLevel}+ risk transactions found in the last ${days} days.`,
							count: 0,
							anomalies: [],
						};
					}

					// Group by risk level
					const riskCounts = {
						critical: anomalies.filter((a) => a.riskLevel === "critical").length,
						high: anomalies.filter((a) => a.riskLevel === "high").length,
						medium: anomalies.filter((a) => a.riskLevel === "medium").length,
						low: anomalies.filter((a) => a.riskLevel === "low").length,
					};

					return {
						success: true as const,
						count: anomalies.length,
						riskSummary: riskCounts,
						anomalies: anomalies.slice(0, 10).map((a) => ({
							transactionId: a.transactionId,
							riskLevel: a.riskLevel,
							overallScore: Math.round(a.overallScore * 100),
							explanation: a.explanation,
							recommendedActions: a.recommendedActions.slice(0, 3),
							dimensions: {
								amount: {
									score: Math.round(a.dimensions.amount.score * 100),
									reason: a.dimensions.amount.reason,
								},
								timing: {
									score: Math.round(a.dimensions.timing.score * 100),
									reason: a.dimensions.timing.reason,
								},
								payee: {
									score: Math.round(a.dimensions.payee.score * 100),
									reason: a.dimensions.payee.reason,
								},
							},
						})),
					};
				} catch (error) {
					console.error("[AI Tool] checkForAnomalies error:", error);
					return {
						success: false as const,
						message: `Failed to check for anomalies: ${error instanceof Error ? error.message : "Unknown error"}`,
					};
				}
			},
		}),
	};
}

/**
 * Tool names for reference
 */
export const AI_TOOL_NAMES = [
	// Read-only tools
	"getAccountBalance",
	"getRecentTransactions",
	"searchTransactions",
	"getBudgetStatus",
	"getPayeeSpending",
	"getCategorySpending",
	// Write tools
	"createBudget",
	"createPayee",
	"categorizeTransaction",
	"listCategories",
	// ML-powered insight tools
	"findSavingsOpportunities",
	"detectRecurringPatterns",
	"predictCashFlow",
	"checkForAnomalies",
] as const;

export type AIToolName = (typeof AI_TOOL_NAMES)[number];
