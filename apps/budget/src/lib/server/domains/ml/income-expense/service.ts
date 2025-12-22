/**
 * Income vs Expense Breakdown Service
 *
 * Provides enhanced income/expense analysis including:
 * - Separate forecasts for income and expenses
 * - Trend indicators (increasing, decreasing, stable)
 * - Period-over-period comparisons
 * - Net savings calculations
 * - Income-to-expense ratio tracking
 */

import { transactions } from "$lib/schema";
import { db } from "$lib/server/db";
import { and, gte, inArray, sql } from "drizzle-orm";
import { linearRegression, mean, standardDeviation } from "simple-statistics";
import type { ForecastPrediction } from "../types";
import { getWorkspaceAccountIds } from "../utils";

// =============================================================================
// Types
// =============================================================================

export type TrendDirection = "increasing" | "decreasing" | "stable";

export interface IncomeExpenseHistory {
  period: string;
  income: number;
  expenses: number;
  netSavings: number;
  savingsRate: number; // (income - expenses) / income as percentage
}

export interface TrendIndicator {
  direction: TrendDirection;
  changePercent: number;
  description: string;
  confidence: number;
}

export interface IncomeExpenseForecast {
  incomePredictions: ForecastPrediction[];
  expensePredictions: ForecastPrediction[];
  netSavingsPredictions: Array<{
    date: string;
    value: number;
    income: number;
    expenses: number;
    savingsRate: number;
  }>;
}

export interface PeriodComparison {
  currentPeriod: {
    label: string;
    startDate: string;
    endDate: string;
    income: number;
    expenses: number;
    netSavings: number;
    savingsRate: number;
  };
  previousPeriod: {
    label: string;
    startDate: string;
    endDate: string;
    income: number;
    expenses: number;
    netSavings: number;
    savingsRate: number;
  };
  changes: {
    income: { amount: number; percent: number; direction: TrendDirection };
    expenses: { amount: number; percent: number; direction: TrendDirection };
    netSavings: { amount: number; percent: number; direction: TrendDirection };
    savingsRate: { amount: number; direction: TrendDirection };
  };
}

export interface IncomeExpenseBreakdown {
  // Historical data
  history: IncomeExpenseHistory[];

  // Current period summary
  currentMonth: {
    income: number;
    expenses: number;
    netSavings: number;
    savingsRate: number;
    daysRemaining: number;
    projectedIncome: number;
    projectedExpenses: number;
  };

  // Trend indicators
  trends: {
    income: TrendIndicator;
    expenses: TrendIndicator;
    netSavings: TrendIndicator;
    savingsRate: TrendIndicator;
  };

  // Forecasts
  forecast: IncomeExpenseForecast;

  // Period comparisons
  monthOverMonth: PeriodComparison;
  quarterOverQuarter: PeriodComparison | null;
  yearOverYear: PeriodComparison | null;

  // Averages
  averages: {
    monthlyIncome: number;
    monthlyExpenses: number;
    monthlyNetSavings: number;
    savingsRate: number;
    incomeToExpenseRatio: number;
  };

  // Seasonality
  seasonality: {
    incomeSeasonalityDetected: boolean;
    expenseSeasonalityDetected: boolean;
    highIncomeMonths: number[];
    highExpenseMonths: number[];
  };

  lastUpdated: string;
}

export interface IncomeExpenseService {
  /**
   * Get comprehensive income vs expense breakdown
   */
  getBreakdown(
    workspaceId: number,
    options?: {
      months?: number;
      forecastHorizon?: number;
      accountId?: number;
    }
  ): Promise<IncomeExpenseBreakdown>;

  /**
   * Get trend indicator for income
   */
  getIncomeTrend(workspaceId: number): Promise<TrendIndicator>;

  /**
   * Get trend indicator for expenses
   */
  getExpenseTrend(workspaceId: number): Promise<TrendIndicator>;

  /**
   * Get period comparison (current vs previous)
   */
  getPeriodComparison(
    workspaceId: number,
    periodType: "month" | "quarter" | "year"
  ): Promise<PeriodComparison>;

  /**
   * Get income/expense history
   */
  getHistory(
    workspaceId: number,
    months: number,
    accountId?: number
  ): Promise<IncomeExpenseHistory[]>;

  /**
   * Get quick summary for dashboard
   */
  getSummary(workspaceId: number): Promise<{
    thisMonth: { income: number; expenses: number; net: number };
    lastMonth: { income: number; expenses: number; net: number };
    incomeTrend: TrendDirection;
    expenseTrend: TrendDirection;
    savingsRate: number;
  }>;
}

// =============================================================================
// Service Implementation
// =============================================================================

export function createIncomeExpenseService(): IncomeExpenseService {
  /**
   * Get monthly income and expense data
   */
  async function getMonthlyData(
    workspaceId: number,
    months: number,
    accountId?: number
  ): Promise<Array<{ period: string; income: number; expenses: number }>> {
    let accountIds: number[];
    if (accountId !== undefined) {
      accountIds = [accountId];
    } else {
      accountIds = await getWorkspaceAccountIds(workspaceId);
      if (accountIds.length === 0) {
        return [];
      }
    }

    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const cutoffDate = cutoff.toISOString().split("T")[0];

    // Get income
    const incomeResult = await db
      .select({
        period: sql<string>`strftime('%Y-%m', ${transactions.date})`,
        total: sql<number>`SUM(${transactions.amount}) / 100.0`,
      })
      .from(transactions)
      .where(
        and(
          inArray(transactions.accountId, accountIds),
          gte(transactions.date, cutoffDate),
          sql`${transactions.amount} > 0`
        )
      )
      .groupBy(sql`strftime('%Y-%m', ${transactions.date})`)
      .orderBy(sql`strftime('%Y-%m', ${transactions.date})`);

    // Get expenses
    const expenseResult = await db
      .select({
        period: sql<string>`strftime('%Y-%m', ${transactions.date})`,
        total: sql<number>`SUM(ABS(${transactions.amount})) / 100.0`,
      })
      .from(transactions)
      .where(
        and(
          inArray(transactions.accountId, accountIds),
          gte(transactions.date, cutoffDate),
          sql`${transactions.amount} < 0`
        )
      )
      .groupBy(sql`strftime('%Y-%m', ${transactions.date})`)
      .orderBy(sql`strftime('%Y-%m', ${transactions.date})`);

    // Merge income and expense data
    const incomeMap = new Map(incomeResult.map((r) => [r.period, r.total ?? 0]));
    const expenseMap = new Map(expenseResult.map((r) => [r.period, r.total ?? 0]));

    // Generate all months
    const periods = new Set([...incomeMap.keys(), ...expenseMap.keys()]);
    const result: Array<{ period: string; income: number; expenses: number }> = [];

    for (const period of Array.from(periods).sort()) {
      result.push({
        period,
        income: incomeMap.get(period) ?? 0,
        expenses: expenseMap.get(period) ?? 0,
      });
    }

    return result;
  }

  /**
   * Calculate trend from values
   */
  function calculateTrend(values: number[]): TrendIndicator {
    if (values.length < 2) {
      return {
        direction: "stable",
        changePercent: 0,
        description: "Not enough data to determine trend",
        confidence: 0,
      };
    }

    // Use linear regression to determine trend
    const data: [number, number][] = values.map((v, i) => [i, v]);
    const regression = linearRegression(data);
    const slope = regression.m;

    // Calculate average value
    const avg = mean(values);
    if (avg === 0) {
      return {
        direction: "stable",
        changePercent: 0,
        description: "Values are zero",
        confidence: 0,
      };
    }

    // Slope as percentage of average
    const changePercent = (slope / avg) * 100 * values.length;

    // Determine direction (use 5% threshold for "stable")
    let direction: TrendDirection;
    if (changePercent > 5) {
      direction = "increasing";
    } else if (changePercent < -5) {
      direction = "decreasing";
    } else {
      direction = "stable";
    }

    // Calculate R-squared for confidence
    const yMean = mean(values);
    const ssTotal = values.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const ssResidual = values.reduce((sum, y, i) => {
      const predicted = regression.m * i + regression.b;
      return sum + Math.pow(y - predicted, 2);
    }, 0);
    const rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;

    // Generate description
    let description: string;
    if (direction === "stable") {
      description = "Relatively stable over the period";
    } else {
      const absChange = Math.abs(changePercent).toFixed(1);
      description = `${direction === "increasing" ? "Up" : "Down"} ~${absChange}% over the period`;
    }

    return {
      direction,
      changePercent,
      description,
      confidence: Math.min(rSquared + 0.3, 1), // Add base confidence
    };
  }

  /**
   * Get period dates
   */
  function getPeriodDates(
    periodType: "month" | "quarter" | "year",
    offset: number = 0
  ): { start: string; end: string; label: string } {
    const now = new Date();

    if (periodType === "month") {
      const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 0);
      const label = start.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      return {
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
        label,
      };
    }

    if (periodType === "quarter") {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const quarterStart = new Date(now.getFullYear(), (currentQuarter - offset) * 3, 1);
      const quarterEnd = new Date(now.getFullYear(), (currentQuarter - offset + 1) * 3, 0);
      const qNum = Math.floor(quarterStart.getMonth() / 3) + 1;
      const label = `Q${qNum} ${quarterStart.getFullYear()}`;
      return {
        start: quarterStart.toISOString().split("T")[0],
        end: quarterEnd.toISOString().split("T")[0],
        label,
      };
    }

    // Year
    const yearStart = new Date(now.getFullYear() - offset, 0, 1);
    const yearEnd = new Date(now.getFullYear() - offset, 11, 31);
    return {
      start: yearStart.toISOString().split("T")[0],
      end: yearEnd.toISOString().split("T")[0],
      label: yearStart.getFullYear().toString(),
    };
  }

  /**
   * Get period totals
   */
  async function getPeriodTotals(
    workspaceId: number,
    startDate: string,
    endDate: string
  ): Promise<{ income: number; expenses: number }> {
    const accountIds = await getWorkspaceAccountIds(workspaceId);
    if (accountIds.length === 0) {
      return { income: 0, expenses: 0 };
    }

    const result = await db
      .select({
        income: sql<number>`SUM(CASE WHEN ${transactions.amount} > 0 THEN ${transactions.amount} ELSE 0 END) / 100.0`,
        expenses: sql<number>`SUM(CASE WHEN ${transactions.amount} < 0 THEN ABS(${transactions.amount}) ELSE 0 END) / 100.0`,
      })
      .from(transactions)
      .where(
        and(
          inArray(transactions.accountId, accountIds),
          gte(transactions.date, startDate),
          sql`${transactions.date} <= ${endDate}`
        )
      );

    return {
      income: result[0]?.income ?? 0,
      expenses: result[0]?.expenses ?? 0,
    };
  }

  /**
   * Detect seasonality in monthly data
   */
  function detectSeasonality(
    monthlyData: Array<{ period: string; income: number; expenses: number }>
  ): {
    incomeSeasonalityDetected: boolean;
    expenseSeasonalityDetected: boolean;
    highIncomeMonths: number[];
    highExpenseMonths: number[];
  } {
    if (monthlyData.length < 12) {
      return {
        incomeSeasonalityDetected: false,
        expenseSeasonalityDetected: false,
        highIncomeMonths: [],
        highExpenseMonths: [],
      };
    }

    // Group by month number
    const incomeByMonth: Record<number, number[]> = {};
    const expenseByMonth: Record<number, number[]> = {};

    for (const data of monthlyData) {
      const month = parseInt(data.period.split("-")[1], 10);
      if (!incomeByMonth[month]) incomeByMonth[month] = [];
      if (!expenseByMonth[month]) expenseByMonth[month] = [];
      incomeByMonth[month].push(data.income);
      expenseByMonth[month].push(data.expenses);
    }

    // Calculate averages per month
    const incomeAvgByMonth: Record<number, number> = {};
    const expenseAvgByMonth: Record<number, number> = {};

    for (let m = 1; m <= 12; m++) {
      incomeAvgByMonth[m] = incomeByMonth[m] ? mean(incomeByMonth[m]) : 0;
      expenseAvgByMonth[m] = expenseByMonth[m] ? mean(expenseByMonth[m]) : 0;
    }

    // Calculate overall averages
    const overallIncomeAvg = mean(Object.values(incomeAvgByMonth));
    const overallExpenseAvg = mean(Object.values(expenseAvgByMonth));

    // Find high months (> 1.2x average)
    const highIncomeMonths = Object.entries(incomeAvgByMonth)
      .filter(([_, avg]) => avg > overallIncomeAvg * 1.2)
      .map(([m]) => parseInt(m, 10));

    const highExpenseMonths = Object.entries(expenseAvgByMonth)
      .filter(([_, avg]) => avg > overallExpenseAvg * 1.2)
      .map(([m]) => parseInt(m, 10));

    // Detect seasonality using coefficient of variation
    const incomeCv =
      overallIncomeAvg > 0
        ? standardDeviation(Object.values(incomeAvgByMonth)) / overallIncomeAvg
        : 0;
    const expenseCv =
      overallExpenseAvg > 0
        ? standardDeviation(Object.values(expenseAvgByMonth)) / overallExpenseAvg
        : 0;

    return {
      incomeSeasonalityDetected: incomeCv > 0.15,
      expenseSeasonalityDetected: expenseCv > 0.15,
      highIncomeMonths,
      highExpenseMonths,
    };
  }

  return {
    async getBreakdown(workspaceId, options = {}): Promise<IncomeExpenseBreakdown> {
      const { months = 12, forecastHorizon = 3, accountId } = options;

      // Get historical data
      const monthlyData = await getMonthlyData(workspaceId, months, accountId);

      // Convert to history format
      const history: IncomeExpenseHistory[] = monthlyData.map((d) => ({
        period: d.period,
        income: d.income,
        expenses: d.expenses,
        netSavings: d.income - d.expenses,
        savingsRate: d.income > 0 ? ((d.income - d.expenses) / d.income) * 100 : 0,
      }));

      // Get current month data
      const currentPeriod = getPeriodDates("month", 0);
      const currentTotals = await getPeriodTotals(workspaceId, currentPeriod.start, currentPeriod.end);

      // Calculate days remaining in month
      const today = new Date();
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const daysRemaining = lastDayOfMonth.getDate() - today.getDate();
      const totalDays = lastDayOfMonth.getDate();
      const daysElapsed = today.getDate();

      // Project current month
      const projectedIncome = daysElapsed > 0 ? (currentTotals.income / daysElapsed) * totalDays : 0;
      const projectedExpenses = daysElapsed > 0 ? (currentTotals.expenses / daysElapsed) * totalDays : 0;

      // Calculate trends
      const incomeValues = history.map((h) => h.income);
      const expenseValues = history.map((h) => h.expenses);
      const netSavingsValues = history.map((h) => h.netSavings);
      const savingsRateValues = history.map((h) => h.savingsRate);

      const trends = {
        income: calculateTrend(incomeValues),
        expenses: calculateTrend(expenseValues),
        netSavings: calculateTrend(netSavingsValues),
        savingsRate: calculateTrend(savingsRateValues),
      };

      // Generate simple forecasts (using linear trend + recent average)
      const recentMonths = history.slice(-6);
      const avgIncome = recentMonths.length > 0 ? mean(recentMonths.map((h) => h.income)) : 0;
      const avgExpenses = recentMonths.length > 0 ? mean(recentMonths.map((h) => h.expenses)) : 0;

      // Apply trend adjustments
      const incomeTrendFactor = 1 + trends.income.changePercent / 100 / 12;
      const expenseTrendFactor = 1 + trends.expenses.changePercent / 100 / 12;

      const incomePredictions: ForecastPrediction[] = [];
      const expensePredictions: ForecastPrediction[] = [];
      const netSavingsPredictions: Array<{
        date: string;
        value: number;
        income: number;
        expenses: number;
        savingsRate: number;
      }> = [];

      for (let i = 1; i <= forecastHorizon; i++) {
        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + i);
        const dateStr = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, "0")}`;

        const predictedIncome = avgIncome * Math.pow(incomeTrendFactor, i);
        const predictedExpenses = avgExpenses * Math.pow(expenseTrendFactor, i);
        const incomeStd = standardDeviation(incomeValues) || avgIncome * 0.1;
        const expenseStd = standardDeviation(expenseValues) || avgExpenses * 0.1;

        incomePredictions.push({
          date: dateStr,
          value: predictedIncome,
          lowerBound: predictedIncome - 1.96 * incomeStd,
          upperBound: predictedIncome + 1.96 * incomeStd,
          confidence: Math.max(0.5, 0.9 - i * 0.1),
        });

        expensePredictions.push({
          date: dateStr,
          value: predictedExpenses,
          lowerBound: Math.max(0, predictedExpenses - 1.96 * expenseStd),
          upperBound: predictedExpenses + 1.96 * expenseStd,
          confidence: Math.max(0.5, 0.9 - i * 0.1),
        });

        const netSavings = predictedIncome - predictedExpenses;
        netSavingsPredictions.push({
          date: dateStr,
          value: netSavings,
          income: predictedIncome,
          expenses: predictedExpenses,
          savingsRate: predictedIncome > 0 ? (netSavings / predictedIncome) * 100 : 0,
        });
      }

      // Period comparisons
      const currentMonthPeriod = getPeriodDates("month", 0);
      const lastMonthPeriod = getPeriodDates("month", 1);
      const currentMonthTotals = await getPeriodTotals(workspaceId, currentMonthPeriod.start, currentMonthPeriod.end);
      const lastMonthTotals = await getPeriodTotals(workspaceId, lastMonthPeriod.start, lastMonthPeriod.end);

      const monthOverMonth: PeriodComparison = {
        currentPeriod: {
          label: currentMonthPeriod.label,
          startDate: currentMonthPeriod.start,
          endDate: currentMonthPeriod.end,
          income: currentMonthTotals.income,
          expenses: currentMonthTotals.expenses,
          netSavings: currentMonthTotals.income - currentMonthTotals.expenses,
          savingsRate:
            currentMonthTotals.income > 0
              ? ((currentMonthTotals.income - currentMonthTotals.expenses) / currentMonthTotals.income) * 100
              : 0,
        },
        previousPeriod: {
          label: lastMonthPeriod.label,
          startDate: lastMonthPeriod.start,
          endDate: lastMonthPeriod.end,
          income: lastMonthTotals.income,
          expenses: lastMonthTotals.expenses,
          netSavings: lastMonthTotals.income - lastMonthTotals.expenses,
          savingsRate:
            lastMonthTotals.income > 0
              ? ((lastMonthTotals.income - lastMonthTotals.expenses) / lastMonthTotals.income) * 100
              : 0,
        },
        changes: {
          income: {
            amount: currentMonthTotals.income - lastMonthTotals.income,
            percent:
              lastMonthTotals.income > 0
                ? ((currentMonthTotals.income - lastMonthTotals.income) / lastMonthTotals.income) * 100
                : 0,
            direction:
              currentMonthTotals.income > lastMonthTotals.income * 1.05
                ? "increasing"
                : currentMonthTotals.income < lastMonthTotals.income * 0.95
                  ? "decreasing"
                  : "stable",
          },
          expenses: {
            amount: currentMonthTotals.expenses - lastMonthTotals.expenses,
            percent:
              lastMonthTotals.expenses > 0
                ? ((currentMonthTotals.expenses - lastMonthTotals.expenses) / lastMonthTotals.expenses) * 100
                : 0,
            direction:
              currentMonthTotals.expenses > lastMonthTotals.expenses * 1.05
                ? "increasing"
                : currentMonthTotals.expenses < lastMonthTotals.expenses * 0.95
                  ? "decreasing"
                  : "stable",
          },
          netSavings: {
            amount:
              currentMonthTotals.income -
              currentMonthTotals.expenses -
              (lastMonthTotals.income - lastMonthTotals.expenses),
            percent: 0,
            direction:
              currentMonthTotals.income - currentMonthTotals.expenses >
              lastMonthTotals.income - lastMonthTotals.expenses
                ? "increasing"
                : "decreasing",
          },
          savingsRate: {
            amount: 0,
            direction: "stable",
          },
        },
      };

      // Quarter comparison (only if enough data)
      let quarterOverQuarter: PeriodComparison | null = null;
      if (history.length >= 6) {
        const currentQuarterPeriod = getPeriodDates("quarter", 0);
        const lastQuarterPeriod = getPeriodDates("quarter", 1);
        const currentQuarterTotals = await getPeriodTotals(
          workspaceId,
          currentQuarterPeriod.start,
          currentQuarterPeriod.end
        );
        const lastQuarterTotals = await getPeriodTotals(
          workspaceId,
          lastQuarterPeriod.start,
          lastQuarterPeriod.end
        );

        quarterOverQuarter = {
          currentPeriod: {
            label: currentQuarterPeriod.label,
            startDate: currentQuarterPeriod.start,
            endDate: currentQuarterPeriod.end,
            income: currentQuarterTotals.income,
            expenses: currentQuarterTotals.expenses,
            netSavings: currentQuarterTotals.income - currentQuarterTotals.expenses,
            savingsRate:
              currentQuarterTotals.income > 0
                ? ((currentQuarterTotals.income - currentQuarterTotals.expenses) / currentQuarterTotals.income) * 100
                : 0,
          },
          previousPeriod: {
            label: lastQuarterPeriod.label,
            startDate: lastQuarterPeriod.start,
            endDate: lastQuarterPeriod.end,
            income: lastQuarterTotals.income,
            expenses: lastQuarterTotals.expenses,
            netSavings: lastQuarterTotals.income - lastQuarterTotals.expenses,
            savingsRate:
              lastQuarterTotals.income > 0
                ? ((lastQuarterTotals.income - lastQuarterTotals.expenses) / lastQuarterTotals.income) * 100
                : 0,
          },
          changes: {
            income: {
              amount: currentQuarterTotals.income - lastQuarterTotals.income,
              percent:
                lastQuarterTotals.income > 0
                  ? ((currentQuarterTotals.income - lastQuarterTotals.income) / lastQuarterTotals.income) * 100
                  : 0,
              direction:
                currentQuarterTotals.income > lastQuarterTotals.income * 1.05
                  ? "increasing"
                  : currentQuarterTotals.income < lastQuarterTotals.income * 0.95
                    ? "decreasing"
                    : "stable",
            },
            expenses: {
              amount: currentQuarterTotals.expenses - lastQuarterTotals.expenses,
              percent:
                lastQuarterTotals.expenses > 0
                  ? ((currentQuarterTotals.expenses - lastQuarterTotals.expenses) / lastQuarterTotals.expenses) * 100
                  : 0,
              direction:
                currentQuarterTotals.expenses > lastQuarterTotals.expenses * 1.05
                  ? "increasing"
                  : currentQuarterTotals.expenses < lastQuarterTotals.expenses * 0.95
                    ? "decreasing"
                    : "stable",
            },
            netSavings: {
              amount:
                currentQuarterTotals.income -
                currentQuarterTotals.expenses -
                (lastQuarterTotals.income - lastQuarterTotals.expenses),
              percent: 0,
              direction:
                currentQuarterTotals.income - currentQuarterTotals.expenses >
                lastQuarterTotals.income - lastQuarterTotals.expenses
                  ? "increasing"
                  : "decreasing",
            },
            savingsRate: {
              amount: 0,
              direction: "stable",
            },
          },
        };
      }

      // Year comparison (only if enough data)
      let yearOverYear: PeriodComparison | null = null;
      if (history.length >= 13) {
        const currentYearPeriod = getPeriodDates("year", 0);
        const lastYearPeriod = getPeriodDates("year", 1);
        const currentYearTotals = await getPeriodTotals(workspaceId, currentYearPeriod.start, currentYearPeriod.end);
        const lastYearTotals = await getPeriodTotals(workspaceId, lastYearPeriod.start, lastYearPeriod.end);

        yearOverYear = {
          currentPeriod: {
            label: currentYearPeriod.label,
            startDate: currentYearPeriod.start,
            endDate: currentYearPeriod.end,
            income: currentYearTotals.income,
            expenses: currentYearTotals.expenses,
            netSavings: currentYearTotals.income - currentYearTotals.expenses,
            savingsRate:
              currentYearTotals.income > 0
                ? ((currentYearTotals.income - currentYearTotals.expenses) / currentYearTotals.income) * 100
                : 0,
          },
          previousPeriod: {
            label: lastYearPeriod.label,
            startDate: lastYearPeriod.start,
            endDate: lastYearPeriod.end,
            income: lastYearTotals.income,
            expenses: lastYearTotals.expenses,
            netSavings: lastYearTotals.income - lastYearTotals.expenses,
            savingsRate:
              lastYearTotals.income > 0
                ? ((lastYearTotals.income - lastYearTotals.expenses) / lastYearTotals.income) * 100
                : 0,
          },
          changes: {
            income: {
              amount: currentYearTotals.income - lastYearTotals.income,
              percent:
                lastYearTotals.income > 0
                  ? ((currentYearTotals.income - lastYearTotals.income) / lastYearTotals.income) * 100
                  : 0,
              direction:
                currentYearTotals.income > lastYearTotals.income * 1.05
                  ? "increasing"
                  : currentYearTotals.income < lastYearTotals.income * 0.95
                    ? "decreasing"
                    : "stable",
            },
            expenses: {
              amount: currentYearTotals.expenses - lastYearTotals.expenses,
              percent:
                lastYearTotals.expenses > 0
                  ? ((currentYearTotals.expenses - lastYearTotals.expenses) / lastYearTotals.expenses) * 100
                  : 0,
              direction:
                currentYearTotals.expenses > lastYearTotals.expenses * 1.05
                  ? "increasing"
                  : currentYearTotals.expenses < lastYearTotals.expenses * 0.95
                    ? "decreasing"
                    : "stable",
            },
            netSavings: {
              amount:
                currentYearTotals.income -
                currentYearTotals.expenses -
                (lastYearTotals.income - lastYearTotals.expenses),
              percent: 0,
              direction:
                currentYearTotals.income - currentYearTotals.expenses >
                lastYearTotals.income - lastYearTotals.expenses
                  ? "increasing"
                  : "decreasing",
            },
            savingsRate: {
              amount: 0,
              direction: "stable",
            },
          },
        };
      }

      // Calculate averages
      const monthlyIncomeAvg = incomeValues.length > 0 ? mean(incomeValues) : 0;
      const monthlyExpenseAvg = expenseValues.length > 0 ? mean(expenseValues) : 0;
      const monthlyNetSavingsAvg = netSavingsValues.length > 0 ? mean(netSavingsValues) : 0;
      const savingsRateAvg = savingsRateValues.length > 0 ? mean(savingsRateValues) : 0;

      // Seasonality detection
      const seasonality = detectSeasonality(monthlyData);

      return {
        history,
        currentMonth: {
          income: currentTotals.income,
          expenses: currentTotals.expenses,
          netSavings: currentTotals.income - currentTotals.expenses,
          savingsRate:
            currentTotals.income > 0
              ? ((currentTotals.income - currentTotals.expenses) / currentTotals.income) * 100
              : 0,
          daysRemaining,
          projectedIncome,
          projectedExpenses,
        },
        trends,
        forecast: {
          incomePredictions,
          expensePredictions,
          netSavingsPredictions,
        },
        monthOverMonth,
        quarterOverQuarter,
        yearOverYear,
        averages: {
          monthlyIncome: monthlyIncomeAvg,
          monthlyExpenses: monthlyExpenseAvg,
          monthlyNetSavings: monthlyNetSavingsAvg,
          savingsRate: savingsRateAvg,
          incomeToExpenseRatio: monthlyExpenseAvg > 0 ? monthlyIncomeAvg / monthlyExpenseAvg : 0,
        },
        seasonality,
        lastUpdated: new Date().toISOString(),
      };
    },

    async getIncomeTrend(workspaceId): Promise<TrendIndicator> {
      const monthlyData = await getMonthlyData(workspaceId, 12);
      const incomeValues = monthlyData.map((d) => d.income);
      return calculateTrend(incomeValues);
    },

    async getExpenseTrend(workspaceId): Promise<TrendIndicator> {
      const monthlyData = await getMonthlyData(workspaceId, 12);
      const expenseValues = monthlyData.map((d) => d.expenses);
      return calculateTrend(expenseValues);
    },

    async getPeriodComparison(workspaceId, periodType): Promise<PeriodComparison> {
      const currentPeriod = getPeriodDates(periodType, 0);
      const previousPeriod = getPeriodDates(periodType, 1);

      const currentTotals = await getPeriodTotals(workspaceId, currentPeriod.start, currentPeriod.end);
      const previousTotals = await getPeriodTotals(workspaceId, previousPeriod.start, previousPeriod.end);

      const currentNet = currentTotals.income - currentTotals.expenses;
      const previousNet = previousTotals.income - previousTotals.expenses;

      return {
        currentPeriod: {
          label: currentPeriod.label,
          startDate: currentPeriod.start,
          endDate: currentPeriod.end,
          income: currentTotals.income,
          expenses: currentTotals.expenses,
          netSavings: currentNet,
          savingsRate: currentTotals.income > 0 ? (currentNet / currentTotals.income) * 100 : 0,
        },
        previousPeriod: {
          label: previousPeriod.label,
          startDate: previousPeriod.start,
          endDate: previousPeriod.end,
          income: previousTotals.income,
          expenses: previousTotals.expenses,
          netSavings: previousNet,
          savingsRate: previousTotals.income > 0 ? (previousNet / previousTotals.income) * 100 : 0,
        },
        changes: {
          income: {
            amount: currentTotals.income - previousTotals.income,
            percent:
              previousTotals.income > 0
                ? ((currentTotals.income - previousTotals.income) / previousTotals.income) * 100
                : 0,
            direction:
              currentTotals.income > previousTotals.income * 1.05
                ? "increasing"
                : currentTotals.income < previousTotals.income * 0.95
                  ? "decreasing"
                  : "stable",
          },
          expenses: {
            amount: currentTotals.expenses - previousTotals.expenses,
            percent:
              previousTotals.expenses > 0
                ? ((currentTotals.expenses - previousTotals.expenses) / previousTotals.expenses) * 100
                : 0,
            direction:
              currentTotals.expenses > previousTotals.expenses * 1.05
                ? "increasing"
                : currentTotals.expenses < previousTotals.expenses * 0.95
                  ? "decreasing"
                  : "stable",
          },
          netSavings: {
            amount: currentNet - previousNet,
            percent: previousNet !== 0 ? ((currentNet - previousNet) / Math.abs(previousNet)) * 100 : 0,
            direction: currentNet > previousNet ? "increasing" : currentNet < previousNet ? "decreasing" : "stable",
          },
          savingsRate: {
            amount: 0,
            direction: "stable",
          },
        },
      };
    },

    async getHistory(workspaceId, months, accountId): Promise<IncomeExpenseHistory[]> {
      const monthlyData = await getMonthlyData(workspaceId, months, accountId);
      return monthlyData.map((d) => ({
        period: d.period,
        income: d.income,
        expenses: d.expenses,
        netSavings: d.income - d.expenses,
        savingsRate: d.income > 0 ? ((d.income - d.expenses) / d.income) * 100 : 0,
      }));
    },

    async getSummary(workspaceId) {
      const thisMonthPeriod = getPeriodDates("month", 0);
      const lastMonthPeriod = getPeriodDates("month", 1);

      const thisMonthTotals = await getPeriodTotals(workspaceId, thisMonthPeriod.start, thisMonthPeriod.end);
      const lastMonthTotals = await getPeriodTotals(workspaceId, lastMonthPeriod.start, lastMonthPeriod.end);

      const monthlyData = await getMonthlyData(workspaceId, 6);
      const incomeValues = monthlyData.map((d) => d.income);
      const expenseValues = monthlyData.map((d) => d.expenses);

      const incomeTrend = calculateTrend(incomeValues);
      const expenseTrend = calculateTrend(expenseValues);

      const thisMonthNet = thisMonthTotals.income - thisMonthTotals.expenses;
      const savingsRate = thisMonthTotals.income > 0 ? (thisMonthNet / thisMonthTotals.income) * 100 : 0;

      return {
        thisMonth: {
          income: thisMonthTotals.income,
          expenses: thisMonthTotals.expenses,
          net: thisMonthNet,
        },
        lastMonth: {
          income: lastMonthTotals.income,
          expenses: lastMonthTotals.expenses,
          net: lastMonthTotals.income - lastMonthTotals.expenses,
        },
        incomeTrend: incomeTrend.direction,
        expenseTrend: expenseTrend.direction,
        savingsRate,
      };
    },
  };
}
