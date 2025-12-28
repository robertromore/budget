/**
 * Action Executor
 *
 * Executes actions defined in automation rules. Each action type has a handler
 * that performs the actual operation and returns the result.
 */

import type { db } from "$lib/server/db";
import type { ActionConfig, ActionResult, EntityType } from "$lib/types/automation";

// Database connection type derived from the actual db export
type DatabaseConnection = typeof db;

/**
 * Execute a list of actions
 */
export async function executeActions(
  actions: ActionConfig[],
  entity: Record<string, unknown>,
  entityType: EntityType,
  entityId: number | undefined,
  context: ActionExecutionContext
): Promise<ActionResult[]> {
  const results: ActionResult[] = [];

  for (const action of actions) {
    const startTime = Date.now();
    try {
      const result = await executeAction(action, entity, entityType, entityId, context);
      results.push({
        ...result,
        actionId: action.id,
      });

      // Stop if action failed and continueOnError is false
      if (!result.success && !action.continueOnError) {
        break;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      results.push({
        actionId: action.id,
        actionType: action.type,
        success: false,
        error: errorMessage,
      });

      if (!action.continueOnError) {
        break;
      }
    }
  }

  return results;
}

/**
 * Execute a single action
 */
async function executeAction(
  action: ActionConfig,
  entity: Record<string, unknown>,
  entityType: EntityType,
  entityId: number | undefined,
  context: ActionExecutionContext
): Promise<Omit<ActionResult, "actionId">> {
  const handler = actionHandlers[action.type];
  if (!handler) {
    return {
      actionType: action.type,
      success: false,
      error: `Unknown action type: ${action.type}`,
    };
  }

  // Check if action applies to this entity type
  const definition = getActionDefinition(action.type);
  if (definition && !definition.entityTypes.includes(entityType)) {
    return {
      actionType: action.type,
      success: false,
      error: `Action ${action.type} does not apply to entity type ${entityType}`,
    };
  }

  // Execute the action (skip in dry run mode)
  if (context.dryRun) {
    return {
      actionType: action.type,
      success: true,
      changes: { _dryRun: { from: false, to: true } },
    };
  }

  return handler(action.params, entity, entityId, context);
}

// =============================================================================
// Action Handlers
// =============================================================================

type ActionHandler = (
  params: Record<string, unknown>,
  entity: Record<string, unknown>,
  entityId: number | undefined,
  context: ActionExecutionContext
) => Promise<Omit<ActionResult, "actionId">>;

const actionHandlers: Record<string, ActionHandler> = {
  // Transaction actions
  setCategory: async (params, entity, entityId, context) => {
    const categoryId = params.categoryId as number;
    if (!entityId) {
      return { actionType: "setCategory", success: false, error: "No entity ID" };
    }

    const previousValue = entity.categoryId;
    await context.services.transactions.update(entityId, { categoryId }, context);

    return {
      actionType: "setCategory",
      success: true,
      changes: { categoryId: { from: previousValue, to: categoryId } },
    };
  },

  setPayee: async (params, entity, entityId, context) => {
    const payeeId = params.payeeId as number;
    if (!entityId) {
      return { actionType: "setPayee", success: false, error: "No entity ID" };
    }

    const previousValue = entity.payeeId;
    await context.services.transactions.update(entityId, { payeeId }, context);

    return {
      actionType: "setPayee",
      success: true,
      changes: { payeeId: { from: previousValue, to: payeeId } },
    };
  },

  setStatus: async (params, entity, entityId, context) => {
    const status = params.status as string;
    if (!entityId) {
      return { actionType: "setStatus", success: false, error: "No entity ID" };
    }

    const previousValue = entity.status;
    await context.services.transactions.update(entityId, { status }, context);

    return {
      actionType: "setStatus",
      success: true,
      changes: { status: { from: previousValue, to: status } },
    };
  },

  appendNotes: async (params, entity, entityId, context) => {
    const text = params.text as string;
    if (!entityId) {
      return { actionType: "appendNotes", success: false, error: "No entity ID" };
    }

    const currentNotes = (entity.notes as string) || "";
    const newNotes = currentNotes ? `${currentNotes}\n${text}` : text;
    await context.services.transactions.update(entityId, { notes: newNotes }, context);

    return {
      actionType: "appendNotes",
      success: true,
      changes: { notes: { from: currentNotes, to: newNotes } },
    };
  },

  setNotes: async (params, entity, entityId, context) => {
    const text = params.text as string;
    if (!entityId) {
      return { actionType: "setNotes", success: false, error: "No entity ID" };
    }

    const previousValue = entity.notes;
    await context.services.transactions.update(entityId, { notes: text }, context);

    return {
      actionType: "setNotes",
      success: true,
      changes: { notes: { from: previousValue, to: text } },
    };
  },

  markReviewed: async (params, entity, entityId, context) => {
    if (!entityId) {
      return { actionType: "markReviewed", success: false, error: "No entity ID" };
    }

    // Add a review flag in notes or metadata
    const currentNotes = (entity.notes as string) || "";
    const reviewNote = "[REVIEWED]";
    if (currentNotes.includes(reviewNote)) {
      return { actionType: "markReviewed", success: true };
    }

    const newNotes = currentNotes ? `${currentNotes} ${reviewNote}` : reviewNote;
    await context.services.transactions.update(entityId, { notes: newNotes }, context);

    return {
      actionType: "markReviewed",
      success: true,
      changes: { notes: { from: currentNotes, to: newNotes } },
    };
  },

  assignToBudget: async (params, entity, entityId, context) => {
    const budgetId = params.budgetId as number;
    if (!entityId) {
      return { actionType: "assignToBudget", success: false, error: "No entity ID" };
    }

    // This would call the budget allocation service
    if (context.services.budgets?.assignTransaction) {
      await context.services.budgets.assignTransaction(entityId, budgetId, context);
    }

    return {
      actionType: "assignToBudget",
      success: true,
      changes: { budgetId: { from: null, to: budgetId } },
    };
  },

  createPayeeAlias: async (params, entity, entityId, context) => {
    const payeeId = params.payeeId as number;
    const payee = entity.payee as Record<string, unknown> | undefined;
    const originalName = (entity.originalPayeeName as string) || (payee?.name as string);

    if (!originalName) {
      return { actionType: "createPayeeAlias", success: false, error: "No payee name to alias" };
    }

    if (context.services.payees?.createAlias) {
      await context.services.payees.createAlias(originalName, payeeId, context);
    }

    return {
      actionType: "createPayeeAlias",
      success: true,
      changes: { alias: { from: null, to: { name: originalName, payeeId } } },
    };
  },

  createCategoryAlias: async (params, entity, entityId, context) => {
    const categoryId = params.categoryId as number;
    const originalName = (entity.originalCategoryName as string) || (entity.inferredCategory as string);

    if (!originalName) {
      return { actionType: "createCategoryAlias", success: false, error: "No category name to alias" };
    }

    if (context.services.categories?.createAlias) {
      await context.services.categories.createAlias(originalName, categoryId, context);
    }

    return {
      actionType: "createCategoryAlias",
      success: true,
      changes: { alias: { from: null, to: { name: originalName, categoryId } } },
    };
  },

  // Account actions
  updateAccountNotes: async (params, entity, entityId, context) => {
    const text = params.text as string;
    if (!entityId) {
      return { actionType: "updateAccountNotes", success: false, error: "No entity ID" };
    }

    const previousValue = entity.notes;
    if (context.services.accounts?.update) {
      await context.services.accounts.update(entityId, { notes: text }, context);
    }

    return {
      actionType: "updateAccountNotes",
      success: true,
      changes: { notes: { from: previousValue, to: text } },
    };
  },

  setAccountDefaultCategory: async (params, entity, entityId, context) => {
    const categoryId = params.categoryId as number;
    if (!entityId) {
      return { actionType: "setAccountDefaultCategory", success: false, error: "No entity ID" };
    }

    const previousValue = entity.defaultCategoryId;
    if (context.services.accounts?.update) {
      await context.services.accounts.update(entityId, { defaultCategoryId: categoryId }, context);
    }

    return {
      actionType: "setAccountDefaultCategory",
      success: true,
      changes: { defaultCategoryId: { from: previousValue, to: categoryId } },
    };
  },

  closeAccount: async (params, entity, entityId, context) => {
    if (!entityId) {
      return { actionType: "closeAccount", success: false, error: "No entity ID" };
    }

    if (context.services.accounts?.close) {
      await context.services.accounts.close(entityId, context);
    }

    return {
      actionType: "closeAccount",
      success: true,
      changes: { isClosed: { from: false, to: true } },
    };
  },

  // Payee actions
  setPayeeDefaultCategory: async (params, entity, entityId, context) => {
    const categoryId = params.categoryId as number;
    if (!entityId) {
      return { actionType: "setPayeeDefaultCategory", success: false, error: "No entity ID" };
    }

    const previousValue = entity.defaultCategoryId;
    if (context.services.payees?.update) {
      await context.services.payees.update(entityId, { defaultCategoryId: categoryId }, context);
    }

    return {
      actionType: "setPayeeDefaultCategory",
      success: true,
      changes: { defaultCategoryId: { from: previousValue, to: categoryId } },
    };
  },

  setIsSubscription: async (params, entity, entityId, context) => {
    const isSubscription = params.isSubscription as boolean;
    if (!entityId) {
      return { actionType: "setIsSubscription", success: false, error: "No entity ID" };
    }

    const previousValue = entity.isSubscription;
    if (context.services.payees?.update) {
      await context.services.payees.update(entityId, { isSubscription }, context);
    }

    return {
      actionType: "setIsSubscription",
      success: true,
      changes: { isSubscription: { from: previousValue, to: isSubscription } },
    };
  },

  mergePayee: async (params, entity, entityId, context) => {
    const targetPayeeId = params.targetPayeeId as number;
    if (!entityId) {
      return { actionType: "mergePayee", success: false, error: "No entity ID" };
    }

    if (context.services.payees?.merge) {
      await context.services.payees.merge(entityId, targetPayeeId, context);
    }

    return {
      actionType: "mergePayee",
      success: true,
      changes: { mergedInto: { from: null, to: targetPayeeId } },
    };
  },

  createPayeeAliasFromPayee: async (params, entity, entityId, context) => {
    const aliasName = params.aliasName as string;
    if (!entityId) {
      return { actionType: "createPayeeAliasFromPayee", success: false, error: "No entity ID" };
    }

    if (context.services.payees?.createAlias) {
      await context.services.payees.createAlias(aliasName, entityId, context);
    }

    return {
      actionType: "createPayeeAliasFromPayee",
      success: true,
      changes: { alias: { from: null, to: aliasName } },
    };
  },

  // Category actions
  setCategoryHidden: async (params, entity, entityId, context) => {
    const isHidden = params.isHidden as boolean;
    if (!entityId) {
      return { actionType: "setCategoryHidden", success: false, error: "No entity ID" };
    }

    const previousValue = entity.isHidden;
    if (context.services.categories?.update) {
      await context.services.categories.update(entityId, { isHidden }, context);
    }

    return {
      actionType: "setCategoryHidden",
      success: true,
      changes: { isHidden: { from: previousValue, to: isHidden } },
    };
  },

  setCategoryTaxDeductible: async (params, entity, entityId, context) => {
    const isTaxDeductible = params.isTaxDeductible as boolean;
    if (!entityId) {
      return { actionType: "setCategoryTaxDeductible", success: false, error: "No entity ID" };
    }

    const previousValue = entity.isTaxDeductible;
    if (context.services.categories?.update) {
      await context.services.categories.update(entityId, { isTaxDeductible }, context);
    }

    return {
      actionType: "setCategoryTaxDeductible",
      success: true,
      changes: { isTaxDeductible: { from: previousValue, to: isTaxDeductible } },
    };
  },

  moveCategoryToGroup: async (params, entity, entityId, context) => {
    const groupId = params.groupId as number;
    if (!entityId) {
      return { actionType: "moveCategoryToGroup", success: false, error: "No entity ID" };
    }

    const previousValue = entity.groupId;
    if (context.services.categories?.moveToGroup) {
      await context.services.categories.moveToGroup(entityId, groupId, context);
    }

    return {
      actionType: "moveCategoryToGroup",
      success: true,
      changes: { groupId: { from: previousValue, to: groupId } },
    };
  },

  // Schedule actions
  enableScheduleAutoAdd: async (params, entity, entityId, context) => {
    const autoAdd = params.autoAdd as boolean;
    if (!entityId) {
      return { actionType: "enableScheduleAutoAdd", success: false, error: "No entity ID" };
    }

    const previousValue = entity.autoAdd;
    if (context.services.schedules?.update) {
      await context.services.schedules.update(entityId, { autoAdd }, context);
    }

    return {
      actionType: "enableScheduleAutoAdd",
      success: true,
      changes: { autoAdd: { from: previousValue, to: autoAdd } },
    };
  },

  skipSchedule: async (params, entity, entityId, context) => {
    const reason = params.reason as string | undefined;
    if (!entityId) {
      return { actionType: "skipSchedule", success: false, error: "No entity ID" };
    }

    if (context.services.schedules?.skip) {
      await context.services.schedules.skip(entityId, reason, context);
    }

    return {
      actionType: "skipSchedule",
      success: true,
      changes: { skipped: { from: false, to: true } },
    };
  },

  adjustScheduleAmount: async (params, entity, entityId, context) => {
    const amount = params.amount as number;
    if (!entityId) {
      return { actionType: "adjustScheduleAmount", success: false, error: "No entity ID" };
    }

    const previousValue = entity.amount;
    if (context.services.schedules?.update) {
      await context.services.schedules.update(entityId, { amount }, context);
    }

    return {
      actionType: "adjustScheduleAmount",
      success: true,
      changes: { amount: { from: previousValue, to: amount } },
    };
  },

  pauseSchedule: async (params, entity, entityId, context) => {
    if (!entityId) {
      return { actionType: "pauseSchedule", success: false, error: "No entity ID" };
    }

    if (context.services.schedules?.pause) {
      await context.services.schedules.pause(entityId, context);
    }

    return {
      actionType: "pauseSchedule",
      success: true,
      changes: { isPaused: { from: false, to: true } },
    };
  },

  resumeSchedule: async (params, entity, entityId, context) => {
    if (!entityId) {
      return { actionType: "resumeSchedule", success: false, error: "No entity ID" };
    }

    if (context.services.schedules?.resume) {
      await context.services.schedules.resume(entityId, context);
    }

    return {
      actionType: "resumeSchedule",
      success: true,
      changes: { isPaused: { from: true, to: false } },
    };
  },

  // Budget actions
  adjustBudgetLimit: async (params, entity, entityId, context) => {
    const amount = params.amount as number;
    if (!entityId) {
      return { actionType: "adjustBudgetLimit", success: false, error: "No entity ID" };
    }

    const previousValue = entity.targetAmount;
    if (context.services.budgets?.update) {
      await context.services.budgets.update(entityId, { targetAmount: amount }, context);
    }

    return {
      actionType: "adjustBudgetLimit",
      success: true,
      changes: { targetAmount: { from: previousValue, to: amount } },
    };
  },

  rolloverBudget: async (params, entity, entityId, context) => {
    if (!entityId) {
      return { actionType: "rolloverBudget", success: false, error: "No entity ID" };
    }

    if (context.services.budgets?.rollover) {
      await context.services.budgets.rollover(entityId, context);
    }

    return {
      actionType: "rolloverBudget",
      success: true,
    };
  },

  pauseBudget: async (params, entity, entityId, context) => {
    if (!entityId) {
      return { actionType: "pauseBudget", success: false, error: "No entity ID" };
    }

    if (context.services.budgets?.pause) {
      await context.services.budgets.pause(entityId, context);
    }

    return {
      actionType: "pauseBudget",
      success: true,
      changes: { status: { from: "active", to: "paused" } },
    };
  },

  // Universal actions
  sendNotification: async (params, entity, entityId, context) => {
    const message = interpolateMessage(params.message as string, entity);

    if (context.services.notifications?.send) {
      await context.services.notifications.send({
        userId: context.userId,
        message,
        type: "automation",
        entityType: context.entityType,
        entityId,
      });
    }

    return {
      actionType: "sendNotification",
      success: true,
      changes: { notification: { from: null, to: message } },
    };
  },
};

/**
 * Interpolate template variables in a message
 * Supports {{field}} syntax for accessing entity fields
 */
function interpolateMessage(template: string, entity: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path) => {
    const parts = path.split(".");
    let value: unknown = entity;
    for (const part of parts) {
      if (value === null || value === undefined || typeof value !== "object") {
        return `{{${path}}}`;
      }
      value = (value as Record<string, unknown>)[part];
    }
    return String(value ?? `{{${path}}}`);
  });
}

/**
 * Get action definition by type (for validation)
 */
function getActionDefinition(type: string) {
  // Import from types to avoid circular dependency
  const { actionDefinitions } = require("$lib/types/automation");
  return actionDefinitions.find((d: { type: string }) => d.type === type);
}

// =============================================================================
// Types
// =============================================================================

/**
 * Context provided during action execution
 */
export interface ActionExecutionContext {
  db: DatabaseConnection;
  workspaceId: number;
  userId?: string;
  entityType: string;
  dryRun?: boolean;
  services: {
    transactions: TransactionService;
    accounts?: AccountService;
    payees?: PayeeService;
    categories?: CategoryService;
    schedules?: ScheduleService;
    budgets?: BudgetService;
    notifications?: NotificationService;
  };
}

// Service interfaces (minimal for action execution)
interface TransactionService {
  update: (id: number, data: Record<string, unknown>, context: ActionExecutionContext) => Promise<void>;
}

interface AccountService {
  update?: (id: number, data: Record<string, unknown>, context: ActionExecutionContext) => Promise<void>;
  close?: (id: number, context: ActionExecutionContext) => Promise<void>;
}

interface PayeeService {
  update?: (id: number, data: Record<string, unknown>, context: ActionExecutionContext) => Promise<void>;
  merge?: (sourceId: number, targetId: number, context: ActionExecutionContext) => Promise<void>;
  createAlias?: (name: string, payeeId: number, context: ActionExecutionContext) => Promise<void>;
}

interface CategoryService {
  update?: (id: number, data: Record<string, unknown>, context: ActionExecutionContext) => Promise<void>;
  moveToGroup?: (id: number, groupId: number, context: ActionExecutionContext) => Promise<void>;
  createAlias?: (name: string, categoryId: number, context: ActionExecutionContext) => Promise<void>;
}

interface ScheduleService {
  update?: (id: number, data: Record<string, unknown>, context: ActionExecutionContext) => Promise<void>;
  skip?: (id: number, reason: string | undefined, context: ActionExecutionContext) => Promise<void>;
  pause?: (id: number, context: ActionExecutionContext) => Promise<void>;
  resume?: (id: number, context: ActionExecutionContext) => Promise<void>;
}

interface BudgetService {
  update?: (id: number, data: Record<string, unknown>, context: ActionExecutionContext) => Promise<void>;
  assignTransaction?: (transactionId: number, budgetId: number, context: ActionExecutionContext) => Promise<void>;
  rollover?: (id: number, context: ActionExecutionContext) => Promise<void>;
  pause?: (id: number, context: ActionExecutionContext) => Promise<void>;
}

interface NotificationService {
  send?: (notification: {
    userId?: string;
    message: string;
    type: string;
    entityType: string;
    entityId?: number;
  }) => Promise<void>;
}
