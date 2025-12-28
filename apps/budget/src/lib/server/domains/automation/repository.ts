/**
 * Automation Repository
 *
 * Database access layer for automation rules and logs.
 */

import {
  automationRuleLogs,
  automationRules,
  type AutomationRule,
  type AutomationRuleLog,
  type NewAutomationRule,
  type NewAutomationRuleLog,
} from "$lib/schema/automation-rules";
import type { db } from "$lib/server/db";
import type { EntityType } from "$lib/types/automation";
import { and, desc, eq, sql } from "drizzle-orm";

// Database connection type derived from the actual db export
type DatabaseConnection = typeof db;

export class AutomationRepository {
  constructor(
    private db: DatabaseConnection,
    private workspaceId: number
  ) {}

  // ==========================================================================
  // Rules
  // ==========================================================================

  /**
   * Create a new automation rule
   */
  async create(data: Omit<NewAutomationRule, "workspaceId">): Promise<AutomationRule> {
    const [rule] = await this.db
      .insert(automationRules)
      .values({
        ...data,
        workspaceId: this.workspaceId,
      })
      .returning();
    return rule;
  }

  /**
   * Get a rule by ID
   */
  async findById(id: number): Promise<AutomationRule | undefined> {
    const [rule] = await this.db
      .select()
      .from(automationRules)
      .where(
        and(
          eq(automationRules.id, id),
          eq(automationRules.workspaceId, this.workspaceId)
        )
      );
    return rule;
  }

  /**
   * Get all rules for the workspace
   */
  async findAll(): Promise<AutomationRule[]> {
    return this.db
      .select()
      .from(automationRules)
      .where(eq(automationRules.workspaceId, this.workspaceId))
      .orderBy(desc(automationRules.priority), automationRules.name);
  }

  /**
   * Get enabled rules for a specific trigger
   */
  async findByTrigger(entityType: EntityType, event: string): Promise<AutomationRule[]> {
    const rules = await this.db
      .select()
      .from(automationRules)
      .where(
        and(
          eq(automationRules.workspaceId, this.workspaceId),
          eq(automationRules.isEnabled, true)
        )
      )
      .orderBy(desc(automationRules.priority));

    // Filter by trigger in application layer (JSON field)
    return rules.filter((rule) => {
      const trigger = rule.trigger as { entityType: string; event: string };
      return trigger.entityType === entityType && trigger.event === event;
    });
  }

  /**
   * Get enabled rules for an entity type (all events)
   */
  async findByEntityType(entityType: EntityType): Promise<AutomationRule[]> {
    const rules = await this.db
      .select()
      .from(automationRules)
      .where(
        and(
          eq(automationRules.workspaceId, this.workspaceId),
          eq(automationRules.isEnabled, true)
        )
      )
      .orderBy(desc(automationRules.priority));

    // Filter by entity type in application layer (JSON field)
    return rules.filter((rule) => {
      const trigger = rule.trigger as { entityType: string };
      return trigger.entityType === entityType;
    });
  }

  /**
   * Update a rule
   */
  async update(
    id: number,
    data: Partial<Omit<NewAutomationRule, "workspaceId" | "id">>
  ): Promise<AutomationRule | undefined> {
    const [rule] = await this.db
      .update(automationRules)
      .set({
        ...data,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(
        and(
          eq(automationRules.id, id),
          eq(automationRules.workspaceId, this.workspaceId)
        )
      )
      .returning();
    return rule;
  }

  /**
   * Delete a rule
   */
  async delete(id: number): Promise<boolean> {
    const result = await this.db
      .delete(automationRules)
      .where(
        and(
          eq(automationRules.id, id),
          eq(automationRules.workspaceId, this.workspaceId)
        )
      );
    return true;
  }

  /**
   * Enable/disable a rule
   */
  async setEnabled(id: number, isEnabled: boolean): Promise<AutomationRule | undefined> {
    return this.update(id, { isEnabled });
  }

  /**
   * Disable a rule (convenience method)
   */
  async disable(id: number): Promise<AutomationRule | undefined> {
    return this.setEnabled(id, false);
  }

  /**
   * Update rule stats after execution
   */
  async updateStats(id: number): Promise<void> {
    await this.db
      .update(automationRules)
      .set({
        lastTriggeredAt: sql`CURRENT_TIMESTAMP`,
        triggerCount: sql`${automationRules.triggerCount} + 1`,
      })
      .where(
        and(
          eq(automationRules.id, id),
          eq(automationRules.workspaceId, this.workspaceId)
        )
      );
  }

  /**
   * Duplicate a rule
   */
  async duplicate(id: number, newName?: string): Promise<AutomationRule | undefined> {
    const original = await this.findById(id);
    if (!original) return undefined;

    const { id: _, workspaceId: __, createdAt, updatedAt, lastTriggeredAt, triggerCount, ...data } = original;
    return this.create({
      ...data,
      name: newName || `${original.name} (copy)`,
      triggerCount: 0,
    });
  }

  // ==========================================================================
  // Logs
  // ==========================================================================

  /**
   * Create a log entry
   */
  async createLog(data: NewAutomationRuleLog): Promise<AutomationRuleLog> {
    const [log] = await this.db
      .insert(automationRuleLogs)
      .values(data)
      .returning();
    return log;
  }

  /**
   * Get logs for a rule
   */
  async findLogs(
    ruleId: number,
    options?: { limit?: number; offset?: number }
  ): Promise<AutomationRuleLog[]> {
    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;

    return this.db
      .select()
      .from(automationRuleLogs)
      .where(eq(automationRuleLogs.ruleId, ruleId))
      .orderBy(desc(automationRuleLogs.createdAt))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Get recent logs for the workspace (all rules)
   */
  async findRecentLogs(options?: { limit?: number }): Promise<AutomationRuleLog[]> {
    const limit = options?.limit ?? 100;

    // Join with rules to filter by workspace
    return this.db
      .select({
        log: automationRuleLogs,
      })
      .from(automationRuleLogs)
      .innerJoin(automationRules, eq(automationRuleLogs.ruleId, automationRules.id))
      .where(eq(automationRules.workspaceId, this.workspaceId))
      .orderBy(desc(automationRuleLogs.createdAt))
      .limit(limit)
      .then((results) => results.map((r) => r.log));
  }

  /**
   * Get log count by status for a rule
   */
  async getLogStats(ruleId: number): Promise<{
    success: number;
    failed: number;
    skipped: number;
  }> {
    const logs = await this.db
      .select({
        status: automationRuleLogs.status,
        count: sql<number>`count(*)`,
      })
      .from(automationRuleLogs)
      .where(eq(automationRuleLogs.ruleId, ruleId))
      .groupBy(automationRuleLogs.status);

    const stats = { success: 0, failed: 0, skipped: 0 };
    for (const log of logs) {
      if (log.status === "success") stats.success = log.count;
      else if (log.status === "failed") stats.failed = log.count;
      else if (log.status === "skipped") stats.skipped = log.count;
    }
    return stats;
  }

  /**
   * Delete old logs (cleanup)
   */
  async deleteOldLogs(daysToKeep: number = 30): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToKeep);

    // Get logs to delete that belong to this workspace
    const logsToDelete = await this.db
      .select({ id: automationRuleLogs.id })
      .from(automationRuleLogs)
      .innerJoin(automationRules, eq(automationRuleLogs.ruleId, automationRules.id))
      .where(
        and(
          eq(automationRules.workspaceId, this.workspaceId),
          sql`${automationRuleLogs.createdAt} < ${cutoff.toISOString()}`
        )
      );

    if (logsToDelete.length === 0) return 0;

    const idsToDelete = logsToDelete.map((l) => l.id);
    await this.db
      .delete(automationRuleLogs)
      .where(sql`${automationRuleLogs.id} IN (${idsToDelete.join(",")})`);

    return logsToDelete.length;
  }
}
