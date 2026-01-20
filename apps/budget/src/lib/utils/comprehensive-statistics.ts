/**
 * Comprehensive statistics calculations for chart analytics tab
 * Extends chart-statistics.ts with additional metrics for detailed analysis
 */

import { mean, standardDeviation, sum } from 'simple-statistics';
import {
	calculateLinearTrend,
	calculateGrowthRate,
	calculatePercentileBands,
	identifyOutliers,
	type TrendLineData,
	type PercentileBands
} from './chart-statistics';
import { formatPercentRaw } from './formatters';

// ===== Type Definitions =====

export interface MonthlyDataPoint {
	month: string;
	monthLabel: string;
	spending: number;
	date: Date;
}

export interface ComprehensiveStats {
	summary: SummaryStats;
	trend: TrendStats;
	distribution: DistributionStats;
	outliers: OutlierStats;
	comparison: ComparisonStats;
}

export interface SummaryStats {
	average: number;
	median: number;
	total: number;
	count: number;
}

export interface TrendStats {
	direction: 'up' | 'down' | 'flat';
	growthRate: number | null;
	slope: number;
	monthlyChange: number;
}

export interface DistributionStats {
	highest: { value: number; month: string; monthLabel: string };
	lowest: { value: number; month: string; monthLabel: string };
	range: number;
	p25: number;
	p50: number;
	p75: number;
	iqr: number;
	stdDev: number;
	coefficientOfVariation: number;
}

export interface OutlierStats {
	count: number;
	months: Array<{ month: string; monthLabel: string; value: number; type: 'high' | 'low' }>;
}

export interface ComparisonStats {
	vsHistoricalAvg: number | null;
	vsHistoricalAvgPercent: number | null;
	vsBudgetTarget: number | null;
	vsBudgetTargetPercent: number | null;
	vsLastYearTotal: number | null;
	vsLastYearPercent: number | null;
}

// ===== Main Calculation Function =====

/**
 * Calculate comprehensive statistics from monthly spending data
 */
export function calculateComprehensiveStats(
	filteredData: MonthlyDataPoint[],
	allTimeData: MonthlyDataPoint[],
	budgetTarget?: number | null,
	lastYearTotal?: number | null
): ComprehensiveStats | null {
	if (filteredData.length === 0) return null;

	const summary = calculateSummaryStats(filteredData);
	const trend = calculateTrendStats(filteredData);
	const distribution = calculateDistributionStats(filteredData);
	const outliers = calculateOutlierStats(filteredData);
	const comparison = calculateComparisonStats(
		filteredData,
		allTimeData,
		budgetTarget,
		lastYearTotal
	);

	return {
		summary,
		trend,
		distribution,
		outliers,
		comparison
	};
}

// ===== Section Calculators =====

function calculateSummaryStats(data: MonthlyDataPoint[]): SummaryStats {
	const values = data.map((d) => d.spending);
	const avg = mean(values);
	const sortedValues = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sortedValues.length / 2);
	const median =
		sortedValues.length % 2 !== 0
			? sortedValues[mid]
			: (sortedValues[mid - 1] + sortedValues[mid]) / 2;

	return {
		average: avg,
		median: median,
		total: sum(values),
		count: data.length
	};
}

function calculateTrendStats(data: MonthlyDataPoint[]): TrendStats {
	const trendData = calculateLinearTrend(data);
	const growthRate = calculateGrowthRate(data);

	if (!trendData) {
		return {
			direction: 'flat',
			growthRate: null,
			slope: 0,
			monthlyChange: 0
		};
	}

	return {
		direction: trendData.direction,
		growthRate: growthRate,
		slope: trendData.slope,
		monthlyChange: trendData.slope // slope represents $/month change
	};
}

function calculateDistributionStats(data: MonthlyDataPoint[]): DistributionStats {
	const values = data.map((d) => d.spending);
	const avg = mean(values);
	const stdDev = data.length >= 2 ? standardDeviation(values) : 0;

	// Find highest and lowest
	let highest = data[0];
	let lowest = data[0];
	for (const d of data) {
		if (d.spending > highest.spending) highest = d;
		if (d.spending < lowest.spending) lowest = d;
	}

	// Get percentiles
	const percentiles = calculatePercentileBands(data);
	const p25 = percentiles?.p25 ?? 0;
	const p50 = percentiles?.p50 ?? avg;
	const p75 = percentiles?.p75 ?? 0;
	const iqr = p75 - p25;

	return {
		highest: { value: highest.spending, month: highest.month, monthLabel: highest.monthLabel },
		lowest: { value: lowest.spending, month: lowest.month, monthLabel: lowest.monthLabel },
		range: highest.spending - lowest.spending,
		p25,
		p50,
		p75,
		iqr,
		stdDev,
		coefficientOfVariation: avg !== 0 ? (stdDev / avg) * 100 : 0
	};
}

function calculateOutlierStats(data: MonthlyDataPoint[]): OutlierStats {
	const outlierIndices = identifyOutliers(data);
	const percentiles = calculatePercentileBands(data);

	if (!percentiles || outlierIndices.length === 0) {
		return { count: 0, months: [] };
	}

	const iqr = percentiles.p75 - percentiles.p25;
	const upperBound = percentiles.p75 + 1.5 * iqr;

	const outlierMonths = outlierIndices.map((i) => {
		const d = data[i];
		return {
			month: d.month,
			monthLabel: d.monthLabel,
			value: d.spending,
			type: (d.spending > upperBound ? 'high' : 'low') as 'high' | 'low'
		};
	});

	return {
		count: outlierIndices.length,
		months: outlierMonths
	};
}

function calculateComparisonStats(
	filteredData: MonthlyDataPoint[],
	allTimeData: MonthlyDataPoint[],
	budgetTarget?: number | null,
	lastYearTotal?: number | null
): ComparisonStats {
	const filteredTotal = sum(filteredData.map((d) => d.spending));
	const filteredAvg = mean(filteredData.map((d) => d.spending));
	const historicalAvg =
		allTimeData.length > 0 ? mean(allTimeData.map((d) => d.spending)) : null;

	// vs Historical Average
	let vsHistoricalAvg: number | null = null;
	let vsHistoricalAvgPercent: number | null = null;
	if (historicalAvg !== null && historicalAvg !== 0) {
		vsHistoricalAvg = filteredAvg - historicalAvg;
		vsHistoricalAvgPercent = ((filteredAvg - historicalAvg) / historicalAvg) * 100;
	}

	// vs Budget Target (compare monthly average to monthly budget)
	let vsBudgetTarget: number | null = null;
	let vsBudgetTargetPercent: number | null = null;
	if (budgetTarget && budgetTarget > 0) {
		vsBudgetTarget = filteredAvg - budgetTarget;
		vsBudgetTargetPercent = (filteredAvg / budgetTarget) * 100;
	}

	// vs Last Year Total
	let vsLastYearTotal: number | null = null;
	let vsLastYearPercent: number | null = null;
	if (lastYearTotal !== null && lastYearTotal !== undefined && lastYearTotal !== 0) {
		vsLastYearTotal = filteredTotal - lastYearTotal;
		vsLastYearPercent = ((filteredTotal - lastYearTotal) / lastYearTotal) * 100;
	}

	return {
		vsHistoricalAvg,
		vsHistoricalAvgPercent,
		vsBudgetTarget,
		vsBudgetTargetPercent,
		vsLastYearTotal,
		vsLastYearPercent
	};
}

// ===== Specialized Stats for Different Chart Types =====

/**
 * Data point for rate/percentage charts (savings rate, etc.)
 */
export interface RateDataPoint {
	month: string;
	monthLabel: string;
	rate: number; // Percentage value (0-100 or can be negative)
	date: Date;
}

/**
 * Comprehensive stats for rate/percentage data
 */
export interface RateStats {
	summary: {
		average: number;
		median: number;
		highest: { value: number; month: string; monthLabel: string };
		lowest: { value: number; month: string; monthLabel: string };
		count: number;
	};
	trend: TrendStats;
	distribution: {
		range: number;
		p25: number;
		p50: number;
		p75: number;
		stdDev: number;
		volatility: 'low' | 'moderate' | 'high';
	};
	targets: {
		monthsAboveTarget: number;
		monthsBelowTarget: number;
		averageAboveTarget: number | null;
		averageBelowTarget: number | null;
	};
}

/**
 * Calculate comprehensive statistics for rate/percentage data
 */
export function calculateComprehensiveStatsForRate(
	data: RateDataPoint[],
	targetRate: number = 20 // Default target savings rate
): RateStats | null {
	if (data.length === 0) return null;

	const values = data.map((d) => d.rate);
	const avg = mean(values);
	const sortedValues = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sortedValues.length / 2);
	const median =
		sortedValues.length % 2 !== 0
			? sortedValues[mid]
			: (sortedValues[mid - 1] + sortedValues[mid]) / 2;

	// Find highest and lowest
	let highest = data[0];
	let lowest = data[0];
	for (const d of data) {
		if (d.rate > highest.rate) highest = d;
		if (d.rate < lowest.rate) lowest = d;
	}

	// Calculate trend using adapted data structure
	const adaptedData = data.map((d) => ({
		month: d.month,
		monthLabel: d.monthLabel,
		spending: d.rate,
		date: d.date
	}));
	const trendData = calculateLinearTrend(adaptedData);
	const growthRate = calculateGrowthRate(adaptedData);

	// Percentiles
	const n = sortedValues.length;
	const p25 = sortedValues[Math.floor(n * 0.25)] ?? 0;
	const p50 = median;
	const p75 = sortedValues[Math.floor(n * 0.75)] ?? 0;
	const stdDev = data.length >= 2 ? standardDeviation(values) : 0;

	// Volatility classification
	const volatility: 'low' | 'moderate' | 'high' =
		stdDev < 5 ? 'low' : stdDev < 15 ? 'moderate' : 'high';

	// Target analysis
	const aboveTarget = data.filter((d) => d.rate >= targetRate);
	const belowTarget = data.filter((d) => d.rate < targetRate);

	return {
		summary: {
			average: avg,
			median,
			highest: { value: highest.rate, month: highest.month, monthLabel: highest.monthLabel },
			lowest: { value: lowest.rate, month: lowest.month, monthLabel: lowest.monthLabel },
			count: data.length
		},
		trend: {
			direction: trendData?.direction ?? 'flat',
			growthRate,
			slope: trendData?.slope ?? 0,
			monthlyChange: trendData?.slope ?? 0
		},
		distribution: {
			range: highest.rate - lowest.rate,
			p25,
			p50,
			p75,
			stdDev,
			volatility
		},
		targets: {
			monthsAboveTarget: aboveTarget.length,
			monthsBelowTarget: belowTarget.length,
			averageAboveTarget:
				aboveTarget.length > 0 ? mean(aboveTarget.map((d) => d.rate)) : null,
			averageBelowTarget:
				belowTarget.length > 0 ? mean(belowTarget.map((d) => d.rate)) : null
		}
	};
}

/**
 * Data point for distribution/histogram charts
 */
export interface DistributionDataPoint {
	amount: number;
	payee?: string;
	category?: string;
}

/**
 * Comprehensive stats for distribution data
 */
export interface DistributionChartStats {
	summary: {
		count: number;
		total: number;
		average: number;
		median: number;
	};
	distribution: {
		min: number;
		max: number;
		range: number;
		p10: number;
		p25: number;
		p50: number;
		p75: number;
		p90: number;
		stdDev: number;
		skewness: 'left' | 'symmetric' | 'right';
	};
	concentration: {
		top10PercentTotal: number;
		top10PercentCount: number;
		belowMedianTotal: number;
		belowMedianCount: number;
	};
}

/**
 * Calculate comprehensive statistics for distribution/histogram data
 */
export function calculateComprehensiveStatsForDistribution(
	data: DistributionDataPoint[]
): DistributionChartStats | null {
	if (data.length === 0) return null;

	const values = data.map((d) => d.amount).sort((a, b) => a - b);
	const n = values.length;
	const total = sum(values);
	const avg = mean(values);
	const mid = Math.floor(n / 2);
	const median = n % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
	const stdDev = n >= 2 ? standardDeviation(values) : 0;

	// Percentiles
	const p10 = values[Math.floor(n * 0.1)] ?? values[0];
	const p25 = values[Math.floor(n * 0.25)] ?? values[0];
	const p50 = median;
	const p75 = values[Math.floor(n * 0.75)] ?? values[n - 1];
	const p90 = values[Math.floor(n * 0.9)] ?? values[n - 1];

	// Skewness (simplified)
	const skewness: 'left' | 'symmetric' | 'right' =
		avg > median * 1.1 ? 'right' : avg < median * 0.9 ? 'left' : 'symmetric';

	// Concentration analysis
	const p90Threshold = p90;
	const top10Percent = values.filter((v) => v >= p90Threshold);
	const belowMedian = values.filter((v) => v < median);

	return {
		summary: {
			count: n,
			total,
			average: avg,
			median
		},
		distribution: {
			min: values[0],
			max: values[n - 1],
			range: values[n - 1] - values[0],
			p10,
			p25,
			p50,
			p75,
			p90,
			stdDev,
			skewness
		},
		concentration: {
			top10PercentTotal: sum(top10Percent),
			top10PercentCount: top10Percent.length,
			belowMedianTotal: sum(belowMedian),
			belowMedianCount: belowMedian.length
		}
	};
}

/**
 * Data point for ranking charts
 */
export interface RankingDataPoint {
	name: string;
	value: number;
	count?: number;
	category?: string;
}

/**
 * Comprehensive stats for ranking data
 */
export interface RankingStats {
	summary: {
		totalItems: number;
		totalValue: number;
		averageValue: number;
		medianValue: number;
	};
	concentration: {
		top1Percent: number;
		top3Percent: number;
		top5Percent: number;
		top10Percent: number;
		herfindahlIndex: number; // Market concentration (0-1)
		diversityScore: 'concentrated' | 'moderate' | 'diverse';
	};
	distribution: {
		highestItem: { name: string; value: number };
		lowestItem: { name: string; value: number };
		itemsAboveAverage: number;
		itemsBelowAverage: number;
	};
}

/**
 * Calculate comprehensive statistics for ranking data
 */
export function calculateComprehensiveStatsForRanking(
	data: RankingDataPoint[]
): RankingStats | null {
	if (data.length === 0) return null;

	const sortedData = [...data].sort((a, b) => b.value - a.value);
	const values = sortedData.map((d) => d.value);
	const n = values.length;
	const total = sum(values);
	const avg = mean(values);
	const sortedValues = [...values].sort((a, b) => a - b);
	const mid = Math.floor(n / 2);
	const median = n % 2 !== 0 ? sortedValues[mid] : (sortedValues[mid - 1] + sortedValues[mid]) / 2;

	// Concentration percentages (what % of total do top N items represent)
	const getTopPercent = (count: number): number => {
		if (total === 0) return 0;
		const topItems = sortedData.slice(0, count);
		return (sum(topItems.map((d) => d.value)) / total) * 100;
	};

	const top1Percent = getTopPercent(1);
	const top3Percent = getTopPercent(3);
	const top5Percent = getTopPercent(5);
	const top10Percent = getTopPercent(10);

	// Herfindahl-Hirschman Index (sum of squared market shares)
	const herfindahlIndex =
		total > 0 ? sum(values.map((v) => Math.pow(v / total, 2))) : 0;

	// Diversity classification based on HHI
	const diversityScore: 'concentrated' | 'moderate' | 'diverse' =
		herfindahlIndex > 0.25 ? 'concentrated' : herfindahlIndex > 0.15 ? 'moderate' : 'diverse';

	// Items above/below average
	const itemsAboveAverage = values.filter((v) => v > avg).length;
	const itemsBelowAverage = values.filter((v) => v <= avg).length;

	return {
		summary: {
			totalItems: n,
			totalValue: total,
			averageValue: avg,
			medianValue: median
		},
		concentration: {
			top1Percent,
			top3Percent,
			top5Percent,
			top10Percent,
			herfindahlIndex,
			diversityScore
		},
		distribution: {
			highestItem: { name: sortedData[0].name, value: sortedData[0].value },
			lowestItem: { name: sortedData[n - 1].name, value: sortedData[n - 1].value },
			itemsAboveAverage,
			itemsBelowAverage
		}
	};
}

/**
 * Data point for dual-series charts (income vs expenses)
 */
export interface DualSeriesDataPoint {
	month: string;
	monthLabel: string;
	income: number;
	expenses: number;
	date: Date;
}

/**
 * Comprehensive stats for dual-series data
 */
export interface DualSeriesStats {
	income: {
		average: number;
		total: number;
		highest: { value: number; month: string };
		trend: 'up' | 'down' | 'flat';
	};
	expenses: {
		average: number;
		total: number;
		highest: { value: number; month: string };
		trend: 'up' | 'down' | 'flat';
	};
	netFlow: {
		average: number;
		total: number;
		surplusMonths: number;
		deficitMonths: number;
		largestSurplus: { value: number; month: string } | null;
		largestDeficit: { value: number; month: string } | null;
	};
	ratio: {
		averageExpenseToIncome: number;
		monthsOverBudget: number;
	};
}

/**
 * Calculate comprehensive statistics for dual-series (income vs expenses) data
 */
export function calculateComprehensiveStatsForDualSeries(
	data: DualSeriesDataPoint[]
): DualSeriesStats | null {
	if (data.length === 0) return null;

	const incomes = data.map((d) => d.income);
	const expenses = data.map((d) => d.expenses);
	const netFlows = data.map((d) => d.income - d.expenses);

	// Income stats
	const incomeAvg = mean(incomes);
	const incomeTotal = sum(incomes);
	const highestIncome = data.reduce((max, d) =>
		d.income > max.income ? d : max
	);

	// Expenses stats
	const expenseAvg = mean(expenses);
	const expenseTotal = sum(expenses);
	const highestExpense = data.reduce((max, d) =>
		d.expenses > max.expenses ? d : max
	);

	// Net flow stats
	const netAvg = mean(netFlows);
	const netTotal = sum(netFlows);
	const surplusMonths = netFlows.filter((n) => n > 0).length;
	const deficitMonths = netFlows.filter((n) => n < 0).length;

	// Find largest surplus/deficit
	let largestSurplus: { value: number; month: string } | null = null;
	let largestDeficit: { value: number; month: string } | null = null;
	for (const d of data) {
		const net = d.income - d.expenses;
		if (net > 0 && (!largestSurplus || net > largestSurplus.value)) {
			largestSurplus = { value: net, month: d.monthLabel };
		}
		if (net < 0 && (!largestDeficit || net < largestDeficit.value)) {
			largestDeficit = { value: net, month: d.monthLabel };
		}
	}

	// Expense to income ratio
	const avgExpenseToIncome = incomeAvg > 0 ? (expenseAvg / incomeAvg) * 100 : 0;
	const monthsOverBudget = data.filter((d) => d.expenses > d.income).length;

	// Simple trend calculation for income
	const incomeData = data.map((d) => ({
		month: d.month,
		monthLabel: d.monthLabel,
		spending: d.income,
		date: d.date
	}));
	const incomeTrend = calculateLinearTrend(incomeData);

	// Simple trend calculation for expenses
	const expenseData = data.map((d) => ({
		month: d.month,
		monthLabel: d.monthLabel,
		spending: d.expenses,
		date: d.date
	}));
	const expenseTrend = calculateLinearTrend(expenseData);

	return {
		income: {
			average: incomeAvg,
			total: incomeTotal,
			highest: { value: highestIncome.income, month: highestIncome.monthLabel },
			trend: incomeTrend?.direction ?? 'flat'
		},
		expenses: {
			average: expenseAvg,
			total: expenseTotal,
			highest: { value: highestExpense.expenses, month: highestExpense.monthLabel },
			trend: expenseTrend?.direction ?? 'flat'
		},
		netFlow: {
			average: netAvg,
			total: netTotal,
			surplusMonths,
			deficitMonths,
			largestSurplus,
			largestDeficit
		},
		ratio: {
			averageExpenseToIncome: avgExpenseToIncome,
			monthsOverBudget
		}
	};
}

// ===== Formatting Helpers =====

/**
 * Format a number as currency
 */
export function formatStatCurrency(value: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(value);
}

/**
 * Format a percentage with sign
 */
export function formatStatPercent(value: number | null, includeSign = true): string {
	if (value === null) return 'N/A';
	const sign = includeSign && value > 0 ? '+' : '';
	return `${sign}${formatPercentRaw(value, 1)}`;
}

/**
 * Get trend indicator arrow
 */
export function getTrendIndicator(direction: 'up' | 'down' | 'flat'): string {
	switch (direction) {
		case 'up':
			return '↗';
		case 'down':
			return '↘';
		case 'flat':
			return '→';
	}
}
