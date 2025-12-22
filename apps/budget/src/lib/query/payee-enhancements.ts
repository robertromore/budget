import type { EnhanceableField, LlmProvider, PayeeAiPreferences } from '$lib/schema';
import { trpc } from '$lib/trpc/client';
import { queryClient } from './_client';
import { createQueryKeys, defineMutation, defineQuery } from './_factory';

// Types for enhancement tracking
export interface FieldEnhancementSummary {
	fieldName: EnhanceableField;
	isEnhanced: boolean;
	lastEnhancedAt?: string;
	lastMode?: 'ml' | 'llm';
	lastConfidence?: number;
	enhancementCount: number;
}

export interface EnhancementStats {
	totalEnhancements: number;
	byMode: { ml: number; llm: number };
	byField: Partial<Record<EnhanceableField, number>>;
	acceptanceRate: number;
	modificationRate: number;
	averageConfidence: number;
}

export interface RecordEnhancementInput {
	payeeId: number;
	fieldName: EnhanceableField;
	mode: 'ml' | 'llm';
	originalValue?: unknown;
	suggestedValue: unknown;
	appliedValue?: unknown;
	confidence?: number;
	provider?: LlmProvider;
	modelId?: string;
}

// Result type from the enhancement recording
export interface RecordEnhancementResult {
	success: boolean;
	enhancement: {
		id: number;
		payeeId: number;
		fieldName: EnhanceableField;
		mode: 'ml' | 'llm';
		confidence: number | null;
		enhancedAt: string;
	};
}

// Result type from feedback update
export interface UpdateFeedbackResult {
	success: boolean;
	enhancement: {
		id: number;
		wasAccepted: boolean;
		wasModified: boolean;
	} | null;
}

// Enhancement history item
export interface EnhancementHistoryItem {
	id: number;
	workspaceId: number;
	payeeId: number;
	fieldName: EnhanceableField;
	mode: 'ml' | 'llm';
	originalValue?: unknown;
	suggestedValue?: unknown;
	appliedValue?: unknown;
	confidence: number | null;
	provider?: LlmProvider | null;
	modelId?: string | null;
	wasAccepted: boolean;
	wasModified: boolean;
	enhancedAt: string;
	createdAt: string;
	updatedAt: string;
}

// Query keys for enhancement-related queries
export const enhancementKeys = createQueryKeys('payee-enhancements', {
	lists: () => ['payee-enhancements', 'list'] as const,
	list: (payeeId: number) => ['payee-enhancements', 'list', payeeId] as const,
	fieldList: (payeeId: number, fieldName: EnhanceableField) =>
		['payee-enhancements', 'list', payeeId, fieldName] as const,
	summary: (payeeId: number) => ['payee-enhancements', 'summary', payeeId] as const,
	preferences: (payeeId: number) => ['payee-enhancements', 'preferences', payeeId] as const,
	stats: (payeeId?: number) => ['payee-enhancements', 'stats', payeeId] as const
});

/**
 * Get enhancement history for a payee
 */
export const getPayeeEnhancements = (payeeId: number, fieldName?: EnhanceableField, limit = 50) =>
	defineQuery<EnhancementHistoryItem[]>({
		queryKey: fieldName
			? enhancementKeys.fieldList(payeeId, fieldName)
			: enhancementKeys.list(payeeId),
		queryFn: async () => {
			const result = await trpc().payeeRoutes.getPayeeEnhancements.query({
				payeeId,
				fieldName,
				limit
			});
			return result as EnhancementHistoryItem[];
		},
		options: {
			staleTime: 5 * 60 * 1000 // 5 minutes
		}
	});

/**
 * Get field enhancement summary for a payee
 */
export const getFieldEnhancementSummary = (payeeId: number) =>
	defineQuery<FieldEnhancementSummary[]>({
		queryKey: enhancementKeys.summary(payeeId),
		queryFn: async () => {
			const result = await trpc().payeeRoutes.getFieldEnhancementSummary.query({ payeeId });
			return result;
		},
		options: {
			staleTime: 60 * 1000 // 1 minute
		}
	});

/**
 * Get AI preferences for a payee (field modes and enhanced fields)
 */
export const getPayeeAiPreferences = (payeeId: number) =>
	defineQuery<PayeeAiPreferences | null>({
		queryKey: enhancementKeys.preferences(payeeId),
		queryFn: async () => {
			const result = await trpc().payeeRoutes.getPayeeAiPreferences.query({ payeeId });
			return result;
		},
		options: {
			staleTime: 60 * 1000 // 1 minute
		}
	});

/**
 * Get enhancement statistics
 */
export const getEnhancementStats = (payeeId?: number) =>
	defineQuery<EnhancementStats>({
		queryKey: enhancementKeys.stats(payeeId),
		queryFn: async () => {
			const result = await trpc().payeeRoutes.getEnhancementStats.query({
				payeeId,
				timeframeMonths: 6
			});
			return result;
		},
		options: {
			staleTime: 5 * 60 * 1000 // 5 minutes
		}
	});

/**
 * Record a new AI/ML enhancement for a payee field
 */
export const recordEnhancement = () =>
	defineMutation<RecordEnhancementInput, RecordEnhancementResult>({
		mutationFn: async (input) => {
			const result = await trpc().payeeRoutes.recordEnhancement.mutate(input);
			return result as RecordEnhancementResult;
		},
		onSuccess: (_data, variables) => {
			// Invalidate related queries
			queryClient.invalidateQueries({ queryKey: enhancementKeys.list(variables.payeeId) });
			queryClient.invalidateQueries({ queryKey: enhancementKeys.summary(variables.payeeId) });
			queryClient.invalidateQueries({ queryKey: enhancementKeys.preferences(variables.payeeId) });
		},
		successMessage: 'Enhancement recorded',
		errorMessage: 'Failed to record enhancement'
	});

/**
 * Update feedback for an enhancement (accepted/modified)
 */
export const updateEnhancementFeedback = () =>
	defineMutation<
		{
			enhancementId: number;
			wasAccepted: boolean;
			wasModified: boolean;
			appliedValue?: unknown;
		},
		UpdateFeedbackResult
	>({
		mutationFn: async (input) => {
			const result = await trpc().payeeRoutes.updateEnhancementFeedback.mutate(input);
			return result as UpdateFeedbackResult;
		},
		successMessage: 'Feedback recorded',
		errorMessage: 'Failed to update feedback'
	});

/**
 * Helper to check if a field has been enhanced
 */
export function isFieldEnhanced(
	summary: FieldEnhancementSummary[],
	fieldName: EnhanceableField
): boolean {
	const field = summary.find((f) => f.fieldName === fieldName);
	return field?.isEnhanced ?? false;
}

/**
 * Helper to get enhancement info for a field
 */
export function getFieldEnhancementInfo(
	summary: FieldEnhancementSummary[],
	fieldName: EnhanceableField
): FieldEnhancementSummary | undefined {
	return summary.find((f) => f.fieldName === fieldName);
}
