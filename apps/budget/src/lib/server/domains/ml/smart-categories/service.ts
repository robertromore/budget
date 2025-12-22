/**
 * Smart Category Suggestions Service
 *
 * Provides intelligent category suggestions based on:
 * - Payee/merchant name similarity (existing)
 * - Amount patterns (large deposits → Income, small recurring → Subscriptions)
 * - Time/day patterns (weekend spending, payday patterns, seasonal)
 * - Historical user behavior and corrections
 */

import { accounts, categories, payees, transactions } from "$lib/schema";
import { db } from "$lib/server/db";
import { and, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import type { MLModelStore } from "../model-store";
import { createSimilarityService, type SimilarityService } from "../similarity/service";
import { extractMerchantName, normalizeMerchantName } from "../similarity/text-similarity";

// =============================================================================
// Types
// =============================================================================

export interface SmartCategorySuggestion {
  categoryId: number;
  categoryName: string;
  categoryType: "income" | "expense" | "transfer" | "savings";
  confidence: number;
  reason: string;
  reasonCode: SuggestionReasonCode;
  factors: SuggestionFactor[];
}

export type SuggestionReasonCode =
  | "payee_match"
  | "amount_pattern"
  | "time_pattern"
  | "historical_pattern"
  | "default_income"
  | "default_expense"
  | "subscription_pattern"
  | "paycheck_pattern";

export interface SuggestionFactor {
  type: "payee" | "amount" | "time" | "historical" | "pattern";
  description: string;
  weight: number;
}

export interface CategoryTransactionContext {
  description: string;
  amount: number;
  date: string; // ISO date string
  payeeId?: number;
  payeeName?: string;
  memo?: string;
  isRecurring?: boolean;
}

export interface SmartCategoryConfig {
  // Thresholds
  minConfidenceToSuggest: number;
  payeeMatchWeight: number;
  amountPatternWeight: number;
  timePatternWeight: number;
  historicalWeight: number;

  // Amount pattern detection
  largeDepositThreshold: number; // Amount above which deposits are likely income
  smallRecurringThreshold: number; // Amount below which recurring is likely subscriptions
  subscriptionMinAmount: number;
  subscriptionMaxAmount: number;

  // Time pattern detection
  paydayDayOfMonth: number[]; // Common payday dates (1, 15, last day)
  weekendCategories: string[]; // Categories more common on weekends
}

const DEFAULT_CONFIG: SmartCategoryConfig = {
  minConfidenceToSuggest: 0.3,
  payeeMatchWeight: 0.4,
  amountPatternWeight: 0.25,
  timePatternWeight: 0.15,
  historicalWeight: 0.2,

  largeDepositThreshold: 500,
  smallRecurringThreshold: 50,
  subscriptionMinAmount: 5,
  subscriptionMaxAmount: 200,

  paydayDayOfMonth: [1, 15, 28, 29, 30, 31],
  weekendCategories: ["Dining Out", "Entertainment", "Recreation", "Shopping"],
};

// Amount-based category hints
const AMOUNT_CATEGORY_HINTS: Array<{
  pattern: "deposit" | "withdrawal";
  minAmount?: number;
  maxAmount?: number;
  categoryTypes: Array<"income" | "expense" | "transfer" | "savings">;
  categoryKeywords: string[];
  confidence: number;
  reason: string;
}> = [
  // Large deposits → Income
  {
    pattern: "deposit",
    minAmount: 500,
    categoryTypes: ["income"],
    categoryKeywords: ["salary", "paycheck", "income", "wages", "earnings", "payment received"],
    confidence: 0.7,
    reason: "Large deposit typically indicates income",
  },
  // Medium deposits → Could be income or refunds
  {
    pattern: "deposit",
    minAmount: 100,
    maxAmount: 500,
    categoryTypes: ["income", "expense"],
    categoryKeywords: ["refund", "rebate", "reimbursement", "income", "side", "freelance"],
    confidence: 0.4,
    reason: "Medium deposit could be refund or side income",
  },
  // Small recurring amounts → Subscriptions
  {
    pattern: "withdrawal",
    minAmount: 5,
    maxAmount: 50,
    categoryTypes: ["expense"],
    categoryKeywords: ["subscription", "streaming", "service", "membership", "monthly"],
    confidence: 0.5,
    reason: "Small recurring amount suggests subscription",
  },
  // Very small amounts → Tips, fees, or small purchases
  {
    pattern: "withdrawal",
    maxAmount: 10,
    categoryTypes: ["expense"],
    categoryKeywords: ["tip", "fee", "coffee", "snack", "food", "dining"],
    confidence: 0.3,
    reason: "Small purchase amount",
  },
  // Large withdrawals → Major expenses
  {
    pattern: "withdrawal",
    minAmount: 500,
    categoryTypes: ["expense"],
    categoryKeywords: ["rent", "mortgage", "insurance", "utilities", "car", "medical", "healthcare"],
    confidence: 0.4,
    reason: "Large expense typically indicates major bills",
  },
];

// Day-of-week patterns
const DAY_PATTERNS: Array<{
  days: number[]; // 0 = Sunday, 6 = Saturday
  categoryKeywords: string[];
  confidence: number;
  reason: string;
}> = [
  // Weekend spending patterns
  {
    days: [0, 6], // Saturday, Sunday
    categoryKeywords: ["dining", "restaurant", "entertainment", "recreation", "shopping", "groceries"],
    confidence: 0.2,
    reason: "Weekend spending pattern",
  },
  // Weekday patterns
  {
    days: [1, 2, 3, 4, 5], // Monday-Friday
    categoryKeywords: ["lunch", "coffee", "commute", "transportation", "parking"],
    confidence: 0.15,
    reason: "Weekday expense pattern",
  },
];

// Day-of-month patterns
const MONTHLY_PATTERNS: Array<{
  daysOfMonth: number[];
  categoryKeywords: string[];
  categoryTypes: Array<"income" | "expense" | "transfer" | "savings">;
  confidence: number;
  reason: string;
}> = [
  // Beginning of month (rent, bills)
  {
    daysOfMonth: [1, 2, 3, 4, 5],
    categoryKeywords: ["rent", "mortgage", "insurance", "bills", "utilities"],
    categoryTypes: ["expense"],
    confidence: 0.3,
    reason: "Beginning of month bills",
  },
  // Mid-month (paycheck, bills)
  {
    daysOfMonth: [14, 15, 16],
    categoryKeywords: ["paycheck", "salary", "income", "utilities", "bills"],
    categoryTypes: ["income", "expense"],
    confidence: 0.3,
    reason: "Mid-month paycheck or bills",
  },
  // End of month (paycheck)
  {
    daysOfMonth: [28, 29, 30, 31],
    categoryKeywords: ["paycheck", "salary", "income", "rent", "mortgage"],
    categoryTypes: ["income", "expense"],
    confidence: 0.25,
    reason: "End of month paycheck or rent",
  },
];

// =============================================================================
// Smart Category Service
// =============================================================================

export interface SmartCategoryService {
  /**
   * Get smart category suggestions for a transaction
   */
  suggestCategory(
    workspaceId: number,
    context: CategoryTransactionContext
  ): Promise<SmartCategorySuggestion[]>;

  /**
   * Get multiple suggestions ranked by confidence
   */
  suggestCategories(
    workspaceId: number,
    context: CategoryTransactionContext,
    limit?: number
  ): Promise<SmartCategorySuggestion[]>;

  /**
   * Analyze a transaction to determine likely category type (income/expense)
   */
  analyzeTransactionType(
    context: CategoryTransactionContext
  ): { type: "income" | "expense" | "transfer"; confidence: number; reason: string };

  /**
   * Detect if transaction is likely a subscription
   */
  detectSubscription(
    workspaceId: number,
    context: CategoryTransactionContext
  ): Promise<{
    isSubscription: boolean;
    confidence: number;
    suggestedCategory?: SmartCategorySuggestion;
  }>;

  /**
   * Get time-based category adjustments
   */
  getTimeBasedHints(
    context: CategoryTransactionContext
  ): { categoryKeywords: string[]; confidence: number; reason: string }[];

  /**
   * Learn from user category selection (for future improvements)
   */
  recordUserSelection(
    workspaceId: number,
    context: CategoryTransactionContext,
    selectedCategoryId: number,
    suggestedCategoryId?: number
  ): Promise<void>;
}

/**
 * Create the smart category service
 */
export function createSmartCategoryService(
  modelStore: MLModelStore,
  config: Partial<SmartCategoryConfig> = {}
): SmartCategoryService {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Initialize similarity service for payee-based suggestions
  let similarityService: SimilarityService | null = null;

  function getSimilarityService(): SimilarityService {
    if (!similarityService) {
      similarityService = createSimilarityService(modelStore);
    }
    return similarityService;
  }

  /**
   * Get amount-based suggestions
   */
  function getAmountBasedSuggestions(
    context: CategoryTransactionContext
  ): { categoryKeywords: string[]; categoryTypes: Array<"income" | "expense" | "transfer" | "savings">; confidence: number; reason: string }[] {
    const amount = Math.abs(context.amount);
    const isDeposit = context.amount > 0;
    const pattern = isDeposit ? "deposit" : "withdrawal";

    const results: { categoryKeywords: string[]; categoryTypes: Array<"income" | "expense" | "transfer" | "savings">; confidence: number; reason: string }[] = [];

    for (const hint of AMOUNT_CATEGORY_HINTS) {
      if (hint.pattern !== pattern) continue;
      if (hint.minAmount !== undefined && amount < hint.minAmount) continue;
      if (hint.maxAmount !== undefined && amount > hint.maxAmount) continue;

      results.push({
        categoryKeywords: hint.categoryKeywords,
        categoryTypes: hint.categoryTypes,
        confidence: hint.confidence,
        reason: hint.reason,
      });
    }

    return results;
  }

  /**
   * Get time-based suggestions
   */
  function getTimeBasedSuggestions(
    context: CategoryTransactionContext
  ): { categoryKeywords: string[]; categoryTypes?: Array<"income" | "expense" | "transfer" | "savings">; confidence: number; reason: string }[] {
    const date = new Date(context.date);
    const dayOfWeek = date.getDay();
    const dayOfMonth = date.getDate();

    const results: { categoryKeywords: string[]; categoryTypes?: Array<"income" | "expense" | "transfer" | "savings">; confidence: number; reason: string }[] = [];

    // Check day of week patterns
    for (const pattern of DAY_PATTERNS) {
      if (pattern.days.includes(dayOfWeek)) {
        results.push({
          categoryKeywords: pattern.categoryKeywords,
          confidence: pattern.confidence,
          reason: pattern.reason,
        });
      }
    }

    // Check day of month patterns
    for (const pattern of MONTHLY_PATTERNS) {
      if (pattern.daysOfMonth.includes(dayOfMonth)) {
        results.push({
          categoryKeywords: pattern.categoryKeywords,
          categoryTypes: pattern.categoryTypes,
          confidence: pattern.confidence,
          reason: pattern.reason,
        });
      }
    }

    return results;
  }

  /**
   * Load workspace categories
   */
  async function loadCategories(workspaceId: number) {
    return db
      .select({
        id: categories.id,
        name: categories.name,
        categoryType: categories.categoryType,
        parentId: categories.parentId,
        spendingPriority: categories.spendingPriority,
        incomeReliability: categories.incomeReliability,
      })
      .from(categories)
      .where(and(eq(categories.workspaceId, workspaceId), isNull(categories.deletedAt)));
  }

  /**
   * Score a category against keywords
   */
  function scoreCategory(
    categoryName: string,
    keywords: string[]
  ): number {
    const normalizedName = categoryName.toLowerCase();
    let score = 0;

    for (const keyword of keywords) {
      if (normalizedName.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }

    return Math.min(score / Math.max(keywords.length, 1), 1);
  }

  return {
    async suggestCategory(
      workspaceId: number,
      context: CategoryTransactionContext
    ): Promise<SmartCategorySuggestion[]> {
      return this.suggestCategories(workspaceId, context, 5);
    },

    async suggestCategories(
      workspaceId: number,
      context: CategoryTransactionContext,
      limit: number = 5
    ): Promise<SmartCategorySuggestion[]> {
      const workspaceCategories = await loadCategories(workspaceId);
      if (workspaceCategories.length === 0) {
        return [];
      }

      // Build a map of category scores
      const categoryScores = new Map<number, {
        category: typeof workspaceCategories[0];
        score: number;
        factors: SuggestionFactor[];
        primaryReason: string;
        primaryReasonCode: SuggestionReasonCode;
      }>();

      // Initialize all categories
      for (const cat of workspaceCategories) {
        categoryScores.set(cat.id, {
          category: cat,
          score: 0,
          factors: [],
          primaryReason: "",
          primaryReasonCode: "default_expense",
        });
      }

      // 1. Payee-based suggestions (highest weight)
      const payeeName = context.payeeName || extractMerchantName(context.description);
      const simService = getSimilarityService();
      const payeeSuggestion = await simService.suggestCategoryByPayee(workspaceId, payeeName);

      if (payeeSuggestion) {
        const entry = categoryScores.get(payeeSuggestion.categoryId);
        if (entry) {
          const weight = cfg.payeeMatchWeight * payeeSuggestion.confidence;
          entry.score += weight;
          entry.factors.push({
            type: "payee",
            description: `Similar payees use this category (${Math.round(payeeSuggestion.confidence * 100)}% match)`,
            weight,
          });
          if (weight > 0.2) {
            entry.primaryReason = `Matches payee pattern for "${normalizeMerchantName(payeeName)}"`;
            entry.primaryReasonCode = "payee_match";
          }
        }
      }

      // 2. Amount-based suggestions
      const amountHints = getAmountBasedSuggestions(context);
      for (const hint of amountHints) {
        for (const [catId, entry] of categoryScores) {
          // Check if category type matches
          const typeMatch = hint.categoryTypes.includes(entry.category.categoryType as "income" | "expense" | "transfer" | "savings");
          if (!typeMatch) continue;

          // Score based on keyword match
          const keywordScore = entry.category.name
            ? scoreCategory(entry.category.name, hint.categoryKeywords)
            : 0;

          if (keywordScore > 0) {
            const weight = cfg.amountPatternWeight * hint.confidence * keywordScore;
            entry.score += weight;
            entry.factors.push({
              type: "amount",
              description: hint.reason,
              weight,
            });

            if (weight > 0.15 && !entry.primaryReason) {
              entry.primaryReason = hint.reason;
              entry.primaryReasonCode = "amount_pattern";
            }
          }
        }
      }

      // 3. Time-based suggestions
      const timeHints = getTimeBasedSuggestions(context);
      for (const hint of timeHints) {
        for (const [catId, entry] of categoryScores) {
          // Check if category type matches (if specified)
          if (hint.categoryTypes) {
            const typeMatch = hint.categoryTypes.includes(entry.category.categoryType as "income" | "expense" | "transfer" | "savings");
            if (!typeMatch) continue;
          }

          // Score based on keyword match
          const keywordScore = entry.category.name
            ? scoreCategory(entry.category.name, hint.categoryKeywords)
            : 0;

          if (keywordScore > 0) {
            const weight = cfg.timePatternWeight * hint.confidence * keywordScore;
            entry.score += weight;
            entry.factors.push({
              type: "time",
              description: hint.reason,
              weight,
            });

            if (weight > 0.1 && !entry.primaryReason) {
              entry.primaryReason = hint.reason;
              entry.primaryReasonCode = "time_pattern";
            }
          }
        }
      }

      // 4. Historical patterns - look at similar amount transactions
      const amount = Math.abs(context.amount);
      const amountRange = amount * 0.1; // ±10% range

      const similarTransactions = await db
        .select({
          categoryId: transactions.categoryId,
          count: sql<number>`count(*)`.as("count"),
        })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(
          and(
            eq(accounts.workspaceId, workspaceId),
            gte(sql`abs(${transactions.amount})`, amount - amountRange),
            lte(sql`abs(${transactions.amount})`, amount + amountRange),
            sql`${transactions.categoryId} IS NOT NULL`
          )
        )
        .groupBy(transactions.categoryId)
        .orderBy(desc(sql`count(*)`))
        .limit(5);

      const totalSimilar = similarTransactions.reduce((sum, t) => sum + (t.count || 0), 0);

      for (const txn of similarTransactions) {
        if (!txn.categoryId) continue;
        const entry = categoryScores.get(txn.categoryId);
        if (entry && totalSimilar > 0) {
          const proportion = (txn.count || 0) / totalSimilar;
          const weight = cfg.historicalWeight * proportion;
          entry.score += weight;
          entry.factors.push({
            type: "historical",
            description: `${txn.count} similar transactions used this category`,
            weight,
          });

          if (weight > 0.1 && !entry.primaryReason) {
            entry.primaryReason = "Based on similar transaction amounts";
            entry.primaryReasonCode = "historical_pattern";
          }
        }
      }

      // 5. Apply default category type boost based on transaction direction
      const isIncome = context.amount > 0;
      for (const [catId, entry] of categoryScores) {
        const matchesDirection =
          (isIncome && entry.category.categoryType === "income") ||
          (!isIncome && entry.category.categoryType === "expense");

        if (matchesDirection && entry.score === 0) {
          // Small boost for correct type if no other signals
          entry.score = 0.1;
          entry.primaryReason = isIncome ? "Default income category" : "Default expense category";
          entry.primaryReasonCode = isIncome ? "default_income" : "default_expense";
        }
      }

      // Sort and filter results
      const results: SmartCategorySuggestion[] = [];

      const sortedEntries = Array.from(categoryScores.values())
        .filter((e) => e.score >= cfg.minConfidenceToSuggest)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      for (const entry of sortedEntries) {
        if (!entry.category.name) continue;

        results.push({
          categoryId: entry.category.id,
          categoryName: entry.category.name,
          categoryType: entry.category.categoryType as "income" | "expense" | "transfer" | "savings",
          confidence: Math.min(entry.score, 0.95),
          reason: entry.primaryReason || "Pattern match",
          reasonCode: entry.primaryReasonCode,
          factors: entry.factors.sort((a, b) => b.weight - a.weight),
        });
      }

      return results;
    },

    analyzeTransactionType(
      context: CategoryTransactionContext
    ): { type: "income" | "expense" | "transfer"; confidence: number; reason: string } {
      const amount = context.amount;

      if (amount > 0) {
        // Positive amount = deposit
        if (amount >= cfg.largeDepositThreshold) {
          return {
            type: "income",
            confidence: 0.85,
            reason: "Large deposit amount suggests income",
          };
        }
        return {
          type: "income",
          confidence: 0.7,
          reason: "Deposit transaction",
        };
      } else {
        // Negative amount = withdrawal
        return {
          type: "expense",
          confidence: 0.9,
          reason: "Withdrawal transaction",
        };
      }
    },

    async detectSubscription(
      workspaceId: number,
      context: CategoryTransactionContext
    ): Promise<{
      isSubscription: boolean;
      confidence: number;
      suggestedCategory?: SmartCategorySuggestion;
    }> {
      const amount = Math.abs(context.amount);

      // Check if amount is in subscription range
      if (amount < cfg.subscriptionMinAmount || amount > cfg.subscriptionMaxAmount) {
        return { isSubscription: false, confidence: 0 };
      }

      // Only withdrawals can be subscriptions
      if (context.amount > 0) {
        return { isSubscription: false, confidence: 0 };
      }

      // Look for recurring patterns with same payee and similar amount
      const payeeName = context.payeeName || extractMerchantName(context.description);
      const normalizedPayee = normalizeMerchantName(payeeName);

      // Find matching payee
      const matchingPayees = await db
        .select({ id: payees.id })
        .from(payees)
        .where(
          and(
            eq(payees.workspaceId, workspaceId),
            sql`lower(${payees.name}) LIKE ${`%${normalizedPayee.toLowerCase()}%`}`
          )
        )
        .limit(5);

      if (matchingPayees.length === 0) {
        // New payee, lower confidence
        return {
          isSubscription: false,
          confidence: 0.2,
        };
      }

      const payeeIds = matchingPayees.map((p) => p.id);
      const amountRange = amount * 0.05; // ±5% variance

      // Count recent similar transactions
      const recentCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(
          and(
            eq(accounts.workspaceId, workspaceId),
            inArray(transactions.payeeId, payeeIds),
            gte(sql`abs(${transactions.amount})`, amount - amountRange),
            lte(sql`abs(${transactions.amount})`, amount + amountRange),
            gte(transactions.date, sql`date('now', '-90 days')`)
          )
        );

      const count = recentCount[0]?.count || 0;

      if (count >= 2) {
        // Found recurring pattern
        const suggestions = await this.suggestCategories(workspaceId, context, 1);

        return {
          isSubscription: true,
          confidence: Math.min(0.5 + count * 0.15, 0.95),
          suggestedCategory: suggestions[0],
        };
      }

      return {
        isSubscription: false,
        confidence: 0.3,
      };
    },

    getTimeBasedHints(
      context: CategoryTransactionContext
    ): { categoryKeywords: string[]; confidence: number; reason: string }[] {
      return getTimeBasedSuggestions(context);
    },

    async recordUserSelection(
      workspaceId: number,
      context: CategoryTransactionContext,
      selectedCategoryId: number,
      suggestedCategoryId?: number
    ): Promise<void> {
      // This could be expanded to store learning data
      // For now, we rely on the existing user behavior tracking
      // The data is implicitly captured through transaction categorization

      // Future: Store in a learning table for smarter suggestions
      // await modelStore.saveModel(workspaceId, {
      //   modelType: "category_learning",
      //   modelName: "user_selection",
      //   parameters: {
      //     context,
      //     selectedCategoryId,
      //     suggestedCategoryId,
      //     wasCorrection: suggestedCategoryId !== selectedCategoryId,
      //   },
      // });
    },
  };
}
