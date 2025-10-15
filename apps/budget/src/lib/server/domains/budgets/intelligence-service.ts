/**
 * Budget Intelligence Service
 *
 * Provides intelligent budget detection and suggestion capabilities
 * for transactions based on multiple factors including payee defaults,
 * category mappings, account scope, and historical patterns.
 */

import {db} from "$lib/server/db";
import {budgets, budgetAccounts, budgetCategories, budgetTransactions} from "$lib/schema/budgets";
import {transactions} from "$lib/schema/transactions";
import {payees} from "$lib/schema/payees";
import {eq, and, desc, sql, inArray} from "drizzle-orm";
import {logger} from "$lib/server/shared/logging";

export interface BudgetSuggestion {
  budgetId: number;
  budgetName: string;
  confidence: number;
  reason: "payee_default" | "category_link" | "account_scope" | "historical_pattern";
  reasonText: string;
}

export interface DetectBudgetParams {
  accountId: number;
  categoryId?: number | null;
  payeeId?: number | null;
  amount: number;
  date: string;
}

export class BudgetIntelligenceService {
  /**
   * Detect and rank budget suggestions for a transaction
   */
  async detectBudgetsForTransaction(params: DetectBudgetParams): Promise<BudgetSuggestion[]> {
    const suggestions: BudgetSuggestion[] = [];

    try {
      // 1. Check payee default budget (highest priority)
      if (params.payeeId) {
        const payeeDefault = await this.detectFromPayeeDefault(params.payeeId);
        if (payeeDefault) suggestions.push(payeeDefault);
      }

      // 2. Check category budget links
      if (params.categoryId) {
        const categoryLinks = await this.detectFromCategoryLink(params.categoryId);
        suggestions.push(...categoryLinks);
      }

      // 3. Check account-level budgets
      const accountBudgets = await this.detectFromAccountScope(params.accountId);
      suggestions.push(...accountBudgets);

      // 4. Check historical patterns
      if (params.payeeId || params.categoryId) {
        const historical = await this.detectFromHistoricalPattern(
          params.payeeId,
          params.categoryId
        );
        if (historical) suggestions.push(historical);
      }

      // Deduplicate and sort by confidence
      // Note: Smart fallback removed - only suggest budgets with meaningful relationships
      return this.deduplicateAndSort(suggestions);
    } catch (error) {
      logger.error("Error detecting budgets for transaction", {error, params});
      return [];
    }
  }

  /**
   * Check if payee has a default budget
   */
  private async detectFromPayeeDefault(payeeId: number): Promise<BudgetSuggestion | null> {
    try {
      const result = await db
        .select({
          budgetId: budgets.id,
          budgetName: budgets.name,
          payeeDefaultBudgetId: payees.defaultBudgetId,
        })
        .from(payees)
        .innerJoin(budgets, eq(payees.defaultBudgetId, budgets.id))
        .where(and(eq(payees.id, payeeId), eq(budgets.status, "active")))
        .limit(1);

      const firstResult = result[0];
      if (firstResult && firstResult.budgetId) {
        return {
          budgetId: firstResult.budgetId,
          budgetName: firstResult.budgetName,
          confidence: 95,
          reason: "payee_default",
          reasonText: "Default budget for this payee",
        };
      }
    } catch (error) {
      logger.warn("Error detecting payee default budget", {error, payeeId});
    }

    return null;
  }

  /**
   * Find budgets linked to the transaction's category
   */
  private async detectFromCategoryLink(categoryId: number): Promise<BudgetSuggestion[]> {
    try {
      const results = await db
        .select({
          budgetId: budgets.id,
          budgetName: budgets.name,
        })
        .from(budgetCategories)
        .innerJoin(budgets, eq(budgetCategories.budgetId, budgets.id))
        .where(and(eq(budgetCategories.categoryId, categoryId), eq(budgets.status, "active")))
        .limit(3);

      return results.map((result) => ({
        budgetId: result.budgetId,
        budgetName: result.budgetName,
        confidence: 85,
        reason: "category_link" as const,
        reasonText: "Budget linked to transaction category",
      }));
    } catch (error) {
      logger.warn("Error detecting category-linked budgets", {error, categoryId});
      return [];
    }
  }

  /**
   * Find account-level budgets
   */
  private async detectFromAccountScope(accountId: number): Promise<BudgetSuggestion[]> {
    try {
      const results = await db
        .select({
          budgetId: budgets.id,
          budgetName: budgets.name,
        })
        .from(budgetAccounts)
        .innerJoin(budgets, eq(budgetAccounts.budgetId, budgets.id))
        .where(and(eq(budgetAccounts.accountId, accountId), eq(budgets.status, "active")))
        .limit(3);

      return results.map((result) => ({
        budgetId: result.budgetId,
        budgetName: result.budgetName,
        confidence: 75,
        reason: "account_scope" as const,
        reasonText: "Account-level budget",
      }));
    } catch (error) {
      logger.warn("Error detecting account-scope budgets", {error, accountId});
      return [];
    }
  }

  /**
   * Analyze historical transaction patterns
   */
  private async detectFromHistoricalPattern(
    payeeId: number | null | undefined,
    categoryId: number | null | undefined
  ): Promise<BudgetSuggestion | null> {
    if (!payeeId && !categoryId) return null;

    try {
      // Find last 10 transactions with same payee and/or category
      const conditions = [];
      if (payeeId) conditions.push(eq(transactions.payeeId, payeeId));
      if (categoryId) conditions.push(eq(transactions.categoryId, categoryId));

      const recentTransactions = await db
        .select({
          transactionId: transactions.id,
        })
        .from(transactions)
        .where(and(...conditions))
        .orderBy(desc(transactions.date))
        .limit(10);

      if (recentTransactions.length < 3) return null; // Need at least 3 transactions for pattern

      // Get budget allocations for these transactions
      const transactionIds = recentTransactions.map((t) => t.transactionId);
      const allocations = await db
        .select({
          budgetId: budgetTransactions.budgetId,
          budgetName: budgets.name,
        })
        .from(budgetTransactions)
        .innerJoin(budgets, eq(budgetTransactions.budgetId, budgets.id))
        .where(and(inArray(budgetTransactions.transactionId, transactionIds), eq(budgets.status, "active")));

      // Count budget occurrences
      const budgetCounts = new Map<number, {name: string; count: number}>();
      for (const allocation of allocations) {
        const current = budgetCounts.get(allocation.budgetId) || {
          name: allocation.budgetName,
          count: 0,
        };
        current.count++;
        budgetCounts.set(allocation.budgetId, current);
      }

      // Find budget with highest occurrence
      let maxBudget: {id: number; name: string; count: number} | null = null;
      for (const [budgetId, {name, count}] of budgetCounts.entries()) {
        if (!maxBudget || count > maxBudget.count) {
          maxBudget = {id: budgetId, name, count};
        }
      }

      // If this budget appears in 70%+ of transactions, suggest it
      if (maxBudget && maxBudget.count / recentTransactions.length >= 0.7) {
        const confidence = Math.min(65, Math.round((maxBudget.count / recentTransactions.length) * 100));
        return {
          budgetId: maxBudget.id,
          budgetName: maxBudget.name,
          confidence,
          reason: "historical_pattern",
          reasonText: `Used in ${maxBudget.count} of last ${recentTransactions.length} similar transactions`,
        };
      }
    } catch (error) {
      logger.warn("Error detecting historical pattern budget", {error, payeeId, categoryId});
    }

    return null;
  }

  /**
   * Deduplicate suggestions and sort by confidence
   */
  private deduplicateAndSort(suggestions: BudgetSuggestion[]): BudgetSuggestion[] {
    const uniqueSuggestions = new Map<number, BudgetSuggestion>();

    for (const suggestion of suggestions) {
      const existing = uniqueSuggestions.get(suggestion.budgetId);

      // Keep the suggestion with highest confidence
      if (!existing || suggestion.confidence > existing.confidence) {
        uniqueSuggestions.set(suggestion.budgetId, suggestion);
      }
    }

    // Sort by confidence descending
    return Array.from(uniqueSuggestions.values()).sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get the top budget suggestion (highest confidence)
   */
  async getTopBudgetSuggestion(params: DetectBudgetParams): Promise<BudgetSuggestion | null> {
    const suggestions = await this.detectBudgetsForTransaction(params);
    return suggestions[0] ?? null;
  }

  /**
   * Detect budgets for multiple transactions (bulk operation for imports)
   */
  async detectBudgetsForTransactions(
    transactions: Array<{
      id?: number;
      accountId: number;
      categoryId?: number | null;
      payeeId?: number | null;
      amount: number;
      date: string;
    }>
  ): Promise<
    Array<{
      transactionIndex: number;
      transactionId?: number;
      suggestions: BudgetSuggestion[];
      topSuggestion: BudgetSuggestion | null;
    }>
  > {
    const results = [];

    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i];
      if (!transaction) continue;

      try {
        const suggestions = await this.detectBudgetsForTransaction({
          accountId: transaction.accountId,
          categoryId: transaction.categoryId ?? null,
          payeeId: transaction.payeeId ?? null,
          amount: transaction.amount,
          date: transaction.date,
        });

        const result: {
          transactionIndex: number;
          transactionId?: number;
          suggestions: BudgetSuggestion[];
          topSuggestion: BudgetSuggestion | null;
        } = {
          transactionIndex: i,
          suggestions,
          topSuggestion: suggestions[0] ?? null,
        };

        if (transaction.id !== undefined) {
          result.transactionId = transaction.id;
        }

        results.push(result);
      } catch (error) {
        logger.warn("Error detecting budgets for transaction", {
          error,
          transactionIndex: i,
          transactionId: transaction.id,
        });

        const result: {
          transactionIndex: number;
          transactionId?: number;
          suggestions: BudgetSuggestion[];
          topSuggestion: BudgetSuggestion | null;
        } = {
          transactionIndex: i,
          suggestions: [],
          topSuggestion: null,
        };

        if (transaction.id !== undefined) {
          result.transactionId = transaction.id;
        }

        results.push(result);
      }
    }

    return results;
  }
}
