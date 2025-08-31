import { AccountRepository } from "./repository";
import type { Account } from "$lib/schema/accounts";
import { ConflictError, ValidationError } from "$lib/server/shared/types/errors";
import { InputSanitizer } from "$lib/server/shared/validation";
import slugify from "@sindresorhus/slugify";
import { generateUniqueSlug } from "$lib/utils/slug-utils";

// Service input types
export interface CreateAccountData {
  name: string;
  notes?: string;
  initialBalance?: number;
}

export interface UpdateAccountData {
  name?: string;
  notes?: string;
  balance?: number;
}

/**
 * Account service containing business logic
 */
export class AccountService {
  constructor(
    private repository: AccountRepository = new AccountRepository()
  ) {}

  /**
   * Create a new account
   */
  async createAccount(data: CreateAccountData): Promise<Account> {
    // Sanitize and validate inputs
    const sanitizedName = InputSanitizer.sanitizeAccountName(data.name);
    const sanitizedNotes = data.notes 
      ? InputSanitizer.sanitizeDescription(data.notes) 
      : undefined;
    
    // Validate balance if provided
    const balance = data.initialBalance !== undefined 
      ? InputSanitizer.validateAmount(data.initialBalance, 'Initial balance')
      : 0;

    // Generate unique slug
    const baseSlug = slugify(sanitizedName);
    const uniqueSlug = await this.generateUniqueSlug(baseSlug);

    // Create account
    const account = await this.repository.create({
      name: sanitizedName,
      slug: uniqueSlug,
      notes: sanitizedNotes,
      balance
    });

    return account;
  }

  /**
   * Update an existing account
   */
  async updateAccount(id: number, data: UpdateAccountData): Promise<Account> {
    // Verify account exists
    const existingAccount = await this.repository.findByIdOrThrow(id);

    const updateData: any = {};

    // Sanitize and validate name if provided
    if (data.name !== undefined) {
      updateData.name = InputSanitizer.sanitizeAccountName(data.name);
      
      // Generate new slug if name changed
      if (updateData.name !== existingAccount.name) {
        const baseSlug = slugify(updateData.name);
        updateData.slug = await this.generateUniqueSlug(baseSlug, id);
      }
    }

    // Sanitize notes if provided
    if (data.notes !== undefined) {
      updateData.notes = data.notes 
        ? InputSanitizer.sanitizeDescription(data.notes)
        : null;
    }

    // Validate balance if provided
    if (data.balance !== undefined) {
      updateData.balance = InputSanitizer.validateAmount(data.balance, 'Balance');
    }

    // Update account
    return await this.repository.update(id, updateData);
  }

  /**
   * Get account by ID
   */
  async getAccountById(id: number): Promise<Account> {
    return await this.repository.findByIdOrThrow(id);
  }

  /**
   * Get account by slug
   */
  async getAccountBySlug(slug: string): Promise<Account> {
    return await this.repository.findBySlugOrThrow(slug);
  }

  /**
   * Get all active accounts
   */
  async getActiveAccounts(): Promise<Account[]> {
    return await this.repository.findActive();
  }

  /**
   * Search accounts by name
   */
  async searchAccounts(query: string, limit?: number): Promise<Account[]> {
    if (!query?.trim()) {
      throw new ValidationError('Search query is required');
    }

    const sanitizedQuery = InputSanitizer.sanitizeText(query, {
      required: true,
      maxLength: 100,
      fieldName: 'Search query'
    });

    return await this.repository.searchByName(sanitizedQuery, limit);
  }

  /**
   * Delete account (soft delete)
   */
  async deleteAccount(id: number): Promise<void> {
    // Verify account exists
    await this.repository.findByIdOrThrow(id);

    // Check if account has transactions
    const accountWithTransactions = await this.repository.findWithTransactions(id);
    if (accountWithTransactions && accountWithTransactions.transactions.length > 0) {
      throw new ConflictError(
        'Cannot delete account with existing transactions',
        'account'
      );
    }

    // Soft delete the account
    await this.repository.softDelete(id);
  }

  /**
   * Update account balance
   */
  async updateAccountBalance(id: number, newBalance: number): Promise<Account> {
    const validatedBalance = InputSanitizer.validateAmount(newBalance, 'Balance');
    return await this.repository.updateBalance(id, validatedBalance);
  }

  /**
   * Generate unique slug for account
   */
  private async generateUniqueSlug(baseSlug: string, excludeId?: number): Promise<string> {
    // Check if base slug is unique
    if (await this.repository.isSlugUnique(baseSlug, excludeId)) {
      return baseSlug;
    }

    // Generate unique slug with suffix
    return await generateUniqueSlug(
      baseSlug,
      async (slug: string) => {
        return await this.repository.isSlugUnique(slug, excludeId);
      }
    );
  }
}