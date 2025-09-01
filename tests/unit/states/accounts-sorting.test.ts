import {describe, test, expect, beforeEach} from "bun:test";
import {AccountsState} from "$lib/states/entities/accounts.svelte";
import type {Account} from "$lib/schema";

// Mock accounts data for testing
const mockAccounts: Account[] = [
  {
    id: 1,
    name: "Checking Account",
    balance: 1500,
    dateOpened: "2023-01-15",
    closed: false,
    createdAt: "2023-01-15T10:00:00Z",
    updatedAt: "2023-01-15T10:00:00Z",
  },
  {
    id: 2,
    name: "Savings Account",
    balance: 5000,
    dateOpened: "2022-06-20",
    closed: false,
    createdAt: "2022-06-20T14:30:00Z",
    updatedAt: "2022-06-20T14:30:00Z",
  },
  {
    id: 3,
    name: "Credit Card",
    balance: -800,
    dateOpened: "2023-03-10",
    closed: false,
    createdAt: "2023-03-10T09:15:00Z",
    updatedAt: "2023-03-10T09:15:00Z",
  },
  {
    id: 4,
    name: "Old Account",
    balance: 0,
    dateOpened: "2021-12-01",
    closed: true,
    createdAt: "2021-12-01T16:45:00Z",
    updatedAt: "2023-01-01T12:00:00Z",
  },
  {
    id: 5,
    name: "Investment Account",
    balance: 10000,
    dateOpened: "2023-05-01",
    closed: false,
    createdAt: "2023-05-01T11:20:00Z",
    updatedAt: "2023-05-01T11:20:00Z",
  },
];

describe("AccountsState Sorting", () => {
  let accountsState: AccountsState;

  beforeEach(() => {
    // Clear localStorage before each test
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
    accountsState = new AccountsState(mockAccounts);
  });

  describe("Default Sorting", () => {
    test("should default to name ascending", () => {
      expect(accountsState.sortField).toBe("name");
      expect(accountsState.sortDirection).toBe("asc");
    });

    test("should sort by name ascending by default", () => {
      const sorted = accountsState.sorted;
      const names = sorted.map((account) => account.name);
      expect(names).toEqual([
        "Checking Account",
        "Credit Card",
        "Investment Account",
        "Old Account",
        "Savings Account",
      ]);
    });
  });

  describe("Name Sorting", () => {
    test("should sort by name ascending", () => {
      accountsState.setSorting("name", "asc");
      const sorted = accountsState.sorted;
      const names = sorted.map((account) => account.name);
      expect(names).toEqual([
        "Checking Account",
        "Credit Card",
        "Investment Account",
        "Old Account",
        "Savings Account",
      ]);
    });

    test("should sort by name descending", () => {
      accountsState.setSorting("name", "desc");
      const sorted = accountsState.sorted;
      const names = sorted.map((account) => account.name);
      expect(names).toEqual([
        "Savings Account",
        "Old Account",
        "Investment Account",
        "Credit Card",
        "Checking Account",
      ]);
    });
  });

  describe("Balance Sorting", () => {
    test("should sort by balance ascending", () => {
      accountsState.setSorting("balance", "asc");
      const sorted = accountsState.sorted;
      const balances = sorted.map((account) => account.balance);
      expect(balances).toEqual([-800, 0, 1500, 5000, 10000]);
    });

    test("should sort by balance descending", () => {
      accountsState.setSorting("balance", "desc");
      const sorted = accountsState.sorted;
      const balances = sorted.map((account) => account.balance);
      expect(balances).toEqual([10000, 5000, 1500, 0, -800]);
    });
  });

  describe("Date Opened Sorting", () => {
    test("should sort by date opened ascending (oldest first)", () => {
      accountsState.setSorting("dateOpened", "asc");
      const sorted = accountsState.sorted;
      const names = sorted.map((account) => account.name);
      expect(names).toEqual([
        "Old Account", // 2021-12-01
        "Savings Account", // 2022-06-20
        "Checking Account", // 2023-01-15
        "Credit Card", // 2023-03-10
        "Investment Account", // 2023-05-01
      ]);
    });

    test("should sort by date opened descending (newest first)", () => {
      accountsState.setSorting("dateOpened", "desc");
      const sorted = accountsState.sorted;
      const names = sorted.map((account) => account.name);
      expect(names).toEqual([
        "Investment Account", // 2023-05-01
        "Credit Card", // 2023-03-10
        "Checking Account", // 2023-01-15
        "Savings Account", // 2022-06-20
        "Old Account", // 2021-12-01
      ]);
    });
  });

  describe("Status Sorting", () => {
    test("should sort by status ascending (active first)", () => {
      accountsState.setSorting("status", "asc");
      const sorted = accountsState.sorted;
      const activeAccounts = sorted.filter((account) => !account.closed);
      const closedAccounts = sorted.filter((account) => account.closed);

      // Active accounts should come first
      expect(activeAccounts.length).toBe(4);
      expect(closedAccounts.length).toBe(1);
      expect(sorted.indexOf(activeAccounts[0])).toBeLessThan(sorted.indexOf(closedAccounts[0]));
    });

    test("should sort by status descending (closed first)", () => {
      accountsState.setSorting("status", "desc");
      const sorted = accountsState.sorted;
      const closedAccounts = sorted.filter((account) => account.closed);
      const activeAccounts = sorted.filter((account) => !account.closed);

      // Closed accounts should come first
      expect(closedAccounts.length).toBe(1);
      expect(activeAccounts.length).toBe(4);
      expect(sorted.indexOf(closedAccounts[0])).toBeLessThan(sorted.indexOf(activeAccounts[0]));
    });
  });

  describe("Created At Sorting", () => {
    test("should sort by created date ascending (oldest first)", () => {
      accountsState.setSorting("createdAt", "asc");
      const sorted = accountsState.sorted;
      const names = sorted.map((account) => account.name);
      expect(names).toEqual([
        "Old Account", // 2021-12-01
        "Savings Account", // 2022-06-20
        "Checking Account", // 2023-01-15
        "Credit Card", // 2023-03-10
        "Investment Account", // 2023-05-01
      ]);
    });

    test("should sort by created date descending (newest first)", () => {
      accountsState.setSorting("createdAt", "desc");
      const sorted = accountsState.sorted;
      const names = sorted.map((account) => account.name);
      expect(names).toEqual([
        "Investment Account", // 2023-05-01
        "Credit Card", // 2023-03-10
        "Checking Account", // 2023-01-15
        "Savings Account", // 2022-06-20
        "Old Account", // 2021-12-01
      ]);
    });
  });

  describe("Sort Direction Toggle", () => {
    test("should toggle from ascending to descending", () => {
      accountsState.setSorting("name", "asc");
      accountsState.toggleSortDirection();
      expect(accountsState.sortDirection).toBe("desc");
    });

    test("should toggle from descending to ascending", () => {
      accountsState.setSorting("name", "desc");
      accountsState.toggleSortDirection();
      expect(accountsState.sortDirection).toBe("asc");
    });
  });

  describe("Sorted Domain Methods", () => {
    test("should return sorted active accounts", () => {
      accountsState.setSorting("balance", "desc");
      const sortedActive = accountsState.getSortedActiveAccounts();

      // Should only include active accounts (not closed)
      expect(sortedActive.every((account) => !account.closed)).toBe(true);
      expect(sortedActive.length).toBe(4);

      // Should be sorted by balance descending
      const balances = sortedActive.map((account) => account.balance);
      expect(balances).toEqual([10000, 5000, 1500, -800]);
    });

    test("should return sorted closed accounts", () => {
      accountsState.setSorting("name", "asc");
      const sortedClosed = accountsState.getSortedClosedAccounts();

      // Should only include closed accounts
      expect(sortedClosed.every((account) => account.closed)).toBe(true);
      expect(sortedClosed.length).toBe(1);
      expect(sortedClosed[0].name).toBe("Old Account");
    });
  });

  describe("Edge Cases", () => {
    test("should handle accounts with null/undefined values", () => {
      const accountsWithNulls: Account[] = [
        {
          id: 1,
          name: "",
          balance: 0,
          dateOpened: null as any,
          closed: false,
          createdAt: null as any,
          updatedAt: null as any,
        },
        ...mockAccounts,
      ];

      const stateWithNulls = new AccountsState(accountsWithNulls);

      // Should not throw errors
      expect(() => stateWithNulls.setSorting("name", "asc")).not.toThrow();
      expect(() => stateWithNulls.setSorting("dateOpened", "asc")).not.toThrow();
      expect(() => stateWithNulls.setSorting("createdAt", "asc")).not.toThrow();

      const sorted = stateWithNulls.sorted;
      expect(sorted.length).toBe(6);
    });

    test("should handle empty accounts array", () => {
      const emptyState = new AccountsState([]);
      expect(emptyState.sorted).toEqual([]);
      expect(emptyState.getSortedActiveAccounts()).toEqual([]);
      expect(emptyState.getSortedClosedAccounts()).toEqual([]);
    });
  });
});
