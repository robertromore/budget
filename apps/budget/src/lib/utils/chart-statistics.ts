/**
 * Statistical utility functions for chart analysis overlays
 */

import { linearRegression, linearRegressionLine, mean, quantile } from 'simple-statistics';

export interface TrendLineData {
	/** Two points defining the trend line (start and end) - uses index-based x values */
	data: Array<{ x: number; y: number }>;
	/** Slope of the regression line */
	slope: number;
	/** Y-intercept of the regression line */
	intercept: number;
	/** Direction indicator based on slope */
	direction: 'up' | 'down' | 'flat';
}

export interface PercentileBands {
	/** 25th percentile value */
	p25: number;
	/** 50th percentile (median) value */
	p50: number;
	/** 75th percentile value */
	p75: number;
}

/**
 * Calculate linear regression trend line for spending data
 * Returns two points (start and end) that define the trend line using index-based x values
 *
 * @param data - Array of data points with spending values. If `index` property exists, it will be used;
 *               otherwise, array position (0, 1, 2, ...) is used as the x value.
 */
export function calculateLinearTrend(
	data: Array<{ spending: number; index?: number; date?: Date }>
): TrendLineData | null {
	if (data.length < 2) return null;

	// Convert to x-y pairs where x is the index
	// Use explicit index property if available, otherwise use array position
	const pairs: [number, number][] = data.map((d, i) => [d.index ?? i, d.spending]);

	const regression = linearRegression(pairs);
	const line = linearRegressionLine(regression);

	// Get first and last index values
	const firstIndex = data[0].index ?? 0;
	const lastIndex = data[data.length - 1].index ?? data.length - 1;

	// Generate trend line points at first and last data points using index-based x values
	const trendData = [
		{ x: firstIndex, y: line(firstIndex) },
		{ x: lastIndex, y: line(lastIndex) }
	];

	// Calculate average spending to determine slope significance threshold
	const avgSpending = data.reduce((sum, d) => sum + d.spending, 0) / data.length;
	const slopeThreshold = avgSpending * 0.01; // 1% of average spending

	// Determine direction based on slope
	const direction: 'up' | 'down' | 'flat' =
		regression.m > slopeThreshold ? 'up' : regression.m < -slopeThreshold ? 'down' : 'flat';

	return {
		data: trendData,
		slope: regression.m,
		intercept: regression.b,
		direction
	};
}

/**
 * Calculate historical average spending
 */
export function calculateHistoricalAverage(data: Array<{ spending: number }>): number {
	if (data.length === 0) return 0;
	return mean(data.map((d) => d.spending));
}

/**
 * Calculate percentile bands for spending distribution
 */
export function calculatePercentileBands(data: Array<{ spending: number }>): PercentileBands | null {
	if (data.length < 4) return null;

	const values = data.map((d) => d.spending).sort((a, b) => a - b);

	return {
		p25: quantile(values, 0.25),
		p50: quantile(values, 0.5),
		p75: quantile(values, 0.75)
	};
}

/**
 * Get trend line value at a specific index
 * Useful for comparing individual data points to the trend
 */
export function getTrendValueAtIndex(trend: TrendLineData, index: number): number {
	return trend.slope * index + trend.intercept;
}

/**
 * Calculate month-over-month growth rate
 */
export function calculateGrowthRate(data: Array<{ spending: number }>): number | null {
	if (data.length < 2) return null;

	const first = data[0].spending;
	const last = data[data.length - 1].spending;

	if (first === 0) return null;

	// Calculate compound monthly growth rate
	const months = data.length - 1;
	const growthRate = Math.pow(last / first, 1 / months) - 1;

	return growthRate * 100; // Return as percentage
}

/**
 * Identify outliers using IQR method
 * Returns indices of data points that are outliers
 */
export function identifyOutliers(data: Array<{ spending: number }>): number[] {
	if (data.length < 4) return [];

	const values = data.map((d) => d.spending);
	const q1 = quantile(values, 0.25);
	const q3 = quantile(values, 0.75);
	const iqr = q3 - q1;

	const lowerBound = q1 - 1.5 * iqr;
	const upperBound = q3 + 1.5 * iqr;

	return data
		.map((d, i) => (d.spending < lowerBound || d.spending > upperBound ? i : -1))
		.filter((i) => i >= 0);
}
