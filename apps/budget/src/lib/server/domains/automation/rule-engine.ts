/**
 * Rule Engine
 *
 * Core automation engine that:
 * 1. Subscribes to entity events
 * 2. Finds matching rules for the workspace and event type
 * 3. Evaluates conditions against the entity
 * 4. Executes actions when conditions match
 * 5. Logs execution results
 */

import type { AutomationRule, NewAutomationRuleLog } from "$lib/schema/automation-rules";
import type { db } from "$lib/server/db";
import type { ActionConfig, ConditionGroup, EntityType, RuleEvent } from "$lib/types/automation";
import { executeActions, type ActionExecutionContext } from "./action-executor";
import { evaluateConditionGroup, type EvaluationContext } from "./condition-evaluator";
import { automationEvents } from "./event-emitter";
import { AutomationRepository } from "./repository";

// Database connection type derived from the actual db export
type DatabaseConnection = typeof db;

// Re-export ActionExecutionContext for use by other modules
export type { ActionExecutionContext };

/**
 * Rule Engine Service
 *
 * Manages the lifecycle of automation rules and their execution.
 */
export class RuleEngine {
  private repository: AutomationRepository;
  private db: DatabaseConnection;
  private workspaceId: number;
  private services: ActionExecutionContext["services"];
  private unsubscribers: (() => void)[] = [];
  private isInitialized = false;

  constructor(
    db: DatabaseConnection,
    workspaceId: number,
    services: ActionExecutionContext["services"]
  ) {
    this.db = db;
    this.workspaceId = workspaceId;
    this.repository = new AutomationRepository(db, workspaceId);
    this.services = services;
  }

  /**
   * Initialize the rule engine and subscribe to events
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Subscribe to all entity types
    const entityTypes: EntityType[] = [
      "transaction",
      "account",
      "payee",
      "category",
      "schedule",
      "budget",
    ];

    for (const entityType of entityTypes) {
      const unsubscribe = automationEvents.onAll(entityType, (event) =>
        this.handleEvent(event)
      );
      this.unsubscribers.push(unsubscribe);
    }

    this.isInitialized = true;
  }

  /**
   * Cleanup subscriptions
   */
  destroy(): void {
    for (const unsubscribe of this.unsubscribers) {
      unsubscribe();
    }
    this.unsubscribers = [];
    this.isInitialized = false;
  }

  /**
   * Handle an incoming event
   */
  private async handleEvent(event: RuleEvent): Promise<void> {
    // Only process events for our workspace
    if (event.workspaceId !== this.workspaceId) return;

    const startTime = Date.now();

    try {
      // Find all enabled rules that match this trigger
      const rules = await this.repository.findByTrigger(
        event.entityType,
        event.event
      );

      // Sort by priority (higher first)
      rules.sort((a, b) => b.priority - a.priority);

      // Process each rule
      for (const rule of rules) {
        const result = await this.processRule(rule, event);

        // Stop processing if rule matched and has stopOnMatch enabled
        if (result.matched && rule.stopOnMatch) {
          break;
        }
      }
    } catch (error) {
      console.error("Error processing automation event:", error);
    }
  }

  /**
   * Process a single rule against an event
   */
  private async processRule(
    rule: AutomationRule,
    event: RuleEvent
  ): Promise<{ matched: boolean; success: boolean }> {
    const startTime = Date.now();
    const entity = event.entity as Record<string, unknown>;

    // Prepare evaluation context
    const evalContext: EvaluationContext = {
      checkCategoryInGroup: (categoryId, groupId) => {
        // TODO: Implement category hierarchy check
        return false;
      },
    };

    // Evaluate conditions
    const conditions = rule.conditions as ConditionGroup;
    const matched = evaluateConditionGroup(conditions, entity, evalContext);

    // Log if conditions didn't match
    if (!matched) {
      await this.logExecution(rule.id, event, {
        status: "skipped",
        conditionsMatched: false,
        executionTimeMs: Date.now() - startTime,
        entitySnapshot: entity,
      });
      return { matched: false, success: true };
    }

    // Execute actions
    const actions = rule.actions as ActionConfig[];
    const actionContext: ActionExecutionContext = {
      db: this.db,
      workspaceId: this.workspaceId,
      entityType: event.entityType,
      services: this.services,
    };

    const actionResults = await executeActions(
      actions,
      entity,
      event.entityType,
      event.entityId,
      actionContext
    );

    // Determine overall success
    const allSuccessful = actionResults.every((r) => r.success);
    const status = allSuccessful ? "success" : "failed";

    // Log execution
    await this.logExecution(rule.id, event, {
      status,
      conditionsMatched: true,
      actionsExecuted: actionResults,
      executionTimeMs: Date.now() - startTime,
      entitySnapshot: entity,
      errorMessage: allSuccessful
        ? undefined
        : actionResults.find((r) => !r.success)?.error,
    });

    // Update rule stats
    await this.repository.updateStats(rule.id);

    // Handle runOnce rules
    if (rule.runOnce && allSuccessful) {
      await this.repository.disable(rule.id);
    }

    return { matched: true, success: allSuccessful };
  }

  /**
   * Log rule execution
   */
  private async logExecution(
    ruleId: number,
    event: RuleEvent,
    data: Partial<NewAutomationRuleLog>
  ): Promise<void> {
    await this.repository.createLog({
      ruleId,
      triggerEvent: event.event,
      entityType: event.entityType,
      entityId: event.entityId,
      ...data,
    } as NewAutomationRuleLog);
  }

  /**
   * Test a rule against an entity without executing actions (dry run)
   */
  async testRule(
    rule: AutomationRule,
    entity: Record<string, unknown>,
    entityType: EntityType,
    entityId?: number
  ): Promise<{
    matched: boolean;
    actions: Array<{ type: string; wouldExecute: boolean }>;
  }> {
    // Evaluate conditions
    const evalContext: EvaluationContext = {
      checkCategoryInGroup: (categoryId, groupId) => false,
    };

    const conditions = rule.conditions as ConditionGroup;
    const matched = evaluateConditionGroup(conditions, entity, evalContext);

    // If matched, simulate actions
    const actions = (rule.actions as ActionConfig[]).map((action) => ({
      type: action.type,
      wouldExecute: matched,
    }));

    return { matched, actions };
  }
}

/**
 * Create a rule engine instance for a workspace
 */
export function createRuleEngine(
  db: DatabaseConnection,
  workspaceId: number,
  services: ActionExecutionContext["services"]
): RuleEngine {
  return new RuleEngine(db, workspaceId, services);
}

/**
 * Global registry of rule engines per workspace
 * Used to avoid creating multiple instances
 */
const ruleEngineRegistry = new Map<number, RuleEngine>();

/**
 * Get or create a rule engine for a workspace
 */
export function getRuleEngine(
  db: DatabaseConnection,
  workspaceId: number,
  services: ActionExecutionContext["services"]
): RuleEngine {
  let engine = ruleEngineRegistry.get(workspaceId);
  if (!engine) {
    engine = createRuleEngine(db, workspaceId, services);
    ruleEngineRegistry.set(workspaceId, engine);
  }
  return engine;
}

/**
 * Destroy a rule engine for a workspace
 */
export function destroyRuleEngine(workspaceId: number): void {
  const engine = ruleEngineRegistry.get(workspaceId);
  if (engine) {
    engine.destroy();
    ruleEngineRegistry.delete(workspaceId);
  }
}

/**
 * Destroy all rule engines
 */
export function destroyAllRuleEngines(): void {
  for (const [workspaceId, engine] of ruleEngineRegistry) {
    engine.destroy();
  }
  ruleEngineRegistry.clear();
}
