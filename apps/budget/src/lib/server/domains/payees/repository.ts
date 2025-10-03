import {db} from "$lib/server/db";
import {payees, transactions, categories, budgets} from "$lib/schema";
import {eq, and, isNull, like, inArray, sql, count, desc, avg, max, min} from "drizzle-orm";
import type {Payee, NewPayee, PayeeType, PaymentFrequency} from "$lib/schema";
import type {
  SubscriptionInfo,
  PayeeAddress,
  PaymentMethodReference,
  PayeeTags
} from "./types";
import {logger} from "$lib/server/shared/logging";
import {NotFoundError} from "$lib/server/shared/types/errors";
import {getCurrentTimestamp, currentDate} from "$lib/utils/dates";

export interface UpdatePayeeData {
  name?: string | undefined;
  notes?: string | null | undefined;
  defaultCategoryId?: number | null | undefined;
  defaultBudgetId?: number | null | undefined;
  payeeType?: PayeeType | null | undefined;
  avgAmount?: number | null | undefined;
  paymentFrequency?: PaymentFrequency | null | undefined;
  lastTransactionDate?: string | null | undefined;
  taxRelevant?: boolean | undefined;
  isActive?: boolean | undefined;
  website?: string | null | undefined;
  phone?: string | null | undefined;
  email?: string | null | undefined;
  address?: PayeeAddress | null | undefined;
  accountNumber?: string | null | undefined;
  alertThreshold?: number | null | undefined;
  isSeasonal?: boolean | undefined;
  subscriptionInfo?: SubscriptionInfo | null | undefined;
  tags?: PayeeTags | null | undefined;
  preferredPaymentMethods?: PaymentMethodReference[] | null | undefined;
  merchantCategoryCode?: string | null | undefined;
}

export interface PayeeStats {
  transactionCount: number;
  totalAmount: number;
  avgAmount: number;
  minAmount: number;
  maxAmount: number;
  lastTransactionDate: string | null;
  firstTransactionDate: string | null;
  monthlyAverage: number;
  categoryDistribution: Array<{categoryId: number; categoryName: string; count: number; totalAmount: number}>;
}

export interface PayeeSuggestions {
  suggestedCategoryId: number | null;
  suggestedCategoryName: string | null;
  suggestedBudgetId: number | null;
  suggestedBudgetName: string | null;
  suggestedAmount: number | null;
  suggestedFrequency: PaymentFrequency | null;
  confidence: number; // 0-1 score based on transaction history
}

export interface PayeeIntelligence {
  payeeId: number;
  payeeName: string;
  stats: PayeeStats;
  suggestions: PayeeSuggestions;
  patterns: {
    isRegular: boolean;
    averageDaysBetween: number | null;
    mostCommonDay: number | null; // 0-6 for Sunday-Saturday
    seasonalTrends: Array<{month: number; avgAmount: number; count: number}>;
  };
}

export interface PayeeSearchFilters {
  query?: string | undefined;
  payeeType?: PayeeType | undefined;
  isActive?: boolean | undefined;
  taxRelevant?: boolean | undefined;
  hasDefaultCategory?: boolean | undefined;
  hasDefaultBudget?: boolean | undefined;
  minAvgAmount?: number | undefined;
  maxAvgAmount?: number | undefined;
  paymentFrequency?: PaymentFrequency | undefined;
  lastTransactionBefore?: string | undefined;
  lastTransactionAfter?: string | undefined;
}

/**
 * Repository for payee database operations
 */
export class PayeeRepository {
  /**
   * Create a new payee
   */
  async create(data: NewPayee): Promise<Payee> {
    const [payee] = await db
      .insert(payees)
      .values(data)
      .returning();

    if (!payee) {
      throw new Error("Failed to create payee");
    }

    return payee;
  }

  /**
   * Find payee by ID
   */
  async findById(id: number): Promise<Payee | null> {
    const [payee] = await db
      .select()
      .from(payees)
      .where(and(eq(payees.id, id), isNull(payees.deletedAt)))
      .limit(1);

    return payee || null;
  }

  /**
   * Find all active payees
   */
  async findAll(): Promise<Payee[]> {
    return await db
      .select()
      .from(payees)
      .where(isNull(payees.deletedAt))
      .orderBy(payees.name);
  }

  /**
   * Update payee
   */
  async update(id: number, data: UpdatePayeeData): Promise<Payee> {
    const [payee] = await db
      .update(payees)
      .set({
        ...data,
        updatedAt: getCurrentTimestamp(),
      })
      .where(and(eq(payees.id, id), isNull(payees.deletedAt)))
      .returning();

    if (!payee) {
      throw new NotFoundError("Payee", id);
    }

    return payee;
  }

  /**
   * Soft delete payee
   */
  async softDelete(id: number): Promise<Payee> {
    const [payee] = await db
      .update(payees)
      .set({
        deletedAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
      })
      .where(and(eq(payees.id, id), isNull(payees.deletedAt)))
      .returning();

    if (!payee) {
      throw new NotFoundError("Payee", id);
    }

    return payee;
  }

  /**
   * Bulk soft delete payees
   */
  async bulkDelete(ids: number[]): Promise<number> {
    if (ids.length === 0) return 0;

    const result = await db
      .update(payees)
      .set({
        deletedAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
      })
      .where(and(
        inArray(payees.id, ids),
        isNull(payees.deletedAt)
      ))
      .returning({id: payees.id});

    return result.length;
  }

  /**
   * Search payees by name (enhanced with better ordering)
   */
  async search(query: string): Promise<Payee[]> {
    if (!query.trim()) {
      return this.findAll();
    }

    return await db
      .select()
      .from(payees)
      .where(and(
        like(payees.name, `%${query}%`),
        isNull(payees.deletedAt),
        eq(payees.isActive, true) // Only return active payees by default
      ))
      .orderBy(payees.name)
      .limit(50);
  }

  /**
   * Find payees used in account transactions
   */
  async findByAccountTransactions(accountId: number): Promise<Payee[]> {
    const payeeIds = await db
      .selectDistinct({payeeId: transactions.payeeId})
      .from(transactions)
      .where(and(
        eq(transactions.accountId, accountId),
        isNull(transactions.deletedAt)
      ));

    if (payeeIds.length === 0) return [];

    const validPayeeIds = payeeIds
      .filter(item => item.payeeId !== null)
      .map(item => item.payeeId!);

    if (validPayeeIds.length === 0) return [];

    return await db
      .select()
      .from(payees)
      .where(and(
        inArray(payees.id, validPayeeIds),
        isNull(payees.deletedAt)
      ))
      .orderBy(payees.name);
  }

  /**
   * Get comprehensive payee statistics
   */
  async getStats(id: number): Promise<PayeeStats> {
    // Get basic transaction stats
    const [basicStats] = await db
      .select({
        transactionCount: count(transactions.id),
        totalAmount: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
        avgAmount: sql<number>`COALESCE(AVG(${transactions.amount}), 0)`,
        minAmount: sql<number>`COALESCE(MIN(${transactions.amount}), 0)`,
        maxAmount: sql<number>`COALESCE(MAX(${transactions.amount}), 0)`,
        lastTransactionDate: sql<string | null>`MAX(${transactions.date})`,
        firstTransactionDate: sql<string | null>`MIN(${transactions.date})`,
      })
      .from(transactions)
      .where(and(
        eq(transactions.payeeId, id),
        isNull(transactions.deletedAt)
      ));

    // Get category distribution
    const categoryDist = await db
      .select({
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        count: count(transactions.id),
        totalAmount: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(
        eq(transactions.payeeId, id),
        isNull(transactions.deletedAt)
      ))
      .groupBy(transactions.categoryId, categories.name)
      .orderBy(desc(count(transactions.id)));

    // Calculate monthly average
    const firstDate = basicStats?.firstTransactionDate;
    const lastDate = basicStats?.lastTransactionDate;
    let monthlyAverage = 0;

    if (firstDate && lastDate) {
      const months = Math.max(1, Math.ceil(
        (new Date(lastDate).getTime() - new Date(firstDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
      ));
      monthlyAverage = (basicStats?.totalAmount || 0) / months;
    }

    return {
      transactionCount: basicStats?.transactionCount || 0,
      totalAmount: basicStats?.totalAmount || 0,
      avgAmount: basicStats?.avgAmount || 0,
      minAmount: basicStats?.minAmount || 0,
      maxAmount: basicStats?.maxAmount || 0,
      lastTransactionDate: basicStats?.lastTransactionDate || null,
      firstTransactionDate: basicStats?.firstTransactionDate || null,
      monthlyAverage,
      categoryDistribution: categoryDist.map(cd => ({
        categoryId: cd.categoryId || 0,
        categoryName: cd.categoryName || 'Uncategorized',
        count: cd.count,
        totalAmount: cd.totalAmount,
      })),
    };
  }

  /**
   * Check if payee exists and is active
   */
  async exists(id: number): Promise<boolean> {
    const [result] = await db
      .select({id: payees.id})
      .from(payees)
      .where(and(eq(payees.id, id), isNull(payees.deletedAt)))
      .limit(1);

    return !!result;
  }

  /**
   * Check if payee has associated transactions
   */
  async hasTransactions(id: number): Promise<boolean> {
    const [result] = await db
      .select({id: transactions.id})
      .from(transactions)
      .where(and(
        eq(transactions.payeeId, id),
        isNull(transactions.deletedAt)
      ))
      .limit(1);

    return !!result;
  }

  /**
   * Find payees with their default category/budget relations
   */
  async findWithRelations(): Promise<Array<Payee & {defaultCategory?: any; defaultBudget?: any}>> {
    return await db
      .select({
        id: payees.id,
        name: payees.name,
        notes: payees.notes,
        defaultCategoryId: payees.defaultCategoryId,
        defaultBudgetId: payees.defaultBudgetId,
        payeeType: payees.payeeType,
        avgAmount: payees.avgAmount,
        paymentFrequency: payees.paymentFrequency,
        lastTransactionDate: payees.lastTransactionDate,
        taxRelevant: payees.taxRelevant,
        isActive: payees.isActive,
        website: payees.website,
        phone: payees.phone,
        email: payees.email,
        address: payees.address,
        accountNumber: payees.accountNumber,
        alertThreshold: payees.alertThreshold,
        isSeasonal: payees.isSeasonal,
        subscriptionInfo: payees.subscriptionInfo,
        tags: payees.tags,
        preferredPaymentMethods: payees.preferredPaymentMethods,
        merchantCategoryCode: payees.merchantCategoryCode,
        dateCreated: payees.dateCreated,
        createdAt: payees.createdAt,
        updatedAt: payees.updatedAt,
        deletedAt: payees.deletedAt,
        defaultCategory: {
          id: categories.id,
          name: categories.name,
        },
        defaultBudget: {
          id: budgets.id,
          name: budgets.name,
        },
      })
      .from(payees)
      .leftJoin(categories, eq(payees.defaultCategoryId, categories.id))
      .leftJoin(budgets, eq(payees.defaultBudgetId, budgets.id))
      .where(isNull(payees.deletedAt))
      .orderBy(payees.name);
  }

  /**
   * Advanced search with filters
   */
  async searchWithFilters(filters: PayeeSearchFilters): Promise<Payee[]> {
    logger.debug('Repository searchWithFilters called', {filters});
    const conditions = [isNull(payees.deletedAt)];

    if (filters.query) {
      conditions.push(like(payees.name, `%${filters.query}%`));
    }

    if (filters.payeeType) {
      conditions.push(eq(payees.payeeType, filters.payeeType));
    }

    if (filters.isActive !== undefined) {
      conditions.push(eq(payees.isActive, filters.isActive));
    }

    if (filters.taxRelevant !== undefined) {
      conditions.push(eq(payees.taxRelevant, filters.taxRelevant));
    }

    if (filters.hasDefaultCategory !== undefined) {
      if (filters.hasDefaultCategory) {
        conditions.push(sql`${payees.defaultCategoryId} IS NOT NULL`);
      } else {
        conditions.push(isNull(payees.defaultCategoryId));
      }
    }

    if (filters.hasDefaultBudget !== undefined) {
      if (filters.hasDefaultBudget) {
        conditions.push(sql`${payees.defaultBudgetId} IS NOT NULL`);
      } else {
        conditions.push(isNull(payees.defaultBudgetId));
      }
    }

    if (filters.minAvgAmount !== undefined) {
      conditions.push(sql`${payees.avgAmount} >= ${filters.minAvgAmount}`);
    }

    if (filters.maxAvgAmount !== undefined) {
      conditions.push(sql`${payees.avgAmount} <= ${filters.maxAvgAmount}`);
    }

    if (filters.paymentFrequency) {
      conditions.push(eq(payees.paymentFrequency, filters.paymentFrequency));
    }

    if (filters.lastTransactionBefore) {
      conditions.push(sql`${payees.lastTransactionDate} <= ${filters.lastTransactionBefore}`);
    }

    if (filters.lastTransactionAfter) {
      conditions.push(sql`${payees.lastTransactionDate} >= ${filters.lastTransactionAfter}`);
    }

    return await db
      .select()
      .from(payees)
      .where(and(...conditions))
      .orderBy(payees.name)
      .limit(100); // Prevent overly large results
  }

  /**
   * Get payees by type
   */
  async findByType(payeeType: PayeeType): Promise<Payee[]> {
    return await db
      .select()
      .from(payees)
      .where(and(
        eq(payees.payeeType, payeeType),
        isNull(payees.deletedAt)
      ))
      .orderBy(payees.name);
  }

  /**
   * Get payees that need attention (old transactions, missing defaults, etc.)
   */
  async findNeedingAttention(): Promise<Array<Payee & {reason: string}>> {
    const cutoffDateValue = currentDate.subtract({months: 3});
    const cutoffDateStr = `${cutoffDateValue.year}-${String(cutoffDateValue.month).padStart(2, '0')}-${String(cutoffDateValue.day).padStart(2, '0')}`;

    // Payees without default category or budget, or with old last transaction dates
    const results = await db
      .select()
      .from(payees)
      .where(and(
        isNull(payees.deletedAt),
        eq(payees.isActive, true)
      ))
      .orderBy(payees.name);

    return results.map(payee => {
      const reasons = [];

      if (!payee.defaultCategoryId) {
        reasons.push('Missing default category');
      }

      if (!payee.defaultBudgetId) {
        reasons.push('Missing default budget');
      }

      if (payee.lastTransactionDate && payee.lastTransactionDate < cutoffDateStr) {
        reasons.push('No recent transactions (3+ months)');
      }

      if (!payee.avgAmount && payee.lastTransactionDate) {
        reasons.push('Missing calculated average amount');
      }

      return {
        ...payee,
        reason: reasons.join(', ') || 'No issues found'
      };
    }).filter(p => p.reason !== 'No issues found');
  }

  /**
   * Calculate and update derived fields for a payee
   */
  async updateCalculatedFields(id: number): Promise<Payee> {
    // Get transaction statistics
    const stats = await this.getStats(id);

    // Determine payment frequency based on transaction patterns
    const frequencyAnalysis = await this.analyzePaymentFrequency(id);

    const updateData: Partial<UpdatePayeeData> = {
      avgAmount: stats.avgAmount || null,
      lastTransactionDate: stats.lastTransactionDate,
    };

    if (frequencyAnalysis.suggestedFrequency) {
      updateData.paymentFrequency = frequencyAnalysis.suggestedFrequency;
    }

    const [payee] = await db
      .update(payees)
      .set({
        ...updateData,
        updatedAt: getCurrentTimestamp(),
      })
      .where(and(eq(payees.id, id), isNull(payees.deletedAt)))
      .returning();

    if (!payee) {
      throw new NotFoundError("Payee", id);
    }

    return payee;
  }

  /**
   * Analyze payment frequency patterns for a payee
   */
  private async analyzePaymentFrequency(id: number): Promise<{suggestedFrequency: PaymentFrequency | null; confidence: number}> {
    const transactionDates = await db
      .select({date: transactions.date})
      .from(transactions)
      .where(and(
        eq(transactions.payeeId, id),
        isNull(transactions.deletedAt)
      ))
      .orderBy(transactions.date);

    if (transactionDates.length < 3) {
      return {suggestedFrequency: null, confidence: 0};
    }

    // Calculate intervals between transactions
    const intervals: number[] = [];
    for (let i = 1; i < transactionDates.length; i++) {
      const prev = new Date(transactionDates[i - 1].date);
      const curr = new Date(transactionDates[i].date);
      const daysDiff = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      intervals.push(daysDiff);
    }

    if (intervals.length === 0) {
      return {suggestedFrequency: null, confidence: 0};
    }

    const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length;
    const standardDev = Math.sqrt(variance);

    // Lower standard deviation means more regular pattern
    const confidence = Math.max(0, 1 - (standardDev / avgInterval));

    // Determine frequency based on average interval
    let suggestedFrequency: PaymentFrequency | null = null;

    if (avgInterval >= 6 && avgInterval <= 8) {
      suggestedFrequency = 'weekly';
    } else if (avgInterval >= 13 && avgInterval <= 15) {
      suggestedFrequency = 'bi_weekly';
    } else if (avgInterval >= 28 && avgInterval <= 32) {
      suggestedFrequency = 'monthly';
    } else if (avgInterval >= 85 && avgInterval <= 95) {
      suggestedFrequency = 'quarterly';
    } else if (avgInterval >= 350 && avgInterval <= 380) {
      suggestedFrequency = 'annual';
    } else {
      suggestedFrequency = 'irregular';
    }

    return {suggestedFrequency, confidence};
  }

  /**
   * Generate intelligent suggestions for a payee based on transaction history
   */
  async generateSuggestions(id: number): Promise<PayeeSuggestions> {
    const stats = await this.getStats(id);
    const frequencyAnalysis = await this.analyzePaymentFrequency(id);

    // Find most common category
    const mostCommonCategory = stats.categoryDistribution.length > 0
      ? stats.categoryDistribution[0]
      : null;

    // For budget suggestion, we'd need to implement budget logic
    // For now, return null but structure is ready

    return {
      suggestedCategoryId: mostCommonCategory?.categoryId || null,
      suggestedCategoryName: mostCommonCategory?.categoryName || null,
      suggestedBudgetId: null, // TODO: Implement budget suggestion logic
      suggestedBudgetName: null,
      suggestedAmount: stats.avgAmount || null,
      suggestedFrequency: frequencyAnalysis.suggestedFrequency,
      confidence: Math.min(frequencyAnalysis.confidence, mostCommonCategory ? 0.8 : 0.3),
    };
  }

  /**
   * Get payee intelligence data for analytics
   */
  async getIntelligence(id: number): Promise<PayeeIntelligence> {
    const payee = await this.findById(id);
    if (!payee) {
      throw new NotFoundError("Payee", id);
    }

    const stats = await this.getStats(id);
    const suggestions = await this.generateSuggestions(id);
    const patterns = await this.analyzePatterns(id);

    return {
      payeeId: id,
      payeeName: payee.name || '',
      stats,
      suggestions,
      patterns,
    };
  }

  /**
   * Analyze spending patterns for a payee
   */
  private async analyzePatterns(id: number): Promise<PayeeIntelligence['patterns']> {
    const transactionData = await db
      .select({
        date: transactions.date,
        amount: transactions.amount,
      })
      .from(transactions)
      .where(and(
        eq(transactions.payeeId, id),
        isNull(transactions.deletedAt)
      ))
      .orderBy(transactions.date);

    if (transactionData.length < 2) {
      return {
        isRegular: false,
        averageDaysBetween: null,
        mostCommonDay: null,
        seasonalTrends: [],
      };
    }

    // Calculate days between transactions
    const intervals: number[] = [];
    const dayOfWeekCounts = new Array(7).fill(0);
    const monthlyData: {[month: number]: {total: number; count: number}} = {};

    for (let i = 1; i < transactionData.length; i++) {
      const prev = new Date(transactionData[i - 1].date);
      const curr = new Date(transactionData[i].date);
      const daysDiff = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      intervals.push(daysDiff);

      // Track day of week
      dayOfWeekCounts[curr.getDay()]++;

      // Track monthly data
      const month = curr.getMonth() + 1;
      if (!monthlyData[month]) {
        monthlyData[month] = {total: 0, count: 0};
      }
      monthlyData[month].total += transactionData[i].amount || 0;
      monthlyData[month].count++;
    }

    const avgDaysBetween = intervals.length > 0
      ? intervals.reduce((sum, val) => sum + val, 0) / intervals.length
      : null;

    const variance = intervals.length > 0
      ? intervals.reduce((sum, val) => sum + Math.pow(val - (avgDaysBetween || 0), 2), 0) / intervals.length
      : 0;

    const isRegular = variance < 100; // Transactions are regular if variance is low

    const mostCommonDay = dayOfWeekCounts.indexOf(Math.max(...dayOfWeekCounts));

    const seasonalTrends = Object.entries(monthlyData).map(([month, data]) => ({
      month: parseInt(month),
      avgAmount: data.total / data.count,
      count: data.count,
    }));

    return {
      isRegular,
      averageDaysBetween: avgDaysBetween,
      mostCommonDay: dayOfWeekCounts.some(count => count > 0) ? mostCommonDay : null,
      seasonalTrends,
    };
  }
}