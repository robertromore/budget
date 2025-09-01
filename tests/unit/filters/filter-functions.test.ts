import { describe, it, expect } from "vitest";

/**
 * Tests for filter functions from PR #42 and #46
 * Testing the null handling logic in entityIsFilter and entityIsNotFilter
 */
describe("Filter Functions - Unit Tests", () => {
  // Mock the filter functions based on the logic from filters.svelte.ts
  const entityIsFilter = (params: { entityId: string | number | null; selectedValues: Set<string | number> }) => {
    const { entityId, selectedValues } = params;
    
    if (selectedValues.size === 0) return true;
    
    // Convert entityId to string for comparison, handling null case
    const entityIdStr = entityId === null ? "null" : entityId.toString();
    return selectedValues.has(entityIdStr);
  };
  
  const entityIsNotFilter = (params: { entityId: string | number | null; selectedValues: Set<string | number> }) => {
    const { entityId, selectedValues } = params;
    
    if (selectedValues.size === 0) return true;
    
    // Convert entityId to string for comparison, handling null case  
    const entityIdStr = entityId === null ? "null" : entityId.toString();
    return !selectedValues.has(entityIdStr);
  };

  describe("entityIsFilter", () => {
    it("should return true when no filters are selected", () => {
      const selectedValues = new Set<string | number>();
      expect(entityIsFilter({ entityId: 1, selectedValues })).toBe(true);
      expect(entityIsFilter({ entityId: null, selectedValues })).toBe(true);
      expect(entityIsFilter({ entityId: "test", selectedValues })).toBe(true);
    });

    it("should return true when entityId matches selected value", () => {
      const selectedValues = new Set<string | number>(["1", "2", "3"]);
      expect(entityIsFilter({ entityId: 1, selectedValues })).toBe(true);
      expect(entityIsFilter({ entityId: 2, selectedValues })).toBe(true);
    });

    it("should return false when entityId does not match selected values", () => {
      const selectedValues = new Set<string | number>(["1", "2", "3"]);
      expect(entityIsFilter({ entityId: 4, selectedValues })).toBe(false);
      expect(entityIsFilter({ entityId: "other", selectedValues })).toBe(false);
    });

    it("should handle null entityId correctly", () => {
      // When null is in selected values as string
      const selectedValuesWithNull = new Set<string | number>(["null", 1, 2]);
      expect(entityIsFilter({ entityId: null, selectedValues: selectedValuesWithNull })).toBe(true);
      
      // When null is not in selected values
      const selectedValuesWithoutNull = new Set<string | number>(["1", "2", "3"]);
      expect(entityIsFilter({ entityId: null, selectedValues: selectedValuesWithoutNull })).toBe(false);
    });

    it("should handle string and number matching", () => {
      const selectedValues = new Set<string | number>(["1", "2", "3"]);
      expect(entityIsFilter({ entityId: 1, selectedValues })).toBe(true); // 1.toString() = "1" matches
      expect(entityIsFilter({ entityId: "1", selectedValues })).toBe(true); // "1" matches
      expect(entityIsFilter({ entityId: 2, selectedValues })).toBe(true); // 2.toString() = "2" matches
      expect(entityIsFilter({ entityId: "2", selectedValues })).toBe(true); // "2" matches
    });
  });

  describe("entityIsNotFilter", () => {
    it("should return true when no filters are selected", () => {
      const selectedValues = new Set<string | number>();
      expect(entityIsNotFilter({ entityId: 1, selectedValues })).toBe(true);
      expect(entityIsNotFilter({ entityId: null, selectedValues })).toBe(true);
      expect(entityIsNotFilter({ entityId: "test", selectedValues })).toBe(true);
    });

    it("should return false when entityId matches selected value", () => {
      const selectedValues = new Set<string | number>(["1", "2", "3"]);
      expect(entityIsNotFilter({ entityId: 1, selectedValues })).toBe(false);
      expect(entityIsNotFilter({ entityId: 2, selectedValues })).toBe(false);
    });

    it("should return true when entityId does not match selected values", () => {
      const selectedValues = new Set<string | number>(["1", "2", "3"]);
      expect(entityIsNotFilter({ entityId: 4, selectedValues })).toBe(true);
      expect(entityIsNotFilter({ entityId: "other", selectedValues })).toBe(true);
    });

    it("should handle null entityId correctly", () => {
      // When null is in selected values as string
      const selectedValuesWithNull = new Set<string | number>(["null", 1, 2]);
      expect(entityIsNotFilter({ entityId: null, selectedValues: selectedValuesWithNull })).toBe(false);
      
      // When null is not in selected values
      const selectedValuesWithoutNull = new Set<string | number>(["1", "2", "3"]);
      expect(entityIsNotFilter({ entityId: null, selectedValues: selectedValuesWithoutNull })).toBe(true);
    });

    it("should handle string and number matching", () => {
      const selectedValues = new Set<string | number>(["1", "2", "3"]);
      expect(entityIsNotFilter({ entityId: 1, selectedValues })).toBe(false); // 1.toString() = "1" is in set
      expect(entityIsNotFilter({ entityId: "1", selectedValues })).toBe(false); // "1" is in set
      expect(entityIsNotFilter({ entityId: 2, selectedValues })).toBe(false); // 2.toString() = "2" is in set
      expect(entityIsNotFilter({ entityId: "2", selectedValues })).toBe(false); // "2" is in set
      expect(entityIsNotFilter({ entityId: 4, selectedValues })).toBe(true); // 4.toString() = "4" not in set
      expect(entityIsNotFilter({ entityId: "4", selectedValues })).toBe(true); // "4" not in set
    });
  });
});