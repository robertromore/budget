/**
 * Automation tRPC Routes
 *
 * API endpoints for managing automation rules.
 */

import {
  cleanupOldLogs,
  createRule,
  deleteRule,
  disableRule,
  duplicateRule,
  enableRule,
  getRecentLogs,
  getRule,
  getRuleLogs,
  getRuleLogStats,
  getRules,
  getRulesByAccountId,
  getRulesByEntityType,
  testRule,
  updateRule,
} from "$lib/server/domains/automation/services";
import { publicProcedure, rateLimitedProcedure, t } from "$lib/trpc";
import type { EntityType } from "$lib/types/automation";
import {
  actionDefinitions,
  conditionFields,
  entityTypes,
  getActionsForEntity,
  triggerEvents,
} from "$lib/types/automation";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

// Schemas for input validation
const triggerConfigSchema = z.object({
  entityType: z.enum(["transaction", "account", "payee", "category", "schedule", "budget"]),
  event: z.string().min(1),
  debounceMs: z.number().optional(),
});

const conditionSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string(),
    field: z.string(),
    operator: z.string(),
    value: z.unknown(),
    value2: z.unknown().optional(),
    negate: z.boolean().optional(),
  })
);

const conditionGroupSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string(),
    operator: z.enum(["AND", "OR"]),
    conditions: z.array(z.union([conditionSchema, conditionGroupSchema])),
  })
);

const actionConfigSchema = z.object({
  id: z.string(),
  type: z.string().min(1),
  params: z.record(z.string(), z.unknown()),
  continueOnError: z.boolean().optional(),
});

const flowNodeSchema = z.object({
  id: z.string(),
  type: z.enum(["trigger", "condition", "action", "group"]),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.record(z.string(), z.unknown()),
});

const flowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
});

const flowStateSchema = z.object({
  nodes: z.array(flowNodeSchema),
  edges: z.array(flowEdgeSchema),
  viewport: z.object({ x: z.number(), y: z.number(), zoom: z.number() }).optional(),
});

const createRuleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isEnabled: z.boolean().optional(),
  priority: z.number().min(-1000).max(1000).optional(),
  trigger: triggerConfigSchema,
  conditions: conditionGroupSchema,
  actions: z.array(actionConfigSchema).min(1),
  flowState: flowStateSchema.optional(),
  stopOnMatch: z.boolean().optional(),
  runOnce: z.boolean().optional(),
});

const updateRuleSchema = z.object({
  id: z.number(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  isEnabled: z.boolean().optional(),
  priority: z.number().min(-1000).max(1000).optional(),
  trigger: triggerConfigSchema.optional(),
  conditions: conditionGroupSchema.optional(),
  actions: z.array(actionConfigSchema).min(1).optional(),
  flowState: flowStateSchema.optional().nullable(),
  stopOnMatch: z.boolean().optional(),
  runOnce: z.boolean().optional(),
});

export const automationRoutes = t.router({
  // ==========================================================================
  // Metadata Routes (for UI)
  // ==========================================================================

  /**
   * Get available entity types
   */
  getEntityTypes: publicProcedure.query(() => {
    return entityTypes;
  }),

  /**
   * Get trigger events for an entity type
   */
  getTriggerEvents: publicProcedure
    .input(z.object({ entityType: z.enum(["transaction", "account", "payee", "category", "schedule", "budget"]) }))
    .query(({ input }) => {
      return triggerEvents[input.entityType as EntityType];
    }),

  /**
   * Get condition fields for an entity type
   */
  getConditionFields: publicProcedure
    .input(z.object({ entityType: z.enum(["transaction", "account", "payee", "category", "schedule", "budget"]) }))
    .query(({ input }) => {
      return conditionFields[input.entityType as EntityType];
    }),

  /**
   * Get available actions for an entity type
   */
  getActions: publicProcedure
    .input(z.object({ entityType: z.enum(["transaction", "account", "payee", "category", "schedule", "budget"]) }))
    .query(({ input }) => {
      return getActionsForEntity(input.entityType as EntityType);
    }),

  /**
   * Get all action definitions
   */
  getAllActions: publicProcedure.query(() => {
    return actionDefinitions;
  }),

  // ==========================================================================
  // CRUD Routes
  // ==========================================================================

  /**
   * Get all rules for the workspace
   */
  list: publicProcedure.query(async ({ ctx }) => {
    return getRules({
      db: ctx.db,
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
    });
  }),

  /**
   * Get rules by entity type
   */
  listByEntityType: publicProcedure
    .input(z.object({ entityType: z.enum(["transaction", "account", "payee", "category", "schedule", "budget"]) }))
    .query(async ({ ctx, input }) => {
      return getRulesByEntityType(input.entityType as EntityType, {
        db: ctx.db,
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
      });
    }),

  /**
   * Get rules that apply to a specific account
   * Filters transaction rules that have an accountId condition matching the given account
   */
  listByAccountId: publicProcedure
    .input(z.object({ accountId: z.number() }))
    .query(async ({ ctx, input }) => {
      return getRulesByAccountId(input.accountId, {
        db: ctx.db,
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
      });
    }),

  /**
   * Get a single rule by ID
   */
  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const rule = await getRule(input.id, {
        db: ctx.db,
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
      });

      if (!rule) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rule not found",
        });
      }

      return rule;
    }),

  /**
   * Create a new rule
   */
  create: rateLimitedProcedure
    .input(createRuleSchema)
    .mutation(async ({ ctx, input }) => {
      return createRule(input, {
        db: ctx.db,
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
      });
    }),

  /**
   * Update an existing rule
   */
  update: rateLimitedProcedure
    .input(updateRuleSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const rule = await updateRule(id, data, {
        db: ctx.db,
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
      });

      if (!rule) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rule not found",
        });
      }

      return rule;
    }),

  /**
   * Delete a rule
   */
  delete: rateLimitedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const success = await deleteRule(input.id, {
        db: ctx.db,
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
      });

      if (!success) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rule not found",
        });
      }

      return { success: true };
    }),

  /**
   * Enable a rule
   */
  enable: rateLimitedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const rule = await enableRule(input.id, {
        db: ctx.db,
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
      });

      if (!rule) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rule not found",
        });
      }

      return rule;
    }),

  /**
   * Disable a rule
   */
  disable: rateLimitedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const rule = await disableRule(input.id, {
        db: ctx.db,
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
      });

      if (!rule) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rule not found",
        });
      }

      return rule;
    }),

  /**
   * Duplicate a rule
   */
  duplicate: rateLimitedProcedure
    .input(z.object({ id: z.number(), newName: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const rule = await duplicateRule(input.id, input.newName, {
        db: ctx.db,
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
      });

      if (!rule) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rule not found",
        });
      }

      return rule;
    }),

  // ==========================================================================
  // Logs Routes
  // ==========================================================================

  /**
   * Get logs for a specific rule
   */
  getLogs: publicProcedure
    .input(z.object({
      ruleId: z.number(),
      limit: z.number().min(1).max(500).optional(),
      offset: z.number().min(0).optional(),
    }))
    .query(async ({ ctx, input }) => {
      return getRuleLogs(
        input.ruleId,
        { limit: input.limit, offset: input.offset },
        {
          db: ctx.db,
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
        }
      );
    }),

  /**
   * Get recent logs for the workspace
   */
  getRecentLogs: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(500).optional() }))
    .query(async ({ ctx, input }) => {
      return getRecentLogs(
        { limit: input.limit },
        {
          db: ctx.db,
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
        }
      );
    }),

  /**
   * Get log statistics for a rule
   */
  getLogStats: publicProcedure
    .input(z.object({ ruleId: z.number() }))
    .query(async ({ ctx, input }) => {
      return getRuleLogStats(input.ruleId, {
        db: ctx.db,
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
      });
    }),

  /**
   * Clean up old logs
   */
  cleanupLogs: rateLimitedProcedure
    .input(z.object({ daysToKeep: z.number().min(1).max(365).optional() }))
    .mutation(async ({ ctx, input }) => {
      const count = await cleanupOldLogs(input.daysToKeep ?? 30, {
        db: ctx.db,
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
      });
      return { deletedCount: count };
    }),

  // ==========================================================================
  // Testing Routes
  // ==========================================================================

  /**
   * Test a rule against sample data (dry run)
   */
  testRule: publicProcedure
    .input(z.object({
      ruleId: z.number(),
      testEntity: z.record(z.string(), z.unknown()),
    }))
    .mutation(async ({ ctx, input }) => {
      // Create minimal services for testing
      const services = {
        transactions: {
          update: async () => {},
        },
      };

      return testRule(
        input.ruleId,
        input.testEntity,
        {
          db: ctx.db,
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
        },
        services
      );
    }),
});
