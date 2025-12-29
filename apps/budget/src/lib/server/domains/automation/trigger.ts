/**
 * Automation Trigger Utility
 *
 * Provides a simple way to trigger automation rules from services.
 * This utility handles:
 * 1. Emitting the event (for any listeners)
 * 2. Processing rules directly (without requiring pre-initialized engine)
 */

import type { db as dbType } from "$lib/server/db";
import type { EntityType, RuleEvent, ActionConfig, ConditionGroup } from "$lib/types/automation";
import { automationEvents } from "./event-emitter";
import { AutomationRepository } from "./repository";
import { evaluateConditionGroup, type EvaluationContext } from "./condition-evaluator";
import { executeActions, type ActionExecutionContext } from "./action-executor";
import type { NewAutomationRuleLog } from "$lib/schema/automation-rules";
import { logger } from "$lib/server/shared/logging";

type DatabaseConnection = typeof dbType;

interface TriggerOptions {
  db: DatabaseConnection;
  workspaceId: number;
  entityType: EntityType;
  event: string;
  entityId?: number;
  entity: Record<string, unknown>;
  previousEntity?: Record<string, unknown>;
  /**
   * Services for action execution.
   * If not provided, actions that require services will be skipped.
   */
  services?: ActionExecutionContext["services"];
}

interface TriggerResult {
  rulesEvaluated: number;
  rulesMatched: number;
  actionsExecuted: number;
  errors: string[];
}

/**
 * Trigger automation rules for an event.
 *
 * This is the main entry point for triggering automation from services.
 * It will:
 * 1. Emit the event to the event bus (for any listeners)
 * 2. Find and evaluate matching rules
 * 3. Execute actions for matched rules
 * 4. Log results
 *
 * @example
 * ```ts
 * // In transaction service after creating a transaction:
 * await triggerAutomation({
 *   db: this.db,
 *   workspaceId,
 *   entityType: "transaction",
 *   event: "created",
 *   entityId: transaction.id,
 *   entity: transaction,
 *   services: { transactions: this }
 * });
 * ```
 */
export async function triggerAutomation(options: TriggerOptions): Promise<TriggerResult> {
  const {
    db,
    workspaceId,
    entityType,
    event,
    entityId,
    entity,
    previousEntity,
    services,
  } = options;

  const result: TriggerResult = {
    rulesEvaluated: 0,
    rulesMatched: 0,
    actionsExecuted: 0,
    errors: [],
  };

  try {
    // Emit the event to the event bus (for any external listeners)
    await automationEvents.emit(entityType, event, {
      workspaceId,
      entityId,
      entity,
      previousState: previousEntity,
    });

    // Find matching rules directly
    const repository = new AutomationRepository(db, workspaceId);
    const rules = await repository.findByTrigger(entityType, event);

    if (rules.length === 0) {
      return result;
    }

    // Sort by priority (higher first)
    rules.sort((a, b) => b.priority - a.priority);

    // Evaluation context
    const evalContext: EvaluationContext = {
      checkCategoryInGroup: (categoryId, groupId) => {
        // TODO: Implement category hierarchy check when needed
        return false;
      },
    };

    // Process each rule
    for (const rule of rules) {
      result.rulesEvaluated++;
      const ruleStartTime = Date.now();

      try {
        // Evaluate conditions
        const conditions = rule.conditions as ConditionGroup;
        const matched = evaluateConditionGroup(conditions, entity, evalContext);

        if (!matched) {
          // Log skipped execution
          await repository.createLog({
            ruleId: rule.id,
            triggerEvent: event,
            entityType,
            entityId,
            status: "skipped",
            conditionsMatched: false,
            executionTimeMs: Date.now() - ruleStartTime,
            entitySnapshot: entity,
          } as NewAutomationRuleLog);
          continue;
        }

        result.rulesMatched++;

        // Execute actions if services are provided
        const actions = rule.actions as ActionConfig[];
        let actionResults: Array<{ success: boolean; error?: string; actionType: string }> = [];

        if (services) {
          const actionContext: ActionExecutionContext = {
            db,
            workspaceId,
            entityType,
            services,
          };

          actionResults = await executeActions(
            actions,
            entity,
            entityType,
            entityId,
            actionContext
          );

          result.actionsExecuted += actionResults.filter(r => r.success).length;
        } else {
          // No services - mark actions as skipped
          actionResults = actions.map(a => ({
            actionType: a.type,
            success: false,
            error: "Services not provided for action execution",
          }));
        }

        // Determine overall success
        const allSuccessful = actionResults.every(r => r.success);
        const status = allSuccessful ? "success" : "failed";

        // Log execution
        await repository.createLog({
          ruleId: rule.id,
          triggerEvent: event,
          entityType,
          entityId,
          status,
          conditionsMatched: true,
          actionsExecuted: actionResults,
          executionTimeMs: Date.now() - ruleStartTime,
          entitySnapshot: entity,
          errorMessage: allSuccessful
            ? undefined
            : actionResults.find(r => !r.success)?.error,
        } as NewAutomationRuleLog);

        // Update rule stats
        await repository.updateStats(rule.id);

        // Handle runOnce rules
        if (rule.runOnce && allSuccessful) {
          await repository.disable(rule.id);
        }

        // Stop if rule matched and has stopOnMatch enabled
        if (rule.stopOnMatch) {
          break;
        }
      } catch (ruleError) {
        const errorMessage = ruleError instanceof Error ? ruleError.message : "Unknown error";
        result.errors.push(`Rule ${rule.id}: ${errorMessage}`);
        logger.error("Error processing automation rule", {
          ruleId: rule.id,
          error: ruleError,
        });
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    result.errors.push(errorMessage);
    logger.error("Error triggering automation", {
      entityType,
      event,
      error,
    });
  }

  return result;
}

/**
 * Helper to trigger transaction automation events
 */
export async function triggerTransactionAutomation(
  db: DatabaseConnection,
  workspaceId: number,
  event: "created" | "updated" | "deleted" | "imported" | "categorized" | "cleared",
  transaction: Record<string, unknown>,
  previousTransaction?: Record<string, unknown>,
  services?: ActionExecutionContext["services"]
): Promise<TriggerResult> {
  return triggerAutomation({
    db,
    workspaceId,
    entityType: "transaction",
    event,
    entityId: transaction.id as number | undefined,
    entity: transaction,
    previousEntity: previousTransaction,
    services,
  });
}
