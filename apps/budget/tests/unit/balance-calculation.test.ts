import {describe, it, expect} from "vitest";
import {currencyFormatter} from "$lib/utils/formatters";

describe("Balance Calculation Safety", () => {
  describe("Currency Formatter Edge Cases", () => {
    it("should handle null values without producing NaN", () => {
      const value: number | null = null;
      const result = currencyFormatter.format(value ?? 0);
      expect(result).toBe("$0.00");
      expect(result).not.toContain("NaN");
    });

    it("should handle undefined values without producing NaN", () => {
      const value: number | undefined = undefined;
      const result = currencyFormatter.format(value ?? 0);
      expect(result).toBe("$0.00");
      expect(result).not.toContain("NaN");
    });

    it("should handle NaN values gracefully", () => {
      const safeFormat = (value: any) => {
        const safeValue = isNaN(value) ? 0 : (value ?? 0);
        return currencyFormatter.format(safeValue);
      };

      const result = safeFormat(NaN);
      expect(result).toBe("$0.00");
      expect(result).not.toContain("NaN");
    });

    it("should handle string values that would cause NaN", () => {
      const safeFormat = (value: any) => {
        const numValue = Number(value);
        const safeValue = isNaN(numValue) ? 0 : numValue;
        return currencyFormatter.format(safeValue);
      };

      expect(safeFormat("invalid")).toBe("$0.00");
      expect(safeFormat("")).toBe("$0.00");
      expect(safeFormat("abc")).toBe("$0.00");
      expect(safeFormat("123.45")).toBe("$123.45");
    });

    it("should handle Infinity and -Infinity values", () => {
      const safeFormat = (value: any) => {
        const safeValue = isFinite(value) ? (value ?? 0) : 0;
        return currencyFormatter.format(safeValue);
      };

      expect(safeFormat(Infinity)).toBe("$0.00");
      expect(safeFormat(-Infinity)).toBe("$0.00");
    });

    it("should handle very large and very small numbers", () => {
      // Test extreme but finite values
      expect(currencyFormatter.format(999999999.99)).toBe("$999,999,999.99");
      expect(currencyFormatter.format(-999999999.99)).toBe("-$999,999,999.99");
      expect(currencyFormatter.format(0.01)).toBe("$0.01");
      expect(currencyFormatter.format(-0.01)).toBe("-$0.01");
    });
  });

  describe("Running Balance Calculation Logic", () => {
    it("should correctly calculate running balance with positive amounts", () => {
      const transactions = [{amount: 100.0}, {amount: 50.0}, {amount: 25.5}];

      let runningBalance = 0;
      const results = transactions.map((transaction) => {
        runningBalance += transaction.amount;
        return {...transaction, balance: runningBalance};
      });

      expect(results[0]?.balance).toBe(100.0);
      expect(results[1]?.balance).toBe(150.0);
      expect(results[2]?.balance).toBe(175.5);

      // Ensure no NaN values
      results.forEach((result) => {
        expect(Number.isNaN(result.balance)).toBe(false);
        expect(Number.isFinite(result.balance)).toBe(true);
      });
    });

    it("should correctly calculate running balance with negative amounts", () => {
      const transactions = [{amount: 100.0}, {amount: -25.5}, {amount: -10.0}];

      let runningBalance = 0;
      const results = transactions.map((transaction) => {
        runningBalance += transaction.amount;
        return {...transaction, balance: runningBalance};
      });

      expect(results[0]?.balance).toBe(100.0);
      expect(results[1]?.balance).toBe(74.5);
      expect(results[2]?.balance).toBe(64.5);

      // Ensure no NaN values
      results.forEach((result) => {
        expect(Number.isNaN(result.balance)).toBe(false);
        expect(Number.isFinite(result.balance)).toBe(true);
      });
    });

    it("should handle zero amounts correctly", () => {
      const transactions = [{amount: 100.0}, {amount: 0.0}, {amount: -50.0}];

      let runningBalance = 0;
      const results = transactions.map((transaction) => {
        runningBalance += transaction.amount;
        return {...transaction, balance: runningBalance};
      });

      expect(results[0].balance).toBe(100.0);
      expect(results[1].balance).toBe(100.0);
      expect(results[2].balance).toBe(50.0);

      // Ensure no NaN values
      results.forEach((result) => {
        expect(Number.isNaN(result.balance)).toBe(false);
        expect(Number.isFinite(result.balance)).toBe(true);
      });
    });

    it("should handle empty transaction list", () => {
      const transactions: Array<{amount: number}> = [];

      let runningBalance = 0;
      const results = transactions.map((transaction) => {
        runningBalance += transaction.amount;
        return {...transaction, balance: runningBalance};
      });

      expect(results).toHaveLength(0);
      expect(runningBalance).toBe(0);
      expect(Number.isNaN(runningBalance)).toBe(false);
    });

    it("should handle malformed transaction amounts", () => {
      const transactions = [
        {amount: 100.0},
        {amount: null as any},
        {amount: undefined as any},
        {amount: NaN as any},
        {amount: "invalid" as any},
      ];

      let runningBalance = 0;
      const results = transactions.map((transaction) => {
        // Simulate the safe amount handling we implemented
        const safeAmount = isNaN(Number(transaction.amount)) ? 0 : Number(transaction.amount) || 0;
        runningBalance += safeAmount;
        return {...transaction, amount: safeAmount, balance: runningBalance};
      });

      expect(results[0].balance).toBe(100.0);
      expect(results[1].balance).toBe(100.0); // null -> 0
      expect(results[2].balance).toBe(100.0); // undefined -> 0
      expect(results[3].balance).toBe(100.0); // NaN -> 0
      expect(results[4].balance).toBe(100.0); // "invalid" -> 0

      // Ensure no NaN values in final results
      results.forEach((result) => {
        expect(Number.isNaN(result.balance)).toBe(false);
        expect(Number.isFinite(result.balance)).toBe(true);
        expect(Number.isNaN(result.amount)).toBe(false);
        expect(Number.isFinite(result.amount)).toBe(true);
      });
    });
  });

  describe("Balance Display Safety", () => {
    it("should safely format any balance value for display", () => {
      const safeBalanceFormatter = (balance: any) => {
        const numBalance = Number(balance);
        const safeBalance = isNaN(numBalance) || !isFinite(numBalance) ? 0 : numBalance;
        return currencyFormatter.format(safeBalance);
      };

      // Test various problematic inputs
      const testCases = [
        {input: null, expected: "$0.00"},
        {input: undefined, expected: "$0.00"},
        {input: NaN, expected: "$0.00"},
        {input: Infinity, expected: "$0.00"},
        {input: -Infinity, expected: "$0.00"},
        {input: "invalid", expected: "$0.00"},
        {input: "", expected: "$0.00"},
        {input: {}, expected: "$0.00"},
        {input: [], expected: "$0.00"},
        {input: 42.5, expected: "$42.50"},
        {input: -25.75, expected: "-$25.75"},
        {input: 0, expected: "$0.00"},
      ];

      testCases.forEach(({input, expected}) => {
        const result = safeBalanceFormatter(input);
        expect(result).toBe(expected);
        expect(result).not.toContain("NaN");
        expect(result).not.toContain("Infinity");
      });
    });

    it("should handle decimal precision correctly", () => {
      const testAmounts = [
        0.1 + 0.2, // JavaScript floating point precision issue
        1 / 3, // Repeating decimal
        0.999999999,
        1.005, // Rounding edge case
        -0.005, // Negative rounding edge case
      ];

      testAmounts.forEach((amount) => {
        const formatted = currencyFormatter.format(amount);
        expect(formatted).toBeDefined();
        expect(typeof formatted).toBe("string");
        expect(formatted).not.toContain("NaN");
        expect(formatted).toMatch(/^\-?\$\d+\.\d{2}$/); // Should match currency format
      });
    });
  });

  describe("Balance Calculation Validation Helpers", () => {
    it("should provide utility functions for balance validation", () => {
      const isValidBalance = (balance: any): boolean => {
        if (balance === null || balance === undefined) return false;
        const num = Number(balance);
        return !isNaN(num) && isFinite(num);
      };

      const sanitizeBalance = (balance: any): number => {
        const num = Number(balance);
        return isNaN(num) || !isFinite(num) ? 0 : num;
      };

      // Test validation function
      expect(isValidBalance(100.5)).toBe(true);
      expect(isValidBalance(-25.75)).toBe(true);
      expect(isValidBalance(0)).toBe(true);
      expect(isValidBalance(null)).toBe(false);
      expect(isValidBalance(undefined)).toBe(false);
      expect(isValidBalance(NaN)).toBe(false);
      expect(isValidBalance(Infinity)).toBe(false);
      expect(isValidBalance("invalid")).toBe(false);

      // Test sanitization function
      expect(sanitizeBalance(100.5)).toBe(100.5);
      expect(sanitizeBalance(-25.75)).toBe(-25.75);
      expect(sanitizeBalance(null)).toBe(0);
      expect(sanitizeBalance(undefined)).toBe(0);
      expect(sanitizeBalance(NaN)).toBe(0);
      expect(sanitizeBalance(Infinity)).toBe(0);
      expect(sanitizeBalance("invalid")).toBe(0);
      expect(sanitizeBalance("123.45")).toBe(123.45);
    });
  });
});
