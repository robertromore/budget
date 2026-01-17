/**
 * Automation Repository Integration Tests
 *
 * Tests for database operations on automation rules and logs.
 * Uses in-memory SQLite for isolated testing.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { setupTestDb, clearTestDb } from "../setup/test-db";
import { AutomationRepository } from "../../../src/lib/server/domains/automation/repository";
import { workspaces } from "../../../src/lib/schema/workspaces";
import type { TriggerConfig, ConditionGroup, ActionConfig } from "$lib/types/automation";

// Test helpers
function createTestTrigger(entityType = "transaction", event = "created"): TriggerConfig {
  return { entityType: entityType as TriggerConfig["entityType"], event };
}

function createTestConditions(): ConditionGroup {
  return {
    id: "group-1",
    operator: "AND",
    conditions: [
      { id: "cond-1", field: "amount", operator: "greaterThan", value: 100 },
    ],
  };
}

function createTestActions(): ActionConfig[] {
  return [
    { id: "action-1", type: "setCategory", params: { categoryId: 1 } },
  ];
}

describe("Automation Repository Integration Tests", () => {
  let db: Awaited<ReturnType<typeof setupTestDb>>;
  let workspaceId: number;
  let repo: AutomationRepository;

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

    // Initialize repository
    repo = new AutomationRepository(db, workspaceId);
  });

  afterEach(async () => {
    if (db) {
      await clearTestDb(db);
    }
  });

  // ==========================================================================
  // Rules CRUD
  // ==========================================================================

  describe("Rules CRUD", () => {
    describe("create", () => {
      it("should create a new rule with all required fields", async () => {
        const rule = await repo.create({
          name: "Test Rule",
          trigger: createTestTrigger(),
          conditions: createTestConditions(),
          actions: createTestActions(),
        });

        expect(rule).toBeDefined();
        expect(rule.id).toBeGreaterThan(0);
        expect(rule.name).toBe("Test Rule");
        expect(rule.workspaceId).toBe(workspaceId);
        expect(rule.isEnabled).toBe(true);
        expect(rule.priority).toBe(0);
        expect(rule.triggerCount).toBe(0);
      });

      it("should create a rule with optional fields", async () => {
        const rule = await repo.create({
          name: "Detailed Rule",
          description: "A rule with all optional fields",
          trigger: createTestTrigger(),
          conditions: createTestConditions(),
          actions: createTestActions(),
          priority: 10,
          isEnabled: false,
          stopOnMatch: false,
          runOnce: true,
        });

        expect(rule.description).toBe("A rule with all optional fields");
        expect(rule.priority).toBe(10);
        expect(rule.isEnabled).toBe(false);
        expect(rule.stopOnMatch).toBe(false);
        expect(rule.runOnce).toBe(true);
      });

      it("should create a rule with flow state", async () => {
        const flowState = {
          nodes: [{ id: "node-1", type: "trigger", position: { x: 0, y: 0 }, data: {} }],
          edges: [],
        };

        const rule = await repo.create({
          name: "Rule with Flow State",
          trigger: createTestTrigger(),
          conditions: createTestConditions(),
          actions: createTestActions(),
          flowState,
        });

        expect(rule.flowState).toEqual(flowState);
      });

      it("should automatically set workspaceId from repository", async () => {
        const rule = await repo.create({
          name: "Workspace Test Rule",
          trigger: createTestTrigger(),
          conditions: createTestConditions(),
          actions: createTestActions(),
        });

        expect(rule.workspaceId).toBe(workspaceId);
      });

      it("should set timestamps on creation", async () => {
        const rule = await repo.create({
          name: "Timestamp Test Rule",
          trigger: createTestTrigger(),
          conditions: createTestConditions(),
          actions: createTestActions(),
        });

        expect(rule.createdAt).toBeDefined();
        expect(rule.updatedAt).toBeDefined();
      });
    });

    describe("findById", () => {
      it("should return a rule by ID", async () => {
        const created = await repo.create({
          name: "Find Test Rule",
          trigger: createTestTrigger(),
          conditions: createTestConditions(),
          actions: createTestActions(),
        });

        const found = await repo.findById(created.id);

        expect(found).toBeDefined();
        expect(found?.id).toBe(created.id);
        expect(found?.name).toBe("Find Test Rule");
      });

      it("should return undefined for non-existent ID", async () => {
        const found = await repo.findById(99999);
        expect(found).toBeUndefined();
      });

      it("should not return rules from other workspaces", async () => {
        // Create a rule in the test workspace
        const rule = await repo.create({
          name: "Workspace Rule",
          trigger: createTestTrigger(),
          conditions: createTestConditions(),
          actions: createTestActions(),
        });

        // Create another workspace and repository
        const [otherWorkspace] = await db
          .insert(workspaces)
          .values({
            displayName: "Other Workspace",
            slug: "other-workspace",
          })
          .returning();
        const otherRepo = new AutomationRepository(db, otherWorkspace.id);

        // Should not find the rule from the other workspace
        const found = await otherRepo.findById(rule.id);
        expect(found).toBeUndefined();
      });
    });

    describe("findAll", () => {
      it("should return empty array when no rules exist", async () => {
        const rules = await repo.findAll();
        expect(rules).toEqual([]);
      });

      it("should return all rules for the workspace", async () => {
        await repo.create({
          name: "Rule 1",
          trigger: createTestTrigger(),
          conditions: createTestConditions(),
          actions: createTestActions(),
        });
        await repo.create({
          name: "Rule 2",
          trigger: createTestTrigger("account", "updated"),
          conditions: createTestConditions(),
          actions: createTestActions(),
        });

        const rules = await repo.findAll();
        expect(rules).toHaveLength(2);
      });

      it("should order by priority descending, then by name", async () => {
        await repo.create({
          name: "C Rule",
          priority: 5,
          trigger: createTestTrigger(),
          conditions: createTestConditions(),
          actions: createTestActions(),
        });
        await repo.create({
          name: "A Rule",
          priority: 10,
          trigger: createTestTrigger(),
          conditions: createTestConditions(),
          actions: createTestActions(),
        });
        await repo.create({
          name: "B Rule",
          priority: 5,
          trigger: createTestTrigger(),
          conditions: createTestConditions(),
          actions: createTestActions(),
        });

        const rules = await repo.findAll();
        expect(rules[0].name).toBe("A Rule"); // Priority 10
        expect(rules[1].name).toBe("B Rule"); // Priority 5, name B
        expect(rules[2].name).toBe("C Rule"); // Priority 5, name C
      });

      it("should not return rules from other workspaces", async () => {
        await repo.create({
          name: "My Workspace Rule",
          trigger: createTestTrigger(),
          conditions: createTestConditions(),
          actions: createTestActions(),
        });

        // Create rule in another workspace
        const [otherWorkspace] = await db
          .insert(workspaces)
          .values({
            displayName: "Other Workspace",
            slug: "other-workspace",
          })
          .returning();
        const otherRepo = new AutomationRepository(db, otherWorkspace.id);
        await otherRepo.create({
          name: "Other Workspace Rule",
          trigger: createTestTrigger(),
          conditions: createTestConditions(),
          actions: createTestActions(),
        });

        const myRules = await repo.findAll();
        const otherRules = await otherRepo.findAll();

        expect(myRules).toHaveLength(1);
        expect(myRules[0].name).toBe("My Workspace Rule");
        expect(otherRules).toHaveLength(1);
        expect(otherRules[0].name).toBe("Other Workspace Rule");
      });
    });

    describe("findByTrigger", () => {
      it("should return enabled rules matching entity type and event", async () => {
        await repo.create({
          name: "Transaction Created Rule",
          trigger: createTestTrigger("transaction", "created"),
          conditions: createTestConditions(),
          actions: createTestActions(),
        });
        await repo.create({
          name: "Transaction Updated Rule",
          trigger: createTestTrigger("transaction", "updated"),
          conditions: createTestConditions(),
          actions: createTestActions(),
        });
        await repo.create({
          name: "Account Created Rule",
          trigger: createTestTrigger("account", "created"),
          conditions: createTestConditions(),
          actions: createTestActions(),
        });

        const rules = await repo.findByTrigger("transaction", "created");
        expect(rules).toHaveLength(1);
        expect(rules[0].name).toBe("Transaction Created Rule");
      });

      it("should not return disabled rules", async () => {
        await repo.create({
          name: "Enabled Rule",
          trigger: createTestTrigger("transaction", "created"),
          conditions: createTestConditions(),
          actions: createTestActions(),
          isEnabled: true,
        });
        await repo.create({
          name: "Disabled Rule",
          trigger: createTestTrigger("transaction", "created"),
          conditions: createTestConditions(),
          actions: createTestActions(),
          isEnabled: false,
        });

        const rules = await repo.findByTrigger("transaction", "created");
        expect(rules).toHaveLength(1);
        expect(rules[0].name).toBe("Enabled Rule");
      });

      it("should order by priority descending", async () => {
        await repo.create({
          name: "Low Priority",
          priority: 1,
          trigger: createTestTrigger("transaction", "created"),
          conditions: createTestConditions(),
          actions: createTestActions(),
        });
        await repo.create({
          name: "High Priority",
          priority: 100,
          trigger: createTestTrigger("transaction", "created"),
          conditions: createTestConditions(),
          actions: createTestActions(),
        });

        const rules = await repo.findByTrigger("transaction", "created");
        expect(rules[0].name).toBe("High Priority");
        expect(rules[1].name).toBe("Low Priority");
      });
    });

    describe("findByEntityType", () => {
      it("should return all enabled rules for an entity type regardless of event", async () => {
        await repo.create({
          name: "Transaction Created",
          trigger: createTestTrigger("transaction", "created"),
          conditions: createTestConditions(),
          actions: createTestActions(),
        });
        await repo.create({
          name: "Transaction Updated",
          trigger: createTestTrigger("transaction", "updated"),
          conditions: createTestConditions(),
          actions: createTestActions(),
        });
        await repo.create({
          name: "Account Created",
          trigger: createTestTrigger("account", "created"),
          conditions: createTestConditions(),
          actions: createTestActions(),
        });

        const rules = await repo.findByEntityType("transaction");
        expect(rules).toHaveLength(2);
        expect(rules.map((r) => r.name).sort()).toEqual(["Transaction Created", "Transaction Updated"]);
      });
    });

    describe("update", () => {
      it("should update rule fields", async () => {
        const rule = await repo.create({
          name: "Original Name",
          trigger: createTestTrigger(),
          conditions: createTestConditions(),
          actions: createTestActions(),
        });

        const updated = await repo.update(rule.id, {
          name: "Updated Name",
          description: "New description",
          priority: 50,
        });

        expect(updated).toBeDefined();
        expect(updated?.name).toBe("Updated Name");
        expect(updated?.description).toBe("New description");
        expect(updated?.priority).toBe(50);
      });

      it("should set updatedAt on update", async () => {
        const rule = await repo.create({
          name: "Timestamp Test",
          trigger: createTestTrigger(),
          conditions: createTestConditions(),
          actions: createTestActions(),
        });

        const updated = await repo.update(rule.id, { name: "Updated" });

        // Verify updatedAt is set and is a valid timestamp
        expect(updated?.updatedAt).toBeDefined();
        expect(typeof updated?.updatedAt).toBe("string");
        expect(new Date(updated!.updatedAt!).getTime()).not.toBeNaN();
      });

      it("should return undefined for non-existent rule", async () => {
        const updated = await repo.update(99999, { name: "Updated" });
        expect(updated).toBeUndefined();
      });

      it("should not update rules from other workspaces", async () => {
        const rule = await repo.create({
          name: "My Rule",
          trigger: createTestTrigger(),
          conditions: createTestConditions(),
          actions: createTestActions(),
        });

        // Create another workspace repository
        const [otherWorkspace] = await db
          .insert(workspaces)
          .values({
            displayName: "Other Workspace",
            slug: "other-workspace-update",
          })
          .returning();
        const otherRepo = new AutomationRepository(db, otherWorkspace.id);

        const updated = await otherRepo.update(rule.id, { name: "Hacked" });
        expect(updated).toBeUndefined();

        // Verify original rule unchanged
        const original = await repo.findById(rule.id);
        expect(original?.name).toBe("My Rule");
      });
    });

    describe("delete", () => {
      it("should delete a rule", async () => {
        const rule = await repo.create({
          name: "To Delete",
          trigger: createTestTrigger(),
          conditions: createTestConditions(),
          actions: createTestActions(),
        });

        const result = await repo.delete(rule.id);
        expect(result).toBe(true);

        const found = await repo.findById(rule.id);
        expect(found).toBeUndefined();
      });

      it("should not delete rules from other workspaces", async () => {
        const rule = await repo.create({
          name: "Protected Rule",
          trigger: createTestTrigger(),
          conditions: createTestConditions(),
          actions: createTestActions(),
        });

        const [otherWorkspace] = await db
          .insert(workspaces)
          .values({
            displayName: "Other Workspace",
            slug: "other-workspace-delete",
          })
          .returning();
        const otherRepo = new AutomationRepository(db, otherWorkspace.id);

        await otherRepo.delete(rule.id);

        // Rule should still exist
        const found = await repo.findById(rule.id);
        expect(found).toBeDefined();
      });
    });

    describe("setEnabled", () => {
      it("should enable a disabled rule", async () => {
        const rule = await repo.create({
          name: "Disabled Rule",
          trigger: createTestTrigger(),
          conditions: createTestConditions(),
          actions: createTestActions(),
          isEnabled: false,
        });

        const updated = await repo.setEnabled(rule.id, true);
        expect(updated?.isEnabled).toBe(true);
      });

      it("should disable an enabled rule", async () => {
        const rule = await repo.create({
          name: "Enabled Rule",
          trigger: createTestTrigger(),
          conditions: createTestConditions(),
          actions: createTestActions(),
          isEnabled: true,
        });

        const updated = await repo.setEnabled(rule.id, false);
        expect(updated?.isEnabled).toBe(false);
      });
    });

    describe("disable", () => {
      it("should disable a rule", async () => {
        const rule = await repo.create({
          name: "Active Rule",
          trigger: createTestTrigger(),
          conditions: createTestConditions(),
          actions: createTestActions(),
        });

        const updated = await repo.disable(rule.id);
        expect(updated?.isEnabled).toBe(false);
      });
    });

    describe("updateStats", () => {
      it("should increment trigger count and update lastTriggeredAt", async () => {
        const rule = await repo.create({
          name: "Stats Test Rule",
          trigger: createTestTrigger(),
          conditions: createTestConditions(),
          actions: createTestActions(),
        });

        expect(rule.triggerCount).toBe(0);
        expect(rule.lastTriggeredAt).toBeNull();

        await repo.updateStats(rule.id);

        const updated = await repo.findById(rule.id);
        expect(updated?.triggerCount).toBe(1);
        expect(updated?.lastTriggeredAt).toBeDefined();

        // Update again
        await repo.updateStats(rule.id);
        const updatedAgain = await repo.findById(rule.id);
        expect(updatedAgain?.triggerCount).toBe(2);
      });
    });

    describe("duplicate", () => {
      it("should duplicate a rule with default name suffix", async () => {
        const original = await repo.create({
          name: "Original Rule",
          description: "Test description",
          priority: 5,
          trigger: createTestTrigger(),
          conditions: createTestConditions(),
          actions: createTestActions(),
        });

        const duplicate = await repo.duplicate(original.id);

        expect(duplicate).toBeDefined();
        expect(duplicate?.id).not.toBe(original.id);
        expect(duplicate?.name).toBe("Original Rule (copy)");
        expect(duplicate?.description).toBe(original.description);
        expect(duplicate?.priority).toBe(original.priority);
        expect(duplicate?.triggerCount).toBe(0);
      });

      it("should duplicate a rule with custom name", async () => {
        const original = await repo.create({
          name: "Original Rule",
          trigger: createTestTrigger(),
          conditions: createTestConditions(),
          actions: createTestActions(),
        });

        const duplicate = await repo.duplicate(original.id, "Custom Copy Name");

        expect(duplicate?.name).toBe("Custom Copy Name");
      });

      it("should return undefined for non-existent rule", async () => {
        const duplicate = await repo.duplicate(99999);
        expect(duplicate).toBeUndefined();
      });

      it("should reset trigger count and lastTriggeredAt on duplicate", async () => {
        const original = await repo.create({
          name: "Triggered Rule",
          trigger: createTestTrigger(),
          conditions: createTestConditions(),
          actions: createTestActions(),
        });

        // Simulate rule being triggered
        await repo.updateStats(original.id);
        await repo.updateStats(original.id);

        const triggered = await repo.findById(original.id);
        expect(triggered?.triggerCount).toBe(2);

        const duplicate = await repo.duplicate(original.id);
        expect(duplicate?.triggerCount).toBe(0);
        expect(duplicate?.lastTriggeredAt).toBeNull();
      });
    });
  });

  // ==========================================================================
  // Logs
  // ==========================================================================

  describe("Logs", () => {
    let testRule: Awaited<ReturnType<typeof repo.create>>;

    beforeEach(async () => {
      testRule = await repo.create({
        name: "Log Test Rule",
        trigger: createTestTrigger(),
        conditions: createTestConditions(),
        actions: createTestActions(),
      });
    });

    describe("createLog", () => {
      it("should create a success log entry", async () => {
        const log = await repo.createLog({
          ruleId: testRule.id,
          triggerEvent: "created",
          entityType: "transaction",
          entityId: 123,
          status: "success",
          conditionsMatched: true,
          actionsExecuted: [{ actionType: "setCategory", success: true }],
          executionTimeMs: 15,
        });

        expect(log.id).toBeGreaterThan(0);
        expect(log.ruleId).toBe(testRule.id);
        expect(log.status).toBe("success");
        expect(log.conditionsMatched).toBe(true);
      });

      it("should create a failed log entry with error message", async () => {
        const log = await repo.createLog({
          ruleId: testRule.id,
          triggerEvent: "created",
          entityType: "transaction",
          status: "failed",
          conditionsMatched: true,
          errorMessage: "Category not found",
          executionTimeMs: 5,
        });

        expect(log.status).toBe("failed");
        expect(log.errorMessage).toBe("Category not found");
      });

      it("should create a skipped log entry", async () => {
        const log = await repo.createLog({
          ruleId: testRule.id,
          triggerEvent: "created",
          entityType: "transaction",
          status: "skipped",
          conditionsMatched: false,
        });

        expect(log.status).toBe("skipped");
        expect(log.conditionsMatched).toBe(false);
      });

      it("should store entity snapshot", async () => {
        const snapshot = { amount: 100, payeeName: "Test Store" };
        const log = await repo.createLog({
          ruleId: testRule.id,
          triggerEvent: "created",
          entityType: "transaction",
          status: "success",
          conditionsMatched: true,
          entitySnapshot: snapshot,
        });

        expect(log.entitySnapshot).toEqual(snapshot);
      });
    });

    describe("findLogs", () => {
      it("should return logs for a rule", async () => {
        await repo.createLog({
          ruleId: testRule.id,
          triggerEvent: "created",
          entityType: "transaction",
          status: "success",
          conditionsMatched: true,
        });

        await repo.createLog({
          ruleId: testRule.id,
          triggerEvent: "updated",
          entityType: "transaction",
          status: "failed",
          conditionsMatched: false,
        });

        const logs = await repo.findLogs(testRule.id);
        expect(logs).toHaveLength(2);
        // Both logs should be present
        const events = logs.map((l) => l.triggerEvent);
        expect(events).toContain("created");
        expect(events).toContain("updated");
      });

      it("should respect limit option", async () => {
        for (let i = 0; i < 5; i++) {
          await repo.createLog({
            ruleId: testRule.id,
            triggerEvent: "created",
            entityType: "transaction",
            status: "success",
            conditionsMatched: true,
          });
        }

        const logs = await repo.findLogs(testRule.id, { limit: 3 });
        expect(logs).toHaveLength(3);
      });

      it("should respect offset option", async () => {
        for (let i = 0; i < 5; i++) {
          await repo.createLog({
            ruleId: testRule.id,
            triggerEvent: `event-${i}`,
            entityType: "transaction",
            status: "success",
            conditionsMatched: true,
          });
        }

        const logs = await repo.findLogs(testRule.id, { limit: 2, offset: 2 });
        expect(logs).toHaveLength(2);
      });
    });

    describe("findRecentLogs", () => {
      it("should return recent logs for all rules in workspace", async () => {
        const rule2 = await repo.create({
          name: "Second Rule",
          trigger: createTestTrigger("account", "updated"),
          conditions: createTestConditions(),
          actions: createTestActions(),
        });

        await repo.createLog({
          ruleId: testRule.id,
          triggerEvent: "created",
          entityType: "transaction",
          status: "success",
          conditionsMatched: true,
        });

        await repo.createLog({
          ruleId: rule2.id,
          triggerEvent: "updated",
          entityType: "account",
          status: "success",
          conditionsMatched: true,
        });

        const logs = await repo.findRecentLogs();
        expect(logs).toHaveLength(2);
      });

      it("should not return logs from other workspaces", async () => {
        await repo.createLog({
          ruleId: testRule.id,
          triggerEvent: "created",
          entityType: "transaction",
          status: "success",
          conditionsMatched: true,
        });

        // Create logs in another workspace
        const [otherWorkspace] = await db
          .insert(workspaces)
          .values({
            displayName: "Other Workspace",
            slug: "other-workspace-logs",
          })
          .returning();
        const otherRepo = new AutomationRepository(db, otherWorkspace.id);
        const otherRule = await otherRepo.create({
          name: "Other Rule",
          trigger: createTestTrigger(),
          conditions: createTestConditions(),
          actions: createTestActions(),
        });
        await otherRepo.createLog({
          ruleId: otherRule.id,
          triggerEvent: "created",
          entityType: "transaction",
          status: "success",
          conditionsMatched: true,
        });

        const myLogs = await repo.findRecentLogs();
        expect(myLogs).toHaveLength(1);
        expect(myLogs[0].ruleId).toBe(testRule.id);
      });
    });

    describe("getLogStats", () => {
      it("should return counts by status", async () => {
        // Create various logs
        await repo.createLog({
          ruleId: testRule.id,
          triggerEvent: "created",
          entityType: "transaction",
          status: "success",
          conditionsMatched: true,
        });
        await repo.createLog({
          ruleId: testRule.id,
          triggerEvent: "created",
          entityType: "transaction",
          status: "success",
          conditionsMatched: true,
        });
        await repo.createLog({
          ruleId: testRule.id,
          triggerEvent: "created",
          entityType: "transaction",
          status: "failed",
          conditionsMatched: true,
        });
        await repo.createLog({
          ruleId: testRule.id,
          triggerEvent: "created",
          entityType: "transaction",
          status: "skipped",
          conditionsMatched: false,
        });

        const stats = await repo.getLogStats(testRule.id);
        expect(stats.success).toBe(2);
        expect(stats.failed).toBe(1);
        expect(stats.skipped).toBe(1);
      });

      it("should return zeros when no logs exist", async () => {
        const stats = await repo.getLogStats(testRule.id);
        expect(stats).toEqual({ success: 0, failed: 0, skipped: 0 });
      });
    });

    describe("rule deletion", () => {
      it("should delete rule and verify it is no longer found", async () => {
        await repo.createLog({
          ruleId: testRule.id,
          triggerEvent: "created",
          entityType: "transaction",
          status: "success",
          conditionsMatched: true,
        });

        const ruleBefore = await repo.findById(testRule.id);
        expect(ruleBefore).toBeDefined();

        await repo.delete(testRule.id);

        // Rule should no longer be found
        const ruleAfter = await repo.findById(testRule.id);
        expect(ruleAfter).toBeUndefined();
      });
    });
  });
});
