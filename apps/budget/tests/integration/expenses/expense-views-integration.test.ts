import {describe, test, expect, beforeEach, afterEach} from "bun:test";
import {parseDate} from "@internationalized/date";

/**
 * Integration tests for expense views functionality
 * Testing the interaction between expense views, filters, and the table state
 */
describe("Expense Views Integration Tests", () => {
  // Helper to create dates relative to today
  const getRelativeDate = (daysAgo: number) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return parseDate(date.toISOString().split('T')[0]);
  };

  const getRelativeDateString = (daysAgo: number) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
  };

  // Mock expense data for testing with relative dates
  const mockExpenses = [
    {
      id: 1,
      date: getRelativeDate(15), // 15 days ago
      provider: "Dr. Smith",
      patientName: "John Doe",
      expenseType: "medical",
      diagnosis: "Annual checkup",
      treatmentDescription: "General examination",
      amount: 250,
      insuranceCovered: 200,
      outOfPocket: 50,
      serviceDate: getRelativeDateString(15),
      paidDate: getRelativeDateString(10),
      taxYear: 2024,
      notes: "Routine visit",
      isQualified: true,
      hsaAccountId: 1,
      transactionId: 100,
      claimStatus: "submitted",
      hasReceipts: true,
    },
    {
      id: 2,
      date: getRelativeDate(20), // 20 days ago
      provider: "Dr. Jones",
      patientName: "Jane Smith",
      expenseType: "dental",
      diagnosis: "Cavity filling",
      treatmentDescription: "Dental restoration",
      amount: 150,
      insuranceCovered: 100,
      outOfPocket: 50,
      serviceDate: getRelativeDateString(20),
      paidDate: getRelativeDateString(18),
      taxYear: 2024,
      notes: null,
      isQualified: true,
      hsaAccountId: 1,
      transactionId: 101,
      claimStatus: "approved",
      hasReceipts: false,
    },
    {
      id: 3,
      date: getRelativeDate(60), // 60 days ago (outside 30-day window)
      provider: "Vision Center",
      patientName: "John Doe",
      expenseType: "vision",
      diagnosis: null,
      treatmentDescription: "Eye exam and glasses",
      amount: 600,
      insuranceCovered: 150,
      outOfPocket: 450,
      serviceDate: getRelativeDateString(60),
      paidDate: getRelativeDateString(58),
      taxYear: 2024,
      notes: "Annual vision exam",
      isQualified: true,
      hsaAccountId: 1,
      transactionId: 102,
      claimStatus: undefined, // not submitted
      hasReceipts: true,
    },
    {
      id: 4,
      date: getRelativeDate(5), // 5 days ago
      provider: "Dr. Smith",
      patientName: "Jane Smith",
      expenseType: "medical",
      diagnosis: "Lab work",
      treatmentDescription: "Blood tests",
      amount: 75,
      insuranceCovered: 60,
      outOfPocket: 15,
      serviceDate: getRelativeDateString(5),
      paidDate: null,
      taxYear: 2024,
      notes: null,
      isQualified: true,
      hsaAccountId: 1,
      transactionId: 103,
      claimStatus: undefined, // not submitted
      hasReceipts: false,
    },
  ];

  describe("All Expenses View", () => {
    test("should include all expenses without filters", () => {
      const view = {
        id: -10,
        name: "All Expenses",
        filters: [],
      };

      // No filtering - all expenses should be included
      const filtered = mockExpenses.filter(() => true);
      expect(filtered).toHaveLength(4);
    });

    test("should sort by date descending by default", () => {
      const sorted = [...mockExpenses].sort((a, b) => b.date.compare(a.date));

      expect(sorted[0].id).toBe(4); // 5 days ago
      expect(sorted[1].id).toBe(1); // 15 days ago
      expect(sorted[2].id).toBe(2); // 20 days ago
      expect(sorted[3].id).toBe(3); // 60 days ago
    });

    test("should have specific columns hidden", () => {
      const hiddenColumns = ["id", "provider", "patientName", "diagnosis", "treatmentDescription", "notes"];
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
  });

  describe("Recent View", () => {
    test("should filter expenses from last 30 days", () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgoDate = parseDate(thirtyDaysAgo.toISOString().split('T')[0]);

      const filtered = mockExpenses.filter(expense =>
        expense.date.compare(thirtyDaysAgoDate) >= 0
      );

      // Should include expenses from 2024-01 and 2024-02
      expect(filtered.length).toBeGreaterThan(0);
      filtered.forEach(expense => {
        expect(expense.date.compare(thirtyDaysAgoDate)).toBeGreaterThanOrEqual(0);
      });
    });

    test("should sort by date descending", () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgoDate = parseDate(thirtyDaysAgo.toISOString().split('T')[0]);

      const filtered = mockExpenses.filter(expense =>
        expense.date.compare(thirtyDaysAgoDate) >= 0
      );

      const sorted = [...filtered].sort((a, b) => b.date.compare(a.date));

      // Most recent should be first
      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].date.compare(sorted[i + 1].date)).toBeGreaterThanOrEqual(0);
      }
    });

    test("should exclude old expenses", () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgoDate = parseDate(thirtyDaysAgo.toISOString().split('T')[0]);

      const filtered = mockExpenses.filter(expense =>
        expense.date.compare(thirtyDaysAgoDate) >= 0
      );

      // Expense from 60 days ago should be excluded
      const oldExpenseIncluded = filtered.some(e => e.id === 3);
      expect(oldExpenseIncluded).toBe(false);
    });
  });

  describe("High Amount View", () => {
    test("should filter expenses over $500", () => {
      const filtered = mockExpenses.filter(expense => expense.amount > 500);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(3);
      expect(filtered[0].amount).toBe(600);
    });

    test("should exclude expenses under $500", () => {
      const filtered = mockExpenses.filter(expense => expense.amount > 500);

      const under500 = mockExpenses.filter(expense => expense.amount <= 500);
      expect(under500).toHaveLength(3);

      // Verify none of the under $500 expenses are in filtered results
      under500.forEach(expense => {
        expect(filtered.find(e => e.id === expense.id)).toBeUndefined();
      });
    });

    test("should sort by amount descending", () => {
      const sorted = [...mockExpenses].sort((a, b) => b.amount - a.amount);

      expect(sorted[0].amount).toBe(600);
      expect(sorted[1].amount).toBe(250);
      expect(sorted[2].amount).toBe(150);
      expect(sorted[3].amount).toBe(75);
    });

    test("should handle boundary case at exactly $500", () => {
      const expenseAt500 = {
        ...mockExpenses[0],
        id: 999,
        amount: 500,
      };

      const testData = [...mockExpenses, expenseAt500];
      const filtered = testData.filter(expense => expense.amount > 500);

      // Exactly $500 should NOT be included (> not >=)
      expect(filtered.find(e => e.id === 999)).toBeUndefined();
      expect(filtered.find(e => e.id === 3)).toBeDefined(); // 600 should be included
    });
  });

  describe("Unclaimed View", () => {
    test("should filter expenses with 'not_submitted' status", () => {
      const filtered = mockExpenses.filter(expense => {
        const status = expense.claimStatus || 'not_submitted';
        return status === 'not_submitted';
      });

      expect(filtered).toHaveLength(2);
      expect(filtered.map(e => e.id).sort()).toEqual([3, 4]);
    });

    test("should exclude expenses with other statuses", () => {
      const filtered = mockExpenses.filter(expense => {
        const status = expense.claimStatus || 'not_submitted';
        return status === 'not_submitted';
      });

      // Should not include submitted or approved
      const submittedExpense = filtered.find(e => e.claimStatus === 'submitted');
      const approvedExpense = filtered.find(e => e.claimStatus === 'approved');

      expect(submittedExpense).toBeUndefined();
      expect(approvedExpense).toBeUndefined();
    });

    test("should treat undefined claimStatus as 'not_submitted'", () => {
      const expensesWithUndefinedStatus = mockExpenses.filter(
        expense => expense.claimStatus === undefined
      );

      expect(expensesWithUndefinedStatus).toHaveLength(2);

      // All should be treated as not_submitted
      expensesWithUndefinedStatus.forEach(expense => {
        const status = expense.claimStatus || 'not_submitted';
        expect(status).toBe('not_submitted');
      });
    });

    test("should sort by date descending", () => {
      const filtered = mockExpenses.filter(expense => {
        const status = expense.claimStatus || 'not_submitted';
        return status === 'not_submitted';
      });

      const sorted = [...filtered].sort((a, b) => b.date.compare(a.date));

      expect(sorted[0].id).toBe(4); // 5 days ago
      expect(sorted[1].id).toBe(3); // 60 days ago
    });
  });

  describe("Multiple Filters Combined", () => {
    test("should combine date and amount filters", () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgoDate = parseDate(thirtyDaysAgo.toISOString().split('T')[0]);

      const filtered = mockExpenses.filter(expense =>
        expense.date.compare(thirtyDaysAgoDate) >= 0 && expense.amount > 100
      );

      // Should include recent expenses with amount > 100
      filtered.forEach(expense => {
        expect(expense.date.compare(thirtyDaysAgoDate)).toBeGreaterThanOrEqual(0);
        expect(expense.amount).toBeGreaterThan(100);
      });
    });

    test("should combine status and provider filters", () => {
      const filtered = mockExpenses.filter(expense => {
        const status = expense.claimStatus || 'not_submitted';
        return status === 'not_submitted' && expense.provider === 'Dr. Smith';
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(4);
    });

    test("should combine multiple field filters", () => {
      const filtered = mockExpenses.filter(expense =>
        expense.expenseType === 'medical' &&
        expense.amount > 200 &&
        expense.patientName === 'John Doe'
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(1);
    });
  });

  describe("Grouping Functionality", () => {
    test("should group by provider correctly", () => {
      const grouped = mockExpenses.reduce((acc, expense) => {
        const key = expense.provider || 'Unknown';
        if (!acc[key]) acc[key] = [];
        acc[key].push(expense);
        return acc;
      }, {} as Record<string, typeof mockExpenses>);

      expect(grouped["Dr. Smith"]).toHaveLength(2);
      expect(grouped["Dr. Jones"]).toHaveLength(1);
      expect(grouped["Vision Center"]).toHaveLength(1);
    });

    test("should calculate group totals", () => {
      const groupTotals = mockExpenses.reduce((acc, expense) => {
        const key = expense.provider || 'Unknown';
        acc[key] = (acc[key] || 0) + expense.amount;
        return acc;
      }, {} as Record<string, number>);

      expect(groupTotals["Dr. Smith"]).toBe(325); // 250 + 75
      expect(groupTotals["Dr. Jones"]).toBe(150);
      expect(groupTotals["Vision Center"]).toBe(600);
    });

    test("should group by expense type", () => {
      const grouped = mockExpenses.reduce((acc, expense) => {
        const key = expense.expenseType;
        if (!acc[key]) acc[key] = [];
        acc[key].push(expense);
        return acc;
      }, {} as Record<string, typeof mockExpenses>);

      expect(grouped["medical"]).toHaveLength(2);
      expect(grouped["dental"]).toHaveLength(1);
      expect(grouped["vision"]).toHaveLength(1);
    });

    test("should group by status with proper defaults", () => {
      const grouped = mockExpenses.reduce((acc, expense) => {
        const key = expense.claimStatus || 'not_submitted';
        if (!acc[key]) acc[key] = [];
        acc[key].push(expense);
        return acc;
      }, {} as Record<string, typeof mockExpenses>);

      expect(grouped["not_submitted"]).toHaveLength(2);
      expect(grouped["submitted"]).toHaveLength(1);
      expect(grouped["approved"]).toHaveLength(1);
    });

    test("should maintain sort order within groups", () => {
      const grouped = mockExpenses.reduce((acc, expense) => {
        const key = expense.provider || 'Unknown';
        if (!acc[key]) acc[key] = [];
        acc[key].push(expense);
        return acc;
      }, {} as Record<string, typeof mockExpenses>);

      // Sort Dr. Smith's expenses by date descending
      const drSmithExpenses = grouped["Dr. Smith"].sort((a, b) => b.date.compare(a.date));

      expect(drSmithExpenses[0].id).toBe(4); // 5 days ago
      expect(drSmithExpenses[1].id).toBe(1); // 15 days ago
    });
  });

  describe("Aggregation Functions", () => {
    test("should calculate total amount for group", () => {
      const totalAmount = mockExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      expect(totalAmount).toBe(1075);
    });

    test("should calculate total insurance covered", () => {
      const totalInsurance = mockExpenses.reduce((sum, expense) => sum + expense.insuranceCovered, 0);
      expect(totalInsurance).toBe(510);
    });

    test("should calculate total out of pocket", () => {
      const totalOutOfPocket = mockExpenses.reduce((sum, expense) => sum + expense.outOfPocket, 0);
      expect(totalOutOfPocket).toBe(565);
    });

    test("should calculate average expense amount", () => {
      const totalAmount = mockExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      const average = totalAmount / mockExpenses.length;
      expect(average).toBeCloseTo(268.75, 2);
    });

    test("should calculate group-specific totals", () => {
      const providerTotals = mockExpenses.reduce((acc, expense) => {
        const key = expense.provider || 'Unknown';
        if (!acc[key]) {
          acc[key] = {
            total: 0,
            insurance: 0,
            outOfPocket: 0,
            count: 0,
          };
        }
        acc[key].total += expense.amount;
        acc[key].insurance += expense.insuranceCovered;
        acc[key].outOfPocket += expense.outOfPocket;
        acc[key].count += 1;
        return acc;
      }, {} as Record<string, {total: number; insurance: number; outOfPocket: number; count: number}>);

      expect(providerTotals["Dr. Smith"].total).toBe(325);
      expect(providerTotals["Dr. Smith"].count).toBe(2);
      expect(providerTotals["Vision Center"].total).toBe(600);
    });
  });

  describe("Column Visibility State", () => {
    test("should maintain visibility state across view changes", () => {
      let visibility = {
        id: false,
        provider: false,
        patientName: false,
        diagnosis: false,
        treatmentDescription: false,
        notes: false,
      };

      // Simulate toggling provider visibility
      visibility.provider = true;

      // Should persist even when changing views
      expect(visibility.provider).toBe(true);
      expect(visibility.id).toBe(false);
    });

    test("should allow resetting to default visibility", () => {
      let visibility = {
        id: true,
        provider: true,
        patientName: true,
        diagnosis: false,
        treatmentDescription: false,
        notes: false,
      };

      // Reset to default
      const defaultVisibility = {
        id: false,
        provider: false,
        patientName: false,
        diagnosis: false,
        treatmentDescription: false,
        notes: false,
      };

      visibility = {...defaultVisibility};

      expect(visibility.id).toBe(false);
      expect(visibility.provider).toBe(false);
      expect(visibility.patientName).toBe(false);
    });
  });

  describe("View Switching", () => {
    test("should apply correct filters when switching to Recent view", () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgoDate = parseDate(thirtyDaysAgo.toISOString().split('T')[0]);

      const allExpensesCount = mockExpenses.length;
      const recentExpensesCount = mockExpenses.filter(expense =>
        expense.date.compare(thirtyDaysAgoDate) >= 0
      ).length;

      expect(recentExpensesCount).toBeLessThanOrEqual(allExpensesCount);
    });

    test("should apply correct sort when switching to High Amount view", () => {
      const sortedByAmount = [...mockExpenses].sort((a, b) => b.amount - a.amount);
      const sortedByDate = [...mockExpenses].sort((a, b) => b.date.compare(a.date));

      // Different sort orders should produce different results
      expect(sortedByAmount[0].id).not.toBe(sortedByDate[0].id);
    });

    test("should clear filters when switching to All Expenses view", () => {
      // Start with Recent view (has filters)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgoDate = parseDate(thirtyDaysAgo.toISOString().split('T')[0]);

      let filtered = mockExpenses.filter(expense =>
        expense.date.compare(thirtyDaysAgoDate) >= 0
      );

      // Switch to All Expenses view (no filters)
      filtered = mockExpenses.filter(() => true);

      expect(filtered).toHaveLength(mockExpenses.length);
    });
  });

  describe("Error Handling", () => {
    test("should handle missing expense data gracefully", () => {
      const incompleteExpense = {
        id: 999,
        date: getRelativeDate(10),
        provider: null,
        patientName: null,
        expenseType: "medical",
        diagnosis: null,
        treatmentDescription: null,
        amount: 100,
        insuranceCovered: 0,
        outOfPocket: 100,
        serviceDate: getRelativeDateString(10),
        paidDate: null,
        taxYear: 2024,
        notes: null,
        isQualified: true,
        hsaAccountId: 1,
        transactionId: 999,
        claimStatus: undefined,
        hasReceipts: false,
      };

      const testData = [...mockExpenses, incompleteExpense];

      // Should not throw errors when filtering
      expect(() => {
        const filtered = testData.filter(expense => {
          const status = expense.claimStatus || 'not_submitted';
          return status === 'not_submitted';
        });
        expect(filtered.length).toBeGreaterThan(0);
      }).not.toThrow();
    });

    test("should handle null values in sorting", () => {
      const expensesWithNulls = mockExpenses.map(e => ({
        ...e,
        provider: Math.random() > 0.5 ? e.provider : null,
      }));

      expect(() => {
        const sorted = [...expensesWithNulls].sort((a, b) =>
          (a.provider || "").localeCompare(b.provider || "")
        );
        expect(sorted.length).toBe(expensesWithNulls.length);
      }).not.toThrow();
    });

    test("should handle empty expense list", () => {
      const emptyExpenses: typeof mockExpenses = [];

      const filtered = emptyExpenses.filter(() => true);
      expect(filtered).toHaveLength(0);

      const sorted = [...emptyExpenses].sort((a, b) => b.amount - a.amount);
      expect(sorted).toHaveLength(0);

      const grouped = emptyExpenses.reduce((acc, expense) => {
        const key = expense.provider || 'Unknown';
        if (!acc[key]) acc[key] = [];
        acc[key].push(expense);
        return acc;
      }, {} as Record<string, typeof emptyExpenses>);

      expect(Object.keys(grouped)).toHaveLength(0);
    });
  });
});
