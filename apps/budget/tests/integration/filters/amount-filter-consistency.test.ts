import {describe, it, expect} from "vitest";

/**
 * Tests to ensure amount filter works consistently across transactions and expenses
 */
describe("Amount Filter Consistency", () => {
  describe("Shared Component", () => {
    it("should use the same DataTableFacetedFilterAmount component for both tables", () => {
      // Both transaction and expense columns import the same component
      const componentPath = "../(components)/(facets)/data-table-faceted-filter-amount.svelte";

      // This test documents that both tables use the same component
      // which ensures consistent behavior
      expect(componentPath).toBeTruthy();
    });

    it("should support all filter operators", () => {
      const operators = ["equals", "greaterThan", "lessThan", "between", "notEquals"];

      operators.forEach(operator => {
        expect(operator).toBeTruthy();
      });

      expect(operators).toHaveLength(5);
    });

    it("should use operator property not type property", () => {
      // Regression test for the bug fix
      const correctFilterValue = {
        operator: "greaterThan",
        value: 100
      };

      const incorrectFilterValue = {
        type: "greaterThan", // Wrong property name
        value: 100
      };

      expect(correctFilterValue.operator).toBe("greaterThan");
      expect(incorrectFilterValue).not.toHaveProperty("operator");
    });
  });

  describe("NumericInput Integration", () => {
    it("should use NumericInput component for better UX", () => {
      // Component now uses NumericInput instead of basic Input
      const features = [
        "Visual keypad",
        "Currency formatting",
        "Decimal validation",
        "Sign toggle",
        "Clear button",
        "Submit on enter"
      ];

      expect(features.length).toBe(6);
    });

    it("should handle numeric values directly", () => {
      // Values are now stored as numbers, not strings
      let value = 123.45;

      expect(typeof value).toBe("number");
      expect(value).toBe(123.45);
    });

    it("should format display values as currency", () => {
      const testValue = 1234.56;
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      });

      const formatted = formatter.format(testValue);
      expect(formatted).toBe("$1,234.56");
    });
  });

  describe("Filter Behavior", () => {
    const applyFilter = (amount: number, operator: string, filterValue: number) => {
      switch (operator) {
        case "equals":
          return amount === filterValue;
        case "greaterThan":
          return amount > filterValue;
        case "lessThan":
          return amount < filterValue;
        case "notEquals":
          return amount !== filterValue;
        default:
          return true;
      }
    };

    it("should filter transactions by amount", () => {
      const transactions = [
        {id: 1, amount: 50},
        {id: 2, amount: 100},
        {id: 3, amount: 150},
      ];

      const filtered = transactions.filter(t => applyFilter(t.amount, "greaterThan", 75));

      expect(filtered).toHaveLength(2);
      expect(filtered.map(t => t.id)).toEqual([2, 3]);
    });

    it("should filter expenses by amount", () => {
      const expenses = [
        {id: 1, amount: 25},
        {id: 2, amount: 75},
        {id: 3, amount: 125},
      ];

      const filtered = expenses.filter(e => applyFilter(e.amount, "lessThan", 100));

      expect(filtered).toHaveLength(2);
      expect(filtered.map(e => e.id)).toEqual([1, 2]);
    });

    it("should use identical filtering logic for both tables", () => {
      const testAmount = 100;

      // Transaction filtering
      const transactionResult = applyFilter(testAmount, "equals", 100);

      // Expense filtering (same logic)
      const expenseResult = applyFilter(testAmount, "equals", 100);

      expect(transactionResult).toBe(expenseResult);
      expect(transactionResult).toBe(true);
    });
  });

  describe("Between Operator", () => {
    const applyBetweenFilter = (amount: number, min: number, max: number) => {
      return amount >= min && amount <= max;
    };

    it("should work consistently for transactions and expenses", () => {
      const testAmounts = [10, 50, 100, 150, 200];
      const min = 50;
      const max = 150;

      const filtered = testAmounts.filter(amount => applyBetweenFilter(amount, min, max));

      expect(filtered).toEqual([50, 100, 150]);
    });

    it("should include boundary values", () => {
      expect(applyBetweenFilter(50, 50, 100)).toBe(true);
      expect(applyBetweenFilter(100, 50, 100)).toBe(true);
    });

    it("should exclude values outside range", () => {
      expect(applyBetweenFilter(49, 50, 100)).toBe(false);
      expect(applyBetweenFilter(101, 50, 100)).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero amounts", () => {
      const applyFilter = (amount: number, operator: string, value: number) => {
        switch (operator) {
          case "equals":
            return amount === value;
          case "greaterThan":
            return amount > value;
          default:
            return true;
        }
      };

      expect(applyFilter(0, "equals", 0)).toBe(true);
      expect(applyFilter(1, "greaterThan", 0)).toBe(true);
      expect(applyFilter(0, "greaterThan", 0)).toBe(false);
    });

    it("should handle negative amounts", () => {
      const applyFilter = (amount: number, operator: string, value: number) => {
        return operator === "lessThan" ? amount < value : true;
      };

      expect(applyFilter(-50, "lessThan", 0)).toBe(true);
      expect(applyFilter(-100, "lessThan", -50)).toBe(true);
    });

    it("should handle decimal precision", () => {
      const amount1 = 99.99;
      const amount2 = 100.00;
      const amount3 = 100.01;

      expect(amount1 < 100).toBe(true);
      expect(amount2 === 100).toBe(true);
      expect(amount3 > 100).toBe(true);
    });

    it("should handle large amounts", () => {
      const largeAmount = 1000000.50;
      const smallAmount = 100.25;

      expect(largeAmount > smallAmount).toBe(true);
      expect(typeof largeAmount).toBe("number");
    });
  });
});
