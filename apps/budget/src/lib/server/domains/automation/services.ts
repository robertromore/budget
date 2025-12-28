/**
 * Automation Services
 *
 * Business logic for managing automation rules.
 */

import type {
  AutomationRule,
  AutomationRuleLog
} from "$lib/schema/automation-rules";
import type { db } from "$lib/server/db";
import type {
  ActionConfig,
  ConditionGroup,
  EntityType,
  FlowState,
  TriggerConfig,
} from "$lib/types/automation";
import type { ActionExecutionContext } from "./action-executor";
import { AutomationRepository } from "./repository";
import { getRuleEngine } from "./rule-engine";

// Database connection type derived from the actual db export
type DatabaseConnection = typeof db;

/**
 * Service context for automation operations
 */
export interface AutomationContext {
  db: DatabaseConnection;
  workspaceId: number;
  userId?: string | null;
}

/**
 * Create a new automation rule
 */
export async function createRule(
  input: CreateRuleInput,
  context: AutomationContext
): Promise<AutomationRule> {
  const repository = new AutomationRepository(context.db, context.workspaceId);

  // Validate trigger
  validateTrigger(input.trigger);

  // Validate conditions
  validateConditions(input.conditions);

  // Validate actions
  validateActions(input.actions, input.trigger.entityType);

  return repository.create({
    name: input.name,
    description: input.description,
    isEnabled: input.isEnabled ?? true,
    priority: input.priority ?? 0,
    trigger: input.trigger,
    conditions: input.conditions,
    actions: input.actions,
    flowState: input.flowState,
    stopOnMatch: input.stopOnMatch ?? true,
    runOnce: input.runOnce ?? false,
  });
}

/**
 * Update an automation rule
 */
export async function updateRule(
  id: number,
  input: UpdateRuleInput,
  context: AutomationContext
): Promise<AutomationRule | undefined> {
  const repository = new AutomationRepository(context.db, context.workspaceId);

  // Get existing rule
  const existing = await repository.findById(id);
  if (!existing) return undefined;

  // Validate if trigger changed
  if (input.trigger) {
    validateTrigger(input.trigger);
  }

  // Validate if conditions changed
  if (input.conditions) {
    validateConditions(input.conditions);
  }

  // Validate if actions changed
  if (input.actions) {
    const entityType = input.trigger?.entityType ?? (existing.trigger as TriggerConfig).entityType;
    validateActions(input.actions, entityType);
  }

  return repository.update(id, {
    name: input.name,
    description: input.description,
    isEnabled: input.isEnabled,
    priority: input.priority,
    trigger: input.trigger,
    conditions: input.conditions,
    actions: input.actions,
    flowState: input.flowState,
    stopOnMatch: input.stopOnMatch,
    runOnce: input.runOnce,
  });
}

/**
 * Get a rule by ID
 */
export async function getRule(
  id: number,
  context: AutomationContext
): Promise<AutomationRule | undefined> {
  const repository = new AutomationRepository(context.db, context.workspaceId);
  return repository.findById(id);
}

/**
 * Get all rules for a workspace
 */
export async function getRules(
  context: AutomationContext
): Promise<AutomationRule[]> {
  const repository = new AutomationRepository(context.db, context.workspaceId);
  return repository.findAll();
}

/**
 * Get rules for a specific entity type
 */
export async function getRulesByEntityType(
  entityType: EntityType,
  context: AutomationContext
): Promise<AutomationRule[]> {
  const repository = new AutomationRepository(context.db, context.workspaceId);
  return repository.findByEntityType(entityType);
}

/**
 * Delete a rule
 */
export async function deleteRule(
  id: number,
  context: AutomationContext
): Promise<boolean> {
  const repository = new AutomationRepository(context.db, context.workspaceId);
  return repository.delete(id);
}

/**
 * Enable a rule
 */
export async function enableRule(
  id: number,
  context: AutomationContext
): Promise<AutomationRule | undefined> {
  const repository = new AutomationRepository(context.db, context.workspaceId);
  return repository.setEnabled(id, true);
}

/**
 * Disable a rule
 */
export async function disableRule(
  id: number,
  context: AutomationContext
): Promise<AutomationRule | undefined> {
  const repository = new AutomationRepository(context.db, context.workspaceId);
  return repository.setEnabled(id, false);
}

/**
 * Duplicate a rule
 */
export async function duplicateRule(
  id: number,
  newName: string | undefined,
  context: AutomationContext
): Promise<AutomationRule | undefined> {
  const repository = new AutomationRepository(context.db, context.workspaceId);
  return repository.duplicate(id, newName);
}

/**
 * Get logs for a rule
 */
export async function getRuleLogs(
  ruleId: number,
  options: { limit?: number; offset?: number },
  context: AutomationContext
): Promise<AutomationRuleLog[]> {
  const repository = new AutomationRepository(context.db, context.workspaceId);

  // Verify rule belongs to workspace
  const rule = await repository.findById(ruleId);
  if (!rule) return [];

  return repository.findLogs(ruleId, options);
}

/**
 * Get recent logs for the workspace
 */
export async function getRecentLogs(
  options: { limit?: number },
  context: AutomationContext
): Promise<AutomationRuleLog[]> {
  const repository = new AutomationRepository(context.db, context.workspaceId);
  return repository.findRecentLogs(options);
}

/**
 * Get log statistics for a rule
 */
export async function getRuleLogStats(
  ruleId: number,
  context: AutomationContext
): Promise<{ success: number; failed: number; skipped: number }> {
  const repository = new AutomationRepository(context.db, context.workspaceId);

  // Verify rule belongs to workspace
  const rule = await repository.findById(ruleId);
  if (!rule) return { success: 0, failed: 0, skipped: 0 };

  return repository.getLogStats(ruleId);
}

/**
 * Test a rule against sample data (dry run)
 */
export async function testRule(
  id: number,
  testEntity: Record<string, unknown>,
  context: AutomationContext,
  services: ActionExecutionContext["services"]
): Promise<{
  matched: boolean;
  actions: Array<{ type: string; wouldExecute: boolean }>;
}> {
  const repository = new AutomationRepository(context.db, context.workspaceId);
  const rule = await repository.findById(id);
  if (!rule) {
    return { matched: false, actions: [] };
  }

  const engine = getRuleEngine(context.db, context.workspaceId, services);
  const trigger = rule.trigger as TriggerConfig;

  return engine.testRule(rule, testEntity, trigger.entityType);
}

/**
 * Clean up old logs
 */
export async function cleanupOldLogs(
  daysToKeep: number,
  context: AutomationContext
): Promise<number> {
  const repository = new AutomationRepository(context.db, context.workspaceId);
  return repository.deleteOldLogs(daysToKeep);
}

// =============================================================================
// Validation
// =============================================================================

function validateTrigger(trigger: TriggerConfig): void {
  const validEntityTypes: EntityType[] = [
    "transaction",
    "account",
    "payee",
    "category",
    "schedule",
    "budget",
  ];

  if (!validEntityTypes.includes(trigger.entityType)) {
    throw new Error(`Invalid entity type: ${trigger.entityType}`);
  }

  if (!trigger.event || typeof trigger.event !== "string") {
    throw new Error("Trigger event is required");
  }
}

function validateConditions(conditions: ConditionGroup): void {
  if (!conditions.operator || !["AND", "OR"].includes(conditions.operator)) {
    throw new Error("Condition group must have AND or OR operator");
  }

  if (!Array.isArray(conditions.conditions)) {
    throw new Error("Condition group must have conditions array");
  }

  // Recursively validate nested groups
  for (const item of conditions.conditions) {
    if ("operator" in item && (item.operator === "AND" || item.operator === "OR")) {
      validateConditions(item as ConditionGroup);
    } else {
      // It's a condition - basic validation
      const condition = item as { field?: string; operator?: string };
      if (!condition.field) {
        throw new Error("Condition must have a field");
      }
      if (!condition.operator) {
        throw new Error("Condition must have an operator");
      }
    }
  }
}

function validateActions(actions: ActionConfig[], entityType: EntityType): void {
  if (!Array.isArray(actions) || actions.length === 0) {
    throw new Error("At least one action is required");
  }

  for (const action of actions) {
    if (!action.type) {
      throw new Error("Action must have a type");
    }

    // TODO: Validate action type is valid for entity type
    // TODO: Validate required params are present
  }
}

// =============================================================================
// Types
// =============================================================================

export interface CreateRuleInput {
  name: string;
  description?: string | null;
  isEnabled?: boolean;
  priority?: number;
  trigger: TriggerConfig;
  conditions: ConditionGroup;
  actions: ActionConfig[];
  flowState?: FlowState | null;
  stopOnMatch?: boolean;
  runOnce?: boolean;
}

export interface UpdateRuleInput {
  name?: string;
  description?: string | null;
  isEnabled?: boolean;
  priority?: number;
  trigger?: TriggerConfig;
  conditions?: ConditionGroup;
  actions?: ActionConfig[];
  flowState?: FlowState | null;
  stopOnMatch?: boolean;
  runOnce?: boolean;
}
