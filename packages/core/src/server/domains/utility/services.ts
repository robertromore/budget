import { accounts, isUtilityAccount } from "$core/schema/accounts";
import type { UtilityUsage, UtilityRateTier, UsageUnit } from "$core/schema/utility-usage";
import { utilityUsage } from "$core/schema/utility-usage";
import { db } from "$core/server/shared/database";
import { NotFoundError, ValidationError } from "$core/server/shared/types";
import { and, eq } from "drizzle-orm";
import {
  utilityUsageRepository,
  utilityRateTierRepository,
  type CreateUtilityUsageInput,
  type UpdateUtilityUsageInput,
  type CreateRateTierInput,
} from "./repository";

// Service types
export interface CreateUsageRecordInput {
  accountId: number;
  workspaceId: number;
  transactionId?: number;
  periodStart: string;
  periodEnd: string;
  dueDate?: string;
  statementDate?: string;
  usageAmount: number;
  usageUnit: UsageUnit;
  meterReadingStart?: number;
  meterReadingEnd?: number;
  ratePerUnit?: number;
  baseCharge?: number;
  usageCost?: number;
  taxes?: number;
  fees?: number;
  totalAmount: number;
  avgTemperature?: number;
  notes?: string;
  importedFrom?: string;
  rawImportData?: string;
}

export interface UsageAnalytics {
  currentPeriod: UtilityUsage | null;
  previousPeriod: UtilityUsage | null;
  yearToDate: {
    totalUsage: number;
    totalCost: number;
    averageMonthlyUsage: number;
    averageRate: number;
  };
  previousYear: {
    totalUsage: number;
    totalCost: number;
  } | null;
  monthlyData: Array<{
    month: string;
    usageAmount: number;
    totalAmount: number;
    ratePerUnit: number | null;
  }>;
  usageChange: {
    vsLastPeriod: number | null;
    vsLastYear: number | null;
  };
}

/**
 * Utility usage service for business logic
 */
export class UtilityUsageService {
  /**
   * Create a new usage record with validation
   */
  async createUsageRecord(input: CreateUsageRecordInput): Promise<UtilityUsage> {
    // Validate account is a utility account in the caller's workspace
    await this.validateUtilityAccount(input.accountId, input.workspaceId);

    // Validate period dates
    if (new Date(input.periodEnd) < new Date(input.periodStart)) {
      throw new ValidationError("Period end date must be after start date");
    }

    // Check for overlapping periods
    const hasOverlap = await utilityUsageRepository.hasOverlappingPeriod(
      input.accountId,
      input.periodStart,
      input.periodEnd
    );

    if (hasOverlap) {
      throw new ValidationError("A usage record already exists for this period");
    }

    // Create the record
    const createInput: CreateUtilityUsageInput = {
      ...input,
      transactionId: input.transactionId || null,
      dueDate: input.dueDate || null,
      statementDate: input.statementDate || null,
      meterReadingStart: input.meterReadingStart || null,
      meterReadingEnd: input.meterReadingEnd || null,
      ratePerUnit: input.ratePerUnit || null,
      baseCharge: input.baseCharge || null,
      usageCost: input.usageCost || null,
      taxes: input.taxes || null,
      fees: input.fees || null,
      avgTemperature: input.avgTemperature || null,
      notes: input.notes || null,
      importedFrom: input.importedFrom || null,
      rawImportData: input.rawImportData || null,
    };

    return await utilityUsageRepository.createWithComputed(createInput);
  }

  /**
   * Update a usage record
   */
  async updateUsageRecord(
    id: number,
    input: UpdateUtilityUsageInput,
    workspaceId: number
  ): Promise<UtilityUsage> {
    // Check for period overlap if dates are being updated
    if (input.periodStart || input.periodEnd) {
      const existing = await utilityUsageRepository.findById(id);
      if (existing) {
        const periodStart = input.periodStart || existing.periodStart;
        const periodEnd = input.periodEnd || existing.periodEnd;

        const hasOverlap = await utilityUsageRepository.hasOverlappingPeriod(
          existing.accountId,
          periodStart,
          periodEnd,
          id
        );

        if (hasOverlap) {
          throw new ValidationError("A usage record already exists for this period");
        }
      }
    }

    return await utilityUsageRepository.update(id, input, workspaceId);
  }

  /**
   * Delete a usage record
   */
  async deleteUsageRecord(id: number, workspaceId: number): Promise<void> {
    await utilityUsageRepository.delete(id, workspaceId);
  }

  /**
   * Get usage record by ID, scoped to the caller's workspace.
   * Returns null if the record does not exist OR belongs to another tenant
   * (uniform response avoids cross-tenant id enumeration).
   */
  async getUsageRecord(id: number, workspaceId: number): Promise<UtilityUsage | null> {
    const [row] = await db
      .select()
      .from(utilityUsage)
      .where(and(eq(utilityUsage.id, id), eq(utilityUsage.workspaceId, workspaceId)))
      .limit(1);
    return row ?? null;
  }

  /**
   * Get all usage records for an account (workspace-verified).
   */
  async getUsageRecords(accountId: number, workspaceId: number): Promise<UtilityUsage[]> {
    await this.assertAccountInWorkspace(accountId, workspaceId);
    return await utilityUsageRepository.findByAccountId(accountId);
  }

  /**
   * Get usage records by date range (workspace-verified).
   */
  async getUsageRecordsByDateRange(
    accountId: number,
    workspaceId: number,
    startDate: string,
    endDate: string
  ): Promise<UtilityUsage[]> {
    await this.assertAccountInWorkspace(accountId, workspaceId);
    return await utilityUsageRepository.findByDateRange(accountId, startDate, endDate);
  }

  /**
   * Get usage record linked to a transaction (workspace-verified).
   */
  async getUsageByTransactionId(
    transactionId: number,
    workspaceId: number
  ): Promise<UtilityUsage | null> {
    const record = await utilityUsageRepository.findByTransactionId(transactionId);
    if (!record || record.workspaceId !== workspaceId) return null;
    return record;
  }

  /**
   * Get comprehensive usage analytics for an account (workspace-verified).
   */
  async getUsageAnalytics(accountId: number, workspaceId: number): Promise<UsageAnalytics> {
    await this.assertAccountInWorkspace(accountId, workspaceId);
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;

    // Get current and previous usage records
    const records = await utilityUsageRepository.findByAccountId(accountId);
    const currentPeriod = records[0] || null;
    const previousPeriod = records[1] || null;

    // Get year-to-date summary
    const yearToDate = await utilityUsageRepository.getUsageSummary(accountId, currentYear);

    // Get previous year summary
    const prevYearSummary = await utilityUsageRepository.getUsageSummary(accountId, previousYear);
    const previousYearData =
      prevYearSummary.recordCount > 0
        ? {
            totalUsage: prevYearSummary.totalUsage,
            totalCost: prevYearSummary.totalCost,
          }
        : null;

    // Get monthly data for charts
    const monthlyData = await utilityUsageRepository.getMonthlyUsage(accountId, 24);

    // Calculate usage changes
    const usageChange = {
      vsLastPeriod:
        currentPeriod && previousPeriod
          ? ((currentPeriod.usageAmount - previousPeriod.usageAmount) /
              previousPeriod.usageAmount) *
            100
          : null,
      vsLastYear:
        previousYearData && yearToDate.totalUsage > 0
          ? ((yearToDate.totalUsage - previousYearData.totalUsage) / previousYearData.totalUsage) *
            100
          : null,
    };

    return {
      currentPeriod,
      previousPeriod,
      yearToDate: {
        totalUsage: yearToDate.totalUsage,
        totalCost: yearToDate.totalCost,
        averageMonthlyUsage: yearToDate.averageMonthlyUsage,
        averageRate: yearToDate.averageMonthlyRate,
      },
      previousYear: previousYearData,
      monthlyData: monthlyData.map((m) => ({
        month: m.month,
        usageAmount: m.usageAmount,
        totalAmount: m.totalAmount,
        ratePerUnit: m.ratePerUnit,
      })),
      usageChange,
    };
  }

  /**
   * Get year-over-year comparison data (workspace-verified).
   */
  async getYearOverYearData(accountId: number, workspaceId: number) {
    await this.assertAccountInWorkspace(accountId, workspaceId);
    return await utilityUsageRepository.getYearOverYearComparison(accountId);
  }

  /**
   * Create rate tiers for an account (workspace-verified).
   */
  async createRateTiers(
    accountId: number,
    workspaceId: number,
    tiers: Omit<CreateRateTierInput, "accountId">[]
  ): Promise<UtilityRateTier[]> {
    await this.validateUtilityAccount(accountId, workspaceId);

    const createdTiers: UtilityRateTier[] = [];

    for (const tier of tiers) {
      const created = await utilityRateTierRepository.create({
        ...tier,
        accountId,
      });
      createdTiers.push(created);
    }

    return createdTiers;
  }

  /**
   * Get current rate tiers for an account (workspace-verified).
   */
  async getCurrentRateTiers(
    accountId: number,
    workspaceId: number
  ): Promise<UtilityRateTier[]> {
    await this.assertAccountInWorkspace(accountId, workspaceId);
    return await utilityRateTierRepository.findCurrentTiers(accountId);
  }

  /**
   * Replace all rate tiers for an account (workspace-verified).
   */
  async replaceRateTiers(
    accountId: number,
    workspaceId: number,
    tiers: Omit<CreateRateTierInput, "accountId">[]
  ): Promise<UtilityRateTier[]> {
    await this.validateUtilityAccount(accountId, workspaceId);

    // Delete existing tiers
    await utilityRateTierRepository.deleteByAccountId(accountId);

    // Create new tiers
    return await this.createRateTiers(accountId, workspaceId, tiers);
  }

  /**
   * Calculate cost breakdown by tier for a usage amount (workspace-verified).
   */
  async calculateTieredCost(
    accountId: number,
    workspaceId: number,
    usageAmount: number
  ): Promise<
    Array<{
      tierName: string;
      usageInTier: number;
      ratePerUnit: number;
      cost: number;
    }>
  > {
    await this.assertAccountInWorkspace(accountId, workspaceId);
    const tiers = await utilityRateTierRepository.findCurrentTiers(accountId);

    if (tiers.length === 0) {
      return [];
    }

    const breakdown: Array<{
      tierName: string;
      usageInTier: number;
      ratePerUnit: number;
      cost: number;
    }> = [];

    let remainingUsage = usageAmount;

    for (const tier of tiers) {
      if (remainingUsage <= 0) break;

      const tierMax = tier.usageMax ?? Infinity;
      const tierRange = tierMax - tier.usageMin;
      const usageInTier = Math.min(remainingUsage, tierRange);

      if (usageInTier > 0) {
        breakdown.push({
          tierName: tier.tierName,
          usageInTier,
          ratePerUnit: tier.ratePerUnit,
          cost: usageInTier * tier.ratePerUnit,
        });

        remainingUsage -= usageInTier;
      }
    }

    return breakdown;
  }

  /**
   * Verify an account belongs to the given workspace (does not require it
   * to be a utility account — some read paths need any account in the tenant).
   * Throws NotFoundError for missing or cross-tenant ids.
   */
  private async assertAccountInWorkspace(
    accountId: number,
    workspaceId: number
  ): Promise<void> {
    const [row] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.id, accountId), eq(accounts.workspaceId, workspaceId)))
      .limit(1);
    if (!row) {
      throw new NotFoundError("Account", accountId.toString());
    }
  }

  /**
   * Validate that an account is a utility account within the caller's workspace.
   */
  private async validateUtilityAccount(
    accountId: number,
    workspaceId: number
  ): Promise<void> {
    const [account] = await db
      .select({ accountType: accounts.accountType, workspaceId: accounts.workspaceId })
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1)
      .execute();

    if (!account || account.workspaceId !== workspaceId) {
      throw new NotFoundError("Account", accountId.toString());
    }

    if (!account.accountType || !isUtilityAccount(account.accountType)) {
      throw new ValidationError("Usage records can only be added to utility accounts");
    }
  }
}

// Export singleton instance
export const utilityUsageService = new UtilityUsageService();
