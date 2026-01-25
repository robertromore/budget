/**
 * Prediction Feedback Schema
 *
 * Stores user feedback on ML predictions to improve future accuracy.
 * Supports both implicit feedback (corrections) and explicit feedback (ratings).
 */

import { relations, sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { payees } from "./payees";
import { workspaces } from "./workspaces";

/**
 * Prediction feedback types
 */
export const feedbackTypes = ["next_transaction", "budget_suggestion"] as const;
export const feedbackRatings = ["positive", "negative", "neutral"] as const;

export type FeedbackType = (typeof feedbackTypes)[number];
export type FeedbackRating = (typeof feedbackRatings)[number];

/**
 * Prediction Feedback table - stores user corrections and ratings
 */
export const predictionFeedback = sqliteTable(
	"prediction_feedback",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		workspaceId: integer("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		payeeId: integer("payee_id")
			.notNull()
			.references(() => payees.id, { onDelete: "cascade" }),

		// Prediction identification
		predictionType: text("prediction_type", { enum: feedbackTypes }).notNull(),

		// Original prediction values
		originalDate: text("original_date"),
		originalAmount: real("original_amount"),
		originalConfidence: real("original_confidence"),
		predictionTier: text("prediction_tier"), // 'statistical', 'ml', 'ai'

		// User corrections (null if not corrected)
		correctedDate: text("corrected_date"),
		correctedAmount: real("corrected_amount"),

		// Explicit rating
		rating: text("rating", { enum: feedbackRatings }),

		// Metadata for ML training
		predictionMethod: text("prediction_method"), // How the prediction was made
		transactionCount: integer("transaction_count"), // Number of transactions at time of prediction

		// Outcome tracking (was the prediction accurate?)
		wasAccurate: integer("was_accurate", { mode: "boolean" }),
		actualDate: text("actual_date"),
		actualAmount: real("actual_amount"),

		// Timestamps
		createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
		resolvedAt: text("resolved_at"), // When the actual transaction occurred
	},
	(table) => [
		index("prediction_feedback_workspace_idx").on(table.workspaceId),
		index("prediction_feedback_payee_idx").on(table.payeeId),
		index("prediction_feedback_type_idx").on(table.predictionType),
		index("prediction_feedback_rating_idx").on(table.rating),
		index("prediction_feedback_created_idx").on(table.createdAt),
	]
);

// Relations
export const predictionFeedbackRelations = relations(predictionFeedback, ({ one }) => ({
	workspace: one(workspaces, {
		fields: [predictionFeedback.workspaceId],
		references: [workspaces.id],
	}),
	payee: one(payees, {
		fields: [predictionFeedback.payeeId],
		references: [payees.id],
	}),
}));

// Schemas
export const selectPredictionFeedbackSchema = createSelectSchema(predictionFeedback);
export const insertPredictionFeedbackSchema = createInsertSchema(predictionFeedback);

// Input schema for recording feedback
export const recordPredictionFeedbackSchema = z.object({
	payeeId: z.number(),
	predictionType: z.enum(feedbackTypes),

	// Original prediction
	originalDate: z.string().optional(),
	originalAmount: z.number().optional(),
	originalConfidence: z.number().optional(),
	predictionTier: z.string().optional(),
	predictionMethod: z.string().optional(),
	transactionCount: z.number().optional(),

	// Corrections (at least one should be provided, or rating)
	correctedDate: z.string().optional(),
	correctedAmount: z.number().optional(),
	rating: z.enum(feedbackRatings).optional(),
});

export type PredictionFeedback = typeof predictionFeedback.$inferSelect;
export type NewPredictionFeedback = typeof predictionFeedback.$inferInsert;
export type RecordPredictionFeedbackInput = z.infer<typeof recordPredictionFeedbackSchema>;
