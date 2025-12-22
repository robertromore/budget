/**
 * ML Model Store
 *
 * Handles persistence and retrieval of ML model parameters,
 * predictions, and training data.
 */

import {
  anomalyAlerts,
  mlModels,
  mlPredictions,
  mlTrainingData,
  userBehaviorEvents,
} from "$lib/schema";
import { db } from "$lib/server/db";
import { logger } from "$lib/server/shared/logging";
import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import type { AnomalyAlert, MLModel } from "./types";

export class MLModelStore {

  // ==========================================================================
  // Model Management
  // ==========================================================================

  /**
   * Save or update a model
   */
  async saveModel(
    workspaceId: number,
    model: {
      modelType: "time_series" | "anomaly" | "similarity" | "behavior";
      modelName: string;
      entityType?: string;
      entityId?: number;
      parameters: Record<string, unknown>;
      metrics?: Record<string, number>;
      trainingSamples?: number;
    }
  ): Promise<number> {
    const now = new Date().toISOString();

    // Check for existing model
    const existing = await db
      .select()
      .from(mlModels)
      .where(
        and(
          eq(mlModels.workspaceId, workspaceId),
          eq(mlModels.modelType, model.modelType),
          eq(mlModels.modelName, model.modelName),
          model.entityType ? eq(mlModels.entityType, model.entityType) : isNull(mlModels.entityType),
          model.entityId ? eq(mlModels.entityId, model.entityId) : isNull(mlModels.entityId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing model with new version
      const newVersion = existing[0].version + 1;
      await db
        .update(mlModels)
        .set({
          parameters: model.parameters,
          metrics: model.metrics,
          version: newVersion,
          trainedAt: now,
          trainingSamples: model.trainingSamples,
          updatedAt: now,
        })
        .where(eq(mlModels.id, existing[0].id));

      logger.debug("ML model updated", {
        modelId: existing[0].id,
        modelName: model.modelName,
        version: newVersion,
      });

      return existing[0].id;
    }

    // Insert new model
    const result = await db.insert(mlModels).values({
      workspaceId,
      modelType: model.modelType,
      modelName: model.modelName,
      entityType: model.entityType,
      entityId: model.entityId,
      parameters: model.parameters,
      metrics: model.metrics,
      trainedAt: now,
      trainingSamples: model.trainingSamples,
    });

    const modelId = Number(result.lastInsertRowid);

    logger.debug("ML model created", {
      modelId,
      modelName: model.modelName,
    });

    return modelId;
  }

  /**
   * Get an active model
   */
  async getModel(
    workspaceId: number,
    modelType: "time_series" | "anomaly" | "similarity" | "behavior",
    modelName: string,
    entityType?: string,
    entityId?: number
  ): Promise<MLModel | null> {
    const result = await db
      .select()
      .from(mlModels)
      .where(
        and(
          eq(mlModels.workspaceId, workspaceId),
          eq(mlModels.modelType, modelType),
          eq(mlModels.modelName, modelName),
          eq(mlModels.isActive, true),
          entityType ? eq(mlModels.entityType, entityType) : isNull(mlModels.entityType),
          entityId ? eq(mlModels.entityId, entityId) : isNull(mlModels.entityId)
        )
      )
      .limit(1);

    if (result.length === 0) return null;

    const row = result[0];
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      modelType: row.modelType as MLModel["modelType"],
      modelName: row.modelName,
      entityType: row.entityType ?? undefined,
      entityId: row.entityId ?? undefined,
      parameters: row.parameters as Record<string, unknown>,
      metrics: row.metrics as Record<string, number> | undefined,
      version: row.version,
      isActive: row.isActive,
      trainedAt: row.trainedAt,
      trainingSamples: row.trainingSamples ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /**
   * Get all active models for a workspace
   */
  async getActiveModels(workspaceId: number): Promise<MLModel[]> {
    const result = await db
      .select()
      .from(mlModels)
      .where(and(eq(mlModels.workspaceId, workspaceId), eq(mlModels.isActive, true)))
      .orderBy(desc(mlModels.trainedAt));

    return result.map((row) => ({
      id: row.id,
      workspaceId: row.workspaceId,
      modelType: row.modelType as MLModel["modelType"],
      modelName: row.modelName,
      entityType: row.entityType ?? undefined,
      entityId: row.entityId ?? undefined,
      parameters: row.parameters as Record<string, unknown>,
      metrics: row.metrics as Record<string, number> | undefined,
      version: row.version,
      isActive: row.isActive,
      trainedAt: row.trainedAt,
      trainingSamples: row.trainingSamples ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  /**
   * Deactivate a model
   */
  async deactivateModel(modelId: number): Promise<void> {
    await db
      .update(mlModels)
      .set({ isActive: false, updatedAt: new Date().toISOString() })
      .where(eq(mlModels.id, modelId));
  }

  // ==========================================================================
  // Prediction Tracking
  // ==========================================================================

  /**
   * Record a prediction for accuracy tracking
   */
  async recordPrediction(
    workspaceId: number,
    prediction: {
      modelId?: number;
      predictionType: string;
      entityType: string;
      entityId: number;
      predictionData: Record<string, unknown>;
      confidence?: number;
    }
  ): Promise<number> {
    const result = await db.insert(mlPredictions).values({
      workspaceId,
      modelId: prediction.modelId,
      predictionType: prediction.predictionType,
      entityType: prediction.entityType,
      entityId: prediction.entityId,
      predictionData: prediction.predictionData,
      confidence: prediction.confidence,
    });

    return Number(result.lastInsertRowid);
  }

  /**
   * Record the actual outcome for a prediction
   */
  async recordOutcome(predictionId: number, actualOutcome: string): Promise<void> {
    await db
      .update(mlPredictions)
      .set({
        actualOutcome,
        resolvedAt: new Date().toISOString(),
      })
      .where(eq(mlPredictions.id, predictionId));
  }

  /**
   * Get recent prediction accuracy
   */
  async getPredictionAccuracy(
    workspaceId: number,
    predictionType?: string,
    days: number = 30
  ): Promise<{ total: number; correct: number; accuracy: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const conditions = [
      eq(mlPredictions.workspaceId, workspaceId),
      gte(mlPredictions.predictedAt, cutoffDate.toISOString()),
    ];

    if (predictionType) {
      conditions.push(eq(mlPredictions.predictionType, predictionType));
    }

    const predictions = await db
      .select({
        predictionData: mlPredictions.predictionData,
        actualOutcome: mlPredictions.actualOutcome,
      })
      .from(mlPredictions)
      .where(and(...conditions));

    const resolved = predictions.filter((p) => p.actualOutcome !== null);
    const correct = resolved.filter((p) => {
      const predicted = (p.predictionData as Record<string, unknown>).predicted;
      return predicted === p.actualOutcome;
    });

    return {
      total: resolved.length,
      correct: correct.length,
      accuracy: resolved.length > 0 ? correct.length / resolved.length : 0,
    };
  }

  // ==========================================================================
  // Training Data Management
  // ==========================================================================

  /**
   * Add training data
   */
  async addTrainingData(
    workspaceId: number,
    data: {
      modelType: "time_series" | "anomaly" | "similarity" | "behavior";
      featureVector: Record<string, unknown>;
      label?: unknown;
      weight?: number;
      source?: string;
      entityType?: string;
      entityId?: number;
    }
  ): Promise<number> {
    const result = await db.insert(mlTrainingData).values({
      workspaceId,
      modelType: data.modelType,
      featureVector: data.featureVector,
      label: data.label,
      weight: data.weight ?? 1.0,
      source: data.source,
      entityType: data.entityType,
      entityId: data.entityId,
    });

    return Number(result.lastInsertRowid);
  }

  /**
   * Get training data for a model type
   */
  async getTrainingData(
    workspaceId: number,
    modelType: "time_series" | "anomaly" | "similarity" | "behavior",
    limit: number = 1000
  ): Promise<
    Array<{
      featureVector: Record<string, unknown>;
      label: unknown;
      weight: number;
    }>
  > {
    const result = await db
      .select({
        featureVector: mlTrainingData.featureVector,
        label: mlTrainingData.label,
        weight: mlTrainingData.weight,
      })
      .from(mlTrainingData)
      .where(and(eq(mlTrainingData.workspaceId, workspaceId), eq(mlTrainingData.modelType, modelType)))
      .orderBy(desc(mlTrainingData.createdAt))
      .limit(limit);

    return result.map((row) => ({
      featureVector: row.featureVector as Record<string, unknown>,
      label: row.label,
      weight: row.weight,
    }));
  }

  // ==========================================================================
  // Anomaly Alerts
  // ==========================================================================

  /**
   * Create an anomaly alert
   */
  async createAnomalyAlert(
    workspaceId: number,
    alert: {
      transactionId: number;
      overallScore: number;
      riskLevel: "low" | "medium" | "high" | "critical";
      scoreDetails: Record<string, unknown>;
      explanation: string;
      recommendedActions: string[];
    }
  ): Promise<number> {
    const result = await db.insert(anomalyAlerts).values({
      workspaceId,
      transactionId: alert.transactionId,
      overallScore: alert.overallScore,
      riskLevel: alert.riskLevel,
      scoreDetails: alert.scoreDetails,
      explanation: alert.explanation,
      recommendedActions: alert.recommendedActions,
    });

    return Number(result.lastInsertRowid);
  }

  /**
   * Get pending anomaly alerts
   */
  async getPendingAlerts(
    workspaceId: number,
    options?: { riskLevel?: "low" | "medium" | "high" | "critical"; limit?: number }
  ): Promise<AnomalyAlert[]> {
    const conditions = [eq(anomalyAlerts.workspaceId, workspaceId), eq(anomalyAlerts.status, "new")];

    if (options?.riskLevel) {
      conditions.push(eq(anomalyAlerts.riskLevel, options.riskLevel));
    }

    let query = db
      .select()
      .from(anomalyAlerts)
      .where(and(...conditions))
      .orderBy(desc(anomalyAlerts.overallScore));

    if (options?.limit) {
      query = query.limit(options.limit) as typeof query;
    }

    const result = await query;

    return result.map((row) => ({
      id: String(row.id),
      transactionId: row.transactionId,
      score: {
        transactionId: row.transactionId,
        overallScore: row.overallScore,
        riskLevel: row.riskLevel,
        dimensions: (row.scoreDetails as Record<string, unknown>).dimensions as AnomalyAlert["score"]["dimensions"],
        detectors: (row.scoreDetails as Record<string, unknown>).detectors as AnomalyAlert["score"]["detectors"],
        explanation: row.explanation,
        recommendedActions: row.recommendedActions,
      },
      detectedAt: row.detectedAt,
      status: row.status,
      reviewedAt: row.reviewedAt ?? undefined,
      notes: row.notes ?? undefined,
    }));
  }

  /**
   * Update alert status
   */
  async updateAlertStatus(
    alertId: number,
    status: "reviewed" | "dismissed" | "confirmed",
    notes?: string
  ): Promise<void> {
    await db
      .update(anomalyAlerts)
      .set({
        status,
        reviewedAt: new Date().toISOString(),
        notes,
      })
      .where(eq(anomalyAlerts.id, alertId));
  }

  // ==========================================================================
  // User Behavior Tracking
  // ==========================================================================

  /**
   * Track a user behavior event
   */
  async trackBehaviorEvent(
    workspaceId: number,
    event: {
      eventType:
        | "recommendation_shown"
        | "recommendation_accepted"
        | "recommendation_rejected"
        | "recommendation_corrected"
        | "recommendation_ignored"
        | "category_changed"
        | "transaction_edited";
      recommendationId?: string;
      entityType?: string;
      entityId?: number;
      eventData?: Record<string, unknown>;
      timeToAction?: number;
    }
  ): Promise<number> {
    const result = await db.insert(userBehaviorEvents).values({
      workspaceId,
      eventType: event.eventType,
      recommendationId: event.recommendationId,
      entityType: event.entityType,
      entityId: event.entityId,
      eventData: event.eventData,
      timeToAction: event.timeToAction,
    });

    return Number(result.lastInsertRowid);
  }

  /**
   * Get recommendation acceptance rate
   */
  async getAcceptanceRate(
    workspaceId: number,
    days: number = 30
  ): Promise<{ total: number; accepted: number; rate: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const events = await db
      .select({ eventType: userBehaviorEvents.eventType })
      .from(userBehaviorEvents)
      .where(
        and(
          eq(userBehaviorEvents.workspaceId, workspaceId),
          gte(userBehaviorEvents.occurredAt, cutoffDate.toISOString()),
          sql`${userBehaviorEvents.eventType} IN ('recommendation_accepted', 'recommendation_rejected', 'recommendation_corrected', 'recommendation_ignored')`
        )
      );

    const accepted = events.filter((e) => e.eventType === "recommendation_accepted").length;

    return {
      total: events.length,
      accepted,
      rate: events.length > 0 ? accepted / events.length : 0,
    };
  }

  // ==========================================================================
  // Model Health Metrics
  // ==========================================================================

  /**
   * Get model status summary
   */
  async getModelStatus(workspaceId: number): Promise<{
    total: number;
    active: number;
    stale: number;
    byType: Record<string, number>;
  }> {
    const staleCutoff = new Date();
    staleCutoff.setDate(staleCutoff.getDate() - 7); // Models not updated in 7 days are stale

    const models = await db
      .select({
        modelType: mlModels.modelType,
        isActive: mlModels.isActive,
        trainedAt: mlModels.trainedAt,
      })
      .from(mlModels)
      .where(eq(mlModels.workspaceId, workspaceId));

    const byType: Record<string, number> = {};
    let active = 0;
    let stale = 0;

    for (const model of models) {
      byType[model.modelType] = (byType[model.modelType] || 0) + 1;

      if (model.isActive) {
        active++;
        if (new Date(model.trainedAt) < staleCutoff) {
          stale++;
        }
      }
    }

    return {
      total: models.length,
      active,
      stale,
      byType,
    };
  }
}

/**
 * Create a model store instance
 */
export function createMLModelStore(): MLModelStore {
  return new MLModelStore();
}
