/**
 * Behavior Tracker
 *
 * Tracks user interactions with recommendations and system features
 * to build personalized models for acceptance prediction and engagement optimization.
 */

import type { RecommendationOutcome, UserBehaviorProfile } from "../types";
import { nowISOString } from "$lib/utils/dates";

// =============================================================================
// Types
// =============================================================================

export interface TrackedInteraction {
  id: string;
  workspaceId: number;
  interactionType:
    | "recommendation_shown"
    | "recommendation_accepted"
    | "recommendation_rejected"
    | "recommendation_corrected"
    | "recommendation_ignored"
    | "category_selected"
    | "payee_selected"
    | "threshold_adjusted";
  entityType: string;
  entityId?: number;
  recommendationId?: string;
  metadata: Record<string, unknown>;
  timestamp: string;
  sessionId?: string;
}

export interface InteractionStats {
  total: number;
  accepted: number;
  rejected: number;
  corrected: number;
  ignored: number;
  acceptanceRate: number;
  correctionRate: number;
  avgResponseTimeMs: number;
}

export interface SessionStats {
  sessionId: string;
  startTime: string;
  endTime?: string;
  interactionCount: number;
  recommendationsShown: number;
  recommendationsAccepted: number;
  avgConfidenceShown: number;
  avgConfidenceAccepted: number;
}

export interface BehaviorTrackerConfig {
  maxInteractionsInMemory: number;
  sessionTimeoutMs: number;
  minInteractionsForStats: number;
}

const DEFAULT_CONFIG: BehaviorTrackerConfig = {
  maxInteractionsInMemory: 10000,
  sessionTimeoutMs: 30 * 60 * 1000, // 30 minutes
  minInteractionsForStats: 10,
};

// =============================================================================
// Behavior Tracker
// =============================================================================

export interface BehaviorTracker {
  /**
   * Track an interaction event
   */
  trackInteraction(interaction: Omit<TrackedInteraction, "id" | "timestamp">): void;

  /**
   * Record recommendation outcome
   */
  recordRecommendationOutcome(
    workspaceId: number,
    outcome: RecommendationOutcome
  ): void;

  /**
   * Get interaction statistics for a workspace
   */
  getInteractionStats(
    workspaceId: number,
    options?: { entityType?: string; daysBack?: number }
  ): InteractionStats;

  /**
   * Get recent interactions
   */
  getRecentInteractions(
    workspaceId: number,
    options?: { limit?: number; entityType?: string }
  ): TrackedInteraction[];

  /**
   * Get session statistics
   */
  getSessionStats(workspaceId: number, sessionId: string): SessionStats | null;

  /**
   * Get all sessions for analysis
   */
  getAllSessions(
    workspaceId: number,
    options?: { daysBack?: number }
  ): SessionStats[];

  /**
   * Build user behavior profile from tracked data
   */
  buildBehaviorProfile(workspaceId: number): UserBehaviorProfile;

  /**
   * Clear old interactions to free memory
   */
  cleanup(maxAgeDays?: number): number;

  /**
   * Export interactions for persistence
   */
  exportInteractions(workspaceId: number): TrackedInteraction[];

  /**
   * Import previously exported interactions
   */
  importInteractions(interactions: TrackedInteraction[]): void;
}

/**
 * Create a behavior tracker instance
 */
export function createBehaviorTracker(
  config: Partial<BehaviorTrackerConfig> = {}
): BehaviorTracker {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // In-memory storage (would be backed by database in production)
  const interactions: TrackedInteraction[] = [];
  const sessions = new Map<string, SessionStats>();

  // Helper to generate unique IDs
  function generateId(): string {
    return `int_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // Helper to get or create session
  function getOrCreateSession(workspaceId: number, sessionId?: string): SessionStats {
    const sid = sessionId ?? `session_${workspaceId}_${Date.now()}`;

    if (!sessions.has(sid)) {
      sessions.set(sid, {
        sessionId: sid,
        startTime: nowISOString(),
        interactionCount: 0,
        recommendationsShown: 0,
        recommendationsAccepted: 0,
        avgConfidenceShown: 0,
        avgConfidenceAccepted: 0,
      });
    }

    return sessions.get(sid)!;
  }

  // Helper to filter interactions by workspace and options
  function filterInteractions(
    workspaceId: number,
    options: { entityType?: string; daysBack?: number } = {}
  ): TrackedInteraction[] {
    const { entityType, daysBack } = options;
    const cutoff = daysBack
      ? new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

    return interactions.filter((i) => {
      if (i.workspaceId !== workspaceId) return false;
      if (entityType && i.entityType !== entityType) return false;
      if (cutoff && i.timestamp < cutoff) return false;
      return true;
    });
  }

  return {
    trackInteraction(interaction: Omit<TrackedInteraction, "id" | "timestamp">): void {
      const fullInteraction: TrackedInteraction = {
        ...interaction,
        id: generateId(),
        timestamp: nowISOString(),
      };

      interactions.push(fullInteraction);

      // Update session stats
      const session = getOrCreateSession(interaction.workspaceId, interaction.sessionId);
      session.interactionCount++;
      session.endTime = fullInteraction.timestamp;

      if (interaction.interactionType === "recommendation_shown") {
        session.recommendationsShown++;
        const confidence = interaction.metadata.confidence as number | undefined;
        if (confidence !== undefined) {
          // Update rolling average
          session.avgConfidenceShown =
            (session.avgConfidenceShown * (session.recommendationsShown - 1) + confidence) /
            session.recommendationsShown;
        }
      }

      if (interaction.interactionType === "recommendation_accepted") {
        session.recommendationsAccepted++;
        const confidence = interaction.metadata.confidence as number | undefined;
        if (confidence !== undefined) {
          session.avgConfidenceAccepted =
            (session.avgConfidenceAccepted * (session.recommendationsAccepted - 1) + confidence) /
            session.recommendationsAccepted;
        }
      }

      // Cleanup if too many interactions
      if (interactions.length > cfg.maxInteractionsInMemory) {
        interactions.splice(0, Math.floor(cfg.maxInteractionsInMemory * 0.1));
      }
    },

    recordRecommendationOutcome(
      workspaceId: number,
      outcome: RecommendationOutcome
    ): void {
      const interactionType =
        outcome.outcome === "accepted"
          ? "recommendation_accepted"
          : outcome.outcome === "rejected"
            ? "recommendation_rejected"
            : outcome.outcome === "corrected"
              ? "recommendation_corrected"
              : "recommendation_ignored";

      this.trackInteraction({
        workspaceId,
        interactionType,
        entityType: "recommendation",
        recommendationId: outcome.recommendationId,
        metadata: {
          outcome: outcome.outcome,
          timeToDecision: outcome.timeToDecision,
          correction: outcome.correction,
          feedback: outcome.feedback,
        },
      });
    },

    getInteractionStats(
      workspaceId: number,
      options: { entityType?: string; daysBack?: number } = {}
    ): InteractionStats {
      const filtered = filterInteractions(workspaceId, options);

      const accepted = filtered.filter(
        (i) => i.interactionType === "recommendation_accepted"
      ).length;
      const rejected = filtered.filter(
        (i) => i.interactionType === "recommendation_rejected"
      ).length;
      const corrected = filtered.filter(
        (i) => i.interactionType === "recommendation_corrected"
      ).length;
      const ignored = filtered.filter(
        (i) => i.interactionType === "recommendation_ignored"
      ).length;

      const total = accepted + rejected + corrected + ignored;

      // Calculate average response time
      const responseTimes = filtered
        .filter((i) => i.metadata.timeToDecision !== undefined)
        .map((i) => i.metadata.timeToDecision as number);

      const avgResponseTimeMs =
        responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : 0;

      return {
        total,
        accepted,
        rejected,
        corrected,
        ignored,
        acceptanceRate: total > 0 ? accepted / total : 0,
        correctionRate: total > 0 ? corrected / total : 0,
        avgResponseTimeMs,
      };
    },

    getRecentInteractions(
      workspaceId: number,
      options: { limit?: number; entityType?: string } = {}
    ): TrackedInteraction[] {
      const { limit = 100, entityType } = options;
      const filtered = filterInteractions(workspaceId, { entityType });

      // Sort by timestamp descending
      filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      return filtered.slice(0, limit);
    },

    getSessionStats(workspaceId: number, sessionId: string): SessionStats | null {
      const session = sessions.get(sessionId);
      if (!session) return null;

      // Verify it belongs to the workspace by checking interactions
      const sessionInteractions = interactions.filter(
        (i) => i.sessionId === sessionId && i.workspaceId === workspaceId
      );

      if (sessionInteractions.length === 0) return null;

      return session;
    },

    getAllSessions(
      workspaceId: number,
      options: { daysBack?: number } = {}
    ): SessionStats[] {
      const { daysBack = 30 } = options;
      const cutoff = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

      // Get unique session IDs from interactions for this workspace
      const sessionIds = new Set(
        interactions
          .filter((i) => i.workspaceId === workspaceId && i.timestamp >= cutoff && i.sessionId)
          .map((i) => i.sessionId!)
      );

      return Array.from(sessionIds)
        .map((sid) => sessions.get(sid))
        .filter((s): s is SessionStats => s !== undefined)
        .sort((a, b) => b.startTime.localeCompare(a.startTime));
    },

    buildBehaviorProfile(workspaceId: number): UserBehaviorProfile {
      const stats = this.getInteractionStats(workspaceId, { daysBack: 90 });
      const recentStats = this.getInteractionStats(workspaceId, { daysBack: 7 });
      const allSessions = this.getAllSessions(workspaceId, { daysBack: 30 });

      // Calculate session frequency (sessions per week)
      const sessionFrequency = allSessions.length / 4; // 30 days / ~4 weeks

      // Calculate average confidence thresholds from accepted recommendations
      const acceptedInteractions = filterInteractions(workspaceId, { daysBack: 90 }).filter(
        (i) => i.interactionType === "recommendation_accepted"
      );

      const confidences = acceptedInteractions
        .map((i) => i.metadata.confidence as number | undefined)
        .filter((c): c is number => c !== undefined);

      const avgAcceptedConfidence =
        confidences.length > 0
          ? confidences.reduce((a, b) => a + b, 0) / confidences.length
          : 0.7;

      // Build category-specific sensitivity (how often user accepts recommendations per category)
      const categorySensitivity: Record<number, number> = {};
      const categoryInteractions = filterInteractions(workspaceId, { daysBack: 90 }).filter(
        (i) =>
          i.entityType === "category" &&
          (i.interactionType === "recommendation_accepted" ||
            i.interactionType === "recommendation_rejected")
      );

      const categoryStats = new Map<number, { accepted: number; total: number }>();
      for (const interaction of categoryInteractions) {
        const categoryId = interaction.entityId;
        if (categoryId === undefined) continue;

        if (!categoryStats.has(categoryId)) {
          categoryStats.set(categoryId, { accepted: 0, total: 0 });
        }

        const stat = categoryStats.get(categoryId)!;
        stat.total++;
        if (interaction.interactionType === "recommendation_accepted") {
          stat.accepted++;
        }
      }

      for (const [categoryId, stat] of categoryStats) {
        if (stat.total >= cfg.minInteractionsForStats) {
          categorySensitivity[categoryId] = stat.accepted / stat.total;
        }
      }

      // Determine automation level based on acceptance rate
      let automationLevel: "manual" | "suggested" | "automatic" = "suggested";
      if (stats.acceptanceRate >= 0.9 && stats.total >= 50) {
        automationLevel = "automatic";
      } else if (stats.acceptanceRate < 0.5) {
        automationLevel = "manual";
      }

      // Calculate confidence calibration (how well our confidence predicts acceptance)
      const calibration = calculateConfidenceCalibration(workspaceId);

      return {
        workspaceId,
        preferences: {
          confidenceThreshold: Math.max(0.5, avgAcceptedConfidence - 0.1), // Slightly below avg accepted
          automationLevel,
          categorySensitivity,
        },
        engagement: {
          avgResponseTime: stats.avgResponseTimeMs,
          acceptanceRate: stats.acceptanceRate,
          correctionRate: stats.correctionRate,
          lastActiveAt:
            allSessions.length > 0 ? allSessions[0].endTime ?? allSessions[0].startTime : nowISOString(),
          sessionFrequency,
        },
        learningProgress: {
          totalRecommendations: stats.total,
          acceptedRecommendations: stats.accepted,
          correctedRecommendations: stats.corrected,
          confidenceCalibration: calibration,
        },
      };
    },

    cleanup(maxAgeDays: number = 90): number {
      const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000).toISOString();
      const initialLength = interactions.length;

      // Remove old interactions
      const toRemove = interactions.filter((i) => i.timestamp < cutoff);
      for (const interaction of toRemove) {
        const idx = interactions.indexOf(interaction);
        if (idx >= 0) {
          interactions.splice(idx, 1);
        }
      }

      // Remove old sessions
      for (const [sessionId, session] of sessions) {
        if (session.startTime < cutoff) {
          sessions.delete(sessionId);
        }
      }

      return initialLength - interactions.length;
    },

    exportInteractions(workspaceId: number): TrackedInteraction[] {
      return interactions.filter((i) => i.workspaceId === workspaceId);
    },

    importInteractions(importedInteractions: TrackedInteraction[]): void {
      for (const interaction of importedInteractions) {
        // Check for duplicates
        if (!interactions.some((i) => i.id === interaction.id)) {
          interactions.push(interaction);
        }
      }
    },
  };

  // Helper method added to the tracker object for confidence calibration
  function calculateConfidenceCalibration(workspaceId: number): number {
    const filtered = filterInteractions(workspaceId, { daysBack: 90 });

    // Group by confidence buckets and calculate actual acceptance rate
    const buckets = new Map<number, { predicted: number; actual: number; count: number }>();

    for (const interaction of filtered) {
      if (
        interaction.interactionType !== "recommendation_accepted" &&
        interaction.interactionType !== "recommendation_rejected"
      ) {
        continue;
      }

      const confidence = interaction.metadata.confidence as number | undefined;
      if (confidence === undefined) continue;

      // Round to nearest 0.1
      const bucket = Math.round(confidence * 10) / 10;

      if (!buckets.has(bucket)) {
        buckets.set(bucket, { predicted: bucket, actual: 0, count: 0 });
      }

      const b = buckets.get(bucket)!;
      b.count++;
      if (interaction.interactionType === "recommendation_accepted") {
        b.actual++;
      }
    }

    // Calculate calibration error (mean absolute error between predicted and actual)
    let totalError = 0;
    let totalWeight = 0;

    for (const b of buckets.values()) {
      if (b.count < 5) continue; // Skip buckets with too few samples

      const actualRate = b.actual / b.count;
      totalError += Math.abs(b.predicted - actualRate) * b.count;
      totalWeight += b.count;
    }

    if (totalWeight === 0) return 1; // No data, assume perfectly calibrated

    const mae = totalError / totalWeight;
    // Convert MAE to calibration score (1 = perfect, 0 = terrible)
    return Math.max(0, 1 - mae * 2);
  }
}
