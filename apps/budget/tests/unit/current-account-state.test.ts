import {describe, it, expect} from "bun:test";
import {currencyFormatter} from "$lib/utils/formatters";

describe("CurrentAccountState Balance Safety", () => {
  describe("Balance Derived Value Safety", () => {
    it("should handle undefined account balance gracefully", () => {
      // Simulate the balance calculation logic from CurrentAccountState
      const simulateBalanceCalculation = (accountBalance: any) => {
        const balance = accountBalance ?? 0;
        return currencyFormatter.format(isNaN(balance) ? 0 : balance);
      };

      expect(simulateBalanceCalculation(undefined)).toBe("$0.00");
      expect(simulateBalanceCalculation(null)).toBe("$0.00");
      expect(simulateBalanceCalculation(NaN)).toBe("$0.00");
      expect(simulateBalanceCalculation(100.5)).toBe("$100.50");
    });

    it("should handle account balance update operations safely", () => {
      // Simulate the addTransaction logic
      const simulateAddTransaction = (currentBalance: any, transactionAmount: any) => {
        const safeCurrentBalance = isNaN(currentBalance) ? 0 : (currentBalance ?? 0);
        const safeAmount = isNaN(transactionAmount) ? 0 : (transactionAmount ?? 0);
        const newBalance = safeCurrentBalance + safeAmount;

        return {
          balance: newBalance,
          isValidBalance: !isNaN(newBalance) && isFinite(newBalance),
        };
      };

      // Test normal case
      const result1 = simulateAddTransaction(100.0, 25.5);
      expect(result1.balance).toBe(125.5);
      expect(result1.isValidBalance).toBe(true);

      // Test with undefined current balance
      const result2 = simulateAddTransaction(undefined, 25.5);
      expect(result2.balance).toBe(25.5);
      expect(result2.isValidBalance).toBe(true);

      // Test with NaN transaction amount
      const result3 = simulateAddTransaction(100.0, NaN);
      expect(result3.balance).toBe(100.0);
      expect(result3.isValidBalance).toBe(true);

      // Test with both values problematic
      const result4 = simulateAddTransaction(null, undefined);
      expect(result4.balance).toBe(0);
      expect(result4.isValidBalance).toBe(true);
    });

    it("should handle transaction balance updates safely", () => {
      // Simulate the updateTransaction logic for amount changes
      const simulateTransactionUpdate = (
        currentAccountBalance: any,
        oldAmount: any,
        newAmount: any,
        transactionBalances: any[]
      ) => {
        const safeCurrentBalance = isNaN(currentAccountBalance) ? 0 : (currentAccountBalance ?? 0);
        const safeOldAmount = isNaN(oldAmount) ? 0 : (oldAmount ?? 0);
        const safeNewAmount = isNaN(newAmount) ? 0 : (newAmount ?? 0);

        const amountDifference = safeNewAmount - safeOldAmount;
        const newAccountBalance = safeCurrentBalance + amountDifference;

        // Update running balances for subsequent transactions
        const updatedBalances = transactionBalances.map((balance) => {
          const safeBalance = isNaN(balance) ? 0 : (balance ?? 0);
          return safeBalance + amountDifference;
        });

        return {
          accountBalance: newAccountBalance,
          transactionBalances: updatedBalances,
          allValidBalances: [newAccountBalance, ...updatedBalances].every(
            (b) => !isNaN(b) && isFinite(b)
          ),
        };
      };

      // Test normal update
      const result1 = simulateTransactionUpdate(150.0, 25.0, 50.0, [100.0, 125.0, 150.0]);
      expect(result1.accountBalance).toBe(175.0);
      expect(result1.transactionBalances).toEqual([125.0, 150.0, 175.0]);
      expect(result1.allValidBalances).toBe(true);

      // Test with problematic values
      const result2 = simulateTransactionUpdate(NaN, null, undefined, [NaN, 125.0]);
      expect(result2.accountBalance).toBe(0);
      expect(result2.transactionBalances).toEqual([0, 125.0]);
      expect(result2.allValidBalances).toBe(true);
    });

    it("should handle transaction deletion balance recalculation safely", () => {
      // Simulate the deleteTransactions logic
      const simulateDeleteTransactions = (transactions: Array<{amount: any}>) => {
        const safeTransactions = transactions.filter((t) => t !== null && t !== undefined);

        const balance = safeTransactions
          .map((transaction) => {
            const amount = Number(transaction.amount);
            return isNaN(amount) || !isFinite(amount) ? 0 : amount;
          })
          .reduce((sum, amount) => sum + amount, 0);

        return {
          balance: balance,
          transactionCount: safeTransactions.length,
          isValidBalance: !isNaN(balance) && isFinite(balance),
        };
      };

      // Test normal case
      const result1 = simulateDeleteTransactions([
        {amount: 100.0},
        {amount: -25.5},
        {amount: 50.0},
      ]);
      expect(result1.balance).toBe(124.5);
      expect(result1.transactionCount).toBe(3);
      expect(result1.isValidBalance).toBe(true);

      // Test with problematic amounts
      const result2 = simulateDeleteTransactions([
        {amount: 100.0},
        {amount: NaN},
        {amount: null},
        {amount: undefined},
        {amount: "invalid"},
      ]);
      expect(result2.balance).toBe(100.0);
      expect(result2.transactionCount).toBe(5);
      expect(result2.isValidBalance).toBe(true);

      // Test empty case
      const result3 = simulateDeleteTransactions([]);
      expect(result3.balance).toBe(0);
      expect(result3.transactionCount).toBe(0);
      expect(result3.isValidBalance).toBe(true);
    });
  });

  describe("Transaction Formatting Safety", () => {
    it("should safely format transaction data", () => {
      // Simulate transactionFormatter.format logic safety
      const simulateTransactionFormatting = (transactions: any[]) => {
        if (!Array.isArray(transactions)) return [];

        return transactions
          .filter((t) => t !== null && t !== undefined)
          .map((transaction) => {
            const numAmount = Number(transaction.amount);
            const safeAmount = isNaN(numAmount) || !isFinite(numAmount) ? 0 : numAmount;
            const numBalance = Number(transaction.balance);
            const safeBalance = isNaN(numBalance) || !isFinite(numBalance) ? 0 : numBalance;

            return {
              ...transaction,
              amount: safeAmount,
              balance: safeBalance,
              formattedAmount: currencyFormatter.format(safeAmount),
              formattedBalance: currencyFormatter.format(safeBalance),
            };
          });
      };

      const testTransactions = [
        {id: 1, amount: 100.0, balance: 100.0},
        {id: 2, amount: null, balance: undefined},
        {id: 3, amount: NaN, balance: NaN},
        {id: 4, amount: "invalid", balance: Infinity},
      ];

      const formatted = simulateTransactionFormatting(testTransactions);

      expect(formatted).toHaveLength(4);

      // First transaction should be normal
      expect(formatted[0].amount).toBe(100.0);
      expect(formatted[0].balance).toBe(100.0);
      expect(formatted[0].formattedAmount).toBe("$100.00");
      expect(formatted[0].formattedBalance).toBe("$100.00");

      // Other transactions should be sanitized to 0
      [1, 2, 3].forEach((index) => {
        expect(formatted[index].amount).toBe(0);
        expect(formatted[index].balance).toBe(0);
        expect(formatted[index].formattedAmount).toBe("$0.00");
        expect(formatted[index].formattedBalance).toBe("$0.00");

        // Ensure no NaN in formatted strings
        expect(formatted[index].formattedAmount).not.toContain("NaN");
        expect(formatted[index].formattedBalance).not.toContain("NaN");
      });
    });
  });

  describe("Balance State Consistency", () => {
    it("should maintain balance consistency during state updates", () => {
      // Simulate a complete state update cycle
      class MockCurrentAccountState {
        private _balance: number = 0;
        private _transactions: Array<{id: number; amount: number; balance: number}> = [];

        get balance() {
          const safeBalance = isNaN(this._balance) ? 0 : this._balance;
          return currencyFormatter.format(safeBalance);
        }

        addTransaction(amount: any) {
          const safeAmount = isNaN(amount) ? 0 : Number(amount) || 0;
          this._balance += safeAmount;

          const transaction = {
            id: this._transactions.length + 1,
            amount: safeAmount,
            balance: this._balance,
          };

          this._transactions.push(transaction);
          return transaction;
        }

        updateTransaction(id: number, newAmount: any) {
          const transaction = this._transactions.find((t) => t.id === id);
          if (!transaction) return false;

          const safeNewAmount = isNaN(newAmount) ? 0 : Number(newAmount) || 0;
          const amountDifference = safeNewAmount - transaction.amount;

          // Update account balance
          this._balance += amountDifference;

          // Update transaction amount
          transaction.amount = safeNewAmount;

          // Update running balances for this and subsequent transactions
          const startIndex = this._transactions.findIndex((t) => t.id === id);
          for (let i = startIndex; i < this._transactions.length; i++) {
            this._transactions[i].balance += amountDifference;
          }

          return true;
        }

        getAllBalances() {
          return {
            accountBalance: this._balance,
            transactionBalances: this._transactions.map((t) => t.balance),
            formattedAccountBalance: this.balance,
          };
        }
      }

      const state = new MockCurrentAccountState();

      // Add transactions
      state.addTransaction(100.0);
      state.addTransaction(-25.5);
      state.addTransaction(50.0);

      let balances = state.getAllBalances();
      expect(balances.accountBalance).toBe(124.5);
      expect(balances.transactionBalances).toEqual([100.0, 74.5, 124.5]);
      expect(balances.formattedAccountBalance).toBe("$124.50");

      // Update middle transaction
      state.updateTransaction(2, -50.0);

      balances = state.getAllBalances();
      expect(balances.accountBalance).toBe(100.0);
      expect(balances.transactionBalances).toEqual([100.0, 50.0, 100.0]);
      expect(balances.formattedAccountBalance).toBe("$100.00");

      // Test with problematic values
      state.addTransaction(NaN);
      state.addTransaction(null);
      state.addTransaction(undefined);

      balances = state.getAllBalances();
      expect(balances.accountBalance).toBe(100.0); // Should remain unchanged
      expect(balances.formattedAccountBalance).toBe("$100.00");
      expect(balances.formattedAccountBalance).not.toContain("NaN");

      // All balances should be valid numbers
      balances.transactionBalances.forEach((balance) => {
        expect(Number.isNaN(balance)).toBe(false);
        expect(Number.isFinite(balance)).toBe(true);
      });
    });
  });
});
