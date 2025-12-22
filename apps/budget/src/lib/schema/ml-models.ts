/**
 * ML Models Schema
 *
 * Database tables for storing ML model parameters, predictions,
 * and training data for the ML feature services.
 */

import { relations, sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { workspaces } from "./workspaces";

/**
 * ML Models table - stores trained model parameters and metadata
 */
export const mlModels = sqliteTable("ml_models", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),

  // Model identification
  modelType: text("model_type", {
    enum: ["time_series", "anomaly", "similarity", "behavior"],
  }).notNull(),
  modelName: text("model_name").notNull(),

  // Optional entity binding (for per-payee, per-category models)
  entityType: text("entity_type"), // 'payee', 'category', 'account', 'global'
  entityId: integer("entity_id"),

  // Model data
  parameters: text("parameters", { mode: "json" })
    .notNull()
    .$type<Record<string, unknown>>(),
  metrics: text("metrics", { mode: "json" }).$type<Record<string, number>>(),

  // Versioning
  version: integer("version").default(1).notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),

  // Training metadata
  trainedAt: text("trained_at").notNull(),
  trainingSamples: integer("training_samples"),

  // Timestamps
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

/**
 * ML Predictions table - stores predictions for tracking accuracy
 */
export const mlPredictions = sqliteTable("ml_predictions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  modelId: integer("model_id").references(() => mlModels.id, { onDelete: "set null" }),

  // Prediction identification
  predictionType: text("prediction_type").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),

  // Prediction data
  predictionData: text("prediction_data", { mode: "json" })
    .notNull()
    .$type<Record<string, unknown>>(),
  confidence: real("confidence"),

  // Outcome tracking (for accuracy measurement)
  actualOutcome: text("actual_outcome"),

  // Timestamps
  predictedAt: text("predicted_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  resolvedAt: text("resolved_at"),
});

/**
 * ML Training Data table - stores labeled training examples
 */
export const mlTrainingData = sqliteTable("ml_training_data", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),

  // Training data identification
  modelType: text("model_type", {
    enum: ["time_series", "anomaly", "similarity", "behavior"],
  }).notNull(),

  // Feature vector and label
  featureVector: text("feature_vector", { mode: "json" })
    .notNull()
    .$type<Record<string, unknown>>(),
  label: text("label", { mode: "json" }).$type<unknown>(),

  // Sample weighting
  weight: real("weight").default(1.0).notNull(),

  // Metadata
  source: text("source"), // 'user_correction', 'import', 'auto_labeled'
  entityType: text("entity_type"),
  entityId: integer("entity_id"),

  // Timestamp
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

/**
 * Anomaly Alerts table - stores detected anomalies for review
 */
export const anomalyAlerts = sqliteTable("anomaly_alerts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),

  // Transaction reference
  transactionId: integer("transaction_id").notNull(),

  // Anomaly details
  overallScore: real("overall_score").notNull(),
  riskLevel: text("risk_level", {
    enum: ["low", "medium", "high", "critical"],
  }).notNull(),
  scoreDetails: text("score_details", { mode: "json" })
    .notNull()
    .$type<Record<string, unknown>>(),
  explanation: text("explanation").notNull(),
  recommendedActions: text("recommended_actions", { mode: "json" })
    .notNull()
    .$type<string[]>(),

  // Status tracking
  status: text("status", {
    enum: ["new", "reviewed", "dismissed", "confirmed"],
  })
    .default("new")
    .notNull(),
  reviewedAt: text("reviewed_at"),
  notes: text("notes"),

  // Timestamps
  detectedAt: text("detected_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

/**
 * User Behavior Events table - tracks user interactions for behavior modeling
 */
export const userBehaviorEvents = sqliteTable("user_behavior_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),

  // Event identification
  eventType: text("event_type", {
    enum: [
      "recommendation_shown",
      "recommendation_accepted",
      "recommendation_rejected",
      "recommendation_corrected",
      "recommendation_ignored",
      "category_changed",
      "transaction_edited",
    ],
  }).notNull(),

  // Reference data
  recommendationId: text("recommendation_id"),
  entityType: text("entity_type"),
  entityId: integer("entity_id"),

  // Event details
  eventData: text("event_data", { mode: "json" }).$type<Record<string, unknown>>(),

  // Timing
  timeToAction: integer("time_to_action"), // milliseconds

  // Timestamp
  occurredAt: text("occurred_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// =============================================================================
// Relations
// =============================================================================

export const mlModelsRelations = relations(mlModels, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [mlModels.workspaceId],
    references: [workspaces.id],
  }),
}));

export const mlPredictionsRelations = relations(mlPredictions, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [mlPredictions.workspaceId],
    references: [workspaces.id],
  }),
  model: one(mlModels, {
    fields: [mlPredictions.modelId],
    references: [mlModels.id],
  }),
}));

export const mlTrainingDataRelations = relations(mlTrainingData, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [mlTrainingData.workspaceId],
    references: [workspaces.id],
  }),
}));

export const anomalyAlertsRelations = relations(anomalyAlerts, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [anomalyAlerts.workspaceId],
    references: [workspaces.id],
  }),
}));

export const userBehaviorEventsRelations = relations(userBehaviorEvents, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [userBehaviorEvents.workspaceId],
    references: [workspaces.id],
  }),
}));
