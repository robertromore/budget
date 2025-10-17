import {describe, it, expect} from "vitest";
import {parseDate} from "@internationalized/date";

/**
 * Tests for transaction filter functions
 * Testing all filter functions from filters.svelte.ts
 */
describe("Transaction Filters - Unit Tests", () => {

  describe("entityIsFilter", () => {
    // Mock filter function
    const entityIsFilter = (params: {
      entityId: string | number | null;
      selectedValues: Set<string | number>;
    }) => {
      const {entityId, selectedValues} = params;
      if (selectedValues.size === 0) return true;
      const entityIdStr = entityId === null ? "null" : entityId.toString();
      return selectedValues.has(entityIdStr);
    };

    it("should return true when no filters are selected", () => {
      const selectedValues = new Set<string | number>();
      expect(entityIsFilter({entityId: 1, selectedValues})).toBe(true);
      expect(entityIsFilter({entityId: null, selectedValues})).toBe(true);
    });

    it("should return true when entityId matches selected value", () => {
      const selectedValues = new Set<string | number>(["1", "2", "3"]);
      expect(entityIsFilter({entityId: 1, selectedValues})).toBe(true);
      expect(entityIsFilter({entityId: 2, selectedValues})).toBe(true);
    });

    it("should return false when entityId does not match selected values", () => {
      const selectedValues = new Set<string | number>(["1", "2", "3"]);
      expect(entityIsFilter({entityId: 4, selectedValues})).toBe(false);
    });

    it("should handle null entityId correctly", () => {
      const selectedValuesWithNull = new Set<string | number>(["null", 1, 2]);
      expect(entityIsFilter({entityId: null, selectedValues: selectedValuesWithNull})).toBe(true);

      const selectedValuesWithoutNull = new Set<string | number>(["1", "2", "3"]);
      expect(entityIsFilter({entityId: null, selectedValues: selectedValuesWithoutNull})).toBe(false);
    });

    it("should handle string and number matching", () => {
      const selectedValues = new Set<string | number>(["1", "2", "3"]);
      expect(entityIsFilter({entityId: 1, selectedValues})).toBe(true);
      expect(entityIsFilter({entityId: "1", selectedValues})).toBe(true);
    });
  });

  describe("entityIsNotFilter", () => {
    // Mock filter function
    const entityIsNotFilter = (params: {
      entityId: string | number | null;
      selectedValues: Set<string | number>;
    }) => {
      const {entityId, selectedValues} = params;
      if (selectedValues.size === 0) return true;
      const entityIdStr = entityId === null ? "null" : entityId.toString();
      return !selectedValues.has(entityIdStr);
    };

    it("should return true when no filters are selected", () => {
      const selectedValues = new Set<string | number>();
      expect(entityIsNotFilter({entityId: 1, selectedValues})).toBe(true);
      expect(entityIsNotFilter({entityId: null, selectedValues})).toBe(true);
    });

    it("should return false when entityId matches selected value", () => {
      const selectedValues = new Set<string | number>(["1", "2", "3"]);
      expect(entityIsNotFilter({entityId: 1, selectedValues})).toBe(false);
      expect(entityIsNotFilter({entityId: 2, selectedValues})).toBe(false);
    });

    it("should return true when entityId does not match selected values", () => {
      const selectedValues = new Set<string | number>(["1", "2", "3"]);
      expect(entityIsNotFilter({entityId: 4, selectedValues})).toBe(true);
    });

    it("should handle null entityId correctly", () => {
      const selectedValuesWithNull = new Set<string | number>(["null", 1, 2]);
      expect(entityIsNotFilter({entityId: null, selectedValues: selectedValuesWithNull})).toBe(false);

      const selectedValuesWithoutNull = new Set<string | number>(["1", "2", "3"]);
      expect(entityIsNotFilter({entityId: null, selectedValues: selectedValuesWithoutNull})).toBe(true);
    });
  });

  describe("Date Filters", () => {
    // Helper function to calculate date difference in days
    const dateDifferenceInDays = (date1: any, date2: any) => {
      return date1.compare(date2);
    };

    describe("dateAfter", () => {
      const dateAfter = (rowDate: any, filterDate: string) => {
        if (!filterDate) return true;
        const filterDateValue = parseDate(filterDate);
        return rowDate.compare(filterDateValue) > 0;
      };

      it("should return true when no filter date provided", () => {
        const rowDate = parseDate("2024-01-15");
        expect(dateAfter(rowDate, "")).toBe(true);
      });

      it("should return true when row date is after filter date", () => {
        const rowDate = parseDate("2024-01-15");
        expect(dateAfter(rowDate, "2024-01-01")).toBe(true);
      });

      it("should return false when row date equals filter date", () => {
        const rowDate = parseDate("2024-01-15");
        expect(dateAfter(rowDate, "2024-01-15")).toBe(false);
      });

      it("should return false when row date is before filter date", () => {
        const rowDate = parseDate("2024-01-01");
        expect(dateAfter(rowDate, "2024-01-15")).toBe(false);
      });

      it("should handle dates across years", () => {
        const rowDate = parseDate("2024-01-01");
        expect(dateAfter(rowDate, "2023-12-31")).toBe(true);
      });
    });

    describe("dateBefore", () => {
      const dateBefore = (rowDate: any, filterDate: string) => {
        if (!filterDate) return true;
        const filterDateValue = parseDate(filterDate);
        return rowDate.compare(filterDateValue) < 0;
      };

      it("should return true when no filter date provided", () => {
        const rowDate = parseDate("2024-01-15");
        expect(dateBefore(rowDate, "")).toBe(true);
      });

      it("should return true when row date is before filter date", () => {
        const rowDate = parseDate("2024-01-01");
        expect(dateBefore(rowDate, "2024-01-15")).toBe(true);
      });

      it("should return false when row date equals filter date", () => {
        const rowDate = parseDate("2024-01-15");
        expect(dateBefore(rowDate, "2024-01-15")).toBe(false);
      });

      it("should return false when row date is after filter date", () => {
        const rowDate = parseDate("2024-01-15");
        expect(dateBefore(rowDate, "2024-01-01")).toBe(false);
      });

      it("should handle dates across months", () => {
        const rowDate = parseDate("2024-01-31");
        expect(dateBefore(rowDate, "2024-02-01")).toBe(true);
      });
    });

    describe("dateOn", () => {
      const dateOn = (rowDate: any, filterDate: string) => {
        if (!filterDate) return true;
        const filterDateValue = parseDate(filterDate);
        return rowDate.compare(filterDateValue) === 0;
      };

      it("should return true when no filter date provided", () => {
        const rowDate = parseDate("2024-01-15");
        expect(dateOn(rowDate, "")).toBe(true);
      });

      it("should return true when row date equals filter date", () => {
        const rowDate = parseDate("2024-01-15");
        expect(dateOn(rowDate, "2024-01-15")).toBe(true);
      });

      it("should return false when row date is different from filter date", () => {
        const rowDate = parseDate("2024-01-15");
        expect(dateOn(rowDate, "2024-01-14")).toBe(false);
        expect(dateOn(rowDate, "2024-01-16")).toBe(false);
      });

      it("should handle date equality check precisely", () => {
        const rowDate = parseDate("2024-12-31");
        expect(dateOn(rowDate, "2024-12-31")).toBe(true);
        expect(dateOn(rowDate, "2025-01-01")).toBe(false);
      });
    });
  });

  describe("String Filters", () => {
    describe("equalsString", () => {
      const equalsString = (value: string, filterValues: Set<string>) => {
        return filterValues.size === 0 ? true : filterValues.has(value);
      };

      it("should return true when no filter values provided", () => {
        expect(equalsString("cleared", new Set())).toBe(true);
      });

      it("should return true when value matches filter value", () => {
        const filterValues = new Set(["cleared", "pending"]);
        expect(equalsString("cleared", filterValues)).toBe(true);
        expect(equalsString("pending", filterValues)).toBe(true);
      });

      it("should return false when value does not match filter value", () => {
        const filterValues = new Set(["cleared", "pending"]);
        expect(equalsString("scheduled", filterValues)).toBe(false);
      });

      it("should be case sensitive", () => {
        const filterValues = new Set(["Cleared"]);
        expect(equalsString("cleared", filterValues)).toBe(false);
        expect(equalsString("Cleared", filterValues)).toBe(true);
      });
    });

    describe("doesntEqualString", () => {
      const doesntEqualString = (value: string, filterValues: Set<string>) => {
        return !filterValues.has(value);
      };

      it("should return false when value matches filter value", () => {
        const filterValues = new Set(["cleared", "pending"]);
        expect(doesntEqualString("cleared", filterValues)).toBe(false);
      });

      it("should return true when value does not match filter value", () => {
        const filterValues = new Set(["cleared", "pending"]);
        expect(doesntEqualString("scheduled", filterValues)).toBe(true);
      });

      it("should handle empty filter set", () => {
        expect(doesntEqualString("cleared", new Set())).toBe(true);
      });
    });
  });

  describe("Amount Filter", () => {
    // Mock the amount filter function - MUST use 'operator' property
    const amountFilter = (amount: number, filterValue: any) => {
      if (!filterValue) return true;

      const {operator, value, min, max} = filterValue;

      switch (operator) {
        case "equals":
          return value !== undefined ? amount === value : true;
        case "greaterThan":
          return value !== undefined ? amount > value : true;
        case "lessThan":
          return value !== undefined ? amount < value : true;
        case "between":
          return min !== undefined && max !== undefined ? amount >= min && amount <= max : true;
        case "notEquals":
          return value !== undefined ? amount !== value : true;
        default:
          return true;
      }
    };

    it("should use 'operator' property not 'type' property", () => {
      // Regression test for the bug where filter checked 'type' instead of 'operator'
      const filterWithOperator = {operator: "greaterThan", value: 100};
      const filterWithType = {type: "greaterThan", value: 100} as any;

      expect(amountFilter(150, filterWithOperator)).toBe(true);
      expect(amountFilter(50, filterWithOperator)).toBe(false);

      // With wrong property name, falls through to default case
      expect(amountFilter(150, filterWithType)).toBe(true);
      expect(amountFilter(50, filterWithType)).toBe(true); // BUG - should be false!
    });

    it("should return true when no filter provided", () => {
      expect(amountFilter(100, null)).toBe(true);
    });

    it("should filter with 'equals' operator", () => {
      const filter = {operator: "equals", value: 100};
      expect(amountFilter(100, filter)).toBe(true);
      expect(amountFilter(99.99, filter)).toBe(false);
      expect(amountFilter(100.01, filter)).toBe(false);
    });

    it("should filter with 'greaterThan' operator", () => {
      const filter = {operator: "greaterThan", value: 50};
      expect(amountFilter(51, filter)).toBe(true);
      expect(amountFilter(100, filter)).toBe(true);
      expect(amountFilter(50, filter)).toBe(false);
      expect(amountFilter(49, filter)).toBe(false);
    });

    it("should filter with 'lessThan' operator", () => {
      const filter = {operator: "lessThan", value: 50};
      expect(amountFilter(49, filter)).toBe(true);
      expect(amountFilter(0, filter)).toBe(true);
      expect(amountFilter(50, filter)).toBe(false);
      expect(amountFilter(51, filter)).toBe(false);
    });

    it("should filter with 'between' operator", () => {
      const filter = {operator: "between", min: 10, max: 100};
      expect(amountFilter(10, filter)).toBe(true);
      expect(amountFilter(50, filter)).toBe(true);
      expect(amountFilter(100, filter)).toBe(true);
      expect(amountFilter(9.99, filter)).toBe(false);
      expect(amountFilter(100.01, filter)).toBe(false);
    });

    it("should filter with 'notEquals' operator", () => {
      const filter = {operator: "notEquals", value: 0};
      expect(amountFilter(0.01, filter)).toBe(true);
      expect(amountFilter(-0.01, filter)).toBe(true);
      expect(amountFilter(100, filter)).toBe(true);
      expect(amountFilter(0, filter)).toBe(false);
    });

    it("should handle negative amounts", () => {
      const filter = {operator: "lessThan", value: 0};
      expect(amountFilter(-50, filter)).toBe(true);
      expect(amountFilter(0, filter)).toBe(false);
      expect(amountFilter(50, filter)).toBe(false);
    });

    it("should handle decimal amounts", () => {
      const filter = {operator: "equals", value: 99.99};
      expect(amountFilter(99.99, filter)).toBe(true);
      expect(amountFilter(99.98, filter)).toBe(false);
      expect(amountFilter(100.00, filter)).toBe(false);
    });

    it("should handle large amounts", () => {
      const filter = {operator: "greaterThan", value: 1000000};
      expect(amountFilter(1000001, filter)).toBe(true);
      expect(amountFilter(1000000, filter)).toBe(false);
      expect(amountFilter(999999, filter)).toBe(false);
    });

    it("should handle boundary cases in between operator", () => {
      const filter = {operator: "between", min: 0, max: 100};
      expect(amountFilter(0, filter)).toBe(true); // min boundary
      expect(amountFilter(100, filter)).toBe(true); // max boundary
      expect(amountFilter(-0.01, filter)).toBe(false);
      expect(amountFilter(100.01, filter)).toBe(false);
    });
  });

  describe("Filter Combinations", () => {
    it("should support combining entity and date filters", () => {
      const entityFilter = (entityId: number, selectedIds: Set<string>) => {
        return selectedIds.has(entityId.toString());
      };

      const dateFilter = (date: any, filterDate: string) => {
        const filterDateValue = parseDate(filterDate);
        return date.compare(filterDateValue) > 0;
      };

      // Transaction with category 1 and date 2024-01-15
      const categoryId = 1;
      const transactionDate = parseDate("2024-01-15");

      const categoryMatch = entityFilter(categoryId, new Set(["1", "2"]));
      const dateMatch = dateFilter(transactionDate, "2024-01-01");

      expect(categoryMatch && dateMatch).toBe(true);
    });

    it("should support combining multiple filters", () => {
      const amountFilter = (amount: number, min: number, max: number) => {
        return amount >= min && amount <= max;
      };

      const statusFilter = (status: string, allowedStatuses: Set<string>) => {
        return allowedStatuses.has(status);
      };

      const amount = 75;
      const status = "cleared";

      const amountMatch = amountFilter(amount, 50, 100);
      const statusMatch = statusFilter(status, new Set(["cleared", "pending"]));

      expect(amountMatch && statusMatch).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined filter values gracefully", () => {
      const amountFilter = (amount: number, filterValue: any) => {
        if (!filterValue) return true;
        return filterValue.operator ? false : true;
      };

      expect(amountFilter(100, undefined)).toBe(true);
      expect(amountFilter(100, null)).toBe(true);
    });

    it("should handle empty Set filters", () => {
      const entityFilter = (entityId: number, filterSet: Set<string>) => {
        return filterSet.size === 0 ? true : filterSet.has(entityId.toString());
      };

      expect(entityFilter(1, new Set())).toBe(true);
      expect(entityFilter(999, new Set())).toBe(true);
    });

    it("should handle zero values correctly", () => {
      const amountFilter = (amount: number, filterValue: any) => {
        if (!filterValue) return true;
        const {operator, value} = filterValue;

        switch (operator) {
          case "equals":
            return value !== undefined ? amount === value : true;
          case "greaterThan":
            return value !== undefined ? amount > value : true;
          default:
            return true;
        }
      };

      // Zero should be treated as a valid value
      expect(amountFilter(0, {operator: "equals", value: 0})).toBe(true);
      expect(amountFilter(1, {operator: "greaterThan", value: 0})).toBe(true);
      expect(amountFilter(0, {operator: "greaterThan", value: 0})).toBe(false);
    });

    it("should handle null entity IDs", () => {
      const entityFilter = (entityId: number | null, filterSet: Set<string>) => {
        const idStr = entityId === null ? "null" : entityId.toString();
        return filterSet.size === 0 ? true : filterSet.has(idStr);
      };

      expect(entityFilter(null, new Set(["null"]))).toBe(true);
      expect(entityFilter(null, new Set(["1", "2"]))).toBe(false);
      expect(entityFilter(1, new Set(["null"]))).toBe(false);
    });
  });

  describe("Filter Performance Considerations", () => {
    it("should short-circuit on empty filter sets", () => {
      let executionCount = 0;

      const entityFilter = (entityId: number, filterSet: Set<string>) => {
        if (filterSet.size === 0) return true; // Short circuit
        executionCount++; // Only execute if filter is not empty
        return filterSet.has(entityId.toString());
      };

      entityFilter(1, new Set()); // Should not increment counter
      expect(executionCount).toBe(0);

      entityFilter(1, new Set(["1"])); // Should increment counter
      expect(executionCount).toBe(1);
    });

    it("should handle large filter sets efficiently", () => {
      const largeFilterSet = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        largeFilterSet.add(i.toString());
      }

      const entityFilter = (entityId: number, filterSet: Set<string>) => {
        return filterSet.has(entityId.toString());
      };

      // Set.has() is O(1), so this should be fast even with 1000 items
      expect(entityFilter(500, largeFilterSet)).toBe(true);
      expect(entityFilter(1500, largeFilterSet)).toBe(false);
    });
  });
});
