/**
 * Hook for aggregating payee intelligence data for the dashboard
 * Combines intelligence, stats, suggestions, and subscription detection
 */

import {
  classifySubscription,
  getIntelligenceWithProfile,
  getPayeeSuggestions,
  payeeKeys,
} from '$lib/query/payees';
import type { PayeeSuggestions } from '$lib/query/payees-types';
import type { IntelligenceProfile } from '$lib/schema/payees';
import { useQueryClient } from '@tanstack/svelte-query';

// Alert types for quick insights
export type QuickInsightType =
	| 'subscription_detected'
	| 'category_mismatch'
	| 'unusual_amount'
	| 'budget_exceeded'
	| 'new_payee';

export interface QuickInsight {
	type: QuickInsightType;
	title: string;
	description: string;
	priority: 'high' | 'medium' | 'low';
	actionLabel?: string;
	actionData?: Record<string, unknown>;
}

export interface ConfidenceMetrics {
	overall: number;
	dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
	transactionCount: number;
	timeSpanMonths: number;
	factors: {
		name: string;
		score: number;
		description: string;
	}[];
}

export interface SpendingTrend {
	direction: 'up' | 'down' | 'stable';
	percentChange: number;
	period: string;
}

export interface NextTransactionPrediction {
	date: string;
	daysUntil: number;
	amount: number;
	amountRange: [number, number];
	confidence: number;
	method: string;
	/** Prediction tier: statistical (default), ml (enhanced), or ai (with explanation) */
	tier?: 'statistical' | 'ml' | 'ai';
	/** AI-generated explanation when tier is 'ai' */
	aiExplanation?: string;
}

export interface BudgetSuggestion {
	monthlyAmount: number;
	buffer: number;
	totalSuggested: number;
	seasonalNote?: string;
	confidence: number;
	/** Prediction tier: statistical (default), ml (enhanced), or ai (with explanation) */
	tier?: 'statistical' | 'ml' | 'ai';
	/** AI-generated explanation when tier is 'ai' */
	aiExplanation?: string;
}

// Stats derived from spending analysis (local type to avoid conflict with repository type)
export interface InsightsStats {
	transactionCount: number;
	totalAmount: number;
	avgAmount: number;
	minAmount: number;
	maxAmount: number;
	monthlyAverage: number;
	firstTransactionDate: string | null;
	lastTransactionDate: string | null;
}

// Intelligence patterns derived from analysis (local type)
export interface InsightsIntelligence {
	patterns: {
		averageDaysBetween: number | null;
		isRegular: boolean;
		mostCommonDay: number | null;
		seasonalTrends: Array<{ month: number; avgAmount: number; count: number }>;
	};
}

export interface PayeeInsightsData {
	// Raw data from queries
	intelligence: InsightsIntelligence | null;
	suggestions: PayeeSuggestions | null;
	stats: InsightsStats | null;
	profile: IntelligenceProfile | null;
	subscriptionInfo: {
		isLikelySubscription: boolean;
		confidence: number;
		frequency: string | null;
		nextExpected: string | null;
	} | null;

	// Computed/derived data
	confidence: ConfidenceMetrics;
	trend: SpendingTrend | null;
	nextTransaction: NextTransactionPrediction | null;
	budgetSuggestion: BudgetSuggestion | null;
	alerts: QuickInsight[];

	// AI Analysis (persisted)
	aiExplanation: string | null;
	aiExplanationUpdatedAt: string | null;

	// State
	isLoading: boolean;
	isError: boolean;
	error: Error | null;
}

/**
 * Compute confidence metrics from stats and intelligence data
 */
function computeConfidence(
	stats: InsightsStats | null,
	intelligence: InsightsIntelligence | null,
	suggestions: PayeeSuggestions | null
): ConfidenceMetrics {
	const txnCount = stats?.transactionCount ?? 0;
	const firstDate = stats?.firstTransactionDate;
	const lastDate = stats?.lastTransactionDate;

	// Calculate time span in months
	let timeSpanMonths = 0;
	if (firstDate && lastDate) {
		const start = new Date(firstDate);
		const end = new Date(lastDate);
		timeSpanMonths = Math.max(
			1,
			(end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
		);
	}

	// Data quality assessment
	let dataQuality: ConfidenceMetrics['dataQuality'] = 'poor';
	if (txnCount >= 12 && timeSpanMonths >= 6) {
		dataQuality = 'excellent';
	} else if (txnCount >= 6 && timeSpanMonths >= 3) {
		dataQuality = 'good';
	} else if (txnCount >= 3) {
		dataQuality = 'fair';
	}

	// Calculate confidence factors
	const factors: ConfidenceMetrics['factors'] = [];

	// Transaction count factor
	const txnScore = Math.min(txnCount / 12, 1);
	factors.push({
		name: 'Transaction History',
		score: txnScore,
		description:
			txnCount >= 12
				? 'Excellent history'
				: txnCount >= 6
					? 'Good history'
					: `${txnCount} transactions`,
	});

	// Time span factor
	const timeScore = Math.min(timeSpanMonths / 6, 1);
	factors.push({
		name: 'Time Span',
		score: timeScore,
		description:
			timeSpanMonths >= 6 ? `${timeSpanMonths} months of data` : `Only ${timeSpanMonths} month(s)`,
	});

	// Pattern regularity factor
	const isRegular = intelligence?.patterns.isRegular ?? false;
	const regularityScore = isRegular ? 0.9 : 0.5;
	factors.push({
		name: 'Payment Pattern',
		score: regularityScore,
		description: isRegular ? 'Regular pattern detected' : 'Irregular payments',
	});

	// Overall confidence (weighted average)
	const overall =
		suggestions?.confidence ?? txnScore * 0.4 + timeScore * 0.3 + regularityScore * 0.3;

	return {
		overall,
		dataQuality,
		transactionCount: txnCount,
		timeSpanMonths,
		factors,
	};
}

/**
 * Compute spending trend from seasonal patterns
 */
function computeTrend(intelligence: InsightsIntelligence | null): SpendingTrend | null {
	const seasonalTrends = intelligence?.patterns.seasonalTrends;
	if (!seasonalTrends || seasonalTrends.length < 2) return null;

	// Compare recent months to older months
	const sorted = [...seasonalTrends].sort((a, b) => a.month - b.month);
	const midpoint = Math.floor(sorted.length / 2);
	const olderAvg =
		sorted.slice(0, midpoint).reduce((sum, m) => sum + m.avgAmount, 0) / midpoint || 1;
	const recentAvg =
		sorted.slice(midpoint).reduce((sum, m) => sum + m.avgAmount, 0) / (sorted.length - midpoint) ||
		1;

	const percentChange = ((recentAvg - olderAvg) / olderAvg) * 100;

	let direction: SpendingTrend['direction'] = 'stable';
	if (percentChange > 10) direction = 'up';
	else if (percentChange < -10) direction = 'down';

	return {
		direction,
		percentChange: Math.round(percentChange),
		period: `Last ${sorted.length} months`,
	};
}

/**
 * Compute next transaction prediction
 */
function computeNextTransaction(
	intelligence: InsightsIntelligence | null,
	stats: InsightsStats | null
): NextTransactionPrediction | null {
	const patterns = intelligence?.patterns;
	const avgAmount = stats?.avgAmount;
	const lastDate = stats?.lastTransactionDate;

	if (!patterns || !avgAmount || !lastDate) return null;

	const avgDaysBetween = patterns.averageDaysBetween;
	if (!avgDaysBetween || avgDaysBetween <= 0) return null;

	// Calculate predicted next date
	const lastTxnDate = new Date(lastDate);
	let predictedDate = new Date(lastTxnDate);
	predictedDate.setDate(predictedDate.getDate() + Math.round(avgDaysBetween));

	const now = new Date();
	// Reset time to start of day for accurate day comparison
	now.setHours(0, 0, 0, 0);
	predictedDate.setHours(0, 0, 0, 0);

	// If predicted date is in the past, advance until it's in the future
	while (predictedDate <= now) {
		predictedDate.setDate(predictedDate.getDate() + Math.round(avgDaysBetween));
	}

	const daysUntil = Math.ceil((predictedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

	// Calculate amount range (±20% or based on min/max)
	const minAmount = stats?.minAmount ?? avgAmount * 0.8;
	const maxAmount = stats?.maxAmount ?? avgAmount * 1.2;

	// Confidence based on regularity
	const confidence = patterns.isRegular ? 0.85 : 0.6;

	// Method description
	let method = 'Based on average pattern';
	if (patterns.isRegular && avgDaysBetween) {
		const days = Math.round(avgDaysBetween);
		if (days >= 28 && days <= 31) method = 'Monthly pattern';
		else if (days >= 7 && days <= 8) method = 'Weekly pattern';
		else if (days >= 14 && days <= 15) method = 'Bi-weekly pattern';
		else method = `Every ~${days} days`;
	}

	return {
		date: predictedDate.toISOString().split('T')[0]!,
		daysUntil,
		amount: avgAmount,
		amountRange: [minAmount, maxAmount],
		confidence,
		method,
	};
}

/**
 * Compute budget suggestion
 */
function computeBudgetSuggestion(
	intelligence: InsightsIntelligence | null,
	stats: InsightsStats | null,
	confidenceScore: number
): BudgetSuggestion | null {
	const monthlyAvg = stats?.monthlyAverage;
	const maxAmount = stats?.maxAmount;
	const seasonalTrends = intelligence?.patterns.seasonalTrends;

	if (!monthlyAvg || monthlyAvg <= 0) return null;

	// Calculate buffer (10% or difference to max, whichever is larger)
	const buffer = Math.max(monthlyAvg * 0.1, (maxAmount ?? monthlyAvg) - monthlyAvg);
	const totalSuggested = monthlyAvg + buffer;

	// Check for seasonal variation
	let seasonalNote: string | undefined;
	if (seasonalTrends && seasonalTrends.length >= 6) {
		const amounts = seasonalTrends.map((t) => t.avgAmount);
		const variance = amounts.reduce((sum, a) => sum + Math.pow(a - monthlyAvg, 2), 0) / amounts.length;
		const stdDev = Math.sqrt(variance);

		if (stdDev > monthlyAvg * 0.3) {
			// High variance - find peak months
			const maxMonth = seasonalTrends.reduce((max, t) => (t.avgAmount > max.avgAmount ? t : max));
			const monthNames = [
				'Jan',
				'Feb',
				'Mar',
				'Apr',
				'May',
				'Jun',
				'Jul',
				'Aug',
				'Sep',
				'Oct',
				'Nov',
				'Dec',
			];
			seasonalNote = `Higher spending in ${monthNames[maxMonth.month - 1]}`;
		}
	}

	return {
		monthlyAmount: monthlyAvg,
		buffer,
		totalSuggested,
		seasonalNote,
		confidence: confidenceScore,
	};
}

/**
 * Compute quick insight alerts
 */
function computeAlerts(
	stats: InsightsStats | null,
	suggestions: PayeeSuggestions | null,
	subscriptionInfo: PayeeInsightsData['subscriptionInfo']
): QuickInsight[] {
	const insights: QuickInsight[] = [];

	// Subscription detection alert
	if (subscriptionInfo?.isLikelySubscription && subscriptionInfo.confidence > 0.7) {
		insights.push({
			type: 'subscription_detected',
			title: 'Subscription Detected',
			description: `This appears to be a ${subscriptionInfo.frequency || 'recurring'} subscription.`,
			priority: 'medium',
			actionLabel: 'Set Up Schedule',
		});
	}

	// Category suggestion alert
	if (suggestions?.suggestedCategoryId && suggestions.confidence > 0.75) {
		insights.push({
			type: 'category_mismatch',
			title: 'Default Category',
			description: `Set "${suggestions.suggestedCategoryName}" as default for new transactions (${Math.round(suggestions.confidence * 100)}% confidence).`,
			priority: 'low',
			actionLabel: 'Apply',
			actionData: { categoryId: suggestions.suggestedCategoryId },
		});
	}

	// New payee alert (low data)
	const txnCount = stats?.transactionCount ?? 0;
	if (txnCount > 0 && txnCount < 3) {
		insights.push({
			type: 'new_payee',
			title: 'Building Intelligence',
			description: `Only ${txnCount} transaction${txnCount === 1 ? '' : 's'} recorded. Predictions will improve with more data.`,
			priority: 'low',
		});
	}

	return insights;
}

/**
 * Creates a payee insights hook for the intelligence dashboard
 * Uses profile-aware intelligence query to apply user-configured filters
 */
export function usePayeeInsights(payeeId: number | undefined) {
	const queryClient = useQueryClient();

	// Primary query - uses intelligence profile filters when enabled
	const intelligenceWithProfileQuery = $derived(
		payeeId ? getIntelligenceWithProfile(payeeId).options() : null
	);
	const suggestionsQuery = $derived(payeeId ? getPayeeSuggestions(payeeId).options() : null);
	const subscriptionQuery = $derived(payeeId ? classifySubscription(payeeId).options() : null);

	// Computed: Loading state
	const isLoading = $derived(
		Boolean(intelligenceWithProfileQuery?.isLoading || suggestionsQuery?.isLoading)
	);

	// Computed: Error state
	const isError = $derived(
		Boolean(intelligenceWithProfileQuery?.isError || suggestionsQuery?.isError)
	);

	const error = $derived(
		intelligenceWithProfileQuery?.error || suggestionsQuery?.error || null
	);

	// Extract profile from response
	const profile = $derived(intelligenceWithProfileQuery?.data?.profile ?? null);

	// Extract AI explanation from payee data (persisted)
	const aiExplanation = $derived(
		(intelligenceWithProfileQuery?.data?.payee as { aiExplanation?: string | null })?.aiExplanation ?? null
	);
	const aiExplanationUpdatedAt = $derived(
		(intelligenceWithProfileQuery?.data?.payee as { aiExplanationUpdatedAt?: string | null })?.aiExplanationUpdatedAt ?? null
	);

	// Map spendingAnalysis to InsightsStats interface
	const stats = $derived.by((): InsightsStats | null => {
		const analysis = intelligenceWithProfileQuery?.data?.spendingAnalysis;
		if (!analysis) return null;

		// Calculate monthly average from total and time span
		const timeSpanMonths = analysis.timeSpanDays > 0 ? analysis.timeSpanDays / 30 : 1;
		const monthlyAverage = analysis.totalAmount / Math.max(1, timeSpanMonths);

		return {
			transactionCount: analysis.transactionCount,
			totalAmount: analysis.totalAmount,
			avgAmount: analysis.averageAmount,
			minAmount: analysis.minAmount,
			maxAmount: analysis.maxAmount,
			monthlyAverage,
			firstTransactionDate: analysis.firstTransactionDate,
			lastTransactionDate: analysis.lastTransactionDate,
		};
	});

	// Map frequency and seasonal data to InsightsIntelligence interface
	const intelligence = $derived.by((): InsightsIntelligence | null => {
		const frequency = intelligenceWithProfileQuery?.data?.frequencyAnalysis;
		const seasonal = intelligenceWithProfileQuery?.data?.seasonalPatterns;
		const dayOfWeek = intelligenceWithProfileQuery?.data?.dayOfWeekPatterns;

		if (!frequency && !seasonal) return null;

		// Find most common day of week
		let mostCommonDay: number | null = null;
		if (dayOfWeek && dayOfWeek.length > 0) {
			const maxDay = dayOfWeek.reduce((max, d) =>
				d.transactionCount > max.transactionCount ? d : max
			);
			mostCommonDay = maxDay.dayOfWeek;
		}

		return {
			patterns: {
				averageDaysBetween: frequency?.averageDaysBetween ?? null,
				isRegular: (frequency?.regularityScore ?? 0) > 0.7,
				mostCommonDay,
				seasonalTrends: (seasonal ?? []).map((s) => ({
					month: s.month,
					avgAmount: s.averageAmount,
					count: s.transactionCount,
				})),
			},
		};
	});

	const suggestions = $derived((suggestionsQuery?.data as PayeeSuggestions | undefined) ?? null);

	// Computed: Subscription info
	const subscriptionInfo = $derived.by((): PayeeInsightsData['subscriptionInfo'] => {
		const rawData = subscriptionQuery?.data as
			| {
					isLikelySubscription?: boolean;
					confidence?: number;
					detectedPattern?: { frequency?: string | null; nextExpected?: string | null };
			  }
			| undefined;

		if (!rawData) return null;

		return {
			isLikelySubscription: rawData.isLikelySubscription ?? false,
			confidence: rawData.confidence ?? 0,
			frequency: rawData.detectedPattern?.frequency ?? null,
			nextExpected: rawData.detectedPattern?.nextExpected ?? null,
		};
	});

	// Map confidence metrics from server response (already computed with profile filters)
	const confidence = $derived.by((): ConfidenceMetrics => {
		const metrics = intelligenceWithProfileQuery?.data?.confidenceMetrics;

		if (!metrics) {
			// Fallback to local computation if no server data
			return computeConfidence(stats, intelligence, suggestions);
		}

		// Map server confidence metrics to our interface
		const txnCount = stats?.transactionCount ?? 0;
		const timeSpanMonths = Math.ceil((metrics.dataQuality.factors.timeSpanMonths ?? 0));

		let dataQuality: ConfidenceMetrics['dataQuality'] = 'poor';
		if (metrics.dataQuality.score >= 0.8) dataQuality = 'excellent';
		else if (metrics.dataQuality.score >= 0.6) dataQuality = 'good';
		else if (metrics.dataQuality.score >= 0.4) dataQuality = 'fair';

		return {
			overall: metrics.overall,
			dataQuality,
			transactionCount: txnCount,
			timeSpanMonths,
			factors: [
				{
					name: 'Data Quality',
					score: metrics.dataQuality.score,
					description: dataQuality === 'excellent' ? 'Excellent data quality' : `${Math.round(metrics.dataQuality.score * 100)}% quality`,
				},
				{
					name: 'Pattern Reliability',
					score: metrics.patternReliability?.score ?? 0.5,
					description: (metrics.patternReliability?.score ?? 0) > 0.7 ? 'Reliable patterns' : 'Variable patterns',
				},
			],
		};
	});

	// Use server-computed trend or fallback to local computation
	const trend = $derived.by((): SpendingTrend | null => {
		const analysis = intelligenceWithProfileQuery?.data?.spendingAnalysis;
		if (!analysis) return computeTrend(intelligence);

		// Use server-computed trend
		let direction: SpendingTrend['direction'] = 'stable';
		if (analysis.trendDirection === 'increasing') direction = 'up';
		else if (analysis.trendDirection === 'decreasing') direction = 'down';

		return {
			direction,
			percentChange: Math.round(analysis.trendStrength * 100),
			period: 'Recent transactions',
		};
	});

	// Use server-computed next transaction prediction (with profile filters applied)
	const nextTransaction = $derived.by((): NextTransactionPrediction | null => {
		const prediction = intelligenceWithProfileQuery?.data?.transactionPrediction;
		if (!prediction || !prediction.nextTransactionDate) {
			return computeNextTransaction(intelligence, stats);
		}

		const predictedDate = new Date(prediction.nextTransactionDate);
		const now = new Date();
		// Reset time to start of day for accurate day comparison
		now.setHours(0, 0, 0, 0);
		predictedDate.setHours(0, 0, 0, 0);

		const daysUntil = Math.ceil((predictedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

		// Determine method description - prefer the reasoning from server
		let method = prediction.reasoning || 'Based on average pattern';
		// Only use generic method names if no reasoning provided
		if (!prediction.reasoning) {
			if (prediction.predictionMethod === 'frequency_based') method = 'Frequency pattern';
			else if (prediction.predictionMethod === 'seasonal_based') method = 'Seasonal pattern';
			else if (prediction.predictionMethod === 'trend_based') method = 'Trend analysis';
		}

		return {
			date: prediction.nextTransactionDate,
			// Keep negative values to show "X days ago" for past predictions
			daysUntil,
			amount: prediction.predictedAmount ?? stats?.avgAmount ?? 0,
			amountRange: prediction.amountRange
				? [prediction.amountRange.min, prediction.amountRange.max]
				: [stats?.minAmount ?? 0, stats?.maxAmount ?? 0],
			confidence: prediction.confidence,
			method,
			tier: prediction.tier as 'statistical' | 'ml' | 'ai' | undefined,
			aiExplanation: prediction.aiExplanation,
		};
	});

	// Use server-computed budget suggestion (with profile filters applied)
	const budgetSuggestion = $derived.by((): BudgetSuggestion | null => {
		const suggestion = intelligenceWithProfileQuery?.data?.budgetSuggestion;
		if (!suggestion) {
			return computeBudgetSuggestion(intelligence, stats, confidence.overall);
		}

		// Find seasonal note from adjustments
		let seasonalNote: string | undefined;
		type SeasonalAdj = { month: number; monthName: string; suggestedAdjustment: number; adjustmentPercent: number; reason: string };
		if (suggestion.seasonalAdjustments && suggestion.seasonalAdjustments.length > 0) {
			const maxAdjustment = suggestion.seasonalAdjustments.reduce(
				(max: SeasonalAdj, adj: SeasonalAdj) =>
					adj.adjustmentPercent > max.adjustmentPercent ? adj : max
			);
			if (maxAdjustment.adjustmentPercent > 10) {
				seasonalNote = `Higher in ${maxAdjustment.monthName}`;
			}
		}

		return {
			monthlyAmount: suggestion.suggestedMonthlyAllocation,
			buffer: suggestion.allocationRange.max - suggestion.suggestedMonthlyAllocation,
			totalSuggested: suggestion.allocationRange.max,
			seasonalNote,
			confidence: suggestion.confidence,
			tier: suggestion.tier as 'statistical' | 'ml' | 'ai' | undefined,
			aiExplanation: suggestion.aiExplanation,
		};
	});

	const alerts = $derived(computeAlerts(stats, suggestions, subscriptionInfo));

	// Refresh function
	function refresh() {
		if (!payeeId) return;

		// Invalidate the profile-aware query (primary source of truth)
		queryClient.invalidateQueries({ queryKey: payeeKeys.intelligenceWithProfile(payeeId) });
		queryClient.invalidateQueries({ queryKey: payeeKeys.suggestions(payeeId) });
		queryClient.invalidateQueries({ queryKey: payeeKeys.subscriptionDetection(payeeId) });
		queryClient.invalidateQueries({ queryKey: payeeKeys.intelligenceProfile(payeeId) });
	}

	// Return reactive data
	const data = $derived.by((): PayeeInsightsData => ({
		intelligence,
		suggestions,
		stats,
		profile,
		subscriptionInfo,
		confidence,
		trend,
		nextTransaction,
		budgetSuggestion,
		alerts,
		aiExplanation,
		aiExplanationUpdatedAt,
		isLoading,
		isError,
		error,
	}));

	return {
		get data() {
			return data;
		},
		refresh,
	};
}
