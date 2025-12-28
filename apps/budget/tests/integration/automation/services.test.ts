/**
 * Automation Services Integration Tests
 *
 * Tests for business logic and validation in automation services.
 * Uses in-memory SQLite for isolated testing.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { setupTestDb, clearTestDb } from "../setup/test-db";
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
  type CreateRuleInput,
  type AutomationContext,
} from "../../../src/lib/server/domains/automation/services";
import { AutomationRepository } from "../../../src/lib/server/domains/automation/repository";
import { workspaces } from "../../../src/lib/schema/workspaces";
import type { TriggerConfig, ConditionGroup, ActionConfig } from "$lib/types/automation";

// Test helpers
function createValidInput(): CreateRuleInput {
  return {
    name: "Test Rule",
    trigger: {
      entityType: "transaction",
      event: "created",
    },
    conditions: {
      id: "group-1",
      operator: "AND",
      conditions: [{ id: "cond-1", field: "amount", operator: "greaterThan", value: 100 }],
    },
    actions: [{ id: "action-1", type: "setCategory", params: { categoryId: 1 } }],
  };
}

describe("Automation Services Integration Tests", () => {
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
        slug: "test-workspace",
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
  // createRule
  // ==========================================================================

  describe("createRule", () => {
    it("should create a valid rule", async () => {
      const input = createValidInput();
      const rule = await createRule(input, context);

      expect(rule).toBeDefined();
      expect(rule.id).toBeGreaterThan(0);
      expect(rule.name).toBe("Test Rule");
      expect(rule.workspaceId).toBe(workspaceId);
    });

    it("should create a rule with all optional fields", async () => {
      const input: CreateRuleInput = {
        ...createValidInput(),
        description: "Full description",
        isEnabled: false,
        priority: 10,
        stopOnMatch: false,
        runOnce: true,
        flowState: {
          nodes: [],
          edges: [],
        },
      };

      const rule = await createRule(input, context);

      expect(rule.description).toBe("Full description");
      expect(rule.isEnabled).toBe(false);
      expect(rule.priority).toBe(10);
      expect(rule.stopOnMatch).toBe(false);
      expect(rule.runOnce).toBe(true);
    });

    it("should set default values for optional fields", async () => {
      const input = createValidInput();
      const rule = await createRule(input, context);

      expect(rule.isEnabled).toBe(true);
      expect(rule.priority).toBe(0);
      expect(rule.stopOnMatch).toBe(true);
      expect(rule.runOnce).toBe(false);
    });

    describe("validation", () => {
      it("should reject invalid entity type", async () => {
        const input = createValidInput();
        input.trigger.entityType = "invalid" as TriggerConfig["entityType"];

        await expect(createRule(input, context)).rejects.toThrow("Invalid entity type");
      });

      it("should reject missing event", async () => {
        const input = createValidInput();
        input.trigger.event = "";

        await expect(createRule(input, context)).rejects.toThrow("Trigger event is required");
      });

      it("should reject invalid condition group operator", async () => {
        const input = createValidInput();
        input.conditions.operator = "INVALID" as ConditionGroup["operator"];

        await expect(createRule(input, context)).rejects.toThrow("AND or OR operator");
      });

      it("should reject condition without field", async () => {
        const input = createValidInput();
        input.conditions.conditions = [{ id: "cond", operator: "equals", value: 1 } as any];

        await expect(createRule(input, context)).rejects.toThrow("must have a field");
      });

      it("should reject condition without operator", async () => {
        const input = createValidInput();
        input.conditions.conditions = [{ id: "cond", field: "amount", value: 1 } as any];

        await expect(createRule(input, context)).rejects.toThrow("must have an operator");
      });

      it("should reject empty actions array", async () => {
        const input = createValidInput();
        input.actions = [];

        await expect(createRule(input, context)).rejects.toThrow("At least one action is required");
      });

      it("should reject action without type", async () => {
        const input = createValidInput();
        input.actions = [{ id: "action", params: {} } as any];

        await expect(createRule(input, context)).rejects.toThrow("must have a type");
      });

      it("should validate nested condition groups", async () => {
        const input = createValidInput();
        // Valid nested group structure but with a condition missing operator
        input.conditions = {
          id: "group-1",
          operator: "AND",
          conditions: [
            {
              id: "nested-group",
              operator: "OR",
              conditions: [
                { id: "cond", field: "amount" } as any, // missing operator
              ],
            },
          ],
        };

        await expect(createRule(input, context)).rejects.toThrow("must have an operator");
      });
    });
  });

  // ==========================================================================
  // updateRule
  // ==========================================================================

  describe("updateRule", () => {
    it("should update rule fields", async () => {
      const input = createValidInput();
      const created = await createRule(input, context);

      const updated = await updateRule(
        created.id,
        {
          name: "Updated Name",
          description: "Updated description",
          priority: 50,
        },
        context
      );

      expect(updated).toBeDefined();
      expect(updated?.name).toBe("Updated Name");
      expect(updated?.description).toBe("Updated description");
      expect(updated?.priority).toBe(50);
    });

    it("should return undefined for non-existent rule", async () => {
      const updated = await updateRule(99999, { name: "Updated" }, context);
      expect(updated).toBeUndefined();
    });

    it("should validate updated trigger", async () => {
      const input = createValidInput();
      const created = await createRule(input, context);

      await expect(
        updateRule(
          created.id,
          {
            trigger: { entityType: "invalid" as any, event: "created" },
          },
          context
        )
      ).rejects.toThrow("Invalid entity type");
    });

    it("should validate updated conditions", async () => {
      const input = createValidInput();
      const created = await createRule(input, context);

      await expect(
        updateRule(
          created.id,
          {
            conditions: { id: "g", operator: "INVALID" as any, conditions: [] },
          },
          context
        )
      ).rejects.toThrow("AND or OR operator");
    });

    it("should validate updated actions", async () => {
      const input = createValidInput();
      const created = await createRule(input, context);

      await expect(
        updateRule(
          created.id,
          {
            actions: [],
          },
          context
        )
      ).rejects.toThrow("At least one action is required");
    });
  });

  // ==========================================================================
  // getRule / getRules
  // ==========================================================================

  describe("getRule", () => {
    it("should return a rule by ID", async () => {
      const input = createValidInput();
      const created = await createRule(input, context);

      const found = await getRule(created.id, context);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });

    it("should return undefined for non-existent ID", async () => {
      const found = await getRule(99999, context);
      expect(found).toBeUndefined();
    });
  });

  describe("getRules", () => {
    it("should return all rules for workspace", async () => {
      await createRule({ ...createValidInput(), name: "Rule 1" }, context);
      await createRule({ ...createValidInput(), name: "Rule 2" }, context);

      const rules = await getRules(context);

      expect(rules).toHaveLength(2);
    });

    it("should return empty array when no rules exist", async () => {
      const rules = await getRules(context);
      expect(rules).toEqual([]);
    });
  });

  describe("getRulesByEntityType", () => {
    it("should return rules for specific entity type", async () => {
      await createRule(createValidInput(), context);
      await createRule(
        {
          ...createValidInput(),
          name: "Account Rule",
          trigger: { entityType: "account", event: "updated" },
        },
        context
      );

      const transactionRules = await getRulesByEntityType("transaction", context);
      const accountRules = await getRulesByEntityType("account", context);

      expect(transactionRules).toHaveLength(1);
      expect(transactionRules[0].name).toBe("Test Rule");
      expect(accountRules).toHaveLength(1);
      expect(accountRules[0].name).toBe("Account Rule");
    });
  });

  // ==========================================================================
  // deleteRule
  // ==========================================================================

  describe("deleteRule", () => {
    it("should delete a rule", async () => {
      const input = createValidInput();
      const created = await createRule(input, context);

      await deleteRule(created.id, context);

      const found = await getRule(created.id, context);
      expect(found).toBeUndefined();
    });
  });

  // ==========================================================================
  // enableRule / disableRule
  // ==========================================================================

  describe("enableRule", () => {
    it("should enable a disabled rule", async () => {
      const input: CreateRuleInput = { ...createValidInput(), isEnabled: false };
      const created = await createRule(input, context);
      expect(created.isEnabled).toBe(false);

      const enabled = await enableRule(created.id, context);
      expect(enabled?.isEnabled).toBe(true);
    });
  });

  describe("disableRule", () => {
    it("should disable an enabled rule", async () => {
      const input = createValidInput();
      const created = await createRule(input, context);
      expect(created.isEnabled).toBe(true);

      const disabled = await disableRule(created.id, context);
      expect(disabled?.isEnabled).toBe(false);
    });
  });

  // ==========================================================================
  // duplicateRule
  // ==========================================================================

  describe("duplicateRule", () => {
    it("should duplicate a rule with default name", async () => {
      const input = createValidInput();
      const original = await createRule(input, context);

      const duplicate = await duplicateRule(original.id, undefined, context);

      expect(duplicate).toBeDefined();
      expect(duplicate?.id).not.toBe(original.id);
      expect(duplicate?.name).toBe("Test Rule (copy)");
    });

    it("should duplicate a rule with custom name", async () => {
      const input = createValidInput();
      const original = await createRule(input, context);

      const duplicate = await duplicateRule(original.id, "My Copy", context);

      expect(duplicate?.name).toBe("My Copy");
    });

    it("should return undefined for non-existent rule", async () => {
      const duplicate = await duplicateRule(99999, undefined, context);
      expect(duplicate).toBeUndefined();
    });
  });

  // ==========================================================================
  // Logs
  // ==========================================================================

  describe("getRuleLogs", () => {
    it("should return logs for a rule", async () => {
      const input = createValidInput();
      const rule = await createRule(input, context);

      // Create logs directly via repository
      const repo = new AutomationRepository(db, workspaceId);
      await repo.createLog({
        ruleId: rule.id,
        triggerEvent: "created",
        entityType: "transaction",
        status: "success",
        conditionsMatched: true,
      });

      const logs = await getRuleLogs(rule.id, {}, context);

      expect(logs).toHaveLength(1);
      expect(logs[0].status).toBe("success");
    });

    it("should return empty array for non-existent rule", async () => {
      const logs = await getRuleLogs(99999, {}, context);
      expect(logs).toEqual([]);
    });

    it("should respect limit and offset options", async () => {
      const input = createValidInput();
      const rule = await createRule(input, context);

      const repo = new AutomationRepository(db, workspaceId);
      for (let i = 0; i < 5; i++) {
        await repo.createLog({
          ruleId: rule.id,
          triggerEvent: `event-${i}`,
          entityType: "transaction",
          status: "success",
          conditionsMatched: true,
        });
      }

      const logs = await getRuleLogs(rule.id, { limit: 2 }, context);
      expect(logs).toHaveLength(2);
    });
  });

  describe("getRecentLogs", () => {
    it("should return recent logs for all rules", async () => {
      const rule1 = await createRule(createValidInput(), context);
      const rule2 = await createRule({ ...createValidInput(), name: "Rule 2" }, context);

      const repo = new AutomationRepository(db, workspaceId);
      await repo.createLog({
        ruleId: rule1.id,
        triggerEvent: "created",
        entityType: "transaction",
        status: "success",
        conditionsMatched: true,
      });
      await repo.createLog({
        ruleId: rule2.id,
        triggerEvent: "updated",
        entityType: "transaction",
        status: "failed",
        conditionsMatched: false,
      });

      const logs = await getRecentLogs({}, context);
      expect(logs).toHaveLength(2);
    });
  });

  describe("getRuleLogStats", () => {
    it("should return log statistics", async () => {
      const input = createValidInput();
      const rule = await createRule(input, context);

      const repo = new AutomationRepository(db, workspaceId);
      await repo.createLog({
        ruleId: rule.id,
        triggerEvent: "created",
        entityType: "transaction",
        status: "success",
        conditionsMatched: true,
      });
      await repo.createLog({
        ruleId: rule.id,
        triggerEvent: "created",
        entityType: "transaction",
        status: "success",
        conditionsMatched: true,
      });
      await repo.createLog({
        ruleId: rule.id,
        triggerEvent: "created",
        entityType: "transaction",
        status: "failed",
        conditionsMatched: true,
      });

      const stats = await getRuleLogStats(rule.id, context);

      expect(stats.success).toBe(2);
      expect(stats.failed).toBe(1);
      expect(stats.skipped).toBe(0);
    });

    it("should return zeros for non-existent rule", async () => {
      const stats = await getRuleLogStats(99999, context);
      expect(stats).toEqual({ success: 0, failed: 0, skipped: 0 });
    });
  });

  // ==========================================================================
  // cleanupOldLogs
  // ==========================================================================

  describe("cleanupOldLogs", () => {
    it("should return 0 when no old logs exist", async () => {
      const input = createValidInput();
      const rule = await createRule(input, context);

      // Create a recent log
      const repo = new AutomationRepository(db, workspaceId);
      await repo.createLog({
        ruleId: rule.id,
        triggerEvent: "created",
        entityType: "transaction",
        status: "success",
        conditionsMatched: true,
      });

      const deleted = await cleanupOldLogs(30, context);
      expect(deleted).toBe(0);
    });
  });
});
