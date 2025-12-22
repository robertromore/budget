/**
 * Hook for aggregating payee intelligence data for the dashboard
 * Combines intelligence, stats, suggestions, and subscription detection
 */

import {
  classifySubscription,
  getPayeeIntelligence,
  getPayeeStats,
  getPayeeSuggestions,
  payeeKeys,
} from '$lib/query/payees';
import type { PayeeIntelligence, PayeeStats, PayeeSuggestions } from '$lib/query/payees-types';
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
}

export interface BudgetSuggestion {
	monthlyAmount: number;
	buffer: number;
	totalSuggested: number;
	seasonalNote?: string;
	confidence: number;
}

export interface PayeeInsightsData {
	// Raw data from queries
	intelligence: PayeeIntelligence | null;
	suggestions: PayeeSuggestions | null;
	stats: PayeeStats | null;
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

	// State
	isLoading: boolean;
	isError: boolean;
	error: Error | null;
}

/**
 * Compute confidence metrics from stats and intelligence data
 */
function computeConfidence(
	stats: PayeeStats | null,
	intelligence: PayeeIntelligence | null,
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
function computeTrend(intelligence: PayeeIntelligence | null): SpendingTrend | null {
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
	intelligence: PayeeIntelligence | null,
	stats: PayeeStats | null
): NextTransactionPrediction | null {
	const patterns = intelligence?.patterns;
	const avgAmount = stats?.avgAmount;
	const lastDate = stats?.lastTransactionDate;

	if (!patterns || !avgAmount || !lastDate) return null;

	const avgDaysBetween = patterns.averageDaysBetween;
	if (!avgDaysBetween || avgDaysBetween <= 0) return null;

	// Calculate predicted next date
	const lastTxnDate = new Date(lastDate);
	const predictedDate = new Date(lastTxnDate);
	predictedDate.setDate(predictedDate.getDate() + Math.round(avgDaysBetween));

	const now = new Date();
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
		date: predictedDate.toISOString().split('T')[0],
		daysUntil: Math.max(0, daysUntil),
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
	intelligence: PayeeIntelligence | null,
	stats: PayeeStats | null,
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
	stats: PayeeStats | null,
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
			title: 'Category Recommendation',
			description: `We suggest categorizing as "${suggestions.suggestedCategoryName}" (${Math.round(suggestions.confidence * 100)}% confidence).`,
			priority: 'low',
			actionLabel: 'Apply Category',
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
 */
export function usePayeeInsights(payeeId: number | undefined) {
	const queryClient = useQueryClient();

	// Only create queries when payeeId is defined
	// Use $derived to make queries reactive to payeeId changes
	const intelligenceQuery = $derived(payeeId ? getPayeeIntelligence(payeeId).options() : null);
	const suggestionsQuery = $derived(payeeId ? getPayeeSuggestions(payeeId).options() : null);
	const statsQuery = $derived(payeeId ? getPayeeStats(payeeId).options() : null);
	const subscriptionQuery = $derived(payeeId ? classifySubscription(payeeId).options() : null);

	// Computed: Loading state
	const isLoading = $derived(
		Boolean(
			intelligenceQuery?.isLoading || suggestionsQuery?.isLoading || statsQuery?.isLoading
		)
	);

	// Computed: Error state
	const isError = $derived(
		Boolean(intelligenceQuery?.isError || suggestionsQuery?.isError || statsQuery?.isError)
	);

	const error = $derived(
		intelligenceQuery?.error || suggestionsQuery?.error || statsQuery?.error || null
	);

	// Computed: Raw data
	const intelligence = $derived(
		(intelligenceQuery?.data as PayeeIntelligence | undefined) ?? null
	);
	const suggestions = $derived((suggestionsQuery?.data as PayeeSuggestions | undefined) ?? null);
	const stats = $derived((statsQuery?.data as PayeeStats | undefined) ?? null);

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

	// Computed metrics using helper functions
	const confidence = $derived(computeConfidence(stats, intelligence, suggestions));
	const trend = $derived(computeTrend(intelligence));
	const nextTransaction = $derived(computeNextTransaction(intelligence, stats));
	const budgetSuggestion = $derived(
		computeBudgetSuggestion(intelligence, stats, confidence.overall)
	);
	const alerts = $derived(computeAlerts(stats, suggestions, subscriptionInfo));

	// Refresh function
	function refresh() {
		if (!payeeId) return;

		queryClient.invalidateQueries({ queryKey: payeeKeys.intelligence(payeeId) });
		queryClient.invalidateQueries({ queryKey: payeeKeys.suggestions(payeeId) });
		queryClient.invalidateQueries({ queryKey: payeeKeys.stats(payeeId) });
		queryClient.invalidateQueries({ queryKey: payeeKeys.subscriptionDetection(payeeId) });
	}

	// Return reactive data
	const data = $derived.by((): PayeeInsightsData => ({
		intelligence,
		suggestions,
		stats,
		subscriptionInfo,
		confidence,
		trend,
		nextTransaction,
		budgetSuggestion,
		alerts,
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
