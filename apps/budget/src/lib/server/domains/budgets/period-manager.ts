import {
  type BudgetPeriodInstance,
  budgetPeriodInstances,
  type BudgetPeriodTemplate,
  budgetPeriodTemplates,
} from "$lib/schema/budgets";
import { db } from "$lib/server/db";
import { DatabaseError, NotFoundError, ValidationError } from "$lib/server/shared/types/errors";
import { currentDate as defaultCurrentDate, parseISOString, toISOString } from "$lib/utils/dates";
import { CalendarDate, type DateValue } from "@internationalized/date";
import { and, desc, eq, sql } from "drizzle-orm";
import { BudgetPeriodCalculator, type PeriodBoundary } from "./services";

export interface PeriodCreationOptions {
  lookAheadMonths?: number;
  lookBehindMonths?: number;
  autoCreateEnvelopes?: boolean;
  copyPreviousPeriodSettings?: boolean;
  enableRollover?: boolean;
}

export interface PeriodBoundaryConfig {
  type: "standard" | "custom" | "fiscal" | "floating";
  customStartDate?: DateValue;
  customEndDate?: DateValue;
  fiscalYearStart?: number; // Month (1-12)
  floatingAnchor?: DateValue;
  skipWeekends?: boolean;
  skipHolidays?: boolean;
  holidayDates?: string[];
}

export interface PeriodAnalytics {
  periodId: number;
  duration: number;
  totalAllocated: number;
  totalSpent: number;
  totalRollover: number;
  utilizationRate: number;
  deficitCount: number;
  surplusCount: number;
  performanceScore: number;
  trends: {
    spendingTrend: "increasing" | "decreasing" | "stable";
    allocationTrend: "increasing" | "decreasing" | "stable";
    efficiencyTrend: "improving" | "declining" | "stable";
  };
}

export interface PeriodComparison {
  currentPeriod: PeriodAnalytics;
  previousPeriod: PeriodAnalytics;
  changes: {
    allocatedChange: number;
    spentChange: number;
    utilizationChange: number;
    performanceChange: number;
  };
  insights: string[];
}

export class PeriodManager {
  async createPeriodsAutomatically(
    budgetId: number,
    options: PeriodCreationOptions = {}
  ): Promise<BudgetPeriodInstance[]> {
    const {
      lookAheadMonths = 3,
      lookBehindMonths = 1,
      autoCreateEnvelopes = true,
      copyPreviousPeriodSettings = true,
      enableRollover = true,
    } = options;

    const templates = await this.getBudgetTemplates(budgetId);
    const createdPeriods: BudgetPeriodInstance[] = [];

    for (const template of templates) {
      const periods = await this.generatePeriodsForTemplate(
        template,
        lookAheadMonths,
        lookBehindMonths
      );

      for (const periodData of periods) {
        const existing = await this.findExistingPeriod(
          template.id,
          periodData.startDate,
          periodData.endDate
        );

        if (!existing) {
          const created = await this.createPeriodInstance(template, periodData, {
            autoCreateEnvelopes,
            copyPreviousPeriodSettings,
            enableRollover,
          });
          createdPeriods.push(created);
        }
      }
    }

    return createdPeriods;
  }

  async createPeriodWithCustomBoundaries(
    templateId: number,
    boundaryConfig: PeriodBoundaryConfig,
    options: PeriodCreationOptions = {}
  ): Promise<BudgetPeriodInstance> {
    const template = await this.getTemplate(templateId);
    const boundaries = await this.calculateCustomBoundaries(boundaryConfig);

    const periodData = {
      startDate: toISOString(boundaries.start),
      endDate: toISOString(boundaries.end),
      allocatedAmount: 0,
      rolloverAmount: 0,
      actualAmount: 0,
    };

    return await this.createPeriodInstance(template, periodData, options);
  }

  async getPeriodAnalytics(periodId: number): Promise<PeriodAnalytics> {
    const period = await this.getPeriodById(periodId);

    // Get envelope data for this period
    const envelopeData = await db.select({
      totalAllocated: sql<number>`COALESCE(SUM(allocated_amount), 0)`,
      totalSpent: sql<number>`COALESCE(SUM(spent_amount), 0)`,
      totalRollover: sql<number>`COALESCE(SUM(rollover_amount), 0)`,
      deficitCount: sql<number>`COUNT(CASE WHEN deficit_amount > 0 THEN 1 END)`,
      surplusCount: sql<number>`COUNT(CASE WHEN available_amount > 0 THEN 1 END)`,
    }).from(sql`envelope_allocation`)
     .where(sql`period_instance_id = ${periodId}`);

    const data = envelopeData[0] || {
      totalAllocated: 0,
      totalSpent: 0,
      totalRollover: 0,
      deficitCount: 0,
      surplusCount: 0,
    };

    const startDate = parseISOString(period.startDate);
    const endDate = parseISOString(period.endDate);
    const duration = startDate && endDate ?
      Math.ceil((endDate.toDate('UTC').getTime() - startDate.toDate('UTC').getTime()) / (1000 * 60 * 60 * 24)) : 0;

    const utilizationRate = data.totalAllocated > 0 ?
      (data.totalSpent / data.totalAllocated) * 100 : 0;

    const performanceScore = this.calculatePerformanceScore({
      utilizationRate,
      deficitCount: data.deficitCount,
      surplusCount: data.surplusCount,
      totalAllocated: data.totalAllocated,
      totalSpent: data.totalSpent,
    });

    const trends = await this.calculateTrends(periodId);

    return {
      periodId,
      duration,
      totalAllocated: data.totalAllocated,
      totalSpent: data.totalSpent,
      totalRollover: data.totalRollover,
      utilizationRate,
      deficitCount: data.deficitCount,
      surplusCount: data.surplusCount,
      performanceScore,
      trends,
    };
  }

  async comparePeriods(
    currentPeriodId: number,
    previousPeriodId: number
  ): Promise<PeriodComparison> {
    const [currentAnalytics, previousAnalytics] = await Promise.all([
      this.getPeriodAnalytics(currentPeriodId),
      this.getPeriodAnalytics(previousPeriodId),
    ]);

    const changes = {
      allocatedChange: currentAnalytics.totalAllocated - previousAnalytics.totalAllocated,
      spentChange: currentAnalytics.totalSpent - previousAnalytics.totalSpent,
      utilizationChange: currentAnalytics.utilizationRate - previousAnalytics.utilizationRate,
      performanceChange: currentAnalytics.performanceScore - previousAnalytics.performanceScore,
    };

    const insights = this.generateInsights(currentAnalytics, previousAnalytics, changes);

    return {
      currentPeriod: currentAnalytics,
      previousPeriod: previousAnalytics,
      changes,
      insights,
    };
  }

  async getPeriodHistory(
    budgetId: number,
    limit: number = 12
  ): Promise<PeriodAnalytics[]> {
    const periods = await db
      .select()
      .from(budgetPeriodInstances)
      .innerJoin(budgetPeriodTemplates, eq(budgetPeriodInstances.templateId, budgetPeriodTemplates.id))
      .where(eq(budgetPeriodTemplates.budgetId, budgetId))
      .orderBy(desc(budgetPeriodInstances.startDate))
      .limit(limit);

    const analytics: PeriodAnalytics[] = [];

    for (const periodData of periods) {
      const period = periodData.budget_period_instance;
      const analytics_data = await this.getPeriodAnalytics(period.id);
      analytics.push(analytics_data);
    }

    return analytics;
  }

  async schedulePeriodMaintenance(budgetId: number): Promise<{
    created: number;
    rolledOver: number;
    cleaned: number;
  }> {
    // Create upcoming periods
    const created = await this.createPeriodsAutomatically(budgetId);

    // Process rollover for completed periods
    const rolledOver = await this.processCompletedPeriodRollovers(budgetId);

    // Clean up old periods (optional)
    const cleaned = await this.cleanupOldPeriods(budgetId);

    return {
      created: created.length,
      rolledOver,
      cleaned,
    };
  }

  private async getBudgetTemplates(budgetId: number): Promise<BudgetPeriodTemplate[]> {
    return await db
      .select()
      .from(budgetPeriodTemplates)
      .where(eq(budgetPeriodTemplates.budgetId, budgetId));
  }

  private async generatePeriodsForTemplate(
    template: BudgetPeriodTemplate,
    lookAheadMonths: number,
    lookBehindMonths: number
  ): Promise<Array<{startDate: string, endDate: string, allocatedAmount: number}>> {
    const periods: Array<{startDate: string, endDate: string, allocatedAmount: number}> = [];
    const today = defaultCurrentDate;

    // Generate periods for the specified range
    let currentDate = today.subtract({months: lookBehindMonths});
    const endDate = today.add({months: lookAheadMonths});

    while (currentDate.compare(endDate) <= 0) {
      try {
        const boundary = BudgetPeriodCalculator.calculatePeriodBoundaries(template, currentDate);

        periods.push({
          startDate: toISOString(boundary.start),
          endDate: toISOString(boundary.end),
          allocatedAmount: 0, // Will be set based on previous period or template
        });

        // Move to next period
        switch (template.type) {
          case "weekly":
            currentDate = currentDate.add({weeks: template.intervalCount || 1});
            break;
          case "monthly":
            currentDate = currentDate.add({months: template.intervalCount || 1});
            break;
          case "quarterly":
            currentDate = currentDate.add({months: (template.intervalCount || 1) * 3});
            break;
          case "yearly":
            currentDate = currentDate.add({years: template.intervalCount || 1});
            break;
          default:
            currentDate = currentDate.add({months: 1});
        }
      } catch (error) {
        // Skip periods that can't be calculated
        currentDate = currentDate.add({days: 1});
      }
    }

    return periods;
  }

  private async findExistingPeriod(
    templateId: number,
    startDate: string,
    endDate: string
  ): Promise<BudgetPeriodInstance | null> {
    const existing = await db
      .select()
      .from(budgetPeriodInstances)
      .where(
        and(
          eq(budgetPeriodInstances.templateId, templateId),
          eq(budgetPeriodInstances.startDate, startDate),
          eq(budgetPeriodInstances.endDate, endDate)
        )
      )
      .limit(1);

    return existing[0] ?? null;
  }

  private async createPeriodInstance(
    template: BudgetPeriodTemplate,
    periodData: {startDate: string, endDate: string, allocatedAmount: number},
    options: PeriodCreationOptions
  ): Promise<BudgetPeriodInstance> {
    let allocatedAmount = periodData.allocatedAmount;

    // Copy allocation from previous period if requested
    if (options.copyPreviousPeriodSettings && allocatedAmount === 0) {
      const previousPeriod = await this.getLatestPeriod(template.id);
      if (previousPeriod) {
        allocatedAmount = previousPeriod.allocatedAmount;
      }
    }

    const [created] = await db
      .insert(budgetPeriodInstances)
      .values({
        templateId: template.id,
        startDate: periodData.startDate,
        endDate: periodData.endDate,
        allocatedAmount,
        rolloverAmount: 0,
        actualAmount: 0,
      })
      .returning();

    if (!created) {
      throw new DatabaseError("Failed to create period instance", "createPeriod");
    }

    // Create envelope allocations if requested
    if (options.autoCreateEnvelopes) {
      await this.createEnvelopeAllocationsForPeriod(created, template);
    }

    return created;
  }

  private async calculateCustomBoundaries(
    config: PeriodBoundaryConfig
  ): Promise<PeriodBoundary> {
    const timezone = "UTC"; // Default timezone

    switch (config.type) {
      case "custom":
        if (!config.customStartDate || !config.customEndDate) {
          throw new ValidationError("Custom boundaries require start and end dates", "period");
        }
        return {
          start: new CalendarDate(
            config.customStartDate.year,
            config.customStartDate.month,
            config.customStartDate.day
          ),
          end: new CalendarDate(
            config.customEndDate.year,
            config.customEndDate.month,
            config.customEndDate.day
          ),
          timezone,
        };

      case "fiscal":
        const fiscalStart = config.fiscalYearStart || 1;
        const currentYear = defaultCurrentDate.year;
        const fiscalStartDate = new CalendarDate(currentYear, fiscalStart, 1);
        const fiscalEndDate = fiscalStartDate.add({years: 1}).subtract({days: 1});

        return {
          start: fiscalStartDate,
          end: fiscalEndDate,
          timezone,
        };

      case "floating":
        if (!config.floatingAnchor) {
          throw new ValidationError("Floating boundaries require an anchor date", "period");
        }
        const anchor = new CalendarDate(
          config.floatingAnchor.year,
          config.floatingAnchor.month,
          config.floatingAnchor.day
        );

        return {
          start: anchor,
          end: anchor.add({months: 1}).subtract({days: 1}),
          timezone,
        };

      default:
        // Standard boundary (current month)
        const start = new CalendarDate(defaultCurrentDate.year, defaultCurrentDate.month, 1);
        const end = start.add({months: 1}).subtract({days: 1});

        return {start, end, timezone};
    }
  }

  private calculatePerformanceScore(data: {
    utilizationRate: number;
    deficitCount: number;
    surplusCount: number;
    totalAllocated: number;
    totalSpent: number;
  }): number {
    let score = 100;

    // Penalize over-utilization or under-utilization
    if (data.utilizationRate > 100) {
      score -= (data.utilizationRate - 100) * 0.5; // -0.5 per % over budget
    } else if (data.utilizationRate < 80) {
      score -= (80 - data.utilizationRate) * 0.2; // -0.2 per % under-utilized
    }

    // Penalize deficits heavily
    score -= data.deficitCount * 5;

    // Small bonus for having surplus
    score += Math.min(data.surplusCount * 2, 10);

    return Math.max(0, Math.min(100, score));
  }

  private async calculateTrends(periodId: number): Promise<PeriodAnalytics["trends"]> {
    // This is a simplified implementation
    // In a real system, you'd compare with previous periods
    return {
      spendingTrend: "stable",
      allocationTrend: "stable",
      efficiencyTrend: "stable",
    };
  }

  private generateInsights(
    current: PeriodAnalytics,
    previous: PeriodAnalytics,
    changes: PeriodComparison["changes"]
  ): string[] {
    const insights: string[] = [];

    if (changes.performanceChange > 5) {
      insights.push("Budget performance has improved significantly this period");
    } else if (changes.performanceChange < -5) {
      insights.push("Budget performance has declined this period");
    }

    if (changes.utilizationChange > 10) {
      insights.push("Spending has increased substantially compared to last period");
    } else if (changes.utilizationChange < -10) {
      insights.push("Spending has decreased significantly this period");
    }

    if (current.deficitCount > previous.deficitCount) {
      insights.push(`${current.deficitCount - previous.deficitCount} more envelopes are in deficit`);
    } else if (current.deficitCount < previous.deficitCount) {
      insights.push(`${previous.deficitCount - current.deficitCount} fewer envelopes are in deficit`);
    }

    if (changes.allocatedChange > 0) {
      insights.push(`Budget allocation increased by ${(changes.allocatedChange).toFixed(2)}`);
    } else if (changes.allocatedChange < 0) {
      insights.push(`Budget allocation decreased by ${Math.abs(changes.allocatedChange).toFixed(2)}`);
    }

    return insights;
  }

  private async getTemplate(templateId: number): Promise<BudgetPeriodTemplate> {
    const template = await db
      .select()
      .from(budgetPeriodTemplates)
      .where(eq(budgetPeriodTemplates.id, templateId))
      .limit(1);

    if (template.length === 0) {
      throw new NotFoundError("Budget period template", templateId);
    }

    return template[0]!;
  }

  private async getPeriodById(periodId: number): Promise<BudgetPeriodInstance> {
    const period = await db
      .select()
      .from(budgetPeriodInstances)
      .where(eq(budgetPeriodInstances.id, periodId))
      .limit(1);

    if (period.length === 0) {
      throw new NotFoundError("Budget period instance", periodId);
    }

    return period[0]!;
  }

  private async getLatestPeriod(templateId: number): Promise<BudgetPeriodInstance | null> {
    const periods = await db
      .select()
      .from(budgetPeriodInstances)
      .where(eq(budgetPeriodInstances.templateId, templateId))
      .orderBy(desc(budgetPeriodInstances.startDate))
      .limit(1);

    return periods.length > 0 ? periods[0]! : null;
  }

  private async createEnvelopeAllocationsForPeriod(
    period: BudgetPeriodInstance,
    template: BudgetPeriodTemplate
  ): Promise<void> {
    // This would create envelope allocations based on the budget's categories
    // Implementation depends on the specific envelope setup
    // For now, this is a placeholder
  }

  private async processCompletedPeriodRollovers(budgetId: number): Promise<number> {
    // Find completed periods that haven't been processed for rollover
    // This is a placeholder - implementation would depend on rollover tracking
    return 0;
  }

  private async cleanupOldPeriods(budgetId: number): Promise<number> {
    // Clean up periods older than a certain threshold
    // This is a placeholder - implementation would depend on retention policy
    return 0;
  }
}
