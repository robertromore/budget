/**
 * Automation tRPC Routes Integration Tests
 *
 * Tests for the automation API endpoints.
 * Uses in-memory SQLite for isolated testing.
 *
 * NOTE: These tests use a minimal tRPC setup to avoid SvelteKit-specific
 * module imports ($env/dynamic/private) that aren't available in bun:test.
 * The services layer tests provide comprehensive coverage of the business logic.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { setupTestDb, clearTestDb } from "../setup/test-db";
import { workspaces } from "../../../src/lib/schema/workspaces";
import { AutomationRepository } from "../../../src/lib/server/domains/automation/repository";
import {
  createRule,
  updateRule,
  getRule,
  getRules,
  getRulesByEntityType,
  deleteRule,
  enableRule,
  disableRule,
  duplicateRule,
  getRuleLogs,
  getRecentLogs,
  getRuleLogStats,
  cleanupOldLogs,
  testRule,
  type AutomationContext,
} from "../../../src/lib/server/domains/automation/services";
import {
  entityTypes,
  triggerEvents,
  conditionFields,
  actionDefinitions,
  getActionsForEntity,
} from "../../../src/lib/types/automation";
import { z } from "zod";

// Zod schemas from the routes (copied here to test validation)
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

const createRuleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isEnabled: z.boolean().optional(),
  priority: z.number().min(-1000).max(1000).optional(),
  trigger: triggerConfigSchema,
  conditions: conditionGroupSchema,
  actions: z.array(actionConfigSchema).min(1),
  stopOnMatch: z.boolean().optional(),
  runOnce: z.boolean().optional(),
});

// Test helpers
function createValidRuleInput() {
  return {
    name: "Test Rule",
    trigger: {
      entityType: "transaction" as const,
      event: "created",
    },
    conditions: {
      id: "group-1",
      operator: "AND" as const,
      conditions: [{ id: "cond-1", field: "amount", operator: "greaterThan", value: 100 }],
    },
    actions: [{ id: "action-1", type: "setCategory", params: { categoryId: 1 } }],
  };
}

describe("Automation tRPC Routes Integration Tests", () => {
  let db: Awaited<ReturnType<typeof setupTestDb>>;
  let workspaceId: number;
  let context: AutomationContext;

  beforeEach(async () => {
    db = await setupTestDb();

    // Create a test workspace
    const [workspace] = await db
      .insert(workspaces)
      .values({
        displayName: "Test Workspace",
        slug: "test-workspace-trpc",
      })
      .returning();
    workspaceId = workspace.id;

    context = { db, workspaceId };
  });

  afterEach(async () => {
    if (db) {
      await clearTestDb(db);
    }
  });

  // ==========================================================================
  // Metadata Routes (Static data, no DB needed)
  // ==========================================================================

  describe("Metadata Routes", () => {
    describe("getEntityTypes", () => {
      it("should return all entity types", () => {
        expect(entityTypes).toBeArray();
        expect(entityTypes.length).toBeGreaterThanOrEqual(6);
        expect(entityTypes.map((t) => t.value)).toContain("transaction");
        expect(entityTypes.map((t) => t.value)).toContain("account");
      });
    });

    describe("getTriggerEvents", () => {
      it("should return events for transaction entity", () => {
        const events = triggerEvents.transaction;

        expect(events).toBeArray();
        expect(events.map((e) => e.event)).toContain("created");
        expect(events.map((e) => e.event)).toContain("updated");
      });

      it("should return events for account entity", () => {
        const events = triggerEvents.account;

        expect(events).toBeArray();
        expect(events.map((e) => e.event)).toContain("created");
        expect(events.map((e) => e.event)).toContain("balanceChanged");
      });
    });

    describe("getConditionFields", () => {
      it("should return fields for transaction entity", () => {
        const fields = conditionFields.transaction;

        expect(fields).toBeArray();
        expect(fields.map((f) => f.field)).toContain("amount");
        expect(fields.map((f) => f.field)).toContain("date");
        expect(fields.map((f) => f.field)).toContain("status");
      });
    });

    describe("getActions", () => {
      it("should return actions for transaction entity", () => {
        const actions = getActionsForEntity("transaction");

        expect(actions).toBeArray();
        expect(actions.map((a) => a.type)).toContain("setCategory");
        expect(actions.map((a) => a.type)).toContain("setPayee");
      });

      it("should return different actions for different entities", () => {
        const transactionActions = getActionsForEntity("transaction");
        const accountActions = getActionsForEntity("account");

        expect(transactionActions.map((a) => a.type)).toContain("setCategory");
        expect(accountActions.map((a) => a.type)).toContain("closeAccount");
        expect(accountActions.map((a) => a.type)).not.toContain("setCategory");
      });
    });

    describe("getAllActions", () => {
      it("should return all action definitions", () => {
        expect(actionDefinitions).toBeArray();
        expect(actionDefinitions.length).toBeGreaterThan(10);
        expect(actionDefinitions[0]).toHaveProperty("type");
        expect(actionDefinitions[0]).toHaveProperty("label");
        expect(actionDefinitions[0]).toHaveProperty("entityTypes");
      });
    });
  });

  // ==========================================================================
  // Input Validation (Zod schemas)
  // ==========================================================================

  describe("Input Validation", () => {
    describe("createRuleSchema", () => {
      it("should accept valid input", () => {
        const input = createValidRuleInput();
        const result = createRuleSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it("should reject empty name", () => {
        const input = { ...createValidRuleInput(), name: "" };
        const result = createRuleSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it("should reject name longer than 100 characters", () => {
        const input = { ...createValidRuleInput(), name: "a".repeat(101) };
        const result = createRuleSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it("should reject priority above 1000", () => {
        const input = { ...createValidRuleInput(), priority: 2000 };
        const result = createRuleSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it("should reject priority below -1000", () => {
        const input = { ...createValidRuleInput(), priority: -2000 };
        const result = createRuleSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it("should reject empty actions array", () => {
        const input = { ...createValidRuleInput(), actions: [] };
        const result = createRuleSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it("should reject invalid entity type", () => {
        const input = {
          ...createValidRuleInput(),
          trigger: { entityType: "invalid", event: "created" },
        };
        const result = createRuleSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it("should reject invalid condition group operator", () => {
        const input = {
          ...createValidRuleInput(),
          conditions: { id: "g", operator: "INVALID", conditions: [] },
        };
        const result = createRuleSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });
  });

  // ==========================================================================
  // CRUD Routes (via services)
  // ==========================================================================

  describe("CRUD Routes", () => {
    describe("create", () => {
      it("should create a new rule", async () => {
        const input = createValidRuleInput();
        const rule = await createRule(input, context);

        expect(rule).toBeDefined();
        expect(rule.id).toBeGreaterThan(0);
        expect(rule.name).toBe("Test Rule");
        expect(rule.isEnabled).toBe(true);
      });

      it("should create a rule with optional fields", async () => {
        const input = {
          ...createValidRuleInput(),
          description: "Test description",
          priority: 10,
          isEnabled: false,
        };

        const rule = await createRule(input, context);

        expect(rule.description).toBe("Test description");
        expect(rule.priority).toBe(10);
        expect(rule.isEnabled).toBe(false);
      });
    });

    describe("list", () => {
      it("should return empty array when no rules exist", async () => {
        const rules = await getRules(context);
        expect(rules).toEqual([]);
      });

      it("should return all rules", async () => {
        await createRule(createValidRuleInput(), context);
        await createRule({ ...createValidRuleInput(), name: "Second Rule" }, context);

        const rules = await getRules(context);

        expect(rules).toHaveLength(2);
      });
    });

    describe("listByEntityType", () => {
      it("should filter rules by entity type", async () => {
        await createRule(createValidRuleInput(), context);
        await createRule({
          ...createValidRuleInput(),
          name: "Account Rule",
          trigger: { entityType: "account", event: "updated" },
        }, context);

        const transactionRules = await getRulesByEntityType("transaction", context);
        const accountRules = await getRulesByEntityType("account", context);

        expect(transactionRules).toHaveLength(1);
        expect(transactionRules[0].name).toBe("Test Rule");
        expect(accountRules).toHaveLength(1);
        expect(accountRules[0].name).toBe("Account Rule");
      });
    });

    describe("get", () => {
      it("should return a rule by ID", async () => {
        const created = await createRule(createValidRuleInput(), context);

        const rule = await getRule(created.id, context);

        expect(rule?.id).toBe(created.id);
        expect(rule?.name).toBe("Test Rule");
      });

      it("should return undefined for non-existent rule", async () => {
        const rule = await getRule(99999, context);
        expect(rule).toBeUndefined();
      });
    });

    describe("update", () => {
      it("should update rule fields", async () => {
        const created = await createRule(createValidRuleInput(), context);

        const updated = await updateRule(
          created.id,
          {
            name: "Updated Name",
            description: "Updated description",
          },
          context
        );

        expect(updated?.name).toBe("Updated Name");
        expect(updated?.description).toBe("Updated description");
      });

      it("should return undefined for non-existent rule", async () => {
        const updated = await updateRule(99999, { name: "Updated" }, context);
        expect(updated).toBeUndefined();
      });
    });

    describe("delete", () => {
      it("should delete a rule", async () => {
        const created = await createRule(createValidRuleInput(), context);

        await deleteRule(created.id, context);

        const found = await getRule(created.id, context);
        expect(found).toBeUndefined();
      });
    });

    describe("enable/disable", () => {
      it("should enable a disabled rule", async () => {
        const created = await createRule(
          { ...createValidRuleInput(), isEnabled: false },
          context
        );

        const enabled = await enableRule(created.id, context);

        expect(enabled?.isEnabled).toBe(true);
      });

      it("should disable an enabled rule", async () => {
        const created = await createRule(createValidRuleInput(), context);

        const disabled = await disableRule(created.id, context);

        expect(disabled?.isEnabled).toBe(false);
      });
    });

    describe("duplicate", () => {
      it("should duplicate a rule with default name", async () => {
        const created = await createRule(createValidRuleInput(), context);

        const duplicate = await duplicateRule(created.id, undefined, context);

        expect(duplicate?.id).not.toBe(created.id);
        expect(duplicate?.name).toBe("Test Rule (copy)");
      });

      it("should duplicate a rule with custom name", async () => {
        const created = await createRule(createValidRuleInput(), context);

        const duplicate = await duplicateRule(created.id, "My Custom Copy", context);

        expect(duplicate?.name).toBe("My Custom Copy");
      });

      it("should return undefined for non-existent rule", async () => {
        const duplicate = await duplicateRule(99999, undefined, context);
        expect(duplicate).toBeUndefined();
      });
    });
  });

  // ==========================================================================
  // Logs Routes
  // ==========================================================================

  describe("Logs Routes", () => {
    let ruleId: number;

    beforeEach(async () => {
      const rule = await createRule(createValidRuleInput(), context);
      ruleId = rule.id;

      // Add some logs directly via repository
      const repo = new AutomationRepository(db, workspaceId);
      await repo.createLog({
        ruleId,
        triggerEvent: "created",
        entityType: "transaction",
        status: "success",
        conditionsMatched: true,
      });
      await repo.createLog({
        ruleId,
        triggerEvent: "created",
        entityType: "transaction",
        status: "failed",
        conditionsMatched: true,
        errorMessage: "Test error",
      });
    });

    describe("getLogs", () => {
      it("should return logs for a rule", async () => {
        const logs = await getRuleLogs(ruleId, {}, context);

        expect(logs).toHaveLength(2);
      });

      it("should respect limit option", async () => {
        const logs = await getRuleLogs(ruleId, { limit: 1 }, context);

        expect(logs).toHaveLength(1);
      });

      it("should return empty array for non-existent rule", async () => {
        const logs = await getRuleLogs(99999, {}, context);
        expect(logs).toEqual([]);
      });
    });

    describe("getRecentLogs", () => {
      it("should return recent logs for workspace", async () => {
        const logs = await getRecentLogs({}, context);

        expect(logs).toHaveLength(2);
      });

      it("should respect limit option", async () => {
        const logs = await getRecentLogs({ limit: 1 }, context);

        expect(logs).toHaveLength(1);
      });
    });

    describe("getLogStats", () => {
      it("should return log statistics", async () => {
        const stats = await getRuleLogStats(ruleId, context);

        expect(stats.success).toBe(1);
        expect(stats.failed).toBe(1);
        expect(stats.skipped).toBe(0);
      });

      it("should return zeros for non-existent rule", async () => {
        const stats = await getRuleLogStats(99999, context);

        expect(stats).toEqual({ success: 0, failed: 0, skipped: 0 });
      });
    });

    describe("cleanupLogs", () => {
      it("should return deleted count", async () => {
        const count = await cleanupOldLogs(30, context);

        // Recent logs won't be deleted
        expect(count).toBe(0);
      });
    });
  });

  // ==========================================================================
  // Testing Routes
  // ==========================================================================

  describe("Testing Routes", () => {
    describe("testRule", () => {
      it("should return matched=true when conditions match", async () => {
        const rule = await createRule(createValidRuleInput(), context);

        const services = { transactions: { update: async () => {} } };
        const result = await testRule(
          rule.id,
          { amount: 150 },
          context,
          services
        );

        expect(result.matched).toBe(true);
        expect(result.actions).toHaveLength(1);
        expect(result.actions[0].wouldExecute).toBe(true);
      });

      it("should return matched=false when conditions do not match", async () => {
        const rule = await createRule(createValidRuleInput(), context);

        const services = { transactions: { update: async () => {} } };
        const result = await testRule(
          rule.id,
          { amount: 50 },
          context,
          services
        );

        expect(result.matched).toBe(false);
        expect(result.actions[0].wouldExecute).toBe(false);
      });

      it("should return matched=false for non-existent rule", async () => {
        const services = { transactions: { update: async () => {} } };
        const result = await testRule(
          99999,
          { amount: 150 },
          context,
          services
        );

        expect(result.matched).toBe(false);
        expect(result.actions).toEqual([]);
      });
    });
  });
});
