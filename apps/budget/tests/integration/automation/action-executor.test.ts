/**
 * Action Executor Integration Tests
 *
 * Tests for action execution with mocked services.
 * Tests each action handler and error handling.
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import {
  executeActions,
  type ActionExecutionContext,
} from "../../../src/lib/server/domains/automation/action-executor";
import type { ActionConfig, ActionResult } from "$lib/types/automation";

// Create mock services that track calls
function createMockServices(): ActionExecutionContext["services"] {
  return {
    transactions: {
      update: mock(() => Promise.resolve()),
    },
    accounts: {
      update: mock(() => Promise.resolve()),
      close: mock(() => Promise.resolve()),
    },
    payees: {
      update: mock(() => Promise.resolve()),
      merge: mock(() => Promise.resolve()),
      createAlias: mock(() => Promise.resolve()),
    },
    categories: {
      update: mock(() => Promise.resolve()),
      moveToGroup: mock(() => Promise.resolve()),
      createAlias: mock(() => Promise.resolve()),
    },
    schedules: {
      update: mock(() => Promise.resolve()),
      skip: mock(() => Promise.resolve()),
      pause: mock(() => Promise.resolve()),
      resume: mock(() => Promise.resolve()),
    },
    budgets: {
      update: mock(() => Promise.resolve()),
      assignTransaction: mock(() => Promise.resolve()),
      rollover: mock(() => Promise.resolve()),
      pause: mock(() => Promise.resolve()),
    },
    notifications: {
      send: mock(() => Promise.resolve()),
    },
  };
}

function createTestContext(
  services: ActionExecutionContext["services"],
  overrides: Partial<ActionExecutionContext> = {}
): ActionExecutionContext {
  return {
    db: {} as any,
    workspaceId: 1,
    entityType: "transaction",
    services,
    ...overrides,
  };
}

describe("Action Executor Integration Tests", () => {
  let mockServices: ActionExecutionContext["services"];
  let context: ActionExecutionContext;

  beforeEach(() => {
    mockServices = createMockServices();
    context = createTestContext(mockServices);
  });

  // ==========================================================================
  // Transaction Actions
  // ==========================================================================

  describe("Transaction Actions", () => {
    describe("setCategory", () => {
      it("should update transaction category", async () => {
        const actions: ActionConfig[] = [
          { id: "a1", type: "setCategory", params: { categoryId: 5 } },
        ];
        const entity = { id: 123, categoryId: null };

        const results = await executeActions(actions, entity, "transaction", 123, context);

        expect(results).toHaveLength(1);
        expect(results[0].success).toBe(true);
        expect(results[0].actionType).toBe("setCategory");
        expect(results[0].changes?.categoryId).toEqual({ from: null, to: 5 });
        expect(mockServices.transactions.update).toHaveBeenCalledWith(
          123,
          { categoryId: 5 },
          context
        );
      });

      it("should fail without entity ID", async () => {
        const actions: ActionConfig[] = [
          { id: "a1", type: "setCategory", params: { categoryId: 5 } },
        ];
        const entity = { categoryId: null };

        const results = await executeActions(actions, entity, "transaction", undefined, context);

        expect(results[0].success).toBe(false);
        expect(results[0].error).toBe("No entity ID");
      });
    });

    describe("setPayee", () => {
      it("should update transaction payee", async () => {
        const actions: ActionConfig[] = [
          { id: "a1", type: "setPayee", params: { payeeId: 10 } },
        ];
        const entity = { id: 123, payeeId: 5 };

        const results = await executeActions(actions, entity, "transaction", 123, context);

        expect(results[0].success).toBe(true);
        expect(results[0].changes?.payeeId).toEqual({ from: 5, to: 10 });
      });
    });

    describe("setStatus", () => {
      it("should update transaction status", async () => {
        const actions: ActionConfig[] = [
          { id: "a1", type: "setStatus", params: { status: "cleared" } },
        ];
        const entity = { id: 123, status: "pending" };

        const results = await executeActions(actions, entity, "transaction", 123, context);

        expect(results[0].success).toBe(true);
        expect(results[0].changes?.status).toEqual({ from: "pending", to: "cleared" });
      });
    });

    describe("appendNotes", () => {
      it("should append text to existing notes", async () => {
        const actions: ActionConfig[] = [
          { id: "a1", type: "appendNotes", params: { text: "Auto-tagged" } },
        ];
        const entity = { id: 123, notes: "Original note" };

        const results = await executeActions(actions, entity, "transaction", 123, context);

        expect(results[0].success).toBe(true);
        expect(results[0].changes?.notes).toEqual({
          from: "Original note",
          to: "Original note\nAuto-tagged",
        });
      });

      it("should create notes when none exist", async () => {
        const actions: ActionConfig[] = [
          { id: "a1", type: "appendNotes", params: { text: "New note" } },
        ];
        const entity = { id: 123, notes: "" };

        const results = await executeActions(actions, entity, "transaction", 123, context);

        expect(results[0].changes?.notes).toEqual({ from: "", to: "New note" });
      });
    });

    describe("setNotes", () => {
      it("should replace notes", async () => {
        const actions: ActionConfig[] = [
          { id: "a1", type: "setNotes", params: { text: "Replacement note" } },
        ];
        const entity = { id: 123, notes: "Old note" };

        const results = await executeActions(actions, entity, "transaction", 123, context);

        expect(results[0].success).toBe(true);
        expect(results[0].changes?.notes).toEqual({
          from: "Old note",
          to: "Replacement note",
        });
      });
    });

    describe("markReviewed", () => {
      it("should add review flag to notes", async () => {
        const actions: ActionConfig[] = [{ id: "a1", type: "markReviewed", params: {} }];
        const entity = { id: 123, notes: "" };

        const results = await executeActions(actions, entity, "transaction", 123, context);

        expect(results[0].success).toBe(true);
        expect(results[0].changes?.notes?.to).toContain("[REVIEWED]");
      });

      it("should not duplicate review flag", async () => {
        const actions: ActionConfig[] = [{ id: "a1", type: "markReviewed", params: {} }];
        const entity = { id: 123, notes: "Note [REVIEWED]" };

        const results = await executeActions(actions, entity, "transaction", 123, context);

        expect(results[0].success).toBe(true);
        expect(results[0].changes).toBeUndefined(); // No changes made
      });
    });

    describe("assignToBudget", () => {
      it("should call budget assignment service", async () => {
        const actions: ActionConfig[] = [
          { id: "a1", type: "assignToBudget", params: { budgetId: 7 } },
        ];
        const entity = { id: 123 };

        const results = await executeActions(actions, entity, "transaction", 123, context);

        expect(results[0].success).toBe(true);
        expect(mockServices.budgets?.assignTransaction).toHaveBeenCalledWith(123, 7, context);
      });
    });
  });

  // ==========================================================================
  // Account Actions
  // ==========================================================================

  describe("Account Actions", () => {
    beforeEach(() => {
      context = createTestContext(mockServices, { entityType: "account" });
    });

    describe("updateAccountNotes", () => {
      it("should update account notes", async () => {
        const actions: ActionConfig[] = [
          { id: "a1", type: "updateAccountNotes", params: { text: "Updated notes" } },
        ];
        const entity = { id: 1, notes: "Old notes" };

        const results = await executeActions(actions, entity, "account", 1, context);

        expect(results[0].success).toBe(true);
        expect(mockServices.accounts?.update).toHaveBeenCalledWith(
          1,
          { notes: "Updated notes" },
          context
        );
      });
    });

    describe("setAccountDefaultCategory", () => {
      it("should set default category for account", async () => {
        const actions: ActionConfig[] = [
          { id: "a1", type: "setAccountDefaultCategory", params: { categoryId: 3 } },
        ];
        const entity = { id: 1, defaultCategoryId: null };

        const results = await executeActions(actions, entity, "account", 1, context);

        expect(results[0].success).toBe(true);
        expect(results[0].changes?.defaultCategoryId).toEqual({ from: null, to: 3 });
      });
    });

    describe("closeAccount", () => {
      it("should close account", async () => {
        const actions: ActionConfig[] = [{ id: "a1", type: "closeAccount", params: {} }];
        const entity = { id: 1 };

        const results = await executeActions(actions, entity, "account", 1, context);

        expect(results[0].success).toBe(true);
        expect(mockServices.accounts?.close).toHaveBeenCalledWith(1, context);
      });
    });
  });

  // ==========================================================================
  // Payee Actions
  // ==========================================================================

  describe("Payee Actions", () => {
    beforeEach(() => {
      context = createTestContext(mockServices, { entityType: "payee" });
    });

    describe("setPayeeDefaultCategory", () => {
      it("should set default category for payee", async () => {
        const actions: ActionConfig[] = [
          { id: "a1", type: "setPayeeDefaultCategory", params: { categoryId: 2 } },
        ];
        const entity = { id: 10, defaultCategoryId: null };

        const results = await executeActions(actions, entity, "payee", 10, context);

        expect(results[0].success).toBe(true);
        expect(mockServices.payees?.update).toHaveBeenCalledWith(
          10,
          { defaultCategoryId: 2 },
          context
        );
      });
    });

    describe("setIsSubscription", () => {
      it("should mark payee as subscription", async () => {
        const actions: ActionConfig[] = [
          { id: "a1", type: "setIsSubscription", params: { isSubscription: true } },
        ];
        const entity = { id: 10, isSubscription: false };

        const results = await executeActions(actions, entity, "payee", 10, context);

        expect(results[0].success).toBe(true);
        expect(results[0].changes?.isSubscription).toEqual({ from: false, to: true });
      });
    });

    describe("mergePayee", () => {
      it("should merge payee into target", async () => {
        const actions: ActionConfig[] = [
          { id: "a1", type: "mergePayee", params: { targetPayeeId: 20 } },
        ];
        const entity = { id: 10 };

        const results = await executeActions(actions, entity, "payee", 10, context);

        expect(results[0].success).toBe(true);
        expect(mockServices.payees?.merge).toHaveBeenCalledWith(10, 20, context);
      });
    });
  });

  // ==========================================================================
  // Category Actions
  // ==========================================================================

  describe("Category Actions", () => {
    beforeEach(() => {
      context = createTestContext(mockServices, { entityType: "category" });
    });

    describe("setCategoryHidden", () => {
      it("should hide category", async () => {
        const actions: ActionConfig[] = [
          { id: "a1", type: "setCategoryHidden", params: { isHidden: true } },
        ];
        const entity = { id: 5, isHidden: false };

        const results = await executeActions(actions, entity, "category", 5, context);

        expect(results[0].success).toBe(true);
        expect(results[0].changes?.isHidden).toEqual({ from: false, to: true });
      });
    });

    describe("setCategoryTaxDeductible", () => {
      it("should mark category as tax deductible", async () => {
        const actions: ActionConfig[] = [
          { id: "a1", type: "setCategoryTaxDeductible", params: { isTaxDeductible: true } },
        ];
        const entity = { id: 5, isTaxDeductible: false };

        const results = await executeActions(actions, entity, "category", 5, context);

        expect(results[0].success).toBe(true);
        expect(results[0].changes?.isTaxDeductible).toEqual({ from: false, to: true });
      });
    });

    describe("moveCategoryToGroup", () => {
      it("should move category to new group", async () => {
        const actions: ActionConfig[] = [
          { id: "a1", type: "moveCategoryToGroup", params: { groupId: 3 } },
        ];
        const entity = { id: 5, groupId: 1 };

        const results = await executeActions(actions, entity, "category", 5, context);

        expect(results[0].success).toBe(true);
        expect(mockServices.categories?.moveToGroup).toHaveBeenCalledWith(5, 3, context);
      });
    });
  });

  // ==========================================================================
  // Schedule Actions
  // ==========================================================================

  describe("Schedule Actions", () => {
    beforeEach(() => {
      context = createTestContext(mockServices, { entityType: "schedule" });
    });

    describe("enableScheduleAutoAdd", () => {
      it("should enable auto-add for schedule", async () => {
        const actions: ActionConfig[] = [
          { id: "a1", type: "enableScheduleAutoAdd", params: { autoAdd: true } },
        ];
        const entity = { id: 8, autoAdd: false };

        const results = await executeActions(actions, entity, "schedule", 8, context);

        expect(results[0].success).toBe(true);
        expect(results[0].changes?.autoAdd).toEqual({ from: false, to: true });
      });
    });

    describe("skipSchedule", () => {
      it("should skip schedule occurrence", async () => {
        const actions: ActionConfig[] = [
          { id: "a1", type: "skipSchedule", params: { reason: "Holiday" } },
        ];
        const entity = { id: 8 };

        const results = await executeActions(actions, entity, "schedule", 8, context);

        expect(results[0].success).toBe(true);
        expect(mockServices.schedules?.skip).toHaveBeenCalledWith(8, "Holiday", context);
      });
    });

    describe("pauseSchedule", () => {
      it("should pause schedule", async () => {
        const actions: ActionConfig[] = [{ id: "a1", type: "pauseSchedule", params: {} }];
        const entity = { id: 8 };

        const results = await executeActions(actions, entity, "schedule", 8, context);

        expect(results[0].success).toBe(true);
        expect(mockServices.schedules?.pause).toHaveBeenCalledWith(8, context);
      });
    });

    describe("resumeSchedule", () => {
      it("should resume schedule", async () => {
        const actions: ActionConfig[] = [{ id: "a1", type: "resumeSchedule", params: {} }];
        const entity = { id: 8 };

        const results = await executeActions(actions, entity, "schedule", 8, context);

        expect(results[0].success).toBe(true);
        expect(mockServices.schedules?.resume).toHaveBeenCalledWith(8, context);
      });
    });
  });

  // ==========================================================================
  // Budget Actions
  // ==========================================================================

  describe("Budget Actions", () => {
    beforeEach(() => {
      context = createTestContext(mockServices, { entityType: "budget" });
    });

    describe("adjustBudgetLimit", () => {
      it("should adjust budget limit", async () => {
        const actions: ActionConfig[] = [
          { id: "a1", type: "adjustBudgetLimit", params: { amount: 500 } },
        ];
        const entity = { id: 3, targetAmount: 300 };

        const results = await executeActions(actions, entity, "budget", 3, context);

        expect(results[0].success).toBe(true);
        expect(results[0].changes?.targetAmount).toEqual({ from: 300, to: 500 });
      });
    });

    describe("rolloverBudget", () => {
      it("should rollover budget", async () => {
        const actions: ActionConfig[] = [{ id: "a1", type: "rolloverBudget", params: {} }];
        const entity = { id: 3 };

        const results = await executeActions(actions, entity, "budget", 3, context);

        expect(results[0].success).toBe(true);
        expect(mockServices.budgets?.rollover).toHaveBeenCalledWith(3, context);
      });
    });

    describe("pauseBudget", () => {
      it("should pause budget", async () => {
        const actions: ActionConfig[] = [{ id: "a1", type: "pauseBudget", params: {} }];
        const entity = { id: 3 };

        const results = await executeActions(actions, entity, "budget", 3, context);

        expect(results[0].success).toBe(true);
        expect(mockServices.budgets?.pause).toHaveBeenCalledWith(3, context);
      });
    });
  });

  // ==========================================================================
  // Universal Actions
  // ==========================================================================

  describe("Universal Actions", () => {
    describe("sendNotification", () => {
      it("should send notification with interpolated message", async () => {
        const actions: ActionConfig[] = [
          { id: "a1", type: "sendNotification", params: { message: "Amount: {{amount}}" } },
        ];
        const entity = { id: 123, amount: 150 };

        const results = await executeActions(actions, entity, "transaction", 123, context);

        expect(results[0].success).toBe(true);
        expect(mockServices.notifications?.send).toHaveBeenCalledWith({
          userId: undefined,
          message: "Amount: 150",
          type: "automation",
          entityType: "transaction",
          entityId: 123,
        });
      });

      it("should handle missing template variables", async () => {
        const actions: ActionConfig[] = [
          { id: "a1", type: "sendNotification", params: { message: "Missing: {{unknown}}" } },
        ];
        const entity = { id: 123 };

        const results = await executeActions(actions, entity, "transaction", 123, context);

        expect(results[0].success).toBe(true);
        expect(mockServices.notifications?.send).toHaveBeenCalledWith(
          expect.objectContaining({ message: "Missing: {{unknown}}" })
        );
      });
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  describe("Error Handling", () => {
    it("should return error for unknown action type", async () => {
      const actions: ActionConfig[] = [
        { id: "a1", type: "unknownAction", params: {} },
      ];
      const entity = { id: 123 };

      const results = await executeActions(actions, entity, "transaction", 123, context);

      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain("Unknown action type");
    });

    it("should stop on first error when continueOnError is false", async () => {
      const actions: ActionConfig[] = [
        { id: "a1", type: "setCategory", params: { categoryId: 5 } },
        { id: "a2", type: "setPayee", params: { payeeId: 10 } },
      ];
      const entity = { id: 123 };

      // First action will fail (no entity ID when we pass undefined)
      const results = await executeActions(actions, entity, "transaction", undefined, context);

      expect(results).toHaveLength(1); // Only first action attempted
      expect(results[0].success).toBe(false);
    });

    it("should continue after error when continueOnError is true", async () => {
      const actions: ActionConfig[] = [
        { id: "a1", type: "setCategory", params: { categoryId: 5 }, continueOnError: true },
        { id: "a2", type: "setPayee", params: { payeeId: 10 } },
      ];
      const entity = { id: 123 };

      // First action fails but has continueOnError
      const results = await executeActions(actions, entity, "transaction", undefined, context);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(false);
      expect(results[1].success).toBe(false); // Also fails, but was attempted
    });

    it("should catch and handle service errors", async () => {
      const errorServices = createMockServices();
      errorServices.transactions.update = mock(() => {
        throw new Error("Database connection failed");
      });
      const ctx = createTestContext(errorServices);

      const actions: ActionConfig[] = [
        { id: "a1", type: "setCategory", params: { categoryId: 5 } },
      ];
      const entity = { id: 123 };

      const results = await executeActions(actions, entity, "transaction", 123, ctx);

      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe("Database connection failed");
    });
  });

  // ==========================================================================
  // Dry Run Mode
  // ==========================================================================

  describe("Dry Run Mode", () => {
    it("should not execute actions in dry run mode", async () => {
      const ctx = createTestContext(mockServices, { dryRun: true });
      const actions: ActionConfig[] = [
        { id: "a1", type: "setCategory", params: { categoryId: 5 } },
      ];
      const entity = { id: 123 };

      const results = await executeActions(actions, entity, "transaction", 123, ctx);

      expect(results[0].success).toBe(true);
      expect(results[0].changes?._dryRun).toEqual({ from: false, to: true });
      expect(mockServices.transactions.update).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Multiple Actions
  // ==========================================================================

  describe("Multiple Actions", () => {
    it("should execute multiple actions in sequence", async () => {
      const executionOrder: string[] = [];
      mockServices.transactions.update = mock(async (id, data) => {
        executionOrder.push(Object.keys(data)[0]);
      });

      const actions: ActionConfig[] = [
        { id: "a1", type: "setCategory", params: { categoryId: 5 } },
        { id: "a2", type: "setPayee", params: { payeeId: 10 } },
        { id: "a3", type: "setStatus", params: { status: "cleared" } },
      ];
      const entity = { id: 123 };

      const results = await executeActions(actions, entity, "transaction", 123, context);

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.success)).toBe(true);
      expect(executionOrder).toEqual(["categoryId", "payeeId", "status"]);
    });

    it("should include action IDs in results", async () => {
      const actions: ActionConfig[] = [
        { id: "action-1", type: "setCategory", params: { categoryId: 5 } },
        { id: "action-2", type: "setPayee", params: { payeeId: 10 } },
      ];
      const entity = { id: 123 };

      const results = await executeActions(actions, entity, "transaction", 123, context);

      expect(results[0].actionId).toBe("action-1");
      expect(results[1].actionId).toBe("action-2");
    });
  });
});
