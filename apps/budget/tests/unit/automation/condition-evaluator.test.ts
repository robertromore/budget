/**
 * Condition Evaluator Unit Tests
 *
 * Comprehensive tests for all condition operators, group logic,
 * negation, deep field access, and edge cases.
 */

import { describe, it, expect } from "bun:test";
import {
  evaluateCondition,
  evaluateConditionGroup,
  getFieldValue,
} from "$lib/server/domains/automation/condition-evaluator";
import {
  createTestCondition,
  createTestConditionGroup,
  createEmptyConditionGroup,
  createTestTransaction,
  createTestAccount,
  createTestPayee,
  createTestCategory,
  createTestEvaluationContext,
  createDateString,
  createRelativeDate,
} from "../../utils/automation-test-helpers";

// =============================================================================
// String Operators
// =============================================================================

describe("String Operators", () => {
  describe("equals", () => {
    it("should match exact string (case insensitive)", () => {
      const condition = createTestCondition("name", "equals", "Amazon");
      const entity = createTestPayee({ name: "amazon" });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should match exact string (same case)", () => {
      const condition = createTestCondition("name", "equals", "Amazon");
      const entity = createTestPayee({ name: "Amazon" });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should not match different strings", () => {
      const condition = createTestCondition("name", "equals", "Amazon");
      const entity = createTestPayee({ name: "Netflix" });
      expect(evaluateCondition(condition, entity)).toBe(false);
    });

    it("should not match partial strings", () => {
      const condition = createTestCondition("name", "equals", "Amazon");
      const entity = createTestPayee({ name: "Amazon Prime" });
      expect(evaluateCondition(condition, entity)).toBe(false);
    });

    it("should match empty strings", () => {
      const condition = createTestCondition("notes", "equals", "");
      const entity = createTestTransaction({ notes: "" });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });
  });

  describe("notEquals", () => {
    it("should not match equal strings", () => {
      const condition = createTestCondition("name", "notEquals", "Amazon");
      const entity = createTestPayee({ name: "Amazon" });
      expect(evaluateCondition(condition, entity)).toBe(false);
    });

    it("should match different strings", () => {
      const condition = createTestCondition("name", "notEquals", "Amazon");
      const entity = createTestPayee({ name: "Netflix" });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });
  });

  describe("contains", () => {
    it("should match substring (case insensitive)", () => {
      const condition = createTestCondition("originalPayeeName", "contains", "amazon");
      const entity = createTestTransaction({ originalPayeeName: "AMAZON.COM*MKT" });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should match substring at start", () => {
      const condition = createTestCondition("name", "contains", "Ama");
      const entity = createTestPayee({ name: "Amazon" });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should match substring at end", () => {
      const condition = createTestCondition("name", "contains", "zon");
      const entity = createTestPayee({ name: "Amazon" });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should not match non-existent substring", () => {
      const condition = createTestCondition("name", "contains", "Netflix");
      const entity = createTestPayee({ name: "Amazon" });
      expect(evaluateCondition(condition, entity)).toBe(false);
    });

    it("should return false for non-string field", () => {
      const condition = createTestCondition("amount", "contains", "50");
      const entity = createTestTransaction({ amount: -50 });
      expect(evaluateCondition(condition, entity)).toBe(false);
    });

    it("should handle empty search string", () => {
      const condition = createTestCondition("name", "contains", "");
      const entity = createTestPayee({ name: "Amazon" });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });
  });

  describe("startsWith", () => {
    it("should match string that starts with value (case insensitive)", () => {
      const condition = createTestCondition("originalPayeeName", "startsWith", "amazon");
      const entity = createTestTransaction({ originalPayeeName: "AMAZON.COM" });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should not match string that does not start with value", () => {
      const condition = createTestCondition("name", "startsWith", "Net");
      const entity = createTestPayee({ name: "Amazon" });
      expect(evaluateCondition(condition, entity)).toBe(false);
    });

    it("should match full string", () => {
      const condition = createTestCondition("name", "startsWith", "Amazon");
      const entity = createTestPayee({ name: "Amazon" });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });
  });

  describe("endsWith", () => {
    it("should match string that ends with value (case insensitive)", () => {
      const condition = createTestCondition("originalPayeeName", "endsWith", ".com");
      const entity = createTestTransaction({ originalPayeeName: "AMAZON.COM" });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should not match string that does not end with value", () => {
      const condition = createTestCondition("name", "endsWith", "flix");
      const entity = createTestPayee({ name: "Amazon" });
      expect(evaluateCondition(condition, entity)).toBe(false);
    });

    it("should match full string", () => {
      const condition = createTestCondition("name", "endsWith", "Amazon");
      const entity = createTestPayee({ name: "Amazon" });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });
  });

  describe("matches (regex)", () => {
    it("should match simple regex pattern", () => {
      const condition = createTestCondition("originalPayeeName", "matches", "^AMAZON.*");
      const entity = createTestTransaction({ originalPayeeName: "AMAZON.COM*MKT" });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should match regex with groups", () => {
      const condition = createTestCondition("name", "matches", "(Amazon|Netflix)");
      const entity = createTestPayee({ name: "Amazon" });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should not match when regex does not match", () => {
      const condition = createTestCondition("name", "matches", "^Netflix.*");
      const entity = createTestPayee({ name: "Amazon" });
      expect(evaluateCondition(condition, entity)).toBe(false);
    });

    it("should handle case-insensitive regex", () => {
      const condition = createTestCondition("name", "matches", "amazon");
      const entity = createTestPayee({ name: "AMAZON" });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should return false for invalid regex", () => {
      const condition = createTestCondition("name", "matches", "[invalid");
      const entity = createTestPayee({ name: "Amazon" });
      expect(evaluateCondition(condition, entity)).toBe(false);
    });
  });

  describe("isEmpty", () => {
    it("should return true for empty string", () => {
      const condition = createTestCondition("notes", "isEmpty", null);
      const entity = createTestTransaction({ notes: "" });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should return true for whitespace-only string", () => {
      const condition = createTestCondition("notes", "isEmpty", null);
      const entity = createTestTransaction({ notes: "   " });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should return false for non-empty string", () => {
      const condition = createTestCondition("notes", "isEmpty", null);
      const entity = createTestTransaction({ notes: "Some notes" });
      expect(evaluateCondition(condition, entity)).toBe(false);
    });

    it("should return true for null value", () => {
      const condition = createTestCondition("notes", "isEmpty", null);
      const entity = { notes: null };
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should return true for undefined value", () => {
      const condition = createTestCondition("notes", "isEmpty", null);
      const entity = {};
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should return true for empty array", () => {
      const condition = createTestCondition("tags", "isEmpty", null);
      const entity = { tags: [] };
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should return false for non-empty array", () => {
      const condition = createTestCondition("tags", "isEmpty", null);
      const entity = { tags: ["important"] };
      expect(evaluateCondition(condition, entity)).toBe(false);
    });
  });
});

// =============================================================================
// Number Operators
// =============================================================================

describe("Number Operators", () => {
  describe("equals (number)", () => {
    it("should match equal numbers", () => {
      const condition = createTestCondition("amount", "equals", -50);
      const entity = createTestTransaction({ amount: -50 });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should match with string number comparison", () => {
      const condition = createTestCondition("amount", "equals", "-50");
      const entity = createTestTransaction({ amount: -50 });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should not match different numbers", () => {
      const condition = createTestCondition("amount", "equals", -100);
      const entity = createTestTransaction({ amount: -50 });
      expect(evaluateCondition(condition, entity)).toBe(false);
    });

    it("should handle zero", () => {
      const condition = createTestCondition("amount", "equals", 0);
      const entity = createTestTransaction({ amount: 0 });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should handle decimals", () => {
      const condition = createTestCondition("amount", "equals", -50.99);
      const entity = createTestTransaction({ amount: -50.99 });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });
  });

  describe("greaterThan", () => {
    it("should return true when value is greater", () => {
      const condition = createTestCondition("amount", "greaterThan", -100);
      const entity = createTestTransaction({ amount: -50 });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should return false when value is equal", () => {
      const condition = createTestCondition("amount", "greaterThan", -50);
      const entity = createTestTransaction({ amount: -50 });
      expect(evaluateCondition(condition, entity)).toBe(false);
    });

    it("should return false when value is less", () => {
      const condition = createTestCondition("amount", "greaterThan", 0);
      const entity = createTestTransaction({ amount: -50 });
      expect(evaluateCondition(condition, entity)).toBe(false);
    });

    it("should handle positive numbers", () => {
      const condition = createTestCondition("balance", "greaterThan", 1000);
      const entity = createTestAccount({ balance: 1500 });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should return false for non-numeric field", () => {
      const condition = createTestCondition("name", "greaterThan", 100);
      const entity = createTestPayee({ name: "Amazon" });
      expect(evaluateCondition(condition, entity)).toBe(false);
    });
  });

  describe("lessThan", () => {
    it("should return true when value is less", () => {
      const condition = createTestCondition("amount", "lessThan", 0);
      const entity = createTestTransaction({ amount: -50 });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should return false when value is equal", () => {
      const condition = createTestCondition("amount", "lessThan", -50);
      const entity = createTestTransaction({ amount: -50 });
      expect(evaluateCondition(condition, entity)).toBe(false);
    });

    it("should return false when value is greater", () => {
      const condition = createTestCondition("balance", "lessThan", 1000);
      const entity = createTestAccount({ balance: 1500 });
      expect(evaluateCondition(condition, entity)).toBe(false);
    });
  });

  describe("greaterThanOrEquals", () => {
    it("should return true when value is greater", () => {
      const condition = createTestCondition("balance", "greaterThanOrEquals", 1000);
      const entity = createTestAccount({ balance: 1500 });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should return true when value is equal", () => {
      const condition = createTestCondition("balance", "greaterThanOrEquals", 1500);
      const entity = createTestAccount({ balance: 1500 });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should return false when value is less", () => {
      const condition = createTestCondition("balance", "greaterThanOrEquals", 2000);
      const entity = createTestAccount({ balance: 1500 });
      expect(evaluateCondition(condition, entity)).toBe(false);
    });
  });

  describe("lessThanOrEquals", () => {
    it("should return true when value is less", () => {
      const condition = createTestCondition("balance", "lessThanOrEquals", 2000);
      const entity = createTestAccount({ balance: 1500 });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should return true when value is equal", () => {
      const condition = createTestCondition("balance", "lessThanOrEquals", 1500);
      const entity = createTestAccount({ balance: 1500 });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should return false when value is greater", () => {
      const condition = createTestCondition("balance", "lessThanOrEquals", 1000);
      const entity = createTestAccount({ balance: 1500 });
      expect(evaluateCondition(condition, entity)).toBe(false);
    });
  });

  describe("between", () => {
    it("should return true when value is within range", () => {
      const condition = createTestCondition("balance", "between", 1000, { value2: 2000 });
      const entity = createTestAccount({ balance: 1500 });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should return true when value equals min", () => {
      const condition = createTestCondition("balance", "between", 1000, { value2: 2000 });
      const entity = createTestAccount({ balance: 1000 });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should return true when value equals max", () => {
      const condition = createTestCondition("balance", "between", 1000, { value2: 2000 });
      const entity = createTestAccount({ balance: 2000 });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should return false when value is below range", () => {
      const condition = createTestCondition("balance", "between", 1000, { value2: 2000 });
      const entity = createTestAccount({ balance: 500 });
      expect(evaluateCondition(condition, entity)).toBe(false);
    });

    it("should return false when value is above range", () => {
      const condition = createTestCondition("balance", "between", 1000, { value2: 2000 });
      const entity = createTestAccount({ balance: 2500 });
      expect(evaluateCondition(condition, entity)).toBe(false);
    });

    it("should handle negative ranges", () => {
      const condition = createTestCondition("amount", "between", -100, { value2: -10 });
      const entity = createTestTransaction({ amount: -50 });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should return false when value2 is missing", () => {
      const condition = createTestCondition("balance", "between", 1000);
      const entity = createTestAccount({ balance: 1500 });
      expect(evaluateCondition(condition, entity)).toBe(false);
    });
  });
});

// =============================================================================
// Date Operators
// =============================================================================

describe("Date Operators", () => {
  describe("before", () => {
    it("should return true when date is before", () => {
      const condition = createTestCondition("date", "before", "2024-02-01");
      const entity = createTestTransaction({ date: "2024-01-15" });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should return false when date is equal", () => {
      const condition = createTestCondition("date", "before", "2024-01-15");
      const entity = createTestTransaction({ date: "2024-01-15" });
      expect(evaluateCondition(condition, entity)).toBe(false);
    });

    it("should return false when date is after", () => {
      const condition = createTestCondition("date", "before", "2024-01-01");
      const entity = createTestTransaction({ date: "2024-01-15" });
      expect(evaluateCondition(condition, entity)).toBe(false);
    });

    it("should handle Date objects", () => {
      const condition = createTestCondition("date", "before", new Date("2024-02-01"));
      const entity = { date: new Date("2024-01-15") };
      expect(evaluateCondition(condition, entity)).toBe(true);
    });
  });

  describe("after", () => {
    it("should return true when date is after", () => {
      const condition = createTestCondition("date", "after", "2024-01-01");
      const entity = createTestTransaction({ date: "2024-01-15" });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should return false when date is equal", () => {
      const condition = createTestCondition("date", "after", "2024-01-15");
      const entity = createTestTransaction({ date: "2024-01-15" });
      expect(evaluateCondition(condition, entity)).toBe(false);
    });

    it("should return false when date is before", () => {
      const condition = createTestCondition("date", "after", "2024-02-01");
      const entity = createTestTransaction({ date: "2024-01-15" });
      expect(evaluateCondition(condition, entity)).toBe(false);
    });
  });

  describe("within", () => {
    it("should return true when date is within N days from today", () => {
      const condition = createTestCondition("nextOccurrence", "within", 30);
      const entity = { nextOccurrence: createRelativeDate(15) };
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should return false when date is past", () => {
      const condition = createTestCondition("nextOccurrence", "within", 30);
      const entity = { nextOccurrence: createRelativeDate(-5) };
      expect(evaluateCondition(condition, entity)).toBe(false);
    });

    it("should return false when date is beyond N days", () => {
      const condition = createTestCondition("nextOccurrence", "within", 7);
      const entity = { nextOccurrence: createRelativeDate(15) };
      expect(evaluateCondition(condition, entity)).toBe(false);
    });

    it("should return true for date later today", () => {
      const condition = createTestCondition("nextOccurrence", "within", 1);
      // Create a date 1 hour from now (ensures it's in the future)
      const futureToday = new Date();
      futureToday.setHours(futureToday.getHours() + 1);
      const entity = { nextOccurrence: futureToday };
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should return false for date earlier today (already passed)", () => {
      const condition = createTestCondition("nextOccurrence", "within", 1);
      // midnight today is in the past relative to current time
      const entity = { nextOccurrence: createRelativeDate(0) };
      // This returns false because the date at midnight is before now
      expect(evaluateCondition(condition, entity)).toBe(false);
    });
  });

  describe("dayOfWeek", () => {
    it("should match day by number", () => {
      // Create a date that falls on a Monday (1)
      const entity = { date: "2024-01-15" }; // This is a Monday
      const condition = createTestCondition("date", "dayOfWeek", [1]); // Monday = 1
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should match day by name", () => {
      const entity = { date: "2024-01-15" }; // Monday
      const condition = createTestCondition("date", "dayOfWeek", ["monday"]);
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should match multiple days", () => {
      const entity = { date: "2024-01-15" }; // Monday
      const condition = createTestCondition("date", "dayOfWeek", ["monday", "friday"]);
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should not match when day is not in list", () => {
      const entity = { date: "2024-01-15" }; // Monday
      const condition = createTestCondition("date", "dayOfWeek", ["saturday", "sunday"]);
      expect(evaluateCondition(condition, entity)).toBe(false);
    });

    it("should handle case-insensitive day names", () => {
      const entity = { date: "2024-01-15" }; // Monday
      const condition = createTestCondition("date", "dayOfWeek", ["MONDAY"]);
      expect(evaluateCondition(condition, entity)).toBe(true);
    });
  });

  describe("dayOfMonth", () => {
    it("should match specific day of month", () => {
      const condition = createTestCondition("date", "dayOfMonth", 15);
      const entity = createTestTransaction({ date: "2024-01-15" });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should not match different day", () => {
      const condition = createTestCondition("date", "dayOfMonth", 1);
      const entity = createTestTransaction({ date: "2024-01-15" });
      expect(evaluateCondition(condition, entity)).toBe(false);
    });

    it("should handle first day of month", () => {
      const condition = createTestCondition("date", "dayOfMonth", 1);
      const entity = createTestTransaction({ date: "2024-02-01" });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should handle last days of month", () => {
      const condition = createTestCondition("date", "dayOfMonth", 31);
      const entity = createTestTransaction({ date: "2024-01-31" });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });
  });
});

// =============================================================================
// Reference Operators
// =============================================================================

describe("Reference Operators", () => {
  describe("isNull", () => {
    it("should return true for null value", () => {
      const condition = createTestCondition("categoryId", "isNull", null);
      const entity = createTestTransaction({ categoryId: null });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should return true for undefined value", () => {
      const condition = createTestCondition("categoryId", "isNull", null);
      const entity = {};
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should return false for non-null value", () => {
      const condition = createTestCondition("categoryId", "isNull", null);
      const entity = createTestTransaction({ categoryId: 5 });
      expect(evaluateCondition(condition, entity)).toBe(false);
    });

    it("should return false for zero", () => {
      const condition = createTestCondition("categoryId", "isNull", null);
      const entity = { categoryId: 0 };
      expect(evaluateCondition(condition, entity)).toBe(false);
    });

    it("should return false for empty string", () => {
      const condition = createTestCondition("notes", "isNull", null);
      const entity = { notes: "" };
      expect(evaluateCondition(condition, entity)).toBe(false);
    });
  });

  describe("in", () => {
    it("should return true when value is in array", () => {
      const condition = createTestCondition("categoryId", "in", [1, 2, 3]);
      const entity = createTestTransaction({ categoryId: 2 });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should return false when value is not in array", () => {
      const condition = createTestCondition("categoryId", "in", [1, 2, 3]);
      const entity = createTestTransaction({ categoryId: 5 });
      expect(evaluateCondition(condition, entity)).toBe(false);
    });

    it("should handle string values (case insensitive)", () => {
      const condition = createTestCondition("status", "in", ["cleared", "pending"]);
      const entity = createTestTransaction({ status: "PENDING" });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should return false for empty array", () => {
      const condition = createTestCondition("categoryId", "in", []);
      const entity = createTestTransaction({ categoryId: 1 });
      expect(evaluateCondition(condition, entity)).toBe(false);
    });

    it("should return false when list is not an array", () => {
      const condition = createTestCondition("categoryId", "in", "not-array");
      const entity = createTestTransaction({ categoryId: 1 });
      expect(evaluateCondition(condition, entity)).toBe(false);
    });
  });

  describe("inGroup", () => {
    it("should return true when category is in group", () => {
      const condition = createTestCondition("categoryId", "inGroup", 1);
      const entity = createTestTransaction({ categoryId: 2 });
      const context = createTestEvaluationContext(new Map([[1, [1, 2, 3]]]));
      expect(evaluateCondition(condition, entity, context)).toBe(true);
    });

    it("should return false when category is not in group", () => {
      const condition = createTestCondition("categoryId", "inGroup", 1);
      const entity = createTestTransaction({ categoryId: 5 });
      const context = createTestEvaluationContext(new Map([[1, [1, 2, 3]]]));
      expect(evaluateCondition(condition, entity, context)).toBe(false);
    });

    it("should return false when context is missing", () => {
      const condition = createTestCondition("categoryId", "inGroup", 1);
      const entity = createTestTransaction({ categoryId: 2 });
      expect(evaluateCondition(condition, entity)).toBe(false);
    });

    it("should return false when group does not exist", () => {
      const condition = createTestCondition("categoryId", "inGroup", 99);
      const entity = createTestTransaction({ categoryId: 2 });
      const context = createTestEvaluationContext(new Map([[1, [1, 2, 3]]]));
      expect(evaluateCondition(condition, entity, context)).toBe(false);
    });
  });
});

// =============================================================================
// Boolean Operators
// =============================================================================

describe("Boolean Operators", () => {
  describe("equals (boolean)", () => {
    it("should match true value", () => {
      const condition = createTestCondition("isTransfer", "equals", true);
      const entity = createTestTransaction({ isTransfer: true });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should match false value", () => {
      const condition = createTestCondition("isTransfer", "equals", false);
      const entity = createTestTransaction({ isTransfer: false });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should not match when different", () => {
      const condition = createTestCondition("isTransfer", "equals", true);
      const entity = createTestTransaction({ isTransfer: false });
      expect(evaluateCondition(condition, entity)).toBe(false);
    });

    it("should handle isClosed on accounts", () => {
      const condition = createTestCondition("isClosed", "equals", false);
      const entity = createTestAccount({ isClosed: false });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });
  });
});

// =============================================================================
// Condition Groups (AND/OR Logic)
// =============================================================================

describe("Condition Groups", () => {
  describe("AND groups", () => {
    it("should return true when all conditions match", () => {
      const group = createTestConditionGroup("AND", [
        createTestCondition("amount", "lessThan", 0),
        createTestCondition("status", "equals", "pending"),
      ]);
      const entity = createTestTransaction({ amount: -50, status: "pending" });
      expect(evaluateConditionGroup(group, entity)).toBe(true);
    });

    it("should return false when any condition fails", () => {
      const group = createTestConditionGroup("AND", [
        createTestCondition("amount", "lessThan", 0),
        createTestCondition("status", "equals", "cleared"),
      ]);
      const entity = createTestTransaction({ amount: -50, status: "pending" });
      expect(evaluateConditionGroup(group, entity)).toBe(false);
    });

    it("should return false when first condition fails", () => {
      const group = createTestConditionGroup("AND", [
        createTestCondition("amount", "greaterThan", 0),
        createTestCondition("status", "equals", "pending"),
      ]);
      const entity = createTestTransaction({ amount: -50, status: "pending" });
      expect(evaluateConditionGroup(group, entity)).toBe(false);
    });

    it("should return true for empty AND group", () => {
      const group = createEmptyConditionGroup("AND");
      const entity = createTestTransaction();
      expect(evaluateConditionGroup(group, entity)).toBe(true);
    });

    it("should handle single condition", () => {
      const group = createTestConditionGroup("AND", [
        createTestCondition("amount", "lessThan", 0),
      ]);
      const entity = createTestTransaction({ amount: -50 });
      expect(evaluateConditionGroup(group, entity)).toBe(true);
    });
  });

  describe("OR groups", () => {
    it("should return true when any condition matches", () => {
      const group = createTestConditionGroup("OR", [
        createTestCondition("amount", "greaterThan", 0),
        createTestCondition("status", "equals", "pending"),
      ]);
      const entity = createTestTransaction({ amount: -50, status: "pending" });
      expect(evaluateConditionGroup(group, entity)).toBe(true);
    });

    it("should return true when first condition matches", () => {
      const group = createTestConditionGroup("OR", [
        createTestCondition("amount", "lessThan", 0),
        createTestCondition("status", "equals", "cleared"),
      ]);
      const entity = createTestTransaction({ amount: -50, status: "pending" });
      expect(evaluateConditionGroup(group, entity)).toBe(true);
    });

    it("should return false when all conditions fail", () => {
      const group = createTestConditionGroup("OR", [
        createTestCondition("amount", "greaterThan", 0),
        createTestCondition("status", "equals", "cleared"),
      ]);
      const entity = createTestTransaction({ amount: -50, status: "pending" });
      expect(evaluateConditionGroup(group, entity)).toBe(false);
    });

    it("should return true for empty OR group", () => {
      const group = createEmptyConditionGroup("OR");
      const entity = createTestTransaction();
      expect(evaluateConditionGroup(group, entity)).toBe(true);
    });
  });

  describe("Nested groups", () => {
    it("should handle AND inside OR", () => {
      // (amount < 0 AND status = pending) OR (amount > 100)
      const group = createTestConditionGroup("OR", [
        createTestConditionGroup("AND", [
          createTestCondition("amount", "lessThan", 0),
          createTestCondition("status", "equals", "pending"),
        ]),
        createTestCondition("amount", "greaterThan", 100),
      ]);
      const entity = createTestTransaction({ amount: -50, status: "pending" });
      expect(evaluateConditionGroup(group, entity)).toBe(true);
    });

    it("should handle OR inside AND", () => {
      // (status = pending OR status = cleared) AND amount < 0
      const group = createTestConditionGroup("AND", [
        createTestConditionGroup("OR", [
          createTestCondition("status", "equals", "pending"),
          createTestCondition("status", "equals", "cleared"),
        ]),
        createTestCondition("amount", "lessThan", 0),
      ]);
      const entity = createTestTransaction({ amount: -50, status: "pending" });
      expect(evaluateConditionGroup(group, entity)).toBe(true);
    });

    it("should handle deeply nested groups", () => {
      // ((a AND b) OR (c AND d)) AND e
      const group = createTestConditionGroup("AND", [
        createTestConditionGroup("OR", [
          createTestConditionGroup("AND", [
            createTestCondition("amount", "lessThan", 0),
            createTestCondition("status", "equals", "pending"),
          ]),
          createTestConditionGroup("AND", [
            createTestCondition("amount", "greaterThan", 100),
            createTestCondition("status", "equals", "cleared"),
          ]),
        ]),
        createTestCondition("isTransfer", "equals", false),
      ]);
      const entity = createTestTransaction({ amount: -50, status: "pending", isTransfer: false });
      expect(evaluateConditionGroup(group, entity)).toBe(true);
    });

    it("should fail deeply nested groups when leaf condition fails", () => {
      const group = createTestConditionGroup("AND", [
        createTestConditionGroup("OR", [
          createTestCondition("amount", "greaterThan", 100),
          createTestCondition("amount", "lessThan", -100),
        ]),
        createTestCondition("isTransfer", "equals", false),
      ]);
      const entity = createTestTransaction({ amount: -50, isTransfer: false });
      expect(evaluateConditionGroup(group, entity)).toBe(false);
    });
  });
});

// =============================================================================
// Negation
// =============================================================================

describe("Negation", () => {
  it("should negate equals operator", () => {
    const condition = createTestCondition("status", "equals", "cleared", { negate: true });
    const entity = createTestTransaction({ status: "pending" });
    expect(evaluateCondition(condition, entity)).toBe(true);
  });

  it("should negate contains operator", () => {
    const condition = createTestCondition("name", "contains", "Amazon", { negate: true });
    const entity = createTestPayee({ name: "Netflix" });
    expect(evaluateCondition(condition, entity)).toBe(true);
  });

  it("should negate greaterThan operator", () => {
    const condition = createTestCondition("amount", "greaterThan", 100, { negate: true });
    const entity = createTestTransaction({ amount: 50 });
    expect(evaluateCondition(condition, entity)).toBe(true);
  });

  it("should negate isNull operator", () => {
    const condition = createTestCondition("categoryId", "isNull", null, { negate: true });
    const entity = createTestTransaction({ categoryId: 5 });
    expect(evaluateCondition(condition, entity)).toBe(true);
  });

  it("should negate isEmpty operator", () => {
    const condition = createTestCondition("notes", "isEmpty", null, { negate: true });
    const entity = createTestTransaction({ notes: "Some notes" });
    expect(evaluateCondition(condition, entity)).toBe(true);
  });

  it("should double-negate correctly (negate true match)", () => {
    const condition = createTestCondition("status", "equals", "pending", { negate: true });
    const entity = createTestTransaction({ status: "pending" });
    expect(evaluateCondition(condition, entity)).toBe(false);
  });
});

// =============================================================================
// Deep Field Access
// =============================================================================

describe("Deep Field Access", () => {
  describe("getFieldValue", () => {
    it("should get simple field", () => {
      const entity = createTestTransaction();
      expect(getFieldValue(entity, "amount")).toBe(-50);
    });

    it("should get nested field", () => {
      const entity = createTestTransaction({ payee: { name: "Amazon" } });
      expect(getFieldValue(entity, "payee.name")).toBe("Amazon");
    });

    it("should handle deeply nested fields", () => {
      const entity = {
        category: {
          group: {
            name: "Shopping",
          },
        },
      };
      expect(getFieldValue(entity, "category.group.name")).toBe("Shopping");
    });

    it("should return undefined for missing field", () => {
      const entity = createTestTransaction();
      expect(getFieldValue(entity, "nonexistent")).toBeUndefined();
    });

    it("should return undefined for missing nested field", () => {
      const entity = createTestTransaction({ payee: null });
      expect(getFieldValue(entity, "payee.name")).toBeUndefined();
    });

    it("should return undefined when path goes through non-object", () => {
      const entity = { amount: 50 };
      expect(getFieldValue(entity, "amount.value")).toBeUndefined();
    });
  });

  describe("evaluateCondition with nested fields", () => {
    it("should evaluate condition on nested field", () => {
      const condition = createTestCondition("payee.name", "contains", "Amazon");
      const entity = createTestTransaction({ payee: { name: "Amazon Prime" } });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should evaluate condition on deeply nested field", () => {
      const condition = createTestCondition("category.group.name", "equals", "Shopping");
      const entity = {
        category: {
          group: { name: "Shopping" },
        },
      };
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should handle null nested object", () => {
      const condition = createTestCondition("payee.name", "isNull", null);
      const entity = createTestTransaction({ payee: null });
      expect(evaluateCondition(condition, entity)).toBe(true);
    });
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe("Edge Cases", () => {
  describe("Null and undefined entities", () => {
    it("should handle empty entity object", () => {
      const condition = createTestCondition("amount", "isNull", null);
      expect(evaluateCondition(condition, {})).toBe(true);
    });

    it("should handle entity with null values", () => {
      const condition = createTestCondition("notes", "isEmpty", null);
      const entity = { notes: null };
      expect(evaluateCondition(condition, entity)).toBe(true);
    });
  });

  describe("Type coercion", () => {
    it("should compare string and number for equals", () => {
      const condition = createTestCondition("amount", "equals", "100");
      const entity = { amount: 100 };
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should handle numeric string for greaterThan", () => {
      const condition = createTestCondition("amount", "greaterThan", "50");
      const entity = { amount: 100 };
      expect(evaluateCondition(condition, entity)).toBe(true);
    });
  });

  describe("Special characters", () => {
    it("should handle special characters in contains", () => {
      const condition = createTestCondition("name", "contains", "Amazon.com");
      const entity = { name: "AMAZON.COM Marketplace" };
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should handle regex special characters in matches", () => {
      const condition = createTestCondition("name", "matches", "Amazon\\.com");
      const entity = { name: "Amazon.com" };
      expect(evaluateCondition(condition, entity)).toBe(true);
    });
  });

  describe("Large values", () => {
    it("should handle very large numbers", () => {
      const condition = createTestCondition("balance", "greaterThan", 999999999);
      const entity = { balance: 1000000000 };
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should handle very small negative numbers", () => {
      const condition = createTestCondition("amount", "lessThan", -999999);
      const entity = { amount: -1000000 };
      expect(evaluateCondition(condition, entity)).toBe(true);
    });
  });

  describe("Date edge cases", () => {
    it("should handle ISO date strings", () => {
      const condition = createTestCondition("date", "before", "2024-12-31T23:59:59Z");
      const entity = { date: "2024-06-15T12:00:00Z" };
      expect(evaluateCondition(condition, entity)).toBe(true);
    });

    it("should handle invalid date strings", () => {
      const condition = createTestCondition("date", "before", "invalid-date");
      const entity = { date: "2024-01-15" };
      expect(evaluateCondition(condition, entity)).toBe(false);
    });

    it("should handle timestamp numbers", () => {
      const condition = createTestCondition("date", "after", 1704067200000); // 2024-01-01
      const entity = { date: 1705276800000 }; // 2024-01-15
      expect(evaluateCondition(condition, entity)).toBe(true);
    });
  });

  describe("Unknown operators", () => {
    it("should return false for unknown operator", () => {
      const condition = createTestCondition("amount", "unknownOp" as any, 100);
      const entity = createTestTransaction();
      expect(evaluateCondition(condition, entity)).toBe(false);
    });
  });
});
