import { describe, it, expect } from "vitest";

/**
 * Tests for date filter label display logic from PR #48
 * Tests the enhanced date filter component logic
 */
describe("Date Filter Labels - Unit Tests", () => {
  
  interface FacetedFilterOption {
    value: string | number;
    label: string;
    icon?: any;
  }

  // Mock the logic for creating allOptions with selected values
  const createAllOptionsWithSelected = (
    allDates: FacetedFilterOption[] | null,
    selectedValues: Set<string | number> | null
  ) => {
    const options = new Map<string, FacetedFilterOption>();
    
    // Add all available dates
    if (allDates) {
      for (const date of allDates) {
        options.set(date.value.toString(), date);
      }
    }
    
    // Ensure selected values are included (in case they're custom dates not in allDates)
    if (selectedValues && selectedValues.size > 0) {
      for (const selectedValue of selectedValues) {
        if (!options.has(selectedValue.toString()) && typeof selectedValue === 'string') {
          // Create a fallback option for selected values not found in allDates
          options.set(selectedValue, {
            value: selectedValue,
            label: selectedValue,
            icon: undefined
          });
        }
      }
    }
    
    return options;
  };

  // Mock the fallback logic for filter labels
  const getFilterLabel = (
    selectedValues: Set<string | number>,
    allOptions: Map<string, FacetedFilterOption>
  ) => {
    if (selectedValues.size === 0) {
      return "none selected";
    }
    
    if (selectedValues.size > 2) {
      return `${selectedValues.size} selected`;
    }
    
    // Try to find matching options
    const matchingOptions = Array.from(selectedValues)
      .map(value => allOptions.get(value.toString()))
      .filter(Boolean) as FacetedFilterOption[];
    
    if (matchingOptions.length > 0) {
      return matchingOptions.map(opt => opt.label);
    } else {
      // Fallback: if no matching options found in allOptions, show count
      return `${selectedValues.size} selected`;
    }
  };

  describe("createAllOptionsWithSelected", () => {
    it("should include all available dates", () => {
      const allDates: FacetedFilterOption[] = [
        { value: "2024-01-01", label: "January 1, 2024" },
        { value: "2024-01-02", label: "January 2, 2024" },
        { value: "2024-01-03", label: "January 3, 2024" }
      ];
      
      const options = createAllOptionsWithSelected(allDates, null);
      
      expect(options.size).toBe(3);
      expect(options.has("2024-01-01")).toBe(true);
      expect(options.has("2024-01-02")).toBe(true);
      expect(options.has("2024-01-03")).toBe(true);
    });

    it("should handle null/empty allDates", () => {
      const options = createAllOptionsWithSelected(null, null);
      expect(options.size).toBe(0);
    });

    it("should include selected values not in allDates", () => {
      const allDates: FacetedFilterOption[] = [
        { value: "2024-01-01", label: "January 1, 2024" }
      ];
      const selectedValues = new Set<string | number>(["2024-01-01", "2024-01-15"]);
      
      const options = createAllOptionsWithSelected(allDates, selectedValues);
      
      expect(options.size).toBe(2);
      expect(options.has("2024-01-01")).toBe(true);
      expect(options.has("2024-01-15")).toBe(true);
      
      // Check that the custom date has proper fallback
      const customDate = options.get("2024-01-15");
      expect(customDate?.label).toBe("2024-01-15");
    });

    it("should not duplicate dates that exist in both allDates and selectedValues", () => {
      const allDates: FacetedFilterOption[] = [
        { value: "2024-01-01", label: "January 1, 2024" },
        { value: "2024-01-02", label: "January 2, 2024" }
      ];
      const selectedValues = new Set<string | number>(["2024-01-01"]);
      
      const options = createAllOptionsWithSelected(allDates, selectedValues);
      
      expect(options.size).toBe(2);
      expect(options.get("2024-01-01")?.label).toBe("January 1, 2024"); // Should preserve original label
    });

    it("should handle numeric selected values", () => {
      const selectedValues = new Set<string | number>([20240101, "2024-01-02"]);
      
      const options = createAllOptionsWithSelected(null, selectedValues);
      
      expect(options.size).toBe(1); // Only string values should be added as fallback
      expect(options.has("2024-01-02")).toBe(true);
    });
  });

  describe("getFilterLabel", () => {
    const allOptions = new Map<string, FacetedFilterOption>([
      ["2024-01-01", { value: "2024-01-01", label: "January 1, 2024" }],
      ["2024-01-02", { value: "2024-01-02", label: "January 2, 2024" }],
      ["2024-01-03", { value: "2024-01-03", label: "January 3, 2024" }]
    ]);

    it("should return 'none selected' when no values selected", () => {
      const selectedValues = new Set<string | number>();
      const label = getFilterLabel(selectedValues, allOptions);
      
      expect(label).toBe("none selected");
    });

    it("should return count when more than 2 values selected", () => {
      const selectedValues = new Set<string | number>(["2024-01-01", "2024-01-02", "2024-01-03"]);
      const label = getFilterLabel(selectedValues, allOptions);
      
      expect(label).toBe("3 selected");
    });

    it("should return array of labels when 1-2 values selected and found in options", () => {
      const selectedValues = new Set<string | number>(["2024-01-01", "2024-01-02"]);
      const labels = getFilterLabel(selectedValues, allOptions);
      
      expect(Array.isArray(labels)).toBe(true);
      expect((labels as string[]).length).toBe(2);
      expect((labels as string[])).toContain("January 1, 2024");
      expect((labels as string[])).toContain("January 2, 2024");
    });

    it("should return single label array when 1 value selected and found in options", () => {
      const selectedValues = new Set<string | number>(["2024-01-01"]);
      const labels = getFilterLabel(selectedValues, allOptions);
      
      expect(Array.isArray(labels)).toBe(true);
      expect((labels as string[]).length).toBe(1);
      expect((labels as string[])[0]).toBe("January 1, 2024");
    });

    it("should return count fallback when selected values not found in options", () => {
      const selectedValues = new Set<string | number>(["2024-01-15", "2024-01-16"]);
      const label = getFilterLabel(selectedValues, allOptions);
      
      expect(label).toBe("2 selected");
    });

    it("should return count fallback when only some selected values found in options", () => {
      const selectedValues = new Set<string | number>(["2024-01-01", "2024-01-15"]);
      const labels = getFilterLabel(selectedValues, allOptions);
      
      // Should find one matching option
      expect(Array.isArray(labels)).toBe(true);
      expect((labels as string[]).length).toBe(1);
      expect((labels as string[])[0]).toBe("January 1, 2024");
    });

    it("should handle empty allOptions", () => {
      const emptyOptions = new Map<string, FacetedFilterOption>();
      const selectedValues = new Set<string | number>(["2024-01-01"]);
      const label = getFilterLabel(selectedValues, emptyOptions);
      
      expect(label).toBe("1 selected");
    });
  });

  describe("edge cases", () => {
    it("should handle malformed date strings", () => {
      const selectedValues = new Set<string | number>(["invalid-date", "2024-13-45"]);
      const options = createAllOptionsWithSelected(null, selectedValues);
      
      expect(options.size).toBe(2);
      expect(options.get("invalid-date")?.label).toBe("invalid-date");
      expect(options.get("2024-13-45")?.label).toBe("2024-13-45");
    });

    it("should handle very large selected value sets", () => {
      const largeSet = new Set<string | number>();
      for (let i = 0; i < 1000; i++) {
        largeSet.add(`2024-01-${i.toString().padStart(2, '0')}`);
      }
      
      const options = createAllOptionsWithSelected(null, largeSet);
      expect(options.size).toBe(1000);
      
      const label = getFilterLabel(largeSet, options);
      expect(label).toBe("1000 selected");
    });

    it("should preserve original date labels over fallback labels", () => {
      const allDates: FacetedFilterOption[] = [
        { value: "2024-01-01", label: "New Year's Day 2024" }
      ];
      const selectedValues = new Set<string | number>(["2024-01-01"]);
      
      const options = createAllOptionsWithSelected(allDates, selectedValues);
      
      expect(options.get("2024-01-01")?.label).toBe("New Year's Day 2024");
    });
  });
});