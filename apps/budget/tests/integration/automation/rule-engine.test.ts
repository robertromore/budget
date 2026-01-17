/**
 * Rule Engine Integration Tests
 *
 * Tests for the rule engine's event handling, condition evaluation,
 * and action execution flow.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setupTestDb, clearTestDb } from "../setup/test-db";
import {
  RuleEngine,
  createRuleEngine,
  getRuleEngine,
  destroyRuleEngine,
  destroyAllRuleEngines,
  type ActionExecutionContext,
} from "../../../src/lib/server/domains/automation/rule-engine";
import { AutomationRepository } from "../../../src/lib/server/domains/automation/repository";
import { automationEvents } from "../../../src/lib/server/domains/automation/event-emitter";
import { workspaces } from "../../../src/lib/schema/workspaces";
import type { TriggerConfig, ConditionGroup, ActionConfig, RuleEvent } from "$lib/types/automation";

// Mock services for action execution
function createMockServices(): ActionExecutionContext["services"] {
  return {
    transactions: {
      update: vi.fn(() => Promise.resolve()),
    },
    accounts: {
      update: vi.fn(() => Promise.resolve()),
      close: vi.fn(() => Promise.resolve()),
    },
    payees: {
      update: vi.fn(() => Promise.resolve()),
      merge: vi.fn(() => Promise.resolve()),
      createAlias: vi.fn(() => Promise.resolve()),
    },
    categories: {
      update: vi.fn(() => Promise.resolve()),
      moveToGroup: vi.fn(() => Promise.resolve()),
      createAlias: vi.fn(() => Promise.resolve()),
    },
    schedules: {
      update: vi.fn(() => Promise.resolve()),
      skip: vi.fn(() => Promise.resolve()),
      pause: vi.fn(() => Promise.resolve()),
      resume: vi.fn(() => Promise.resolve()),
    },
    budgets: {
      update: vi.fn(() => Promise.resolve()),
      assignTransaction: vi.fn(() => Promise.resolve()),
      rollover: vi.fn(() => Promise.resolve()),
      pause: vi.fn(() => Promise.resolve()),
    },
  };
}

// Test helpers
function createTestTrigger(entityType = "transaction", event = "created"): TriggerConfig {
  return { entityType: entityType as TriggerConfig["entityType"], event };
}

function createTestConditions(field = "amount", operator = "greaterThan", value: unknown = 100): ConditionGroup {
  return {
    id: "group-1",
    operator: "AND",
    conditions: [{ id: "cond-1", field, operator: operator as any, value }],
  };
}

function createTestActions(): ActionConfig[] {
  return [{ id: "action-1", type: "setCategory", params: { categoryId: 1 } }];
}

describe("Rule Engine Integration Tests", () => {
  let db: Awaited<ReturnType<typeof setupTestDb>>;
  let workspaceId: number;
  let repo: AutomationRepository;
  let mockServices: ActionExecutionContext["services"];

  beforeEach(async () => {
    db = await setupTestDb();

    // Create a test workspace
    const [workspace] = await db
      .insert(workspaces)
      .values({
        displayName: "Test Workspace",
        slug: "test-workspace-engine",
      })
      .returning();
    workspaceId = workspace.id;

    repo = new AutomationRepository(db, workspaceId);
    mockServices = createMockServices();

    // Clean up any existing engines
    destroyAllRuleEngines();
  });

  afterEach(async () => {
    destroyAllRuleEngines();
    if (db) {
      await clearTestDb(db);
    }
  });

  // ==========================================================================
  // Engine Lifecycle
  // ==========================================================================

  describe("Engine Lifecycle", () => {
    it("should create a new engine instance", () => {
      const engine = createRuleEngine(db, workspaceId, mockServices);
      expect(engine).toBeDefined();
      expect(engine).toBeInstanceOf(RuleEngine);
    });

    it("should initialize engine and subscribe to events", async () => {
      const engine = createRuleEngine(db, workspaceId, mockServices);
      await engine.initialize();
      // No error means success
      engine.destroy();
    });

    it("should not initialize twice", async () => {
      const engine = createRuleEngine(db, workspaceId, mockServices);
      await engine.initialize();
      await engine.initialize(); // Should not throw
      engine.destroy();
    });

    it("should destroy engine and clean up subscriptions", async () => {
      const engine = createRuleEngine(db, workspaceId, mockServices);
      await engine.initialize();
      engine.destroy();
      // Engine should no longer process events
    });
  });

  // ==========================================================================
  // Engine Registry
  // ==========================================================================

  describe("Engine Registry", () => {
    it("should get or create engine for workspace", () => {
      const engine1 = getRuleEngine(db, workspaceId, mockServices);
      const engine2 = getRuleEngine(db, workspaceId, mockServices);
      expect(engine1).toBe(engine2); // Same instance
    });

    it("should create different engines for different workspaces", async () => {
      const [workspace2] = await db
        .insert(workspaces)
        .values({
          displayName: "Workspace 2",
          slug: "workspace-2",
        })
        .returning();

      const engine1 = getRuleEngine(db, workspaceId, mockServices);
      const engine2 = getRuleEngine(db, workspace2.id, mockServices);
      expect(engine1).not.toBe(engine2);
    });

    it("should destroy specific workspace engine", () => {
      const engine = getRuleEngine(db, workspaceId, mockServices);
      destroyRuleEngine(workspaceId);
      // Getting engine again should create a new one
      const newEngine = getRuleEngine(db, workspaceId, mockServices);
      expect(newEngine).not.toBe(engine);
    });

    it("should destroy all engines", async () => {
      const [workspace2] = await db
        .insert(workspaces)
        .values({
          displayName: "Workspace 2",
          slug: "workspace-2b",
        })
        .returning();

      getRuleEngine(db, workspaceId, mockServices);
      getRuleEngine(db, workspace2.id, mockServices);

      destroyAllRuleEngines();

      // New engines should be created
      const newEngine1 = getRuleEngine(db, workspaceId, mockServices);
      const newEngine2 = getRuleEngine(db, workspace2.id, mockServices);
      expect(newEngine1).toBeDefined();
      expect(newEngine2).toBeDefined();
    });
  });

  // ==========================================================================
  // testRule (Dry Run)
  // ==========================================================================

  describe("testRule", () => {
    it("should return matched=true when conditions match", async () => {
      const rule = await repo.create({
        name: "Test Rule",
        trigger: createTestTrigger(),
        conditions: createTestConditions("amount", "greaterThan", 100),
        actions: createTestActions(),
      });

      const engine = createRuleEngine(db, workspaceId, mockServices);
      const entity = { amount: 150 };

      const result = await engine.testRule(rule, entity, "transaction");

      expect(result.matched).toBe(true);
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe("setCategory");
      expect(result.actions[0].wouldExecute).toBe(true);
    });

    it("should return matched=false when conditions do not match", async () => {
      const rule = await repo.create({
        name: "Test Rule",
        trigger: createTestTrigger(),
        conditions: createTestConditions("amount", "greaterThan", 100),
        actions: createTestActions(),
      });

      const engine = createRuleEngine(db, workspaceId, mockServices);
      const entity = { amount: 50 };

      const result = await engine.testRule(rule, entity, "transaction");

      expect(result.matched).toBe(false);
      expect(result.actions[0].wouldExecute).toBe(false);
    });

    it("should handle complex conditions", async () => {
      const rule = await repo.create({
        name: "Complex Rule",
        trigger: createTestTrigger(),
        conditions: {
          id: "group-1",
          operator: "AND",
          conditions: [
            { id: "cond-1", field: "amount", operator: "greaterThan", value: 100 },
            { id: "cond-2", field: "status", operator: "equals", value: "pending" },
          ],
        },
        actions: createTestActions(),
      });

      const engine = createRuleEngine(db, workspaceId, mockServices);

      // Both conditions match
      const result1 = await engine.testRule(
        rule,
        { amount: 150, status: "pending" },
        "transaction"
      );
      expect(result1.matched).toBe(true);

      // One condition fails
      const result2 = await engine.testRule(
        rule,
        { amount: 150, status: "cleared" },
        "transaction"
      );
      expect(result2.matched).toBe(false);
    });

    it("should handle OR conditions", async () => {
      const rule = await repo.create({
        name: "OR Rule",
        trigger: createTestTrigger(),
        conditions: {
          id: "group-1",
          operator: "OR",
          conditions: [
            { id: "cond-1", field: "amount", operator: "greaterThan", value: 1000 },
            { id: "cond-2", field: "status", operator: "equals", value: "urgent" },
          ],
        },
        actions: createTestActions(),
      });

      const engine = createRuleEngine(db, workspaceId, mockServices);

      // First condition matches
      const result1 = await engine.testRule(
        rule,
        { amount: 1500, status: "normal" },
        "transaction"
      );
      expect(result1.matched).toBe(true);

      // Second condition matches
      const result2 = await engine.testRule(
        rule,
        { amount: 50, status: "urgent" },
        "transaction"
      );
      expect(result2.matched).toBe(true);

      // Neither matches
      const result3 = await engine.testRule(
        rule,
        { amount: 50, status: "normal" },
        "transaction"
      );
      expect(result3.matched).toBe(false);
    });

    it("should list all actions in result", async () => {
      const rule = await repo.create({
        name: "Multi-Action Rule",
        trigger: createTestTrigger(),
        conditions: createTestConditions(),
        actions: [
          { id: "action-1", type: "setCategory", params: { categoryId: 1 } },
          { id: "action-2", type: "setPayee", params: { payeeId: 2 } },
          { id: "action-3", type: "appendNotes", params: { text: "Auto-tagged" } },
        ],
      });

      const engine = createRuleEngine(db, workspaceId, mockServices);
      const result = await engine.testRule(rule, { amount: 150 }, "transaction");

      expect(result.actions).toHaveLength(3);
      expect(result.actions.map((a) => a.type)).toEqual([
        "setCategory",
        "setPayee",
        "appendNotes",
      ]);
    });
  });

  // ==========================================================================
  // Rule Logging
  // ==========================================================================

  describe("Rule Logging", () => {
    it("should create log entries for rule execution", async () => {
      const rule = await repo.create({
        name: "Logging Test Rule",
        trigger: createTestTrigger(),
        conditions: createTestConditions("amount", "greaterThan", 100),
        actions: createTestActions(),
      });

      // Simulate processing a rule
      const engine = createRuleEngine(db, workspaceId, mockServices);
      await engine.initialize();

      // Emit an event to trigger the rule
      await automationEvents.emit("transaction", "created", {
        workspaceId,
        entityId: 123,
        entity: { amount: 150, id: 123 },
      });

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check logs
      const logs = await repo.findLogs(rule.id);
      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs[0].status).toBe("success");
      expect(logs[0].conditionsMatched).toBe(true);

      engine.destroy();
    });

    it("should log skipped when conditions do not match", async () => {
      const rule = await repo.create({
        name: "Skip Test Rule",
        trigger: createTestTrigger(),
        conditions: createTestConditions("amount", "greaterThan", 100),
        actions: createTestActions(),
      });

      const engine = createRuleEngine(db, workspaceId, mockServices);
      await engine.initialize();

      // Emit an event that doesn't match conditions
      await automationEvents.emit("transaction", "created", {
        workspaceId,
        entityId: 456,
        entity: { amount: 50, id: 456 },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const logs = await repo.findLogs(rule.id);
      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs[0].status).toBe("skipped");
      expect(logs[0].conditionsMatched).toBe(false);

      engine.destroy();
    });
  });

  // ==========================================================================
  // Rule Stats
  // ==========================================================================

  describe("Rule Stats", () => {
    it("should update trigger count and lastTriggeredAt", async () => {
      const rule = await repo.create({
        name: "Stats Test Rule",
        trigger: createTestTrigger(),
        conditions: createTestConditions("amount", "greaterThan", 100),
        actions: createTestActions(),
      });

      expect(rule.triggerCount).toBe(0);
      expect(rule.lastTriggeredAt).toBeNull();

      const engine = createRuleEngine(db, workspaceId, mockServices);
      await engine.initialize();

      // Emit matching event
      await automationEvents.emit("transaction", "created", {
        workspaceId,
        entityId: 789,
        entity: { amount: 150, id: 789 },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const updated = await repo.findById(rule.id);
      expect(updated?.triggerCount).toBe(1);
      expect(updated?.lastTriggeredAt).not.toBeNull();

      engine.destroy();
    });
  });

  // ==========================================================================
  // runOnce Rules
  // ==========================================================================

  describe("runOnce Rules", () => {
    it("should disable rule after successful execution when runOnce is true", async () => {
      const rule = await repo.create({
        name: "Run Once Rule",
        trigger: createTestTrigger(),
        conditions: createTestConditions("amount", "greaterThan", 100),
        actions: createTestActions(),
        runOnce: true,
      });

      expect(rule.isEnabled).toBe(true);

      const engine = createRuleEngine(db, workspaceId, mockServices);
      await engine.initialize();

      await automationEvents.emit("transaction", "created", {
        workspaceId,
        entityId: 111,
        entity: { amount: 150, id: 111 },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const updated = await repo.findById(rule.id);
      expect(updated?.isEnabled).toBe(false);

      engine.destroy();
    });

    it("should not disable rule when conditions do not match", async () => {
      const rule = await repo.create({
        name: "Run Once Rule - No Match",
        trigger: createTestTrigger(),
        conditions: createTestConditions("amount", "greaterThan", 100),
        actions: createTestActions(),
        runOnce: true,
      });

      const engine = createRuleEngine(db, workspaceId, mockServices);
      await engine.initialize();

      await automationEvents.emit("transaction", "created", {
        workspaceId,
        entityId: 222,
        entity: { amount: 50, id: 222 },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const updated = await repo.findById(rule.id);
      expect(updated?.isEnabled).toBe(true); // Still enabled

      engine.destroy();
    });
  });

  // ==========================================================================
  // stopOnMatch Behavior
  // ==========================================================================

  describe("stopOnMatch Behavior", () => {
    it("should stop processing after first match when stopOnMatch is true", async () => {
      // Create two rules - both would match
      await repo.create({
        name: "High Priority Rule",
        priority: 100,
        trigger: createTestTrigger(),
        conditions: createTestConditions("amount", "greaterThan", 100),
        actions: [{ id: "action-1", type: "setCategory", params: { categoryId: 1 } }],
        stopOnMatch: true,
      });

      const rule2 = await repo.create({
        name: "Low Priority Rule",
        priority: 1,
        trigger: createTestTrigger(),
        conditions: createTestConditions("amount", "greaterThan", 100),
        actions: [{ id: "action-2", type: "setPayee", params: { payeeId: 2 } }],
      });

      const engine = createRuleEngine(db, workspaceId, mockServices);
      await engine.initialize();

      await automationEvents.emit("transaction", "created", {
        workspaceId,
        entityId: 333,
        entity: { amount: 150, id: 333 },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Second rule should not have been triggered
      const logs2 = await repo.findLogs(rule2.id);
      expect(logs2).toHaveLength(0);

      engine.destroy();
    });
  });

  // ==========================================================================
  // Workspace Isolation
  // ==========================================================================

  describe("Workspace Isolation", () => {
    it("should only process events for its workspace", async () => {
      const [workspace2] = await db
        .insert(workspaces)
        .values({
          displayName: "Workspace 2",
          slug: "workspace-2c",
        })
        .returning();

      // Create rule in workspace 1
      const rule = await repo.create({
        name: "Workspace 1 Rule",
        trigger: createTestTrigger(),
        conditions: createTestConditions(),
        actions: createTestActions(),
      });

      const engine = createRuleEngine(db, workspaceId, mockServices);
      await engine.initialize();

      // Emit event for workspace 2
      await automationEvents.emit("transaction", "created", {
        workspaceId: workspace2.id, // Different workspace
        entityId: 444,
        entity: { amount: 150, id: 444 },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Rule should not be triggered
      const logs = await repo.findLogs(rule.id);
      expect(logs).toHaveLength(0);

      engine.destroy();
    });
  });

  // ==========================================================================
  // Priority Ordering
  // ==========================================================================

  describe("Priority Ordering", () => {
    it("should process rules in priority order (highest first)", async () => {
      const executionOrder: string[] = [];
      const mockServicesWithTracking = {
        ...mockServices,
        transactions: {
          update: vi.fn(async (id: number, data: Record<string, unknown>) => {
            if (data.categoryId === 1) executionOrder.push("high");
            if (data.categoryId === 2) executionOrder.push("low");
          }),
        },
      };

      await repo.create({
        name: "Low Priority",
        priority: 1,
        trigger: createTestTrigger(),
        conditions: createTestConditions(),
        actions: [{ id: "a-1", type: "setCategory", params: { categoryId: 2 } }],
        stopOnMatch: false,
      });

      await repo.create({
        name: "High Priority",
        priority: 100,
        trigger: createTestTrigger(),
        conditions: createTestConditions(),
        actions: [{ id: "a-2", type: "setCategory", params: { categoryId: 1 } }],
        stopOnMatch: false,
      });

      const engine = createRuleEngine(db, workspaceId, mockServicesWithTracking);
      await engine.initialize();

      await automationEvents.emit("transaction", "created", {
        workspaceId,
        entityId: 555,
        entity: { amount: 150, id: 555 },
      });

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(executionOrder[0]).toBe("high"); // High priority first
      expect(executionOrder[1]).toBe("low");

      engine.destroy();
    });
  });
});
