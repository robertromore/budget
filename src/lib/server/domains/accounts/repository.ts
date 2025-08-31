import { BaseRepository } from "$lib/server/shared/database/base-repository";
import { db } from "$lib/server/shared/database";
import { accounts } from "$lib/schema/accounts";
import type { Account } from "$lib/schema/accounts";
import { eq, like, and, isNull } from "drizzle-orm";
import { NotFoundError } from "$lib/server/shared/types/errors";

// Types for account operations
export interface CreateAccountInput {
  name: string;
  slug: string;
  notes?: string;
  balance?: number;
}

export interface UpdateAccountInput {
  name?: string;
  slug?: string;
  notes?: string;
  balance?: number;
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
    super(db, accounts, 'Account');
  }

  /**
   * Find account by slug
   */
  async findBySlug(slug: string): Promise<Account | null> {
    try {
      const result = await this.db
        .select()
        .from(accounts)
        .where(and(
          eq(accounts.slug, slug),
          isNull(accounts.deletedAt)
        ))
        .limit(1);
      
      return result[0] || null;
    } catch (error) {
      throw new Error(`Failed to find account by slug: ${error}`);
    }
  }

  /**
   * Find account by slug or throw error
   */
  async findBySlugOrThrow(slug: string): Promise<Account> {
    const account = await this.findBySlug(slug);
    if (!account) {
      throw new NotFoundError('Account', slug);
    }
    return account;
  }

  /**
   * Check if slug is unique (excluding specific account ID)
   */
  async isSlugUnique(slug: string, excludeId?: number): Promise<boolean> {
    try {
      const conditions = [
        eq(accounts.slug, slug),
        isNull(accounts.deletedAt)
      ];

      if (excludeId) {
        conditions.push(eq(accounts.id, excludeId));
      }

      const result = await this.db
        .select({ id: accounts.id })
        .from(accounts)
        .where(and(...conditions))
        .limit(1);

      return result.length === 0;
    } catch (error) {
      throw new Error(`Failed to check slug uniqueness: ${error}`);
    }
  }

  /**
   * Find account with related transactions
   */
  async findWithTransactions(id: number): Promise<AccountWithTransactions | null> {
    try {
      // For now, just return the account without transactions
      // In a real implementation, you'd join with transactions table
      const account = await this.findById(id);
      if (!account) return null;

      return {
        ...account,
        transactions: [] // TODO: Implement transaction loading
      };
    } catch (error) {
      throw new Error(`Failed to find account with transactions: ${error}`);
    }
  }

  /**
   * Search accounts by name
   */
  async searchByName(query: string, limit: number = 10): Promise<Account[]> {
    try {
      return await this.db
        .select()
        .from(accounts)
        .where(and(
          like(accounts.name, `%${query}%`),
          isNull(accounts.deletedAt)
        ))
        .limit(limit);
    } catch (error) {
      throw new Error(`Failed to search accounts: ${error}`);
    }
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
   * Update account balance
   */
  async updateBalance(id: number, newBalance: number): Promise<Account> {
    return await this.update(id, { balance: newBalance });
  }
}