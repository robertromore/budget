/**
 * Automation Query Layer
 *
 * TanStack Query wrappers for automation rule operations.
 */

import { trpc } from "$lib/trpc/client";
import type { ActionConfig, ConditionGroup, EntityType, FlowState, TriggerConfig } from "$lib/types/automation";
import { queryClient } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

/**
 * Query Keys for automation operations
 */
export const automationKeys = createQueryKeys("automation", {
  lists: () => ["automation", "list"] as const,
  list: () => ["automation", "list"] as const,
  byEntityType: (entityType: EntityType) => ["automation", "entity", entityType] as const,
  details: () => ["automation", "detail"] as const,
  detail: (id: number) => ["automation", "detail", id] as const,
  logs: (ruleId: number) => ["automation", "logs", ruleId] as const,
  recentLogs: () => ["automation", "logs", "recent"] as const,
  logStats: (ruleId: number) => ["automation", "stats", ruleId] as const,
  // Metadata
  entityTypes: () => ["automation", "meta", "entityTypes"] as const,
  triggerEvents: (entityType: EntityType) => ["automation", "meta", "triggers", entityType] as const,
  conditionFields: (entityType: EntityType) => ["automation", "meta", "conditions", entityType] as const,
  actions: (entityType: EntityType) => ["automation", "meta", "actions", entityType] as const,
  allActions: () => ["automation", "meta", "actions"] as const,
});

// =============================================================================
// Metadata Queries
// =============================================================================

/**
 * Get available entity types
 */
export const getEntityTypes = () =>
  defineQuery({
    queryKey: automationKeys.entityTypes(),
    queryFn: () => trpc().automationRoutes.getEntityTypes.query(),
    options: { staleTime: Infinity }, // Static data
  });

/**
 * Get trigger events for an entity type
 */
export const getTriggerEvents = (entityType: EntityType) =>
  defineQuery({
    queryKey: automationKeys.triggerEvents(entityType),
    queryFn: () => trpc().automationRoutes.getTriggerEvents.query({ entityType }),
    options: { staleTime: Infinity }, // Static data
  });

/**
 * Get condition fields for an entity type
 */
export const getConditionFields = (entityType: EntityType) =>
  defineQuery({
    queryKey: automationKeys.conditionFields(entityType),
    queryFn: () => trpc().automationRoutes.getConditionFields.query({ entityType }),
    options: { staleTime: Infinity }, // Static data
  });

/**
 * Get available actions for an entity type
 */
export const getActions = (entityType: EntityType) =>
  defineQuery({
    queryKey: automationKeys.actions(entityType),
    queryFn: () => trpc().automationRoutes.getActions.query({ entityType }),
    options: { staleTime: Infinity }, // Static data
  });

/**
 * Get all action definitions
 */
export const getAllActions = () =>
  defineQuery({
    queryKey: automationKeys.allActions(),
    queryFn: () => trpc().automationRoutes.getAllActions.query(),
    options: { staleTime: Infinity }, // Static data
  });

// =============================================================================
// CRUD Queries
// =============================================================================

/**
 * Get all automation rules
 */
export const getAll = () =>
  defineQuery({
    queryKey: automationKeys.list(),
    queryFn: () => trpc().automationRoutes.list.query(),
  });

/**
 * Get rules by entity type
 */
export const getByEntityType = (entityType: EntityType) =>
  defineQuery({
    queryKey: automationKeys.byEntityType(entityType),
    queryFn: () => trpc().automationRoutes.listByEntityType.query({ entityType }),
  });

/**
 * Get a single rule by ID
 */
export const getById = (id: number) =>
  defineQuery({
    queryKey: automationKeys.detail(id),
    queryFn: () => trpc().automationRoutes.get.query({ id }),
  });

/**
 * Create a new rule
 */
export interface CreateRuleInput {
  name: string;
  description?: string;
  isEnabled?: boolean;
  priority?: number;
  trigger: TriggerConfig;
  conditions: ConditionGroup;
  actions: ActionConfig[];
  flowState?: FlowState;
  stopOnMatch?: boolean;
  runOnce?: boolean;
}

export const createRule = defineMutation({
  mutationFn: (input: CreateRuleInput) => trpc().automationRoutes.create.mutate(input),
  onSuccess: (newRule) => {
    queryClient.invalidateQueries({ queryKey: automationKeys.lists() });
    queryClient.setQueryData(automationKeys.detail(newRule.id), newRule);
  },
  successMessage: "Rule created",
  errorMessage: "Failed to create rule",
});

/**
 * Update an existing rule
 */
export interface UpdateRuleInput {
  id: number;
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

export const updateRule = defineMutation({
  mutationFn: (input: UpdateRuleInput) => trpc().automationRoutes.update.mutate(input),
  onSuccess: (updatedRule, variables) => {
    queryClient.setQueryData(automationKeys.detail(variables.id), updatedRule);
    queryClient.invalidateQueries({ queryKey: automationKeys.lists() });
  },
  successMessage: "Rule updated",
  errorMessage: "Failed to update rule",
});

/**
 * Delete a rule
 */
export const deleteRule = defineMutation<number, { success: boolean }>({
  mutationFn: (id) => trpc().automationRoutes.delete.mutate({ id }),
  onSuccess: (_data, id) => {
    queryClient.removeQueries({ queryKey: automationKeys.detail(id) });
    queryClient.invalidateQueries({ queryKey: automationKeys.lists() });
    // Also invalidate logs for this rule
    queryClient.removeQueries({ queryKey: automationKeys.logs(id) });
    queryClient.removeQueries({ queryKey: automationKeys.logStats(id) });
  },
  successMessage: "Rule deleted",
  errorMessage: "Failed to delete rule",
});

/**
 * Enable a rule
 */
export const enableRule = defineMutation({
  mutationFn: (id: number) => trpc().automationRoutes.enable.mutate({ id }),
  onSuccess: (updatedRule, id) => {
    queryClient.setQueryData(automationKeys.detail(id), updatedRule);
    queryClient.invalidateQueries({ queryKey: automationKeys.lists() });
  },
  successMessage: "Rule enabled",
  errorMessage: "Failed to enable rule",
});

/**
 * Disable a rule
 */
export const disableRule = defineMutation({
  mutationFn: (id: number) => trpc().automationRoutes.disable.mutate({ id }),
  onSuccess: (updatedRule, id) => {
    queryClient.setQueryData(automationKeys.detail(id), updatedRule);
    queryClient.invalidateQueries({ queryKey: automationKeys.lists() });
  },
  successMessage: "Rule disabled",
  errorMessage: "Failed to disable rule",
});

/**
 * Duplicate a rule
 */
export const duplicateRule = defineMutation({
  mutationFn: ({ id, newName }: { id: number; newName?: string }) => trpc().automationRoutes.duplicate.mutate({ id, newName }),
  onSuccess: (newRule) => {
    queryClient.invalidateQueries({ queryKey: automationKeys.lists() });
    queryClient.setQueryData(automationKeys.detail(newRule.id), newRule);
  },
  successMessage: "Rule duplicated",
  errorMessage: "Failed to duplicate rule",
});

// =============================================================================
// Log Queries
// =============================================================================

/**
 * Get logs for a specific rule
 */
export const getLogs = (ruleId: number, options?: { limit?: number; offset?: number }) =>
  defineQuery({
    queryKey: [...automationKeys.logs(ruleId), options] as const,
    queryFn: () =>
      trpc().automationRoutes.getLogs.query({
        ruleId,
        limit: options?.limit,
        offset: options?.offset,
      }),
  });

/**
 * Get recent logs for the workspace
 */
export const getRecentLogs = (limit?: number) =>
  defineQuery({
    queryKey: [...automationKeys.recentLogs(), limit] as const,
    queryFn: () => trpc().automationRoutes.getRecentLogs.query({ limit }),
  });

/**
 * Get log statistics for a rule
 */
export const getLogStats = (ruleId: number) =>
  defineQuery({
    queryKey: automationKeys.logStats(ruleId),
    queryFn: () => trpc().automationRoutes.getLogStats.query({ ruleId }),
  });

/**
 * Clean up old logs
 */
export const cleanupLogs = defineMutation<{ daysToKeep?: number }, { deletedCount: number }>({
  mutationFn: (input) => trpc().automationRoutes.cleanupLogs.mutate(input),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["automation", "logs"] });
  },
  successMessage: "Logs cleaned up",
  errorMessage: "Failed to clean up logs",
});

// =============================================================================
// Testing Queries
// =============================================================================

/**
 * Test a rule against sample data (dry run)
 */
export const testRule = defineMutation<
  { ruleId: number; testEntity: Record<string, unknown> },
  { matched: boolean; actions: Array<{ type: string; wouldExecute: boolean }> }
>({
  mutationFn: (input) => trpc().automationRoutes.testRule.mutate(input),
});
