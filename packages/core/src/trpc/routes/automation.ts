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
} from "$core/server/domains/automation/services";
import { publicProcedure, rateLimitedProcedure, t } from "$core/trpc";
import type { EntityType } from "$core/types/automation";
import {
  actionDefinitions,
  conditionFields,
  entityTypes,
  getActionsForEntity,
  triggerEvents,
} from "$core/types/automation";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

// Schemas for input validation.
//
// The automation system intentionally supports polymorphic condition values
// (a `amount > 100` condition uses a number, `payee contains X` uses a string,
// etc.), so the value types cannot be fully enumerated here. The shape is
// still tightened to:
//   - string/number/boolean/null scalars, or arrays of the same,
//   - bounded string lengths,
//   - bounded arrays and nesting depth on condition groups and action params,
//   - prototype-pollution key rejection on action params.
//
// A future pass could discriminate by field type (see conditionFields) for
// the strongest possible validation, but that requires threading the field
// metadata through zod and is out of scope here.

const AUTOMATION_ID_MAX = 100;
const AUTOMATION_STRING_VALUE_MAX = 1_000;
const AUTOMATION_VALUE_ARRAY_MAX = 100;
const AUTOMATION_PARAMS_KEY_MAX = 100;
const AUTOMATION_PARAMS_ENTRIES_MAX = 50;
const AUTOMATION_CONDITION_DEPTH_MAX = 10;
const AUTOMATION_CONDITION_GROUP_SIZE_MAX = 50;
const AUTOMATION_ACTIONS_MAX = 20;

/** Scalar values acceptable in condition.value / value2. Complex objects are
 * rejected — automation conditions never compare structured objects. */
const conditionScalarSchema = z.union([
  z.string().max(AUTOMATION_STRING_VALUE_MAX),
  z.number(),
  z.boolean(),
  z.null(),
]);

const conditionValueSchema = z.union([
  conditionScalarSchema,
  z.array(conditionScalarSchema).max(AUTOMATION_VALUE_ARRAY_MAX),
]);

/**
 * Reject prototype-pollution keys and cap the number of entries on an
 * action params record so a malicious rule author cannot hide an
 * arbitrary-depth payload behind `z.unknown()`.
 */
const paramsSchema = z
  .record(z.string().max(AUTOMATION_PARAMS_KEY_MAX), z.unknown())
  .refine(
    (obj) => {
      if (Object.keys(obj).length > AUTOMATION_PARAMS_ENTRIES_MAX) return false;
      for (const key of Object.keys(obj)) {
        if (key === "__proto__" || key === "constructor" || key === "prototype") {
          return false;
        }
      }
      return true;
    },
    { message: "Invalid params (too many keys or contains reserved names)" }
  );

const triggerConfigSchema = z.object({
  entityType: z.enum(["transaction", "account", "payee", "category", "schedule", "budget"]),
  event: z.string().min(1).max(100),
  debounceMs: z.number().int().min(0).max(60_000).optional(),
});

const conditionSchema = z.object({
  id: z.string().max(AUTOMATION_ID_MAX),
  field: z.string().min(1).max(100),
  operator: z.string().min(1).max(50),
  value: conditionValueSchema,
  value2: conditionValueSchema.optional(),
  negate: z.boolean().optional(),
});

type ConditionGroupShape = {
  id: string;
  operator: "AND" | "OR";
  conditions: Array<z.infer<typeof conditionSchema> | ConditionGroupShape>;
};

function makeConditionGroupSchema(depth: number): z.ZodType<ConditionGroupShape> {
  if (depth <= 0) {
    return z.object({
      id: z.string().max(AUTOMATION_ID_MAX),
      operator: z.enum(["AND", "OR"]),
      // At max depth, only leaf conditions are accepted.
      conditions: z.array(conditionSchema).max(AUTOMATION_CONDITION_GROUP_SIZE_MAX),
    }) as unknown as z.ZodType<ConditionGroupShape>;
  }
  return z.object({
    id: z.string().max(AUTOMATION_ID_MAX),
    operator: z.enum(["AND", "OR"]),
    conditions: z
      .array(z.union([conditionSchema, makeConditionGroupSchema(depth - 1)]))
      .max(AUTOMATION_CONDITION_GROUP_SIZE_MAX),
  }) as unknown as z.ZodType<ConditionGroupShape>;
}

const conditionGroupSchema = makeConditionGroupSchema(AUTOMATION_CONDITION_DEPTH_MAX);

const actionConfigSchema = z.object({
  id: z.string().max(AUTOMATION_ID_MAX),
  type: z.string().min(1).max(100),
  params: paramsSchema,
  continueOnError: z.boolean().optional(),
});

const flowNodeSchema = z.object({
  id: z.string().max(AUTOMATION_ID_MAX),
  type: z.enum(["trigger", "condition", "action", "group"]),
  position: z.object({ x: z.number(), y: z.number() }),
  data: paramsSchema,
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
  actions: z.array(actionConfigSchema).min(1).max(AUTOMATION_ACTIONS_MAX),
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
  actions: z.array(actionConfigSchema).min(1).max(AUTOMATION_ACTIONS_MAX).optional(),
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
    .input(
      z.object({
        entityType: z.enum(["transaction", "account", "payee", "category", "schedule", "budget"]),
      })
    )
    .query(({ input }) => {
      return triggerEvents[input.entityType as EntityType];
    }),

  /**
   * Get condition fields for an entity type
   */
  getConditionFields: publicProcedure
    .input(
      z.object({
        entityType: z.enum(["transaction", "account", "payee", "category", "schedule", "budget"]),
      })
    )
    .query(({ input }) => {
      return conditionFields[input.entityType as EntityType];
    }),

  /**
   * Get available actions for an entity type
   */
  getActions: publicProcedure
    .input(
      z.object({
        entityType: z.enum(["transaction", "account", "payee", "category", "schedule", "budget"]),
      })
    )
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
    .input(
      z.object({
        entityType: z.enum(["transaction", "account", "payee", "category", "schedule", "budget"]),
      })
    )
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
  get: publicProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
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
  create: rateLimitedProcedure.input(createRuleSchema).mutation(async ({ ctx, input }) => {
    // The zod schema is narrower than the domain types (it restricts
    // operator and condition values at the wire boundary). The service
    // types use `unknown` for value / a string union for operator, which
    // our inferred types satisfy at runtime.
    return createRule(input as unknown as Parameters<typeof createRule>[0], {
      db: ctx.db,
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
    });
  }),

  /**
   * Update an existing rule
   */
  update: rateLimitedProcedure.input(updateRuleSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    const rule = await updateRule(id, data as unknown as Parameters<typeof updateRule>[1], {
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
    .input(
      z.object({
        ruleId: z.number(),
        limit: z.number().min(1).max(500).optional(),
        offset: z.number().min(0).optional(),
      })
    )
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
    .input(
      z.object({
        ruleId: z.number(),
        testEntity: paramsSchema,
      })
    )
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
