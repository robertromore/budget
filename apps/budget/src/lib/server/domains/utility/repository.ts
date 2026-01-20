import {
  utilityUsage,
  utilityRateTiers,
  type UtilityUsage,
  type UtilityRateTier,
  type UsageUnit,
  calculateAverageDailyUsage,
} from "$lib/schema/utility-usage";
import { db } from "$lib/server/shared/database";
import { BaseRepository } from "$lib/server/shared/database/base-repository";
import { getCurrentTimestamp } from "$lib/utils/dates";
import { and, desc, eq, gte, lte, sql, asc } from "drizzle-orm";

// Types for utility usage operations
export interface CreateUtilityUsageInput {
  workspaceId: number;
  accountId: number;
  transactionId?: number | null;
  periodStart: string;
  periodEnd: string;
  dueDate?: string | null;
  statementDate?: string | null;
  usageAmount: number;
  usageUnit: UsageUnit;
  meterReadingStart?: number | null;
  meterReadingEnd?: number | null;
  ratePerUnit?: number | null;
  baseCharge?: number | null;
  usageCost?: number | null;
  taxes?: number | null;
  fees?: number | null;
  totalAmount: number;
  avgTemperature?: number | null;
  heatingDegreeDays?: number | null;
  coolingDegreeDays?: number | null;
  notes?: string | null;
  importedFrom?: string | null;
  rawImportData?: string | null;
}

export interface UpdateUtilityUsageInput {
  transactionId?: number | null;
  periodStart?: string;
  periodEnd?: string;
  dueDate?: string | null;
  statementDate?: string | null;
  usageAmount?: number;
  usageUnit?: UsageUnit;
  meterReadingStart?: number | null;
  meterReadingEnd?: number | null;
  ratePerUnit?: number | null;
  baseCharge?: number | null;
  usageCost?: number | null;
  taxes?: number | null;
  fees?: number | null;
  totalAmount?: number;
  avgTemperature?: number | null;
  heatingDegreeDays?: number | null;
  coolingDegreeDays?: number | null;
  notes?: string | null;
}

export interface CreateRateTierInput {
  accountId: number;
  tierName: string;
  tierOrder: number;
  usageMin: number;
  usageMax?: number | null;
  ratePerUnit: number;
  effectiveDate: string;
  expirationDate?: string | null;
}

export interface UpdateRateTierInput {
  tierName?: string;
  tierOrder?: number;
  usageMin?: number;
  usageMax?: number | null;
  ratePerUnit?: number;
  effectiveDate?: string;
  expirationDate?: string | null;
}

/**
 * Utility usage repository with domain-specific operations
 */
export class UtilityUsageRepository extends BaseRepository<
  typeof utilityUsage,
  UtilityUsage,
  CreateUtilityUsageInput,
  UpdateUtilityUsageInput
> {
  constructor() {
    super(db, utilityUsage, "UtilityUsage");
  }

  /**
   * Create a new usage record with computed fields
   */
  async createWithComputed(input: CreateUtilityUsageInput): Promise<UtilityUsage> {
    // Calculate days in period
    const startDate = new Date(input.periodStart);
    const endDate = new Date(input.periodEnd);
    const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Calculate average daily usage
    const averageDailyUsage = calculateAverageDailyUsage(
      input.usageAmount,
      input.periodStart,
      input.periodEnd
    );

    const values = {
      ...input,
      daysInPeriod,
      averageDailyUsage,
    };

    const result = await db.insert(utilityUsage).values(values).returning();
    return result[0];
  }

  /**
   * Find all usage records for an account
   */
  async findByAccountId(accountId: number): Promise<UtilityUsage[]> {
    return await db
      .select()
      .from(utilityUsage)
      .where(eq(utilityUsage.accountId, accountId))
      .orderBy(desc(utilityUsage.periodEnd))
      .execute();
  }

  /**
   * Find usage records by date range
   */
  async findByDateRange(
    accountId: number,
    startDate: string,
    endDate: string
  ): Promise<UtilityUsage[]> {
    return await db
      .select()
      .from(utilityUsage)
      .where(
        and(
          eq(utilityUsage.accountId, accountId),
          gte(utilityUsage.periodStart, startDate),
          lte(utilityUsage.periodEnd, endDate)
        )
      )
      .orderBy(desc(utilityUsage.periodEnd))
      .execute();
  }

  /**
   * Find usage record by transaction ID
   */
  async findByTransactionId(transactionId: number): Promise<UtilityUsage | null> {
    const result = await db
      .select()
      .from(utilityUsage)
      .where(eq(utilityUsage.transactionId, transactionId))
      .limit(1)
      .execute();

    return result[0] || null;
  }

  /**
   * Get usage summary for an account
   */
  async getUsageSummary(
    accountId: number,
    year?: number
  ): Promise<{
    totalUsage: number;
    totalCost: number;
    averageMonthlyUsage: number;
    averageMonthlyRate: number;
    recordCount: number;
  }> {
    // Build where conditions
    const conditions = [eq(utilityUsage.accountId, accountId)];
    if (year) {
      conditions.push(
        sql`strftime('%Y', ${utilityUsage.periodStart}) = ${year.toString()}`
      );
    }

    const result = await db
      .select({
        totalUsage: sql<number>`SUM(${utilityUsage.usageAmount})`,
        totalCost: sql<number>`SUM(${utilityUsage.totalAmount})`,
        recordCount: sql<number>`COUNT(*)`,
      })
      .from(utilityUsage)
      .where(and(...conditions))
      .execute();

    const totalUsage = result[0]?.totalUsage || 0;
    const totalCost = result[0]?.totalCost || 0;
    const recordCount = result[0]?.recordCount || 0;

    return {
      totalUsage,
      totalCost,
      averageMonthlyUsage: recordCount > 0 ? totalUsage / recordCount : 0,
      averageMonthlyRate: totalUsage > 0 ? totalCost / totalUsage : 0,
      recordCount,
    };
  }

  /**
   * Get monthly aggregated usage data for charts
   */
  async getMonthlyUsage(
    accountId: number,
    limit?: number
  ): Promise<
    Array<{
      month: string;
      usageAmount: number;
      totalAmount: number;
      ratePerUnit: number | null;
      daysInPeriod: number | null;
    }>
  > {
    const query = db
      .select({
        month: sql<string>`strftime('%Y-%m', ${utilityUsage.periodStart})`,
        usageAmount: sql<number>`SUM(${utilityUsage.usageAmount})`,
        totalAmount: sql<number>`SUM(${utilityUsage.totalAmount})`,
        ratePerUnit: sql<number | null>`AVG(${utilityUsage.ratePerUnit})`,
        daysInPeriod: sql<number | null>`SUM(${utilityUsage.daysInPeriod})`,
      })
      .from(utilityUsage)
      .where(eq(utilityUsage.accountId, accountId))
      .groupBy(sql`strftime('%Y-%m', ${utilityUsage.periodStart})`)
      .orderBy(desc(sql`strftime('%Y-%m', ${utilityUsage.periodStart})`));

    if (limit) {
      return await query.limit(limit).execute();
    }

    return await query.execute();
  }

  /**
   * Get year-over-year comparison data
   */
  async getYearOverYearComparison(
    accountId: number
  ): Promise<
    Array<{
      month: number;
      year: number;
      usageAmount: number;
      totalAmount: number;
    }>
  > {
    return await db
      .select({
        month: sql<number>`CAST(strftime('%m', ${utilityUsage.periodStart}) AS INTEGER)`,
        year: sql<number>`CAST(strftime('%Y', ${utilityUsage.periodStart}) AS INTEGER)`,
        usageAmount: sql<number>`SUM(${utilityUsage.usageAmount})`,
        totalAmount: sql<number>`SUM(${utilityUsage.totalAmount})`,
      })
      .from(utilityUsage)
      .where(eq(utilityUsage.accountId, accountId))
      .groupBy(
        sql`strftime('%Y', ${utilityUsage.periodStart})`,
        sql`strftime('%m', ${utilityUsage.periodStart})`
      )
      .orderBy(
        desc(sql`strftime('%Y', ${utilityUsage.periodStart})`),
        asc(sql`strftime('%m', ${utilityUsage.periodStart})`)
      )
      .execute();
  }

  /**
   * Get most recent usage record for an account
   */
  async getMostRecent(accountId: number): Promise<UtilityUsage | null> {
    const result = await db
      .select()
      .from(utilityUsage)
      .where(eq(utilityUsage.accountId, accountId))
      .orderBy(desc(utilityUsage.periodEnd))
      .limit(1)
      .execute();

    return result[0] || null;
  }

  /**
   * Check for overlapping periods (for validation)
   */
  async hasOverlappingPeriod(
    accountId: number,
    periodStart: string,
    periodEnd: string,
    excludeId?: number
  ): Promise<boolean> {
    const conditions = [
      eq(utilityUsage.accountId, accountId),
      // Check if periods overlap: existing.start <= new.end AND existing.end >= new.start
      lte(utilityUsage.periodStart, periodEnd),
      gte(utilityUsage.periodEnd, periodStart),
    ];

    if (excludeId) {
      const { ne } = await import("drizzle-orm");
      conditions.push(ne(utilityUsage.id, excludeId));
    }

    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(utilityUsage)
      .where(and(...conditions))
      .execute();

    return (result[0]?.count || 0) > 0;
  }
}

/**
 * Rate tier repository for tiered pricing
 */
export class UtilityRateTierRepository extends BaseRepository<
  typeof utilityRateTiers,
  UtilityRateTier,
  CreateRateTierInput,
  UpdateRateTierInput
> {
  constructor() {
    super(db, utilityRateTiers, "UtilityRateTier");
  }

  /**
   * Find all rate tiers for an account
   */
  async findByAccountId(accountId: number): Promise<UtilityRateTier[]> {
    return await db
      .select()
      .from(utilityRateTiers)
      .where(eq(utilityRateTiers.accountId, accountId))
      .orderBy(asc(utilityRateTiers.tierOrder))
      .execute();
  }

  /**
   * Find current (active) rate tiers for an account
   */
  async findCurrentTiers(accountId: number): Promise<UtilityRateTier[]> {
    const today = getCurrentTimestamp();

    return await db
      .select()
      .from(utilityRateTiers)
      .where(
        and(
          eq(utilityRateTiers.accountId, accountId),
          lte(utilityRateTiers.effectiveDate, today),
          sql`(${utilityRateTiers.expirationDate} IS NULL OR ${utilityRateTiers.expirationDate} >= ${today})`
        )
      )
      .orderBy(asc(utilityRateTiers.tierOrder))
      .execute();
  }

  /**
   * Delete all tiers for an account
   */
  async deleteByAccountId(accountId: number): Promise<void> {
    await db.delete(utilityRateTiers).where(eq(utilityRateTiers.accountId, accountId)).execute();
  }
}

// Export singleton instances
export const utilityUsageRepository = new UtilityUsageRepository();
export const utilityRateTierRepository = new UtilityRateTierRepository();
