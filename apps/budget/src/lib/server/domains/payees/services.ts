import {
  PayeeRepository,
  type UpdatePayeeData,
  type PayeeStats,
  type PayeeSuggestions,
  type PayeeIntelligence,
  type PayeeSearchFilters
} from "./repository";
import {ValidationError, NotFoundError, ConflictError} from "$lib/server/shared/types/errors";
import {InputSanitizer} from "$lib/server/shared/validation";
import type {Payee, NewPayee, PayeeType, PaymentFrequency} from "$lib/schema";

export interface CreatePayeeData {
  name: string;
  notes?: string | null | undefined;
  defaultCategoryId?: number | null | undefined;
  defaultBudgetId?: number | null | undefined;
  payeeType?: PayeeType | null | undefined;
  taxRelevant?: boolean | undefined;
  website?: string | null | undefined;
  phone?: string | null | undefined;
  email?: string | null | undefined;
  address?: any | null | undefined;
  accountNumber?: string | null | undefined;
  alertThreshold?: number | null | undefined;
  isSeasonal?: boolean | undefined;
  subscriptionInfo?: any | null | undefined;
  tags?: any | null | undefined;
  preferredPaymentMethods?: any | null | undefined;
  merchantCategoryCode?: string | null | undefined;
}

export interface PayeeWithStats extends Payee {
  stats?: PayeeStats;
}

export interface PayeeWithRelations extends Payee {
  defaultCategory?: {id: number; name: string} | null;
  defaultBudget?: {id: number; name: string} | null;
  stats?: PayeeStats;
  suggestions?: PayeeSuggestions;
}

export interface BulkUpdateResult {
  successCount: number;
  errors: Array<{id: number; error: string}>;
}

export interface PayeeAnalytics {
  totalPayees: number;
  activePayees: number;
  payeesWithDefaults: number;
  payeesNeedingAttention: number;
  topCategories: Array<{categoryId: number; categoryName: string; payeeCount: number}>;
  averageTransactionsPerPayee: number;
  recentlyActiveCount: number;
}

/**
 * Service for payee business logic
 */
export class PayeeService {
  constructor(
    private repository: PayeeRepository = new PayeeRepository()
  ) {}

  /**
   * Create a new payee with enhanced budgeting integration
   */
  async createPayee(data: CreatePayeeData): Promise<Payee> {
    // Validate and sanitize input
    if (!data.name?.trim()) {
      throw new ValidationError("Payee name is required");
    }

    const sanitizedName = InputSanitizer.sanitizeName(data.name.trim());
    if (!sanitizedName) {
      throw new ValidationError("Invalid payee name");
    }

    const sanitizedNotes = data.notes && typeof data.notes === 'string'
      ? InputSanitizer.sanitizeDescription(data.notes)
      : null;

    // Check for duplicate names (case-insensitive)
    await this.validateUniquePayeeName(sanitizedName);

    // Validate related entities if provided
    if (data.defaultCategoryId) {
      await this.validateCategoryExists(data.defaultCategoryId);
    }

    if (data.defaultBudgetId) {
      await this.validateBudgetExists(data.defaultBudgetId);
    }

    // Sanitize and validate additional fields
    const sanitizedData = await this.sanitizePayeeData(data);

    const newPayee: NewPayee = {
      name: sanitizedName,
      notes: sanitizedNotes,
      ...sanitizedData,
      isActive: true, // New payees are active by default
      taxRelevant: data.taxRelevant || false,
    };

    return await this.repository.create(newPayee);
  }

  /**
   * Get payee by ID
   */
  async getPayeeById(id: number): Promise<Payee> {
    if (!id || id <= 0) {
      throw new ValidationError("Invalid payee ID");
    }

    const payee = await this.repository.findById(id);
    if (!payee) {
      throw new NotFoundError("Payee", id);
    }

    return payee;
  }

  /**
   * Get payee by ID with statistics
   */
  async getPayeeWithStats(id: number): Promise<PayeeWithStats> {
    const payee = await this.getPayeeById(id);
    const stats = await this.repository.getStats(id);

    return {
      ...payee,
      stats,
    };
  }

  /**
   * Get all payees
   */
  async getAllPayees(): Promise<Payee[]> {
    return await this.repository.findAll();
  }

  /**
   * Update payee with enhanced validation and field support
   */
  async updatePayee(id: number, data: UpdatePayeeData): Promise<Payee> {
    if (!id || id <= 0) {
      throw new ValidationError("Invalid payee ID");
    }

    // Verify payee exists
    await this.getPayeeById(id);

    const updateData: UpdatePayeeData = {};

    // Validate and sanitize name if provided
    if (data.name !== undefined) {
      if (!data.name?.trim()) {
        throw new ValidationError("Payee name cannot be empty");
      }

      const sanitizedName = InputSanitizer.sanitizeName(data.name.trim());
      if (!sanitizedName) {
        throw new ValidationError("Invalid payee name");
      }

      // Check for duplicate names (excluding current payee)
      await this.validateUniquePayeeName(sanitizedName, id);
      updateData.name = sanitizedName;
    }

    // Validate and sanitize notes if provided
    if (data.notes !== undefined) {
      updateData.notes = data.notes && typeof data.notes === 'string'
        ? InputSanitizer.sanitizeDescription(data.notes)
        : null;
    }

    // Validate related entities
    if (data.defaultCategoryId !== undefined) {
      if (data.defaultCategoryId) {
        await this.validateCategoryExists(data.defaultCategoryId);
      }
      updateData.defaultCategoryId = data.defaultCategoryId;
    }

    if (data.defaultBudgetId !== undefined) {
      if (data.defaultBudgetId) {
        await this.validateBudgetExists(data.defaultBudgetId);
      }
      updateData.defaultBudgetId = data.defaultBudgetId;
    }

    // Validate and set other fields
    const fieldsToUpdate = [
      'payeeType', 'avgAmount', 'paymentFrequency', 'lastTransactionDate',
      'taxRelevant', 'isActive', 'website', 'phone', 'email', 'address',
      'accountNumber', 'alertThreshold', 'isSeasonal', 'subscriptionInfo',
      'tags', 'preferredPaymentMethods', 'merchantCategoryCode'
    ] as const;

    for (const field of fieldsToUpdate) {
      if (data[field] !== undefined) {
        updateData[field] = data[field] as any;
      }
    }

    // Validate specific field constraints
    if (updateData.avgAmount !== undefined && updateData.avgAmount !== null && updateData.avgAmount <= 0) {
      throw new ValidationError("Average amount must be positive");
    }

    if (updateData.alertThreshold !== undefined && updateData.alertThreshold !== null && updateData.alertThreshold <= 0) {
      throw new ValidationError("Alert threshold must be positive");
    }

    if (updateData.website && typeof updateData.website === 'string' && !this.isValidUrl(updateData.website)) {
      throw new ValidationError("Invalid website URL");
    }

    if (updateData.email && typeof updateData.email === 'string' && !this.isValidEmail(updateData.email)) {
      throw new ValidationError("Invalid email address");
    }

    if (Object.keys(updateData).length === 0) {
      throw new ValidationError("No valid fields to update");
    }

    return await this.repository.update(id, updateData);
  }

  /**
   * Delete payee (soft delete)
   */
  async deletePayee(id: number, options: {force?: boolean} = {}): Promise<Payee> {
    if (!id || id <= 0) {
      throw new ValidationError("Invalid payee ID");
    }

    // Verify payee exists
    await this.getPayeeById(id);

    // Check for associated transactions unless force delete
    if (!options.force) {
      const hasTransactions = await this.repository.hasTransactions(id);
      if (hasTransactions) {
        throw new ConflictError(
          "Cannot delete payee with associated transactions. Use force delete or reassign transactions first."
        );
      }
    }

    return await this.repository.softDelete(id);
  }

  /**
   * Bulk delete payees
   */
  async bulkDeletePayees(
    ids: number[],
    options: {force?: boolean} = {}
  ): Promise<{deletedCount: number; errors: string[]}> {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new ValidationError("No payee IDs provided");
    }

    const validIds = ids.filter(id => id && id > 0);
    if (validIds.length === 0) {
      throw new ValidationError("No valid payee IDs provided");
    }

    const errors: string[] = [];
    const deleteableIds: number[] = [];

    // Validate each payee and check for conflicts
    for (const id of validIds) {
      try {
        await this.getPayeeById(id);

        if (!options.force) {
          const hasTransactions = await this.repository.hasTransactions(id);
          if (hasTransactions) {
            errors.push(`Payee ${id}: Has associated transactions`);
            continue;
          }
        }

        deleteableIds.push(id);
      } catch (error) {
        errors.push(`Payee ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const deletedCount = deleteableIds.length > 0
      ? await this.repository.bulkDelete(deleteableIds)
      : 0;

    return {deletedCount, errors};
  }

  /**
   * Search payees
   */
  async searchPayees(query: string): Promise<Payee[]> {
    const sanitizedQuery = query?.trim() || '';
    return await this.repository.search(sanitizedQuery);
  }

  /**
   * Get payees used in account transactions
   */
  async getPayeesByAccount(accountId: number): Promise<Payee[]> {
    if (!accountId || accountId <= 0) {
      throw new ValidationError("Invalid account ID");
    }

    return await this.repository.findByAccountTransactions(accountId);
  }

  /**
   * Verify payee exists
   */
  async verifyPayeeExists(id: number): Promise<boolean> {
    if (!id || id <= 0) return false;
    return await this.repository.exists(id);
  }

  /**
   * Get comprehensive payee statistics
   */
  async getPayeeStats(id: number): Promise<PayeeStats> {
    await this.getPayeeById(id); // Verify exists
    return await this.repository.getStats(id);
  }

  /**
   * Merge two payees (move all transactions from source to target)
   */
  async mergePayees(sourceId: number, targetId: number): Promise<void> {
    if (!sourceId || !targetId || sourceId === targetId) {
      throw new ValidationError("Invalid payee IDs for merge operation");
    }

    // Verify both payees exist
    const sourcePayee = await this.getPayeeById(sourceId);
    const targetPayee = await this.getPayeeById(targetId);

    // Get source payee stats before merge
    const sourceStats = await this.repository.getStats(sourceId);
    if (sourceStats.transactionCount === 0) {
      throw new ValidationError("Source payee has no transactions to merge");
    }

    // Note: Transaction reassignment would be handled by TransactionService
    // For now, we'll soft delete the source payee and update calculated fields
    // TODO: Implement actual transaction reassignment when TransactionService supports it

    // Soft delete the source payee
    await this.repository.softDelete(sourceId);

    // Update calculated fields for target payee
    await this.repository.updateCalculatedFields(targetId);

    console.log(`Merged payee ${sourcePayee.name} into ${targetPayee.name}. Transaction reassignment pending implementation.`);
  }

  /**
   * Get payees with their default category/budget relations
   */
  async getPayeesWithRelations(): Promise<PayeeWithRelations[]> {
    return await this.repository.findWithRelations();
  }

  /**
   * Advanced search with comprehensive filters
   */
  async searchPayeesAdvanced(filters: PayeeSearchFilters): Promise<Payee[]> {
    return await this.repository.searchWithFilters(filters);
  }

  /**
   * Get payees by type
   */
  async getPayeesByType(payeeType: PayeeType): Promise<Payee[]> {
    return await this.repository.findByType(payeeType);
  }

  /**
   * Get payees that need attention (missing defaults, old transactions, etc.)
   */
  async getPayeesNeedingAttention(): Promise<Array<Payee & {reason: string}>> {
    return await this.repository.findNeedingAttention();
  }

  /**
   * Generate intelligent suggestions for a payee
   */
  async generatePayeeSuggestions(id: number): Promise<PayeeSuggestions> {
    await this.getPayeeById(id); // Verify exists
    return await this.repository.generateSuggestions(id);
  }

  /**
   * Get comprehensive payee intelligence data
   */
  async getPayeeIntelligence(id: number): Promise<PayeeIntelligence> {
    return await this.repository.getIntelligence(id);
  }

  /**
   * Auto-update calculated fields for all payees or specific payee
   */
  async updateCalculatedFields(payeeId?: number): Promise<BulkUpdateResult> {
    if (payeeId) {
      try {
        await this.repository.updateCalculatedFields(payeeId);
        return {successCount: 1, errors: []};
      } catch (error) {
        return {
          successCount: 0,
          errors: [{id: payeeId, error: error instanceof Error ? error.message : 'Unknown error'}]
        };
      }
    }

    // Update all payees
    const allPayees = await this.repository.findAll();
    const result: BulkUpdateResult = {successCount: 0, errors: []};

    for (const payee of allPayees) {
      try {
        await this.repository.updateCalculatedFields(payee.id);
        result.successCount++;
      } catch (error) {
        result.errors.push({
          id: payee.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return result;
  }

  /**
   * Get payee analytics and summary data
   */
  async getPayeeAnalytics(): Promise<PayeeAnalytics> {
    const allPayees = await this.repository.findAll();
    const activePayees = allPayees.filter(p => p.isActive);
    const payeesWithDefaults = allPayees.filter(p => p.defaultCategoryId || p.defaultBudgetId);
    const needingAttention = await this.repository.findNeedingAttention();

    // Calculate category distribution
    const categoryMap = new Map<number, {name: string; count: number}>();
    for (const payee of allPayees) {
      if (payee.defaultCategoryId) {
        const existing = categoryMap.get(payee.defaultCategoryId);
        if (existing) {
          existing.count++;
        } else {
          // We'd need to fetch category name from CategoryService
          categoryMap.set(payee.defaultCategoryId, {name: `Category ${payee.defaultCategoryId}`, count: 1});
        }
      }
    }

    const topCategories = Array.from(categoryMap.entries()).map(([id, data]) => ({
      categoryId: id,
      categoryName: data.name,
      payeeCount: data.count
    })).sort((a, b) => b.payeeCount - a.payeeCount).slice(0, 5);

    // Calculate recent activity (payees with transactions in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];

    const recentlyActiveCount = allPayees.filter(p =>
      p.lastTransactionDate && p.lastTransactionDate >= cutoffDate
    ).length;

    // Calculate average transactions per payee (would need transaction stats)
    const averageTransactionsPerPayee = 0; // TODO: Implement with transaction aggregation

    return {
      totalPayees: allPayees.length,
      activePayees: activePayees.length,
      payeesWithDefaults: payeesWithDefaults.length,
      payeesNeedingAttention: needingAttention.length,
      topCategories,
      averageTransactionsPerPayee,
      recentlyActiveCount,
    };
  }

  /**
   * Apply intelligent defaults to a payee based on suggestions
   */
  async applyIntelligentDefaults(id: number, applyCategory = true, applyBudget = true): Promise<Payee> {
    const suggestions = await this.generatePayeeSuggestions(id);

    if (suggestions.confidence < 0.5) {
      throw new ValidationError("Insufficient data confidence to apply intelligent defaults");
    }

    const updateData: Partial<UpdatePayeeData> = {};

    if (applyCategory && suggestions.suggestedCategoryId) {
      updateData.defaultCategoryId = suggestions.suggestedCategoryId;
    }

    if (applyBudget && suggestions.suggestedBudgetId) {
      updateData.defaultBudgetId = suggestions.suggestedBudgetId;
    }

    if (suggestions.suggestedAmount) {
      updateData.avgAmount = suggestions.suggestedAmount;
    }

    if (suggestions.suggestedFrequency) {
      updateData.paymentFrequency = suggestions.suggestedFrequency;
    }

    if (Object.keys(updateData).length === 0) {
      throw new ValidationError("No intelligent defaults available to apply");
    }

    return await this.repository.update(id, updateData);
  }

  /**
   * Sanitize and validate payee data
   */
  private async sanitizePayeeData(data: Partial<CreatePayeeData>): Promise<Partial<NewPayee>> {
    const sanitized: Partial<NewPayee> = {};

    if (data.website && typeof data.website === 'string') {
      if (!this.isValidUrl(data.website)) {
        throw new ValidationError("Invalid website URL");
      }
      sanitized.website = data.website;
    }

    if (data.email && typeof data.email === 'string') {
      if (!this.isValidEmail(data.email)) {
        throw new ValidationError("Invalid email address");
      }
      sanitized.email = data.email;
    }

    if (data.phone && typeof data.phone === 'string') {
      sanitized.phone = data.phone.replace(/[^\d\s\-\+\(\)\.]/g, ''); // Remove invalid characters
    }

    // Copy other fields directly
    const directFields = [
      'defaultCategoryId', 'defaultBudgetId', 'payeeType', 'address',
      'accountNumber', 'alertThreshold', 'isSeasonal', 'subscriptionInfo',
      'tags', 'preferredPaymentMethods', 'merchantCategoryCode'
    ] as const;

    for (const field of directFields) {
      if (data[field] !== undefined) {
        sanitized[field] = data[field] as any;
      }
    }

    return sanitized;
  }

  /**
   * Validate that a category exists
   */
  private async validateCategoryExists(categoryId: number): Promise<void> {
    // TODO: This should call CategoryService.exists() when available
    // For now, we'll assume it exists
    if (categoryId <= 0) {
      throw new ValidationError("Invalid category ID");
    }
  }

  /**
   * Validate that a budget exists
   */
  private async validateBudgetExists(budgetId: number): Promise<void> {
    // TODO: This should call BudgetService.exists() when available
    // For now, we'll assume it exists
    if (budgetId <= 0) {
      throw new ValidationError("Invalid budget ID");
    }
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Private: Validate unique payee name
   */
  private async validateUniquePayeeName(name: string, excludeId?: number): Promise<void> {
    const existingPayees = await this.repository.findAll();

    const duplicate = existingPayees.find(payee =>
      payee.name.toLowerCase() === name.toLowerCase() &&
      payee.id !== excludeId
    );

    if (duplicate) {
      throw new ConflictError(`Payee with name "${name}" already exists`);
    }
  }
}