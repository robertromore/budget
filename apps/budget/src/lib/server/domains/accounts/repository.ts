import {BaseRepository} from "$lib/server/shared/database/base-repository";
import {db} from "$lib/server/shared/database";
import {accounts} from "$lib/schema/accounts";
import type {Account} from "$lib/schema/accounts";
import {transactions} from "$lib/schema/transactions";
import {categories} from "$lib/schema/categories";
import {payees} from "$lib/schema/payees";
import {eq, like, and, isNull, desc} from "drizzle-orm";
import {NotFoundError} from "$lib/server/shared/types/errors";

// Types for account operations
export interface CreateAccountInput {
  name: string;
  slug: string;
  notes?: string | undefined;
  balance?: number | undefined;
  onBudget?: boolean | undefined;
}

export interface UpdateAccountInput {
  name?: string | undefined;
  slug?: string | undefined;
  notes?: string | undefined;
  balance?: number | undefined;
  onBudget?: boolean | undefined;
}

export interface AccountWithTransactions extends Account {
  transactions: any[]; // Define proper transaction type
}

/**
 * Account repository with domain-specific operations
 */
export class AccountRepository extends BaseRepository<
  typeof accounts,
  Account,
  CreateAccountInput,
  UpdateAccountInput
> {
  constructor() {
    super(db, accounts, "Account");
  }

  // findBySlug() inherited from BaseRepository

  /**
   * Find account by slug or throw error
   */
  async findBySlugOrThrow(slug: string): Promise<Account> {
    const account = await this.findBySlug(slug);
    if (!account) {
      throw new NotFoundError("Account", slug);
    }
    return account;
  }

  // isSlugUnique() inherited from BaseRepository

  /**
   * Find account with related transactions
   */
  async findWithTransactions(id: number): Promise<AccountWithTransactions | null> {
    try {
      const account = await this.findById(id);
      if (!account) return null;

      // Returns account with empty transactions array as baseline
      // Transaction loading requires transactions domain implementation
      return {
        ...account,
        transactions: [],
      };
    } catch (error) {
      throw new Error(`Failed to find account with transactions: ${error}`);
    }
  }

  /**
   * Search accounts by name
   * Overrides BaseRepository searchByName to use different default limit
   */
  async searchByName(query: string, options?: {limit?: number}): Promise<Account[]> {
    return await super.searchByName(query, {
      limit: options?.limit ?? 10
    });
  }

  /**
   * Get active accounts (not soft deleted)
   */
  async findActive(): Promise<Account[]> {
    try {
      return await this.db
        .select()
        .from(accounts)
        .where(isNull(accounts.deletedAt))
        .orderBy(accounts.name);
    } catch (error) {
      throw new Error(`Failed to find active accounts: ${error}`);
    }
  }

  /**
   * Get on-budget accounts (included in budget calculations)
   */
  async findOnBudgetAccounts(): Promise<Account[]> {
    try {
      return await this.db
        .select()
        .from(accounts)
        .where(and(eq(accounts.onBudget, true), isNull(accounts.deletedAt)))
        .orderBy(accounts.name);
    } catch (error) {
      throw new Error(`Failed to find on-budget accounts: ${error}`);
    }
  }

  /**
   * Get off-budget accounts (tracked for net worth only)
   */
  async findOffBudgetAccounts(): Promise<Account[]> {
    try {
      return await this.db
        .select()
        .from(accounts)
        .where(and(eq(accounts.onBudget, false), isNull(accounts.deletedAt)))
        .orderBy(accounts.name);
    } catch (error) {
      throw new Error(`Failed to find off-budget accounts: ${error}`);
    }
  }

  /**
   * Get all accounts with their transactions
   */
  async findAllWithTransactions(): Promise<Account[]> {
    try {
      // First get all active accounts
      const accountList = await this.findActive();

      // Then fetch transactions for each account with proper joins
      const accountsWithTransactions = await Promise.all(
        accountList.map(async (account) => {
          const accountTransactions = await this.db
            .select({
              id: transactions.id,
              accountId: transactions.accountId,
              parentId: transactions.parentId,
              status: transactions.status,
              payeeId: transactions.payeeId,
              amount: transactions.amount,
              categoryId: transactions.categoryId,
              notes: transactions.notes,
              date: transactions.date,
              scheduleId: transactions.scheduleId,
              createdAt: transactions.createdAt,
              updatedAt: transactions.updatedAt,
              deletedAt: transactions.deletedAt,
              payee: {
                id: payees.id,
                name: payees.name,
                notes: payees.notes,
                createdAt: payees.createdAt,
                updatedAt: payees.updatedAt,
                deletedAt: payees.deletedAt,
              },
              category: {
                id: categories.id,
                name: categories.name,
                notes: categories.notes,
                createdAt: categories.createdAt,
                updatedAt: categories.updatedAt,
                deletedAt: categories.deletedAt,
              },
            })
            .from(transactions)
            .leftJoin(payees, eq(transactions.payeeId, payees.id))
            .leftJoin(categories, eq(transactions.categoryId, categories.id))
            .where(and(eq(transactions.accountId, account.id), isNull(transactions.deletedAt)))
            .orderBy(desc(transactions.date), desc(transactions.id));

          // Calculate running balances
          // Since transactions are ordered DESC (newest first), we start with total balance
          // and show that as the balance AFTER the first (newest) transaction
          const totalBalance = accountTransactions.reduce((sum: number, t: any) => {
            const amount = Number(t.amount) || 0;
            return sum + amount;
          }, 0);

          let runningBalance = totalBalance;
          const transactionsWithBalance = accountTransactions.map((transaction: any) => {
            const balanceAfterTransaction = runningBalance;
            // For next transaction, subtract this transaction's amount
            runningBalance -= Number(transaction.amount) || 0;
            return {
              ...transaction,
              balance: balanceAfterTransaction,
            };
          });

          return {
            ...account,
            transactions: transactionsWithBalance,
            balance: runningBalance,
          } as Account;
        })
      );

      return accountsWithTransactions;
    } catch (error) {
      throw new Error(`Failed to find accounts with transactions: ${error}`);
    }
  }

  /**
   * Update account balance
   */
  async updateBalance(id: number, newBalance: number): Promise<Account> {
    return await this.update(id, {balance: newBalance});
  }
}
