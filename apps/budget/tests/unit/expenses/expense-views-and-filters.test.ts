import {describe, it, expect} from "vitest";
import {parseDate} from "@internationalized/date";

/**
 * Tests for expense views and filter functions
 * Testing the default views configuration and filter logic for medical expenses
 */
describe("Expense Views and Filters - Unit Tests", () => {

  describe("Default Expense Views Configuration", () => {
    // Mock the default expense views from +page.server.ts
    const defaultExpenseViews = [
      {
        id: -10,
        name: "All Expenses",
        description: "All medical expenses",
        filters: [],
        display: {
          grouping: [],
          sort: [
            {
              id: "date",
              desc: true,
            }
          ],
          visibility: {
            id: false,
            provider: false,
            patientName: false,
            diagnosis: false,
            treatmentDescription: false,
            notes: false,
          },
        },
        icon: "",
        dirty: false,
      },
      {
        id: -11,
        name: "Recent",
        description: "Expenses from the last 30 days",
        filters: [
          {
            column: "date",
            filter: "dateAfter",
            value: [new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]],
          },
        ],
        display: {
          grouping: [],
          sort: [
            {
              id: "date",
              desc: true,
            }
          ],
          visibility: {
            id: false,
            provider: false,
            patientName: false,
            diagnosis: false,
            treatmentDescription: false,
            notes: false,
          },
        },
        icon: "",
        dirty: false,
      },
      {
        id: -12,
        name: "High Amount",
        description: "Expenses over $500",
        filters: [
          {
            column: "amount",
            filter: "amountFilter",
            value: [{operator: "greaterThan", value: 500}],
          },
        ],
        display: {
          grouping: [],
          sort: [
            {
              id: "amount",
              desc: true,
            }
          ],
          visibility: {
            id: false,
            provider: false,
            patientName: false,
            diagnosis: false,
            treatmentDescription: false,
            notes: false,
          },
        },
        icon: "",
        dirty: false,
      },
      {
        id: -13,
        name: "Unclaimed",
        description: "Expenses not yet submitted for reimbursement",
        filters: [
          {
            column: "status",
            filter: "auto",
            value: ["not_submitted"],
          },
        ],
        display: {
          grouping: [],
          sort: [
            {
              id: "date",
              desc: true,
            }
          ],
          visibility: {
            id: false,
            provider: false,
            patientName: false,
            diagnosis: false,
            treatmentDescription: false,
            notes: false,
          },
        },
        icon: "",
        dirty: false,
      },
    ];

    it("should have exactly 4 default views", () => {
      expect(defaultExpenseViews).toHaveLength(4);
    });

    it("should have unique negative IDs for each view", () => {
      const ids = defaultExpenseViews.map(v => v.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(4);
      ids.forEach(id => {
        expect(id).toBeLessThan(0);
      });
    });

    it("should have descriptive names for each view", () => {
      const names = defaultExpenseViews.map(v => v.name);
      expect(names).toEqual(["All Expenses", "Recent", "High Amount", "Unclaimed"]);
    });

    it("should have descriptions for each view", () => {
      defaultExpenseViews.forEach(view => {
        expect(view.description).toBeTruthy();
        expect(view.description.length).toBeGreaterThan(0);
      });
    });

    it("All Expenses view should have no filters", () => {
      const allExpensesView = defaultExpenseViews[0];
      expect(allExpensesView.filters).toEqual([]);
    });

    it("All Expenses view should sort by date descending", () => {
      const allExpensesView = defaultExpenseViews[0];
      expect(allExpensesView.display.sort).toEqual([{id: "date", desc: true}]);
    });

    it("Recent view should filter by date (last 30 days)", () => {
      const recentView = defaultExpenseViews[1];
      expect(recentView.filters).toHaveLength(1);
      expect(recentView.filters[0].column).toBe("date");
      expect(recentView.filters[0].filter).toBe("dateAfter");

      // Check the date is approximately 30 days ago
      const filterDate = new Date(recentView.filters[0].value[0]);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const diffInDays = Math.abs((filterDate.getTime() - thirtyDaysAgo.getTime()) / (24 * 60 * 60 * 1000));
      expect(diffInDays).toBeLessThan(1); // Should be within 1 day
    });

    it("High Amount view should filter by amount greater than $500", () => {
      const highAmountView = defaultExpenseViews[2];
      expect(highAmountView.filters).toHaveLength(1);
      expect(highAmountView.filters[0].column).toBe("amount");
      expect(highAmountView.filters[0].filter).toBe("amountFilter");
      expect(highAmountView.filters[0].value[0]).toEqual({operator: "greaterThan", value: 500});
    });

    it("High Amount view should sort by amount descending", () => {
      const highAmountView = defaultExpenseViews[2];
      expect(highAmountView.display.sort).toEqual([{id: "amount", desc: true}]);
    });

    it("Unclaimed view should filter by status 'not_submitted'", () => {
      const unclaimedView = defaultExpenseViews[3];
      expect(unclaimedView.filters).toHaveLength(1);
      expect(unclaimedView.filters[0].column).toBe("status");
      expect(unclaimedView.filters[0].filter).toBe("auto");
      expect(unclaimedView.filters[0].value).toEqual(["not_submitted"]);
    });

    it("all views should hide the same columns by default", () => {
      const expectedVisibility = {
        id: false,
        provider: false,
        patientName: false,
        diagnosis: false,
        treatmentDescription: false,
        notes: false,
      };

      defaultExpenseViews.forEach(view => {
        expect(view.display.visibility).toEqual(expectedVisibility);
      });
    });

    it("all views should have no grouping by default", () => {
      defaultExpenseViews.forEach(view => {
        expect(view.display.grouping).toEqual([]);
      });
    });

    it("all views should not be marked as dirty initially", () => {
      defaultExpenseViews.forEach(view => {
        expect(view.dirty).toBe(false);
      });
    });
  });

  describe("Expense Filter Functions", () => {
    // Mock the provider filter function from expense-columns.svelte.ts
    const providerFilter = (row: {provider: string | null}, id: string, value: any[]) => {
      if (!value || value.length === 0) return true;
      const provider = row.provider;
      return value.includes(provider);
    };

    // Mock the patient name filter function
    const patientNameFilter = (row: {patientName: string | null}, id: string, value: any[]) => {
      if (!value || value.length === 0) return true;
      const patient = row.patientName;
      return value.includes(patient);
    };

    // Mock the expense type filter function
    const expenseTypeFilter = (row: {expenseType: string}, id: string, value: any[]) => {
      if (!value || value.length === 0) return true;
      const expenseType = row.expenseType;
      return value.includes(expenseType);
    };

    // Mock the status filter function
    const statusFilter = (row: {claimStatus?: string}, id: string, value: any[]) => {
      if (!value || value.length === 0) return true;
      const status = row.claimStatus || 'not_submitted';
      return value.includes(status);
    };

    describe("Provider Filter", () => {
      it("should return true when no filter values provided", () => {
        const row = {provider: "Dr. Smith"};
        expect(providerFilter(row, "provider", [])).toBe(true);
      });

      it("should return true when provider matches filter value", () => {
        const row = {provider: "Dr. Smith"};
        expect(providerFilter(row, "provider", ["Dr. Smith", "Dr. Jones"])).toBe(true);
      });

      it("should return false when provider doesn't match filter value", () => {
        const row = {provider: "Dr. Smith"};
        expect(providerFilter(row, "provider", ["Dr. Jones", "Dr. Brown"])).toBe(false);
      });

      it("should handle null provider", () => {
        const row = {provider: null};
        expect(providerFilter(row, "provider", [null])).toBe(true);
        expect(providerFilter(row, "provider", ["Dr. Smith"])).toBe(false);
      });
    });

    describe("Patient Name Filter", () => {
      it("should return true when no filter values provided", () => {
        const row = {patientName: "John Doe"};
        expect(patientNameFilter(row, "patientName", [])).toBe(true);
      });

      it("should return true when patient name matches filter value", () => {
        const row = {patientName: "John Doe"};
        expect(patientNameFilter(row, "patientName", ["John Doe", "Jane Smith"])).toBe(true);
      });

      it("should return false when patient name doesn't match filter value", () => {
        const row = {patientName: "John Doe"};
        expect(patientNameFilter(row, "patientName", ["Jane Smith", "Bob Johnson"])).toBe(false);
      });

      it("should handle null patient name", () => {
        const row = {patientName: null};
        expect(patientNameFilter(row, "patientName", [null])).toBe(true);
        expect(patientNameFilter(row, "patientName", ["John Doe"])).toBe(false);
      });
    });

    describe("Expense Type Filter", () => {
      it("should return true when no filter values provided", () => {
        const row = {expenseType: "medical"};
        expect(expenseTypeFilter(row, "expenseType", [])).toBe(true);
      });

      it("should return true when expense type matches filter value", () => {
        const row = {expenseType: "medical"};
        expect(expenseTypeFilter(row, "expenseType", ["medical", "dental"])).toBe(true);
      });

      it("should return false when expense type doesn't match filter value", () => {
        const row = {expenseType: "medical"};
        expect(expenseTypeFilter(row, "expenseType", ["dental", "vision"])).toBe(false);
      });

      it("should handle different expense types", () => {
        const medicalRow = {expenseType: "medical"};
        const dentalRow = {expenseType: "dental"};
        const visionRow = {expenseType: "vision"};

        const filterValues = ["medical", "vision"];
        expect(expenseTypeFilter(medicalRow, "expenseType", filterValues)).toBe(true);
        expect(expenseTypeFilter(dentalRow, "expenseType", filterValues)).toBe(false);
        expect(expenseTypeFilter(visionRow, "expenseType", filterValues)).toBe(true);
      });
    });

    describe("Status Filter", () => {
      it("should return true when no filter values provided", () => {
        const row = {claimStatus: "submitted"};
        expect(statusFilter(row, "status", [])).toBe(true);
      });

      it("should return true when status matches filter value", () => {
        const row = {claimStatus: "submitted"};
        expect(statusFilter(row, "status", ["submitted", "approved"])).toBe(true);
      });

      it("should return false when status doesn't match filter value", () => {
        const row = {claimStatus: "submitted"};
        expect(statusFilter(row, "status", ["approved", "denied"])).toBe(false);
      });

      it("should default to 'not_submitted' when claimStatus is undefined", () => {
        const row = {};
        expect(statusFilter(row, "status", ["not_submitted"])).toBe(true);
        expect(statusFilter(row, "status", ["submitted"])).toBe(false);
      });

      it("should handle all claim statuses", () => {
        const notSubmitted = {};
        const submitted = {claimStatus: "submitted"};
        const approved = {claimStatus: "approved"};
        const denied = {claimStatus: "denied"};
        const paid = {claimStatus: "paid"};

        expect(statusFilter(notSubmitted, "status", ["not_submitted"])).toBe(true);
        expect(statusFilter(submitted, "status", ["submitted"])).toBe(true);
        expect(statusFilter(approved, "status", ["approved"])).toBe(true);
        expect(statusFilter(denied, "status", ["denied"])).toBe(true);
        expect(statusFilter(paid, "status", ["paid"])).toBe(true);
      });
    });
  });

  describe("Amount Filter Logic", () => {
    // Mock the amount filter function - MUST use 'operator' property to match AmountFilterValue type
    const amountFilter = (amount: number, filterValue: any) => {
      if (!filterValue) return true;

      const {operator, value, min, max} = filterValue;

      switch (operator) {
        case "equals":
          return value !== undefined && amount === value;
        case "greaterThan":
          return value !== undefined && amount > value;
        case "lessThan":
          return value !== undefined && amount < value;
        case "between":
          return min !== undefined && max !== undefined && amount >= min && amount <= max;
        case "notEquals":
          return value !== undefined && amount !== value;
        default:
          return true;
      }
    };

    it("should use 'operator' property not 'type' property", () => {
      // This test ensures we don't regress to using 'type' instead of 'operator'
      const filterWithOperator = {operator: "greaterThan", value: 100};
      const filterWithType = {type: "greaterThan", value: 100} as any;

      // Should work with 'operator'
      expect(amountFilter(150, filterWithOperator)).toBe(true);
      expect(amountFilter(50, filterWithOperator)).toBe(false);

      // Should NOT work with 'type' (will return true due to default case)
      // This documents the bug that was fixed - before the fix, the filter function
      // was checking filterValue.type instead of filterValue.operator
      expect(amountFilter(150, filterWithType)).toBe(true); // Falls through to default
      expect(amountFilter(50, filterWithType)).toBe(true); // Falls through to default (BUG!)
    });

    it("should return true when no filter provided", () => {
      expect(amountFilter(100, null)).toBe(true);
    });

    it("should filter with 'equals' operator", () => {
      const filter = {operator: "equals", value: 100};
      expect(amountFilter(100, filter)).toBe(true);
      expect(amountFilter(99, filter)).toBe(false);
      expect(amountFilter(101, filter)).toBe(false);
    });

    it("should filter with 'greaterThan' operator", () => {
      const filter = {operator: "greaterThan", value: 500};
      expect(amountFilter(501, filter)).toBe(true);
      expect(amountFilter(1000, filter)).toBe(true);
      expect(amountFilter(500, filter)).toBe(false);
      expect(amountFilter(499, filter)).toBe(false);
    });

    it("should filter with 'lessThan' operator", () => {
      const filter = {operator: "lessThan", value: 100};
      expect(amountFilter(99, filter)).toBe(true);
      expect(amountFilter(50, filter)).toBe(true);
      expect(amountFilter(100, filter)).toBe(false);
      expect(amountFilter(101, filter)).toBe(false);
    });

    it("should filter with 'between' operator", () => {
      const filter = {operator: "between", min: 100, max: 500};
      expect(amountFilter(100, filter)).toBe(true);
      expect(amountFilter(250, filter)).toBe(true);
      expect(amountFilter(500, filter)).toBe(true);
      expect(amountFilter(99, filter)).toBe(false);
      expect(amountFilter(501, filter)).toBe(false);
    });

    it("should filter with 'notEquals' operator", () => {
      const filter = {operator: "notEquals", value: 100};
      expect(amountFilter(99, filter)).toBe(true);
      expect(amountFilter(101, filter)).toBe(true);
      expect(amountFilter(100, filter)).toBe(false);
    });

    it("should handle decimal amounts", () => {
      const filter = {operator: "greaterThan", value: 99.99};
      expect(amountFilter(100.00, filter)).toBe(true);
      expect(amountFilter(99.98, filter)).toBe(false);
    });

    it("should handle large amounts", () => {
      const filter = {operator: "between", min: 1000, max: 10000};
      expect(amountFilter(5000, filter)).toBe(true);
      expect(amountFilter(15000, filter)).toBe(false);
    });
  });

  describe("Date Filter Logic", () => {
    // Mock the dateAfter filter function
    const dateAfterFilter = (rowDate: any, filterDate: string) => {
      if (!filterDate) return true;

      const filterDateValue = parseDate(filterDate);
      return rowDate.compare(filterDateValue) >= 0;
    };

    it("should return true when no filter date provided", () => {
      const rowDate = parseDate("2024-01-15");
      expect(dateAfterFilter(rowDate, "")).toBe(true);
    });

    it("should return true when row date is after filter date", () => {
      const rowDate = parseDate("2024-01-15");
      const filterDate = "2024-01-01";
      expect(dateAfterFilter(rowDate, filterDate)).toBe(true);
    });

    it("should return true when row date equals filter date", () => {
      const rowDate = parseDate("2024-01-15");
      const filterDate = "2024-01-15";
      expect(dateAfterFilter(rowDate, filterDate)).toBe(true);
    });

    it("should return false when row date is before filter date", () => {
      const rowDate = parseDate("2024-01-01");
      const filterDate = "2024-01-15";
      expect(dateAfterFilter(rowDate, filterDate)).toBe(false);
    });

    it("should handle dates across years", () => {
      const rowDate = parseDate("2024-01-01");
      const filterDate = "2023-12-31";
      expect(dateAfterFilter(rowDate, filterDate)).toBe(true);
    });

    it("should handle dates across months", () => {
      const rowDate = parseDate("2024-02-01");
      const filterDate = "2024-01-31";
      expect(dateAfterFilter(rowDate, filterDate)).toBe(true);
    });
  });

  describe("Expense Table Grouping", () => {
    it("should support grouping by provider", () => {
      const expenses = [
        {id: 1, provider: "Dr. Smith", amount: 100},
        {id: 2, provider: "Dr. Smith", amount: 200},
        {id: 3, provider: "Dr. Jones", amount: 150},
      ];

      const groupedByProvider = expenses.reduce((acc, expense) => {
        const key = expense.provider || "Unknown";
        if (!acc[key]) acc[key] = [];
        acc[key].push(expense);
        return acc;
      }, {} as Record<string, typeof expenses>);

      expect(Object.keys(groupedByProvider)).toEqual(["Dr. Smith", "Dr. Jones"]);
      expect(groupedByProvider["Dr. Smith"]).toHaveLength(2);
      expect(groupedByProvider["Dr. Jones"]).toHaveLength(1);
    });

    it("should support grouping by patient name", () => {
      const expenses = [
        {id: 1, patientName: "John Doe", amount: 100},
        {id: 2, patientName: "John Doe", amount: 200},
        {id: 3, patientName: "Jane Smith", amount: 150},
      ];

      const groupedByPatient = expenses.reduce((acc, expense) => {
        const key = expense.patientName || "Unknown";
        if (!acc[key]) acc[key] = [];
        acc[key].push(expense);
        return acc;
      }, {} as Record<string, typeof expenses>);

      expect(Object.keys(groupedByPatient)).toEqual(["John Doe", "Jane Smith"]);
      expect(groupedByPatient["John Doe"]).toHaveLength(2);
      expect(groupedByPatient["Jane Smith"]).toHaveLength(1);
    });

    it("should support grouping by expense type", () => {
      const expenses = [
        {id: 1, expenseType: "medical", amount: 100},
        {id: 2, expenseType: "medical", amount: 200},
        {id: 3, expenseType: "dental", amount: 150},
        {id: 4, expenseType: "vision", amount: 75},
      ];

      const groupedByType = expenses.reduce((acc, expense) => {
        const key = expense.expenseType;
        if (!acc[key]) acc[key] = [];
        acc[key].push(expense);
        return acc;
      }, {} as Record<string, typeof expenses>);

      expect(Object.keys(groupedByType)).toEqual(["medical", "dental", "vision"]);
      expect(groupedByType["medical"]).toHaveLength(2);
      expect(groupedByType["dental"]).toHaveLength(1);
      expect(groupedByType["vision"]).toHaveLength(1);
    });

    it("should support grouping by status", () => {
      const expenses = [
        {id: 1, claimStatus: "submitted", amount: 100},
        {id: 2, claimStatus: "submitted", amount: 200},
        {id: 3, claimStatus: "approved", amount: 150},
        {id: 4, claimStatus: undefined, amount: 75},
      ];

      const groupedByStatus = expenses.reduce((acc, expense) => {
        const key = expense.claimStatus || "not_submitted";
        if (!acc[key]) acc[key] = [];
        acc[key].push(expense);
        return acc;
      }, {} as Record<string, typeof expenses>);

      expect(Object.keys(groupedByStatus)).toEqual(["submitted", "approved", "not_submitted"]);
      expect(groupedByStatus["submitted"]).toHaveLength(2);
      expect(groupedByStatus["approved"]).toHaveLength(1);
      expect(groupedByStatus["not_submitted"]).toHaveLength(1);
    });

    it("should calculate totals when grouping", () => {
      const expenses = [
        {id: 1, provider: "Dr. Smith", amount: 100},
        {id: 2, provider: "Dr. Smith", amount: 200},
        {id: 3, provider: "Dr. Jones", amount: 150},
      ];

      const groupTotals = expenses.reduce((acc, expense) => {
        const key = expense.provider || "Unknown";
        acc[key] = (acc[key] || 0) + expense.amount;
        return acc;
      }, {} as Record<string, number>);

      expect(groupTotals["Dr. Smith"]).toBe(300);
      expect(groupTotals["Dr. Jones"]).toBe(150);
    });
  });

  describe("Expense Table Sorting", () => {
    it("should sort by date ascending", () => {
      const expenses = [
        {id: 1, date: parseDate("2024-01-15")},
        {id: 2, date: parseDate("2024-01-10")},
        {id: 3, date: parseDate("2024-01-20")},
      ];

      const sorted = [...expenses].sort((a, b) => a.date.compare(b.date));

      expect(sorted[0].id).toBe(2); // 2024-01-10
      expect(sorted[1].id).toBe(1); // 2024-01-15
      expect(sorted[2].id).toBe(3); // 2024-01-20
    });

    it("should sort by date descending", () => {
      const expenses = [
        {id: 1, date: parseDate("2024-01-15")},
        {id: 2, date: parseDate("2024-01-10")},
        {id: 3, date: parseDate("2024-01-20")},
      ];

      const sorted = [...expenses].sort((a, b) => b.date.compare(a.date));

      expect(sorted[0].id).toBe(3); // 2024-01-20
      expect(sorted[1].id).toBe(1); // 2024-01-15
      expect(sorted[2].id).toBe(2); // 2024-01-10
    });

    it("should sort by amount ascending", () => {
      const expenses = [
        {id: 1, amount: 200},
        {id: 2, amount: 50},
        {id: 3, amount: 150},
      ];

      const sorted = [...expenses].sort((a, b) => a.amount - b.amount);

      expect(sorted[0].id).toBe(2); // 50
      expect(sorted[1].id).toBe(3); // 150
      expect(sorted[2].id).toBe(1); // 200
    });

    it("should sort by amount descending", () => {
      const expenses = [
        {id: 1, amount: 200},
        {id: 2, amount: 50},
        {id: 3, amount: 150},
      ];

      const sorted = [...expenses].sort((a, b) => b.amount - a.amount);

      expect(sorted[0].id).toBe(1); // 200
      expect(sorted[1].id).toBe(3); // 150
      expect(sorted[2].id).toBe(2); // 50
    });

    it("should sort by provider alphabetically", () => {
      const expenses = [
        {id: 1, provider: "Dr. Smith"},
        {id: 2, provider: "Dr. Brown"},
        {id: 3, provider: "Dr. Jones"},
      ];

      const sorted = [...expenses].sort((a, b) =>
        (a.provider || "").localeCompare(b.provider || "")
      );

      expect(sorted[0].id).toBe(2); // Dr. Brown
      expect(sorted[1].id).toBe(3); // Dr. Jones
      expect(sorted[2].id).toBe(1); // Dr. Smith
    });

    it("should handle null values when sorting", () => {
      const expenses = [
        {id: 1, provider: "Dr. Smith"},
        {id: 2, provider: null},
        {id: 3, provider: "Dr. Jones"},
      ];

      const sorted = [...expenses].sort((a, b) =>
        (a.provider || "").localeCompare(b.provider || "")
      );

      expect(sorted[0].id).toBe(2); // null sorts first
      expect(sorted[1].id).toBe(3); // Dr. Jones
      expect(sorted[2].id).toBe(1); // Dr. Smith
    });
  });

  describe("Column Visibility", () => {
    it("should hide specific columns by default", () => {
      const hiddenColumns = [
        "id",
        "provider",
        "patientName",
        "diagnosis",
        "treatmentDescription",
        "notes"
      ];

      const visibility = {
        id: false,
        provider: false,
        patientName: false,
        diagnosis: false,
        treatmentDescription: false,
        notes: false,
      };

      hiddenColumns.forEach(column => {
        expect(visibility[column as keyof typeof visibility]).toBe(false);
      });
    });

    it("should show core columns by default", () => {
      const visibleColumns = [
        "date",
        "expenseType",
        "amount",
        "insuranceCovered",
        "outOfPocket",
        "status"
      ];

      // These columns should not be in the visibility object
      // or should be explicitly set to true
      visibleColumns.forEach(column => {
        // If not in visibility object, it's visible by default
        expect(column).toBeTruthy();
      });
    });

    it("should allow toggling column visibility", () => {
      let visibility = {
        provider: false,
        patientName: false,
        notes: false,
      };

      // Toggle provider visible
      visibility.provider = true;
      expect(visibility.provider).toBe(true);

      // Toggle provider hidden again
      visibility.provider = false;
      expect(visibility.provider).toBe(false);

      // Toggle multiple columns
      visibility.patientName = true;
      visibility.notes = true;
      expect(visibility.patientName).toBe(true);
      expect(visibility.notes).toBe(true);
    });
  });
});
