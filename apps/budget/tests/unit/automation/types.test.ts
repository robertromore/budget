/**
 * Automation Types Unit Tests
 *
 * Tests for type definitions, type guards, and data lookup functions.
 */

import { describe, it, expect } from "bun:test";
import {
  entityTypes,
  getEntityTypeLabel,
  triggerEvents,
  conditionFields,
  operatorInfo,
  actionDefinitions,
  getActionsForEntity,
  isConditionGroup,
  type EntityType,
  type Condition,
  type ConditionGroup,
  type ConditionOperator,
} from "$lib/types/automation";

// =============================================================================
// Entity Types
// =============================================================================

describe("Entity Types", () => {
  it("should have all expected entity types defined", () => {
    const expectedTypes: EntityType[] = [
      "transaction",
      "account",
      "payee",
      "category",
      "schedule",
      "budget",
    ];

    expectedTypes.forEach((type) => {
      const found = entityTypes.find((t) => t.value === type);
      expect(found).toBeDefined();
      expect(found?.label).toBeTruthy();
    });
  });

  it("should have 6 entity types total", () => {
    expect(entityTypes).toHaveLength(6);
  });

  describe("getEntityTypeLabel", () => {
    it("should return label for transaction", () => {
      expect(getEntityTypeLabel("transaction")).toBe("Transaction");
    });

    it("should return label for account", () => {
      expect(getEntityTypeLabel("account")).toBe("Account");
    });

    it("should return label for payee", () => {
      expect(getEntityTypeLabel("payee")).toBe("Payee");
    });

    it("should return label for category", () => {
      expect(getEntityTypeLabel("category")).toBe("Category");
    });

    it("should return label for schedule", () => {
      expect(getEntityTypeLabel("schedule")).toBe("Schedule");
    });

    it("should return label for budget", () => {
      expect(getEntityTypeLabel("budget")).toBe("Budget");
    });

    it("should return the value itself for unknown entity type", () => {
      expect(getEntityTypeLabel("unknown" as EntityType)).toBe("unknown");
    });
  });
});

// =============================================================================
// Trigger Events
// =============================================================================

describe("Trigger Events", () => {
  it("should have events defined for all entity types", () => {
    const types: EntityType[] = ["transaction", "account", "payee", "category", "schedule", "budget"];
    types.forEach((type) => {
      expect(triggerEvents[type]).toBeDefined();
      expect(Array.isArray(triggerEvents[type])).toBe(true);
      expect(triggerEvents[type].length).toBeGreaterThan(0);
    });
  });

  describe("Transaction events", () => {
    it("should have expected transaction events", () => {
      const events = triggerEvents.transaction.map((e) => e.event);
      expect(events).toContain("created");
      expect(events).toContain("updated");
      expect(events).toContain("deleted");
      expect(events).toContain("imported");
      expect(events).toContain("categorized");
      expect(events).toContain("cleared");
    });

    it("should have proper structure for each event", () => {
      triggerEvents.transaction.forEach((event) => {
        expect(event.entityType).toBe("transaction");
        expect(event.event).toBeTruthy();
        expect(event.label).toBeTruthy();
        expect(event.description).toBeTruthy();
      });
    });
  });

  describe("Account events", () => {
    it("should have expected account events", () => {
      const events = triggerEvents.account.map((e) => e.event);
      expect(events).toContain("created");
      expect(events).toContain("updated");
      expect(events).toContain("balanceChanged");
      expect(events).toContain("reconciled");
    });
  });

  describe("Budget events", () => {
    it("should have expected budget events", () => {
      const events = triggerEvents.budget.map((e) => e.event);
      expect(events).toContain("created");
      expect(events).toContain("updated");
      expect(events).toContain("overspent");
      expect(events).toContain("threshold");
      expect(events).toContain("periodReset");
    });
  });
});

// =============================================================================
// Condition Fields
// =============================================================================

describe("Condition Fields", () => {
  it("should have fields defined for all entity types", () => {
    const types: EntityType[] = ["transaction", "account", "payee", "category", "schedule", "budget"];
    types.forEach((type) => {
      expect(conditionFields[type]).toBeDefined();
      expect(Array.isArray(conditionFields[type])).toBe(true);
      expect(conditionFields[type].length).toBeGreaterThan(0);
    });
  });

  describe("Transaction condition fields", () => {
    it("should have expected fields", () => {
      const fields = conditionFields.transaction.map((f) => f.field);
      expect(fields).toContain("amount");
      expect(fields).toContain("date");
      expect(fields).toContain("status");
      expect(fields).toContain("notes");
      expect(fields).toContain("payeeId");
      expect(fields).toContain("categoryId");
    });

    it("should have proper structure for each field", () => {
      conditionFields.transaction.forEach((field) => {
        expect(field.field).toBeTruthy();
        expect(field.label).toBeTruthy();
        expect(["string", "number", "boolean", "date", "enum", "reference"]).toContain(field.type);
        expect(Array.isArray(field.operators)).toBe(true);
        expect(field.operators.length).toBeGreaterThan(0);
      });
    });

    it("should have operators appropriate for field types", () => {
      const amountField = conditionFields.transaction.find((f) => f.field === "amount");
      expect(amountField?.operators).toContain("greaterThan");
      expect(amountField?.operators).toContain("lessThan");
      expect(amountField?.operators).toContain("between");

      const notesField = conditionFields.transaction.find((f) => f.field === "notes");
      expect(notesField?.operators).toContain("contains");
      expect(notesField?.operators).toContain("isEmpty");
    });

    it("should have reference type for payeeId", () => {
      const payeeField = conditionFields.transaction.find((f) => f.field === "payeeId");
      expect(payeeField?.type).toBe("reference");
      expect(payeeField?.referenceType).toBe("payee");
    });
  });
});

// =============================================================================
// Operator Info
// =============================================================================

describe("Operator Info", () => {
  const allOperators: ConditionOperator[] = [
    "equals", "notEquals", "contains", "startsWith", "endsWith", "matches",
    "greaterThan", "lessThan", "greaterThanOrEquals", "lessThanOrEquals",
    "between", "in", "inGroup", "isNull", "isEmpty", "before", "after",
    "within", "dayOfWeek", "dayOfMonth",
  ];

  it("should have info for all operators", () => {
    allOperators.forEach((op) => {
      expect(operatorInfo[op]).toBeDefined();
    });
  });

  it("should have proper structure for each operator", () => {
    allOperators.forEach((op) => {
      const info = operatorInfo[op];
      expect(info.operator).toBe(op);
      expect(info.label).toBeTruthy();
      expect(info.description).toBeTruthy();
      expect([0, 1, 2]).toContain(info.valueCount);
    });
  });

  it("should have correct value counts", () => {
    // Zero-value operators
    expect(operatorInfo.isNull.valueCount).toBe(0);
    expect(operatorInfo.isEmpty.valueCount).toBe(0);

    // Single-value operators
    expect(operatorInfo.equals.valueCount).toBe(1);
    expect(operatorInfo.contains.valueCount).toBe(1);
    expect(operatorInfo.greaterThan.valueCount).toBe(1);

    // Two-value operators
    expect(operatorInfo.between.valueCount).toBe(2);
  });

  it("should have value types where appropriate", () => {
    expect(operatorInfo.contains.valueType).toBe("string");
    expect(operatorInfo.greaterThan.valueType).toBe("number");
    expect(operatorInfo.before.valueType).toBe("date");
    expect(operatorInfo.in.valueType).toBe("array");
  });
});

// =============================================================================
// Action Definitions
// =============================================================================

describe("Action Definitions", () => {
  it("should have at least one action defined", () => {
    expect(actionDefinitions.length).toBeGreaterThan(0);
  });

  it("should have proper structure for each action", () => {
    actionDefinitions.forEach((action) => {
      expect(action.type).toBeTruthy();
      expect(action.label).toBeTruthy();
      expect(action.description).toBeTruthy();
      expect(Array.isArray(action.entityTypes)).toBe(true);
      expect(action.entityTypes.length).toBeGreaterThan(0);
      expect(Array.isArray(action.params)).toBe(true);
    });
  });

  it("should have transaction-specific actions", () => {
    const transactionActions = actionDefinitions.filter((a) =>
      a.entityTypes.includes("transaction")
    );
    const types = transactionActions.map((a) => a.type);

    expect(types).toContain("setCategory");
    expect(types).toContain("setPayee");
    expect(types).toContain("setStatus");
    expect(types).toContain("appendNotes");
  });

  it("should have universal actions available for multiple entities", () => {
    const sendNotification = actionDefinitions.find((a) => a.type === "sendNotification");
    expect(sendNotification).toBeDefined();
    expect(sendNotification?.entityTypes.length).toBeGreaterThan(1);
  });

  describe("getActionsForEntity", () => {
    it("should return actions for transaction entity", () => {
      const actions = getActionsForEntity("transaction");
      expect(actions.length).toBeGreaterThan(0);
      actions.forEach((action) => {
        expect(action.entityTypes).toContain("transaction");
      });
    });

    it("should return actions for account entity", () => {
      const actions = getActionsForEntity("account");
      expect(actions.length).toBeGreaterThan(0);
      actions.forEach((action) => {
        expect(action.entityTypes).toContain("account");
      });
    });

    it("should return different actions for different entities", () => {
      const transactionActions = getActionsForEntity("transaction");
      const accountActions = getActionsForEntity("account");

      // Should have some unique actions
      const transactionTypes = transactionActions.map((a) => a.type);
      expect(transactionTypes).toContain("setCategory");
      expect(transactionTypes).not.toContain("closeAccount");

      const accountTypes = accountActions.map((a) => a.type);
      expect(accountTypes).toContain("closeAccount");
      expect(accountTypes).not.toContain("setCategory");
    });
  });
});

// =============================================================================
// Type Guards
// =============================================================================

describe("Type Guards", () => {
  describe("isConditionGroup", () => {
    it("should return true for AND condition group", () => {
      const group: ConditionGroup = {
        id: "group-1",
        operator: "AND",
        conditions: [],
      };
      expect(isConditionGroup(group)).toBe(true);
    });

    it("should return true for OR condition group", () => {
      const group: ConditionGroup = {
        id: "group-1",
        operator: "OR",
        conditions: [],
      };
      expect(isConditionGroup(group)).toBe(true);
    });

    it("should return false for single condition", () => {
      const condition: Condition = {
        id: "condition-1",
        field: "amount",
        operator: "equals",
        value: 100,
      };
      expect(isConditionGroup(condition)).toBe(false);
    });

    it("should return false for condition with operator field (not AND/OR)", () => {
      const condition: Condition = {
        id: "condition-1",
        field: "amount",
        operator: "greaterThan",
        value: 100,
      };
      expect(isConditionGroup(condition)).toBe(false);
    });

    it("should correctly distinguish nested structures", () => {
      const nestedGroup: ConditionGroup = {
        id: "group-1",
        operator: "AND",
        conditions: [
          {
            id: "condition-1",
            field: "amount",
            operator: "equals",
            value: 100,
          },
          {
            id: "group-2",
            operator: "OR",
            conditions: [],
          },
        ],
      };

      expect(isConditionGroup(nestedGroup)).toBe(true);
      expect(isConditionGroup(nestedGroup.conditions[0])).toBe(false);
      expect(isConditionGroup(nestedGroup.conditions[1])).toBe(true);
    });
  });
});

// =============================================================================
// Action Parameters
// =============================================================================

describe("Action Parameters", () => {
  it("should have proper parameter structure", () => {
    actionDefinitions.forEach((action) => {
      action.params.forEach((param) => {
        expect(param.name).toBeTruthy();
        expect(param.label).toBeTruthy();
        expect(["string", "number", "boolean", "reference", "enum", "text"]).toContain(param.type);
        expect(typeof param.required).toBe("boolean");
      });
    });
  });

  it("should have reference type for category parameters", () => {
    const setCategoryAction = actionDefinitions.find((a) => a.type === "setCategory");
    expect(setCategoryAction).toBeDefined();

    const categoryParam = setCategoryAction?.params.find((p) => p.name === "categoryId");
    expect(categoryParam?.type).toBe("reference");
    expect(categoryParam?.referenceType).toBe("category");
    expect(categoryParam?.required).toBe(true);
  });

  it("should have enum type for status parameters", () => {
    const setStatusAction = actionDefinitions.find((a) => a.type === "setStatus");
    expect(setStatusAction).toBeDefined();

    const statusParam = setStatusAction?.params.find((p) => p.name === "status");
    expect(statusParam?.type).toBe("enum");
    expect(statusParam?.enumValues).toContain("cleared");
    expect(statusParam?.enumValues).toContain("pending");
  });

  it("should have actions with no required parameters", () => {
    const markReviewed = actionDefinitions.find((a) => a.type === "markReviewed");
    expect(markReviewed).toBeDefined();
    expect(markReviewed?.params).toHaveLength(0);
  });
});
