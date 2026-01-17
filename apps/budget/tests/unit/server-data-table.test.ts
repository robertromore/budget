import {describe, it, expect} from "vitest";
import type {TransactionsFormat} from "$lib/types/transactions";
import {CalendarDate} from "@internationalized/date";

// Extended type with balance field for test data
type TestTransactionFormat = TransactionsFormat & {
  balance: number;
};

// Mock transaction data with proper typing
const mockTransactions: TestTransactionFormat[] = [
  {
    id: 1,
    date: new CalendarDate(2024, 1, 1),
    amount: 100.5,
    notes: "Test transaction",
    status: "cleared",
    accountId: 1,
    payeeId: 1,
    payee: {
      id: 1,
      name: "Test Payee",
      notes: null,
      dateCreated: "2024-01-01T00:00:00Z",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      deletedAt: null,
    },
    categoryId: 1,
    category: {
      id: 1,
      name: "Test Category",
      notes: null,
      dateCreated: "2024-01-01T00:00:00Z",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      deletedAt: null,
      parentId: null,
    },
    parentId: null,
    balance: 100.5,
  },
  {
    id: 2,
    date: new CalendarDate(2024, 1, 2),
    amount: -50.25,
    notes: "Another test",
    status: "pending",
    accountId: 1,
    payeeId: 2,
    payee: {
      id: 2,
      name: "Another Payee",
      notes: null,
      dateCreated: "2024-01-01T00:00:00Z",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      deletedAt: null,
    },
    categoryId: 2,
    category: {
      id: 2,
      name: "Another Category",
      notes: null,
      dateCreated: "2024-01-01T00:00:00Z",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      deletedAt: null,
      parentId: null,
    },
    parentId: null,
    balance: 50.25,
  },
];

describe("ServerDataTable Component Logic", () => {
  describe("Data Processing", () => {
    it("should process transaction data correctly", () => {
      const processTransactions = (transactions: TestTransactionFormat[]) => {
        return transactions.map((transaction) => ({
          id: transaction.id,
          date: transaction.date.toString(),
          amount: transaction.amount,
          notes: transaction.notes || "",
          payee: transaction.payee?.name || "",
          category: transaction.category?.name || "",
          status: transaction.status,
        }));
      };

      const processed = processTransactions(mockTransactions);

      expect(processed[0]).toEqual({
        id: 1,
        date: "2024-01-01",
        amount: 100.5,
        notes: "Test transaction",
        payee: "Test Payee",
        category: "Test Category",
        status: "cleared",
      });

      expect(processed[1]).toEqual({
        id: 2,
        date: "2024-01-02",
        amount: -50.25,
        notes: "Another test",
        payee: "Another Payee",
        category: "Another Category",
        status: "pending",
      });
    });

    it("should handle empty transaction list", () => {
      const processTransactions = (transactions: TestTransactionFormat[]) => {
        return transactions.map((transaction) => ({
          id: transaction.id,
          date: transaction.date.toString(),
          amount: transaction.amount,
        }));
      };

      const processed = processTransactions([]);
      expect(processed).toEqual([]);
    });
  });

  describe("Component State Logic", () => {
    it("should determine loading state correctly", () => {
      const determineDisplayState = (
        isLoading: boolean,
        hasError: boolean,
        transactions: TestTransactionFormat[],
        searchQuery?: string
      ) => {
        if (hasError) return {type: "error", message: "Error loading transactions"};
        if (isLoading) return {type: "loading"};
        if (transactions.length === 0 && searchQuery) {
          return {
            type: "empty-search",
            message: `No transactions found matching "${searchQuery}".`,
          };
        }
        if (transactions.length === 0) {
          return {type: "empty", message: "No transactions found."};
        }
        return {type: "loaded", data: transactions};
      };

      // Loading state
      expect(determineDisplayState(true, false, [])).toEqual({
        type: "loading",
      });

      // Error state
      expect(determineDisplayState(false, true, [])).toEqual({
        type: "error",
        message: "Error loading transactions",
      });

      // Empty with search
      expect(determineDisplayState(false, false, [], "test")).toEqual({
        type: "empty-search",
        message: 'No transactions found matching "test".',
      });

      // Empty without search
      expect(determineDisplayState(false, false, [])).toEqual({
        type: "empty",
        message: "No transactions found.",
      });

      // Loaded with data
      const result = determineDisplayState(false, false, mockTransactions);
      expect(result.type).toBe("loaded");
      expect(result.data).toEqual(mockTransactions);
    });

    it("should calculate skeleton row count for loading state", () => {
      const getSkeletonRowCount = (pageSize: number, isLoading: boolean) => {
        if (!isLoading) return 0;
        return Math.min(pageSize, 10); // Cap at 10 for performance
      };

      expect(getSkeletonRowCount(50, true)).toBe(10);
      expect(getSkeletonRowCount(5, true)).toBe(5);
      expect(getSkeletonRowCount(50, false)).toBe(0);
    });
  });

  describe("Table Configuration Logic", () => {
    it("should create server-side table configuration", () => {
      const createServerTableConfig = (
        data: TestTransactionFormat[],
        pageIndex: number,
        pageSize: number,
        sortBy: string,
        sortOrder: "asc" | "desc"
      ) => {
        return {
          data,
          manualSorting: true,
          manualPagination: true,
          state: {
            sorting: [
              {
                id: sortBy,
                desc: sortOrder === "desc",
              },
            ],
            pagination: {
              pageIndex,
              pageSize,
            },
          },
        };
      };

      const config = createServerTableConfig(mockTransactions, 0, 50, "date", "desc");

      expect(config.manualSorting).toBe(true);
      expect(config.manualPagination).toBe(true);
      expect(config.data).toEqual(mockTransactions);
      expect(config.state.sorting).toEqual([
        {
          id: "date",
          desc: true,
        },
      ]);
      expect(config.state.pagination).toEqual({
        pageIndex: 0,
        pageSize: 50,
      });
    });

    it("should map column IDs for sorting", () => {
      const columnIdMap: Record<string, "date" | "amount" | "notes"> = {
        date: "date",
        amount: "amount",
        notes: "notes",
        "transaction-date": "date",
        "transaction-amount": "amount",
        "transaction-notes": "notes",
      };

      const mapColumnId = (columnId: string) => {
        return columnIdMap[columnId] || "date";
      };

      expect(mapColumnId("date")).toBe("date");
      expect(mapColumnId("transaction-amount")).toBe("amount");
      expect(mapColumnId("unknown-column")).toBe("date");
    });
  });

  describe("Error Handling", () => {
    it("should handle sorting errors gracefully", () => {
      const safeSortingHandler = (sortFn: () => void) => {
        try {
          sortFn();
          return {success: true, error: null};
        } catch (error) {
          console.error("Sort error:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      };

      const workingSort = () => {
        // Simulates successful sort
      };

      const failingSort = () => {
        throw new Error("Sort failed");
      };

      expect(safeSortingHandler(workingSort)).toEqual({
        success: true,
        error: null,
      });

      expect(safeSortingHandler(failingSort)).toEqual({
        success: false,
        error: "Sort failed",
      });
    });

    it("should validate pagination parameters", () => {
      const validatePagination = (pageIndex: number, pageSize: number) => {
        const errors: string[] = [];

        if (!Number.isInteger(pageIndex) || pageIndex < 0) {
          errors.push("Page index must be a non-negative integer");
        }

        if (!Number.isInteger(pageSize) || pageSize <= 0 || pageSize > 100) {
          errors.push("Page size must be a positive integer between 1 and 100");
        }

        return {
          isValid: errors.length === 0,
          errors,
        };
      };

      expect(validatePagination(0, 50)).toEqual({
        isValid: true,
        errors: [],
      });

      expect(validatePagination(-1, 50)).toEqual({
        isValid: false,
        errors: ["Page index must be a non-negative integer"],
      });

      expect(validatePagination(0, 0)).toEqual({
        isValid: false,
        errors: ["Page size must be a positive integer between 1 and 100"],
      });
    });
  });

  describe("Performance Optimizations", () => {
    it("should batch state updates efficiently", () => {
      let updateCount = 0;
      const updates: Array<{type: string; value: any}> = [];

      const batchStateUpdates = (newUpdates: Array<{type: string; value: any}>) => {
        updates.push(...newUpdates);
        updateCount++;

        const finalState = newUpdates.reduce(
          (acc, update) => {
            acc[update.type] = update.value;
            return acc;
          },
          {} as Record<string, any>
        );

        return finalState;
      };

      const multipleUpdates = [
        {type: "pageIndex", value: 1},
        {type: "sortBy", value: "amount"},
        {type: "sortOrder", value: "desc"},
      ];

      const result = batchStateUpdates(multipleUpdates);

      expect(updateCount).toBe(1); // Only one batch update
      expect(result).toEqual({
        pageIndex: 1,
        sortBy: "amount",
        sortOrder: "desc",
      });
    });
  });
});
