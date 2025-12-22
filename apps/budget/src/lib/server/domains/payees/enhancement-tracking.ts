import {
  payeeAiEnhancements,
  payees,
  type EnhanceableField,
  type LlmProvider,
  type NewPayeeAiEnhancement,
  type PayeeAiEnhancement,
  type PayeeAiPreferences
} from '$lib/schema';
import { db } from '$lib/server/db';
import { logger } from '$lib/server/shared/logging';
import { getCurrentTimestamp } from '$lib/utils/dates';
import { and, desc, eq, sql } from 'drizzle-orm';

// Types for the service
export interface RecordEnhancementInput {
	workspaceId: number;
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

export interface UpdateFeedbackInput {
	enhancementId: number;
	wasAccepted: boolean;
	wasModified: boolean;
	appliedValue?: unknown;
}

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

/**
 * Service for tracking AI/ML enhancements to payee fields.
 * Handles recording, querying, and analytics for enhancement history.
 */
export class PayeeEnhancementTrackingService {
	private workspaceId: number;

	constructor(workspaceId: number) {
		this.workspaceId = workspaceId;
	}

	/**
	 * Record a new enhancement event
	 */
	async recordEnhancement(input: RecordEnhancementInput): Promise<PayeeAiEnhancement> {
		const now = getCurrentTimestamp();

		const enhancement: NewPayeeAiEnhancement = {
			workspaceId: input.workspaceId,
			payeeId: input.payeeId,
			fieldName: input.fieldName,
			mode: input.mode,
			originalValue: input.originalValue !== undefined ? JSON.stringify(input.originalValue) : null,
			suggestedValue: JSON.stringify(input.suggestedValue),
			appliedValue:
				input.appliedValue !== undefined
					? JSON.stringify(input.appliedValue)
					: JSON.stringify(input.suggestedValue),
			confidence: input.confidence ?? null,
			provider: input.provider ?? null,
			modelId: input.modelId ?? null,
			wasAccepted: true,
			wasModified: false,
			enhancedAt: now,
			createdAt: now,
			updatedAt: now
		};

		const [result] = await db.insert(payeeAiEnhancements).values(enhancement).returning();

		// Update the payee's aiPreferences
		await this.updatePayeeAiPreferences(input.payeeId, input.fieldName, input.mode);

		logger.info('Enhancement recorded', {
			payeeId: input.payeeId,
			fieldName: input.fieldName,
			mode: input.mode,
			confidence: input.confidence
		});

		return result;
	}

	/**
	 * Update feedback for an enhancement (accepted/modified)
	 */
	async updateFeedback(input: UpdateFeedbackInput): Promise<PayeeAiEnhancement | null> {
		const now = getCurrentTimestamp();

		const updateData: Partial<PayeeAiEnhancement> = {
			wasAccepted: input.wasAccepted,
			wasModified: input.wasModified,
			updatedAt: now
		};

		if (input.appliedValue !== undefined) {
			updateData.appliedValue = JSON.stringify(input.appliedValue) as unknown as undefined;
		}

		const [result] = await db
			.update(payeeAiEnhancements)
			.set(updateData)
			.where(eq(payeeAiEnhancements.id, input.enhancementId))
			.returning();

		return result ?? null;
	}

	/**
	 * Get enhancement history for a payee
	 */
	async getPayeeEnhancements(
		payeeId: number,
		fieldName?: EnhanceableField,
		limit = 50
	): Promise<PayeeAiEnhancement[]> {
		const conditions = [
			eq(payeeAiEnhancements.workspaceId, this.workspaceId),
			eq(payeeAiEnhancements.payeeId, payeeId)
		];

		if (fieldName) {
			conditions.push(eq(payeeAiEnhancements.fieldName, fieldName));
		}

		return db
			.select()
			.from(payeeAiEnhancements)
			.where(and(...conditions))
			.orderBy(desc(payeeAiEnhancements.enhancedAt))
			.limit(limit);
	}

	/**
	 * Get enhancement summary for all fields of a payee
	 */
	async getFieldEnhancementSummary(payeeId: number): Promise<FieldEnhancementSummary[]> {
		// Get the latest enhancement for each field
		const results = await db
			.select({
				fieldName: payeeAiEnhancements.fieldName,
				lastEnhancedAt: sql<string>`MAX(${payeeAiEnhancements.enhancedAt})`,
				enhancementCount: sql<number>`COUNT(*)`,
				lastMode: sql<string>`(
          SELECT ${payeeAiEnhancements.mode}
          FROM ${payeeAiEnhancements} AS inner_t
          WHERE inner_t.payee_id = ${payeeId}
            AND inner_t.field_name = ${payeeAiEnhancements.fieldName}
          ORDER BY inner_t.enhanced_at DESC
          LIMIT 1
        )`,
				lastConfidence: sql<number>`(
          SELECT ${payeeAiEnhancements.confidence}
          FROM ${payeeAiEnhancements} AS inner_t
          WHERE inner_t.payee_id = ${payeeId}
            AND inner_t.field_name = ${payeeAiEnhancements.fieldName}
          ORDER BY inner_t.enhanced_at DESC
          LIMIT 1
        )`
			})
			.from(payeeAiEnhancements)
			.where(
				and(
					eq(payeeAiEnhancements.workspaceId, this.workspaceId),
					eq(payeeAiEnhancements.payeeId, payeeId)
				)
			)
			.groupBy(payeeAiEnhancements.fieldName);

		return results.map((r) => ({
			fieldName: r.fieldName,
			isEnhanced: true,
			lastEnhancedAt: r.lastEnhancedAt,
			lastMode: r.lastMode as 'ml' | 'llm',
			lastConfidence: r.lastConfidence,
			enhancementCount: Number(r.enhancementCount)
		}));
	}

	/**
	 * Get enhancement stats for a payee or all payees
	 */
	async getEnhancementStats(payeeId?: number): Promise<EnhancementStats> {
		const conditions = [eq(payeeAiEnhancements.workspaceId, this.workspaceId)];

		if (payeeId) {
			conditions.push(eq(payeeAiEnhancements.payeeId, payeeId));
		}

		const stats = await db
			.select({
				totalEnhancements: sql<number>`COUNT(*)`,
				mlCount: sql<number>`SUM(CASE WHEN ${payeeAiEnhancements.mode} = 'ml' THEN 1 ELSE 0 END)`,
				llmCount: sql<number>`SUM(CASE WHEN ${payeeAiEnhancements.mode} = 'llm' THEN 1 ELSE 0 END)`,
				acceptedCount: sql<number>`SUM(CASE WHEN ${payeeAiEnhancements.wasAccepted} = 1 THEN 1 ELSE 0 END)`,
				modifiedCount: sql<number>`SUM(CASE WHEN ${payeeAiEnhancements.wasModified} = 1 THEN 1 ELSE 0 END)`,
				avgConfidence: sql<number>`AVG(${payeeAiEnhancements.confidence})`
			})
			.from(payeeAiEnhancements)
			.where(and(...conditions));

		const result = stats[0];
		const total = Number(result?.totalEnhancements ?? 0);

		// Get counts by field
		const fieldCounts = await db
			.select({
				fieldName: payeeAiEnhancements.fieldName,
				count: sql<number>`COUNT(*)`
			})
			.from(payeeAiEnhancements)
			.where(and(...conditions))
			.groupBy(payeeAiEnhancements.fieldName);

		const byField: Partial<Record<EnhanceableField, number>> = {};
		for (const fc of fieldCounts) {
			byField[fc.fieldName] = Number(fc.count);
		}

		return {
			totalEnhancements: total,
			byMode: {
				ml: Number(result?.mlCount ?? 0),
				llm: Number(result?.llmCount ?? 0)
			},
			byField,
			acceptanceRate: total > 0 ? Number(result?.acceptedCount ?? 0) / total : 0,
			modificationRate: total > 0 ? Number(result?.modifiedCount ?? 0) / total : 0,
			averageConfidence: Number(result?.avgConfidence ?? 0)
		};
	}

	/**
	 * Update the payee's aiPreferences JSON column
	 */
	private async updatePayeeAiPreferences(
		payeeId: number,
		fieldName: EnhanceableField,
		mode: 'ml' | 'llm'
	): Promise<void> {
		const now = getCurrentTimestamp();

		// Get current preferences
		const [payee] = await db.select().from(payees).where(eq(payees.id, payeeId)).limit(1);

		if (!payee) {
			logger.warn('Payee not found for preference update', { payeeId });
			return;
		}

		const currentPrefs: PayeeAiPreferences = payee.aiPreferences ?? {};

		// Update preferences
		const updatedPrefs: PayeeAiPreferences = {
			...currentPrefs,
			fieldModes: {
				...(currentPrefs.fieldModes ?? {}),
				[fieldName]: mode
			},
			enhancedFields: [
				...new Set([...(currentPrefs.enhancedFields ?? []), fieldName])
			] as EnhanceableField[],
			lastEnhanced: {
				...(currentPrefs.lastEnhanced ?? {}),
				[fieldName]: now
			}
		};

		await db.update(payees).set({ aiPreferences: updatedPrefs }).where(eq(payees.id, payeeId));
	}

	/**
	 * Get the aiPreferences for a payee
	 */
	async getPayeeAiPreferences(payeeId: number): Promise<PayeeAiPreferences | null> {
		const [payee] = await db
			.select({ aiPreferences: payees.aiPreferences })
			.from(payees)
			.where(eq(payees.id, payeeId))
			.limit(1);

		return payee?.aiPreferences ?? null;
	}

	/**
	 * Check if a specific field has been enhanced
	 */
	async isFieldEnhanced(payeeId: number, fieldName: EnhanceableField): Promise<boolean> {
		const prefs = await this.getPayeeAiPreferences(payeeId);
		return prefs?.enhancedFields?.includes(fieldName) ?? false;
	}
}

/**
 * Factory function to create an enhancement tracking service
 */
export function createEnhancementTrackingService(workspaceId: number): PayeeEnhancementTrackingService {
	return new PayeeEnhancementTrackingService(workspaceId);
}
