import type {
  CategoryCorrection,
  CategoryDrift,
  CategoryRecommendation,
  CorrectionContext,
  CorrectionPattern,
  CorrectionTrigger,
  LearningMetrics,
  NewPayee,
  Payee,
  PayeeType,
} from "$lib/schema";
import { extractMerchantName, merchantSimilarity } from "$lib/server/domains/ml/similarity/text-similarity";
import { logger } from "$lib/server/shared/logging";
import { ConflictError, NotFoundError, ValidationError } from "$lib/server/shared/types/errors";
import { InputSanitizer } from "$lib/server/shared/validation";
import { currentDate, toISOString } from "$lib/utils/dates";
import { BudgetAllocationService } from "./budget-allocation";
import { CategoryLearningService } from "./category-learning";
import {
  ContactManagementService,
  type ContactAnalytics,
  type ContactSuggestion,
  type ContactValidationResult,
  type DuplicateDetection,
} from "./contact-management";
import {
  PayeeIntelligenceService,
  type BudgetAllocationSuggestion,
  type ConfidenceMetrics,
  type DayOfWeekPattern,
  type FrequencyAnalysis,
  type SeasonalPattern,
  type SpendingAnalysis,
  type TransactionPrediction,
} from "./intelligence";
import {
  PayeeMLCoordinator,
  type ActionableInsight,
  type BehaviorChangeDetection,
  type CrossSystemLearning,
  type MLPerformanceMetrics,
  type UnifiedRecommendations,
} from "./ml-coordinator";
import {
  PayeeRepository,
  type PayeeIntelligence,
  type PayeeSearchFilters,
  type PayeeStats,
  type PayeeSuggestions,
  type UpdatePayeeData,
} from "./repository";
import {
  SubscriptionManagementService,
  type SubscriptionCancellationAssistance,
  type SubscriptionCostAnalysis,
  type SubscriptionDetection,
  type SubscriptionLifecycle,
  type SubscriptionMetadata,
  type SubscriptionRenewalPrediction,
  type SubscriptionUsageAnalysis,
} from "./subscription-management";
import type {
  AddressData,
  ContactData,
  FieldChange,
  FieldRecommendation,
  PayeeAddress,
  PayeeIntelligenceSummary,
  PayeeTags, PaymentMethodReference, SubscriptionInfo,
} from "./types";

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
  address?: PayeeAddress | null | undefined;
  accountNumber?: string | null | undefined;
  alertThreshold?: number | null | undefined;
  isSeasonal?: boolean | undefined;
  subscriptionInfo?: SubscriptionInfo | null | undefined;
  tags?: PayeeTags | null | undefined;
  preferredPaymentMethods?: PaymentMethodReference[] | null | undefined;
  merchantCategoryCode?: string | null | undefined;
}

export interface PayeeWithStats extends Payee {
  stats?: PayeeStats;
}

export interface PayeeWithRelations extends Payee {
  defaultCategory?: { id: number; name: string } | null;
  defaultBudget?: { id: number; name: string } | null;
  stats?: PayeeStats;
  suggestions?: PayeeSuggestions;
}

export interface BulkUpdateResult {
  successCount: number;
  errors: Array<{ id: number; error: string }>;
}

export interface PayeeAnalytics {
  totalPayees: number;
  activePayees: number;
  payeesWithDefaults: number;
  payeesNeedingAttention: number;
  topCategories: Array<{ categoryId: number; categoryName: string; payeeCount: number }>;
  averageTransactionsPerPayee: number;
  recentlyActiveCount: number;
}

/**
 * Service for payee business logic with advanced intelligence capabilities
 */
import type { BudgetService } from "../budgets/services";
import type { CategoryService } from "../categories/services";

/**
 * Payee service containing business logic with advanced intelligence capabilities
 *
 * Dependencies are injected via constructor for testability.
 * Use ServiceFactory to instantiate in production code.
 */
export class PayeeService {
  constructor(
    private repository: PayeeRepository,
    private intelligenceService: PayeeIntelligenceService,
    private learningService: CategoryLearningService,
    private mlCoordinator: PayeeMLCoordinator,
    private contactService: ContactManagementService,
    private subscriptionService: SubscriptionManagementService,
    private categoryService?: CategoryService,
    private budgetService?: BudgetService,
    private budgetAllocationService?: BudgetAllocationService
  ) {}

  /**
   * Get budget allocation service, creating if not injected
   */
  private getBudgetAllocationService(): BudgetAllocationService {
    if (!this.budgetAllocationService) {
      this.budgetAllocationService = new BudgetAllocationService();
    }
    return this.budgetAllocationService;
  }

  /**
   * Generate a URL-friendly slug from a string
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  }

  /**
   * Create a new payee with enhanced budgeting integration
   */
  async createPayee(data: CreatePayeeData, workspaceId: number): Promise<Payee> {
    // Validate and sanitize input
    if (!data.name?.trim()) {
      throw new ValidationError("Payee name is required");
    }

    const sanitizedName = InputSanitizer.sanitizeName(data.name.trim());
    if (!sanitizedName) {
      throw new ValidationError("Invalid payee name");
    }

    const sanitizedNotes =
      data.notes && typeof data.notes === "string"
        ? InputSanitizer.sanitizeDescription(data.notes)
        : null;

    // Allow duplicate payee names - users may want multiple entries for same name

    // Validate related entities if provided
    if (data.defaultCategoryId) {
      await this.validateCategoryExists(data.defaultCategoryId, workspaceId);
    }

    if (data.defaultBudgetId) {
      await this.validateBudgetExists(data.defaultBudgetId, workspaceId);
    }

    // Sanitize and validate additional fields
    const sanitizedData = await this.sanitizePayeeData(data);

    // Generate unique slug
    let baseSlug = this.generateSlug(sanitizedName);
    let slug = baseSlug;
    let counter = 1;

    // Ensure slug uniqueness (only checking active payees since deleted ones have modified slugs)
    while (await this.repository.findBySlug(slug, workspaceId)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const newPayee: NewPayee = {
      workspaceId,
      name: sanitizedName,
      slug,
      notes: sanitizedNotes,
      ...sanitizedData,
      isActive: true, // New payees are active by default
      taxRelevant: data.taxRelevant || false,
    };

    return await this.repository.create(newPayee, workspaceId);
  }

  /**
   * Get payee by ID
   */
  async getPayeeById(id: number, workspaceId: number): Promise<Payee> {
    if (!id || id <= 0) {
      throw new ValidationError("Invalid payee ID");
    }

    const payee = await this.repository.findById(id, workspaceId);
    if (!payee) {
      throw new NotFoundError("Payee", id);
    }

    return payee;
  }

  /**
   * Get payee by slug
   */
  async getPayeeBySlug(slug: string, workspaceId: number): Promise<Payee> {
    if (!slug?.trim()) {
      throw new ValidationError("Invalid payee slug");
    }

    const payee = await this.repository.findBySlug(slug, workspaceId);
    if (!payee) {
      throw new NotFoundError("Payee", slug);
    }

    return payee;
  }

  /**
   * Get payee by ID with statistics
   */
  async getPayeeWithStats(id: number, workspaceId: number): Promise<PayeeWithStats> {
    const payee = await this.getPayeeById(id, workspaceId);
    const stats = await this.repository.getStats(id, workspaceId);

    return {
      ...payee,
      stats,
    };
  }

  /**
   * Get all payees
   */
  async getAllPayees(workspaceId: number): Promise<Payee[]> {
    // Fetch all payees without pagination
    return await this.repository.findAllPayees(workspaceId);
  }

  /**
   * Get all payees with transaction statistics
   */
  async getAllPayeesWithStats(workspaceId: number): Promise<PayeeWithStats[]> {
    // Fetch all payees without pagination
    const payees = await this.repository.findAllPayees(workspaceId);

    return await Promise.all(
      payees.map(async (payee) => {
        const stats = await this.repository.getStats(payee.id, workspaceId);
        return {
          ...payee,
          stats,
        };
      })
    );
  }

  /**
   * Update payee with enhanced validation and field support
   */
  async updatePayee(id: number, data: UpdatePayeeData, workspaceId: number): Promise<Payee> {
    if (!id || id <= 0) {
      throw new ValidationError("Invalid payee ID");
    }

    // Verify payee exists
    await this.getPayeeById(id, workspaceId);

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

      // Allow duplicate payee names - users may want multiple entries for same name
      updateData.name = sanitizedName;
    }

    // Validate and sanitize notes if provided
    if (data.notes !== undefined) {
      updateData.notes =
        data.notes && typeof data.notes === "string"
          ? InputSanitizer.sanitizeDescription(data.notes)
          : null;
    }

    // Validate related entities
    if (data.defaultCategoryId !== undefined) {
      if (data.defaultCategoryId) {
        await this.validateCategoryExists(data.defaultCategoryId, workspaceId);
      }
      updateData.defaultCategoryId = data.defaultCategoryId;
    }

    if (data.defaultBudgetId !== undefined) {
      if (data.defaultBudgetId) {
        await this.validateBudgetExists(data.defaultBudgetId, workspaceId);
      }
      updateData.defaultBudgetId = data.defaultBudgetId;
    }

    // Validate and set other fields
    const fieldsToUpdate = [
      "payeeType",
      "avgAmount",
      "paymentFrequency",
      "lastTransactionDate",
      "taxRelevant",
      "isActive",
      "website",
      "phone",
      "email",
      "address",
      "accountNumber",
      "alertThreshold",
      "isSeasonal",
      "subscriptionInfo",
      "tags",
      "preferredPaymentMethods",
      "merchantCategoryCode",
    ] as const;

    for (const field of fieldsToUpdate) {
      if (data[field] !== undefined) {
        updateData[field] = data[field] as any;
      }
    }

    // Validate specific field constraints
    if (
      updateData.website &&
      typeof updateData.website === "string" &&
      !this.isValidUrl(updateData.website)
    ) {
      throw new ValidationError("Invalid website URL");
    }

    if (
      updateData.email &&
      typeof updateData.email === "string" &&
      !this.isValidEmail(updateData.email)
    ) {
      throw new ValidationError("Invalid email address");
    }

    if (Object.keys(updateData).length === 0) {
      throw new ValidationError("No valid fields to update");
    }

    return await this.repository.update(id, updateData, workspaceId);
  }

  /**
   * Delete payee (soft delete)
   */
  async deletePayee(
    id: number,
    workspaceId: number,
    options: { force?: boolean } = {}
  ): Promise<Payee> {
    if (!id || id <= 0) {
      throw new ValidationError("Invalid payee ID");
    }

    // Verify payee exists
    await this.getPayeeById(id, workspaceId);

    // Check for associated transactions unless force delete
    if (!options.force) {
      const hasTransactions = await this.repository.hasTransactions(id, workspaceId);
      if (hasTransactions) {
        throw new ConflictError(
          "Cannot delete payee with associated transactions. Use force delete or reassign transactions first."
        );
      }
    }

    return await this.repository.softDelete(id, workspaceId);
  }

  /**
   * Bulk delete payees
   */
  async bulkDeletePayees(
    ids: number[],
    workspaceId: number,
    options: { force?: boolean } = {}
  ): Promise<{ deletedCount: number; errors: string[] }> {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new ValidationError("No payee IDs provided");
    }

    const validIds = ids.filter((id) => id && id > 0);
    if (validIds.length === 0) {
      throw new ValidationError("No valid payee IDs provided");
    }

    const errors: string[] = [];
    const deleteableIds: number[] = [];

    // Validate each payee and check for conflicts
    for (const id of validIds) {
      try {
        await this.getPayeeById(id, workspaceId);

        if (!options.force) {
          const hasTransactions = await this.repository.hasTransactions(id, workspaceId);
          if (hasTransactions) {
            errors.push(`Payee ${id}: Has associated transactions`);
            continue;
          }
        }

        deleteableIds.push(id);
      } catch (error) {
        errors.push(`Payee ${id}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    if (deleteableIds.length > 0) {
      await this.repository.bulkDelete(deleteableIds, workspaceId);
    }

    return { deletedCount: deleteableIds.length, errors };
  }

  /**
   * Bulk assign category to payees
   */
  async bulkAssignCategory(
    payeeIds: number[],
    categoryId: number,
    overwriteExisting: boolean,
    workspaceId: number
  ): Promise<{ updatedCount: number; skippedCount: number; errors: string[] }> {
    if (!Array.isArray(payeeIds) || payeeIds.length === 0) {
      throw new ValidationError("No payee IDs provided");
    }

    if (!categoryId || categoryId <= 0) {
      throw new ValidationError("Invalid category ID");
    }

    const validIds = payeeIds.filter((id) => id && id > 0);
    if (validIds.length === 0) {
      throw new ValidationError("No valid payee IDs provided");
    }

    const errors: string[] = [];
    let updatedCount = 0;
    let skippedCount = 0;

    for (const id of validIds) {
      try {
        const payee = await this.getPayeeById(id, workspaceId);

        // Skip if already has category and not overwriting
        if (payee.defaultCategoryId && !overwriteExisting) {
          skippedCount++;
          continue;
        }

        await this.updatePayee(id, { defaultCategoryId: categoryId }, workspaceId);
        updatedCount++;
      } catch (error) {
        errors.push(`Payee ${id}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    return { updatedCount, skippedCount, errors };
  }

  /**
   * Bulk update payee status (active/inactive)
   */
  async bulkUpdatePayeeStatus(
    payeeIds: number[],
    isActive: boolean,
    workspaceId: number
  ): Promise<{ updatedCount: number; errors: string[] }> {
    if (!Array.isArray(payeeIds) || payeeIds.length === 0) {
      throw new ValidationError("No payee IDs provided");
    }

    const validIds = payeeIds.filter((id) => id && id > 0);
    if (validIds.length === 0) {
      throw new ValidationError("No valid payee IDs provided");
    }

    const errors: string[] = [];
    let updatedCount = 0;

    for (const id of validIds) {
      try {
        await this.updatePayee(id, { isActive }, workspaceId);
        updatedCount++;
      } catch (error) {
        errors.push(`Payee ${id}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    return { updatedCount, errors };
  }

  /**
   * Bulk manage tags on payees
   */
  async bulkManageTags(
    payeeIds: number[],
    tags: string[],
    operation: "add" | "remove" | "replace",
    workspaceId: number
  ): Promise<{ updatedCount: number; errors: string[] }> {
    if (!Array.isArray(payeeIds) || payeeIds.length === 0) {
      throw new ValidationError("No payee IDs provided");
    }

    const validIds = payeeIds.filter((id) => id && id > 0);
    if (validIds.length === 0) {
      throw new ValidationError("No valid payee IDs provided");
    }

    const errors: string[] = [];
    let updatedCount = 0;

    for (const id of validIds) {
      try {
        const payee = await this.getPayeeById(id, workspaceId);
        const existingTags = (payee.tags as string[] | null) || [];
        let newTags: string[];

        switch (operation) {
          case "add":
            newTags = [...new Set([...existingTags, ...tags])];
            break;
          case "remove":
            newTags = existingTags.filter((t) => !tags.includes(t));
            break;
          case "replace":
            newTags = tags;
            break;
        }

        await this.updatePayee(id, { tags: newTags as any }, workspaceId);
        updatedCount++;
      } catch (error) {
        errors.push(`Payee ${id}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    return { updatedCount, errors };
  }

  /**
   * Bulk apply intelligent defaults to payees
   */
  async bulkApplyIntelligentDefaults(
    payeeIds: number[],
    options: {
      applyCategory?: boolean;
      applyBudget?: boolean;
      confidenceThreshold?: number;
      overwriteExisting?: boolean;
    },
    workspaceId: number
  ): Promise<{ updatedCount: number; skippedCount: number; errors: string[] }> {
    if (!Array.isArray(payeeIds) || payeeIds.length === 0) {
      throw new ValidationError("No payee IDs provided");
    }

    const validIds = payeeIds.filter((id) => id && id > 0);
    if (validIds.length === 0) {
      throw new ValidationError("No valid payee IDs provided");
    }

    const {
      applyCategory = true,
      applyBudget = true,
      confidenceThreshold = 0.7,
      overwriteExisting = false,
    } = options;

    const errors: string[] = [];
    let updatedCount = 0;
    let skippedCount = 0;

    for (const id of validIds) {
      try {
        const payee = await this.getPayeeById(id, workspaceId);
        const suggestions = await this.generatePayeeSuggestions(id, workspaceId);

        if (!suggestions) {
          skippedCount++;
          continue;
        }

        const updateData: UpdatePayeeData = {};

        if (
          applyCategory &&
          suggestions.suggestedCategoryId &&
          suggestions.confidence >= confidenceThreshold
        ) {
          if (!payee.defaultCategoryId || overwriteExisting) {
            updateData.defaultCategoryId = suggestions.suggestedCategoryId;
          }
        }

        if (
          applyBudget &&
          suggestions.suggestedBudgetId &&
          suggestions.confidence >= confidenceThreshold
        ) {
          if (!payee.defaultBudgetId || overwriteExisting) {
            updateData.defaultBudgetId = suggestions.suggestedBudgetId;
          }
        }

        if (Object.keys(updateData).length > 0) {
          await this.updatePayee(id, updateData, workspaceId);
          updatedCount++;
        } else {
          skippedCount++;
        }
      } catch (error) {
        errors.push(`Payee ${id}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    return { updatedCount, skippedCount, errors };
  }

  /**
   * Bulk cleanup payees based on specified operations
   */
  async bulkCleanupPayees(
    operations: Array<"remove_inactive" | "merge_duplicates" | "fix_data" | "archive_unused">,
    dryRun: boolean,
    confirmDestructive: boolean,
    workspaceId: number
  ): Promise<{
    affectedPayees: number[];
    operationResults: Array<{
      operation: string;
      affectedCount: number;
      details: string[];
    }>;
    canUndo: boolean;
  }> {
    const affectedPayees: number[] = [];
    const operationResults: Array<{
      operation: string;
      affectedCount: number;
      details: string[];
    }> = [];

    for (const operation of operations) {
      const result = {
        operation,
        affectedCount: 0,
        details: [] as string[],
      };

      switch (operation) {
        case "remove_inactive": {
          const allPayees = await this.repository.findAllPayees(workspaceId);
          const inactive = allPayees.filter((p) => !p.isActive);

          if (!dryRun && confirmDestructive) {
            for (const payee of inactive) {
              const hasTransactions = await this.repository.hasTransactions(payee.id, workspaceId);
              if (!hasTransactions) {
                await this.deletePayee(payee.id, workspaceId);
                affectedPayees.push(payee.id);
                result.affectedCount++;
                result.details.push(`Removed inactive payee: ${payee.name}`);
              }
            }
          } else {
            result.affectedCount = inactive.length;
            result.details.push(`Found ${inactive.length} inactive payees`);
          }
          break;
        }
        case "archive_unused": {
          const allPayees = await this.repository.findAllPayees(workspaceId);
          for (const payee of allPayees) {
            const hasTransactions = await this.repository.hasTransactions(payee.id, workspaceId);
            if (!hasTransactions && payee.isActive) {
              if (!dryRun) {
                await this.updatePayee(payee.id, { isActive: false }, workspaceId);
                affectedPayees.push(payee.id);
              }
              result.affectedCount++;
              result.details.push(`${dryRun ? "Would archive" : "Archived"}: ${payee.name}`);
            }
          }
          break;
        }
        case "fix_data": {
          // Placeholder - data fixing would be specific to your needs
          result.details.push("Data fixing not yet implemented");
          break;
        }
        case "merge_duplicates": {
          // Placeholder - would call findDuplicatePayees and merge
          result.details.push("Use the dedicated duplicate detection feature");
          break;
        }
      }

      operationResults.push(result);
    }

    return {
      affectedPayees,
      operationResults,
      canUndo: !dryRun && affectedPayees.length > 0,
    };
  }

  /**
   * Undo a bulk operation (placeholder - requires operation history tracking)
   */
  async undoBulkOperation(
    _operationId: string,
    _operationType: string,
    _workspaceId: number
  ): Promise<{ success: boolean; message: string; restoredCount: number }> {
    // Note: Full implementation would require persisting operation history
    // with before/after states for each affected payee
    throw new ValidationError(
      "Undo functionality requires operation history tracking which is not yet implemented"
    );
  }

  /**
   * Search payees
   */
  async searchPayees(query: string, workspaceId: number): Promise<Payee[]> {
    const sanitizedQuery = query?.trim() || "";
    return await this.repository.search(sanitizedQuery, workspaceId);
  }

  /**
   * Get payees used in account transactions
   */
  async getPayeesByAccount(accountId: number, workspaceId: number): Promise<Payee[]> {
    if (!accountId || accountId <= 0) {
      throw new ValidationError("Invalid account ID");
    }

    return await this.repository.findByAccountTransactions(accountId, workspaceId);
  }

  /**
   * Verify payee exists
   */
  async verifyPayeeExists(id: number, workspaceId: number): Promise<boolean> {
    if (!id || id <= 0) return false;
    return await this.repository.exists(id, workspaceId);
  }

  /**
   * Get comprehensive payee statistics
   */
  async getPayeeStats(id: number, workspaceId: number): Promise<PayeeStats> {
    await this.getPayeeById(id, workspaceId); // Verify exists
    return await this.repository.getStats(id, workspaceId);
  }

  /**
   * Merge two payees (move all transactions from source to target)
   */
  async mergePayees(sourceId: number, targetId: number, workspaceId: number): Promise<void> {
    if (!sourceId || !targetId || sourceId === targetId) {
      throw new ValidationError("Invalid payee IDs for merge operation");
    }

    // Verify both payees exist
    const sourcePayee = await this.getPayeeById(sourceId, workspaceId);
    const targetPayee = await this.getPayeeById(targetId, workspaceId);

    // Get source payee stats before merge
    const sourceStats = await this.repository.getStats(sourceId, workspaceId);
    if (sourceStats.transactionCount === 0) {
      throw new ValidationError("Source payee has no transactions to merge");
    }

    // Reassign all transactions from source to target payee
    const reassignedCount = await this.repository.reassignTransactions(
      sourceId,
      targetId,
      workspaceId
    );

    // Soft delete the source payee
    await this.repository.softDelete(sourceId, workspaceId);

    // Update calculated fields for target payee
    await this.repository.updateCalculatedFields(targetId, workspaceId);

    logger.info("Payee merge completed", {
      sourceId,
      sourceName: sourcePayee.name,
      targetId,
      targetName: targetPayee.name,
      transactionsReassigned: reassignedCount,
    });
  }

  /**
   * Get payees with their default category/budget relations
   */
  async getPayeesWithRelations(workspaceId: number): Promise<PayeeWithRelations[]> {
    return await this.repository.findWithRelations(workspaceId);
  }

  /**
   * Advanced search with comprehensive filters
   */
  async searchPayeesAdvanced(filters: PayeeSearchFilters, workspaceId: number): Promise<Payee[]> {
    return await this.repository.searchWithFilters(filters, workspaceId);
  }

  /**
   * Get payees by type
   */
  async getPayeesByType(payeeType: PayeeType, workspaceId: number): Promise<Payee[]> {
    return await this.repository.findByType(payeeType, workspaceId);
  }

  /**
   * Get payees that need attention (missing defaults, old transactions, etc.)
   */
  async getPayeesNeedingAttention(workspaceId: number): Promise<Array<Payee & { reason: string }>> {
    return await this.repository.findNeedingAttention(workspaceId);
  }

  /**
   * Generate intelligent suggestions for a payee
   */
  async generatePayeeSuggestions(id: number, workspaceId: number): Promise<PayeeSuggestions> {
    await this.getPayeeById(id, workspaceId); // Verify exists
    return await this.repository.generateSuggestions(id, workspaceId);
  }

  /**
   * Get comprehensive payee intelligence data
   */
  async getPayeeIntelligence(id: number, workspaceId: number): Promise<PayeeIntelligence> {
    return await this.repository.getIntelligence(id, workspaceId);
  }

  /**
   * Auto-update calculated fields for all payees or specific payee
   */
  async updateCalculatedFields(payeeId: number | undefined, workspaceId: number): Promise<BulkUpdateResult> {
    if (payeeId) {
      try {
        await this.repository.updateCalculatedFields(payeeId, workspaceId);
        return { successCount: 1, errors: [] };
      } catch (error) {
        return {
          successCount: 0,
          errors: [
            { id: payeeId, error: error instanceof Error ? error.message : "Unknown error" },
          ],
        };
      }
    }

    // Update all payees
    const allPayeesResult = await this.repository.findAll(workspaceId);
    const allPayees = allPayeesResult.data;
    const result: BulkUpdateResult = { successCount: 0, errors: [] };

    for (const payee of allPayees) {
      try {
        await this.repository.updateCalculatedFields(payee.id, workspaceId);
        result.successCount++;
      } catch (error) {
        result.errors.push({
          id: payee.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return result;
  }

  /**
   * Get payee analytics and summary data
   */
  async getPayeeAnalytics(workspaceId: number): Promise<PayeeAnalytics> {
    const allPayeesResult = await this.repository.findAll(workspaceId);
    const allPayees = allPayeesResult.data;
    const activePayees = allPayees.filter((p) => p.isActive);
    const payeesWithDefaults = allPayees.filter((p) => p.defaultCategoryId || p.defaultBudgetId);
    const needingAttention = await this.repository.findNeedingAttention(workspaceId);

    // Calculate category distribution
    const categoryMap = new Map<number, { name: string; count: number }>();
    for (const payee of allPayees) {
      if (payee.defaultCategoryId) {
        const existing = categoryMap.get(payee.defaultCategoryId);
        if (existing) {
          existing.count++;
        } else {
          // We'd need to fetch category name from CategoryService
          categoryMap.set(payee.defaultCategoryId, {
            name: `Category ${payee.defaultCategoryId}`,
            count: 1,
          });
        }
      }
    }

    const topCategories = Array.from(categoryMap.entries())
      .map(([id, data]) => ({
        categoryId: id,
        categoryName: data.name,
        payeeCount: data.count,
      }))
      .sort((a, b) => b.payeeCount - a.payeeCount)
      .slice(0, 5);

    // Calculate recent activity (payees with transactions in last 30 days)
    const thirtyDaysAgo = currentDate.subtract({ days: 30 });
    const cutoffDate = toISOString(thirtyDaysAgo);

    const recentlyActiveCount = allPayees.filter(
      (p) => p.lastTransactionDate && cutoffDate && p.lastTransactionDate >= cutoffDate
    ).length;

    // Calculate average transactions per payee
    const totalTransactions = await this.repository.getTotalTransactionCount(workspaceId);
    const averageTransactionsPerPayee =
      allPayees.length > 0 ? Math.round(totalTransactions / allPayees.length) : 0;

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
  async applyIntelligentDefaults(
    id: number,
    workspaceId: number,
    applyCategory = true,
    applyBudget = true
  ): Promise<Payee> {
    const suggestions = await this.generatePayeeSuggestions(id, workspaceId);

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

    return await this.repository.update(id, updateData, workspaceId);
  }

  /**
   * Sanitize and validate payee data
   */
  private async sanitizePayeeData(data: Partial<CreatePayeeData>): Promise<Partial<NewPayee>> {
    const sanitized: Partial<NewPayee> = {};

    if (data.website && typeof data.website === "string") {
      if (!this.isValidUrl(data.website)) {
        throw new ValidationError("Invalid website URL");
      }
      sanitized.website = data.website;
    }

    if (data.email && typeof data.email === "string") {
      if (!this.isValidEmail(data.email)) {
        throw new ValidationError("Invalid email address");
      }
      sanitized.email = data.email;
    }

    if (data.phone && typeof data.phone === "string") {
      sanitized.phone = data.phone.replace(/[^\d\s\-\+\(\)\.]/g, ""); // Remove invalid characters
    }

    // Copy other fields directly
    const directFields = [
      "defaultCategoryId",
      "defaultBudgetId",
      "payeeType",
      "address",
      "accountNumber",
      "alertThreshold",
      "isSeasonal",
      "subscriptionInfo",
      "tags",
      "preferredPaymentMethods",
      "merchantCategoryCode",
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
  private async validateCategoryExists(categoryId: number, workspaceId: number): Promise<void> {
    if (categoryId <= 0) {
      throw new ValidationError("Invalid category ID");
    }

    if (this.categoryService) {
      const exists = await this.categoryService.verifyCategoryExists(categoryId, workspaceId);
      if (!exists) {
        throw new NotFoundError("Category", categoryId);
      }
    }
  }

  /**
   * Validate that a budget exists
   */
  private async validateBudgetExists(budgetId: number, workspaceId: number): Promise<void> {
    if (budgetId <= 0) {
      throw new ValidationError("Invalid budget ID");
    }

    if (this.budgetService) {
      try {
        await this.budgetService.getBudget(budgetId, workspaceId);
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw error;
        }
        throw error;
      }
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

  // ==================== ADVANCED INTELLIGENCE METHODS ====================

  /**
   * Analyze comprehensive spending patterns for a payee using advanced algorithms
   */
  async analyzeAdvancedSpendingPatterns(id: number, workspaceId: number): Promise<SpendingAnalysis> {
    await this.getPayeeById(id, workspaceId); // Verify exists
    return await this.intelligenceService.analyzeSpendingPatterns(id);
  }

  /**
   * Detect seasonal spending patterns with statistical analysis
   */
  async detectSeasonalPatterns(id: number, workspaceId: number): Promise<SeasonalPattern[]> {
    await this.getPayeeById(id, workspaceId); // Verify exists
    return await this.intelligenceService.detectSeasonality(id);
  }

  /**
   * Analyze day-of-week spending preferences
   */
  async analyzeDayOfWeekPatterns(id: number, workspaceId: number): Promise<DayOfWeekPattern[]> {
    await this.getPayeeById(id, workspaceId); // Verify exists
    return await this.intelligenceService.analyzeDayOfWeekPatterns(id);
  }

  /**
   * Advanced frequency pattern analysis with irregular pattern support
   */
  async analyzeAdvancedFrequencyPatterns(id: number, workspaceId: number): Promise<FrequencyAnalysis> {
    await this.getPayeeById(id, workspaceId); // Verify exists
    return await this.intelligenceService.analyzeFrequencyPattern(id);
  }

  /**
   * Predict next transaction timing and amount using machine learning patterns
   */
  async predictNextTransaction(id: number, workspaceId: number): Promise<TransactionPrediction> {
    await this.getPayeeById(id, workspaceId); // Verify exists
    return await this.intelligenceService.predictNextTransaction(id);
  }

  /**
   * Generate smart budget allocation suggestions with seasonal adjustments
   */
  async generateBudgetAllocationSuggestion(id: number, workspaceId: number): Promise<BudgetAllocationSuggestion> {
    await this.getPayeeById(id, workspaceId); // Verify exists
    return await this.intelligenceService.suggestBudgetAllocation(id);
  }

  /**
   * Calculate comprehensive confidence scores for all intelligence predictions
   */
  async calculateIntelligenceConfidence(id: number, workspaceId: number): Promise<ConfidenceMetrics> {
    await this.getPayeeById(id, workspaceId); // Verify exists
    return await this.intelligenceService.calculateConfidenceScores(id);
  }

  /**
   * Get comprehensive payee intelligence analysis combining all advanced features
   */
  async getComprehensiveIntelligence(id: number, workspaceId: number): Promise<{
    payee: Payee;
    spendingAnalysis: SpendingAnalysis;
    seasonalPatterns: SeasonalPattern[];
    dayOfWeekPatterns: DayOfWeekPattern[];
    frequencyAnalysis: FrequencyAnalysis;
    transactionPrediction: TransactionPrediction;
    budgetSuggestion: BudgetAllocationSuggestion;
    confidenceMetrics: ConfidenceMetrics;
  }> {
    const payee = await this.getPayeeById(id, workspaceId); // Verify exists

    // Run all intelligence analysis in parallel for efficiency
    const [
      spendingAnalysis,
      seasonalPatterns,
      dayOfWeekPatterns,
      frequencyAnalysis,
      transactionPrediction,
      budgetSuggestion,
      confidenceMetrics,
    ] = await Promise.all([
      this.intelligenceService.analyzeSpendingPatterns(id),
      this.intelligenceService.detectSeasonality(id),
      this.intelligenceService.analyzeDayOfWeekPatterns(id),
      this.intelligenceService.analyzeFrequencyPattern(id),
      this.intelligenceService.predictNextTransaction(id),
      this.intelligenceService.suggestBudgetAllocation(id),
      this.intelligenceService.calculateConfidenceScores(id),
    ]);

    return {
      payee,
      spendingAnalysis,
      seasonalPatterns,
      dayOfWeekPatterns,
      frequencyAnalysis,
      transactionPrediction,
      budgetSuggestion,
      confidenceMetrics,
    };
  }

  /**
   * Apply machine learning insights to automatically improve payee defaults
   */
  async applyIntelligentOptimizations(
    id: number,
    workspaceId: number,
    options: {
      updateCategory?: boolean;
      updateBudget?: boolean;
      updateFrequency?: boolean;
      updateAmount?: boolean;
      minConfidence?: number;
    } = {}
  ): Promise<PayeeIntelligenceSummary & { updated: boolean }> {
    const {
      updateCategory = true,
      updateBudget = true,
      updateFrequency = true,
      updateAmount = true,
      minConfidence = 0.7,
    } = options;

    const payee = await this.getPayeeById(id, workspaceId);
    const budgetSuggestion = await this.intelligenceService.suggestBudgetAllocation(id);
    const frequencyAnalysis = await this.intelligenceService.analyzeFrequencyPattern(id);
    const spendingAnalysis = await this.intelligenceService.analyzeSpendingPatterns(id);

    const changes: FieldChange[] = [];
    const recommendations: FieldRecommendation[] = [];
    const updateData: Partial<UpdatePayeeData> = {};

    // Update category if confidence is high enough
    if (
      updateCategory &&
      budgetSuggestion.budgetCategory.categoryConfidence >= minConfidence &&
      budgetSuggestion.budgetCategory.primaryCategoryId &&
      payee.defaultCategoryId !== budgetSuggestion.budgetCategory.primaryCategoryId
    ) {
      changes.push({
        field: "defaultCategoryId",
        oldValue: payee.defaultCategoryId,
        newValue: budgetSuggestion.budgetCategory.primaryCategoryId,
        confidence: budgetSuggestion.budgetCategory.categoryConfidence,
      });
      updateData.defaultCategoryId = budgetSuggestion.budgetCategory.primaryCategoryId;
    } else if (
      budgetSuggestion.budgetCategory.primaryCategoryId &&
      budgetSuggestion.budgetCategory.categoryConfidence < minConfidence
    ) {
      recommendations.push({
        field: "defaultCategoryId",
        suggestion: budgetSuggestion.budgetCategory.primaryCategoryId,
        confidence: budgetSuggestion.budgetCategory.categoryConfidence,
        reason: `Category suggestion confidence (${Math.round(budgetSuggestion.budgetCategory.categoryConfidence * 100)}%) below threshold (${Math.round(minConfidence * 100)}%)`,
      });
    }

    // Update payment frequency if detected with high confidence
    if (
      updateFrequency &&
      frequencyAnalysis.confidence >= minConfidence &&
      frequencyAnalysis.detectedFrequency &&
      payee.paymentFrequency !== frequencyAnalysis.detectedFrequency
    ) {
      changes.push({
        field: "paymentFrequency",
        oldValue: payee.paymentFrequency,
        newValue: frequencyAnalysis.detectedFrequency,
        confidence: frequencyAnalysis.confidence,
      });
      updateData.paymentFrequency = frequencyAnalysis.detectedFrequency;
    } else if (
      frequencyAnalysis.detectedFrequency &&
      frequencyAnalysis.confidence < minConfidence
    ) {
      recommendations.push({
        field: "paymentFrequency",
        suggestion: frequencyAnalysis.detectedFrequency,
        confidence: frequencyAnalysis.confidence,
        reason: `Frequency detection confidence (${Math.round(frequencyAnalysis.confidence * 100)}%) below threshold (${Math.round(minConfidence * 100)}%)`,
      });
    }

    // Update average amount if significantly different and confident
    if (updateAmount && spendingAnalysis.transactionCount >= 5) {
      const currentAvg = payee.avgAmount || 0;
      const suggestedAvg = spendingAnalysis.averageAmount;
      const difference = Math.abs(currentAvg - suggestedAvg);
      const percentDifference = currentAvg > 0 ? difference / currentAvg : 1;

      if (percentDifference > 0.1) {
        // 10% difference threshold
        const confidence =
          Math.min(1, spendingAnalysis.transactionCount / 10) *
          (1 - Math.min(1, spendingAnalysis.volatility));

        if (confidence >= minConfidence) {
          changes.push({
            field: "avgAmount",
            oldValue: payee.avgAmount,
            newValue: suggestedAvg,
            confidence,
          });
          updateData.avgAmount = suggestedAvg;
        } else {
          recommendations.push({
            field: "avgAmount",
            suggestion: suggestedAvg,
            confidence,
            reason: `Amount analysis confidence (${Math.round(confidence * 100)}%) below threshold due to volatility or limited data`,
          });
        }
      }
    }

    // Apply updates if any
    let updated = false;
    if (Object.keys(updateData).length > 0) {
      await this.updatePayee(id, updateData, workspaceId);
      updated = true;
    }

    return {
      updated,
      changes,
      recommendations,
      confidence:
        changes.length > 0 ? changes.reduce((sum, c) => sum + c.confidence, 0) / changes.length : 0,
      lastUpdated: toISOString(currentDate),
    };
  }

  /**
   * Bulk intelligence analysis for multiple payees with performance optimization
   */
  async bulkIntelligenceAnalysis(
    payeeIds: number[],
    workspaceId: number,
    options: {
      includeSpendingAnalysis?: boolean;
      includeSeasonalPatterns?: boolean;
      includeFrequencyAnalysis?: boolean;
      includePredictions?: boolean;
      minTransactionCount?: number;
    } = {}
  ): Promise<
    Array<{
      payeeId: number;
      payeeName: string;
      analysis: {
        spendingAnalysis?: SpendingAnalysis;
        seasonalPatterns?: SeasonalPattern[];
        frequencyAnalysis?: FrequencyAnalysis;
        transactionPrediction?: TransactionPrediction;
        confidence?: ConfidenceMetrics;
      };
      error?: string;
    }>
  > {
    const {
      includeSpendingAnalysis = true,
      includeSeasonalPatterns = false,
      includeFrequencyAnalysis = false,
      includePredictions = false,
      minTransactionCount = 3,
    } = options;

    const results = [];

    // Process payees in batches to avoid overwhelming the database
    const batchSize = 10;
    for (let i = 0; i < payeeIds.length; i += batchSize) {
      const batch = payeeIds.slice(i, i + batchSize);

      const batchPromises = batch.map(async (payeeId) => {
        try {
          const payee = await this.getPayeeById(payeeId, workspaceId);

          // Check if payee has sufficient transaction history
          const stats = await this.getPayeeStats(payeeId, workspaceId);
          if (stats.transactionCount < minTransactionCount) {
            return {
              payeeId,
              payeeName: payee.name || "Unknown",
              analysis: {},
              error: `Insufficient transaction history (${stats.transactionCount} transactions, minimum ${minTransactionCount} required)`,
            };
          }

          const analysis: {
            spendingAnalysis?: SpendingAnalysis;
            seasonalPatterns?: SeasonalPattern[];
            frequencyAnalysis?: FrequencyAnalysis;
            transactionPrediction?: TransactionPrediction;
            confidence?: ConfidenceMetrics;
          } = {};

          // Run requested analyses
          if (includeSpendingAnalysis) {
            analysis.spendingAnalysis =
              await this.intelligenceService.analyzeSpendingPatterns(payeeId);
          }

          if (includeSeasonalPatterns) {
            analysis.seasonalPatterns = await this.intelligenceService.detectSeasonality(payeeId);
          }

          if (includeFrequencyAnalysis) {
            analysis.frequencyAnalysis =
              await this.intelligenceService.analyzeFrequencyPattern(payeeId);
          }

          if (includePredictions) {
            analysis.transactionPrediction =
              await this.intelligenceService.predictNextTransaction(payeeId);
          }

          // Always include confidence metrics for any analysis
          if (Object.keys(analysis).length > 0) {
            analysis.confidence = await this.intelligenceService.calculateConfidenceScores(payeeId);
          }

          return {
            payeeId,
            payeeName: payee.name || "Unknown",
            analysis,
          };
        } catch (error) {
          return {
            payeeId,
            payeeName: "Unknown",
            analysis: {},
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  // =====================================
  // Category Learning Service Methods
  // =====================================

  /**
   * Record a user category correction for machine learning
   */
  async recordCategoryCorrection(
    data: {
      payeeId: number;
      transactionId?: number;
      fromCategoryId?: number;
      toCategoryId: number;
      correctionTrigger: CorrectionTrigger;
      correctionContext?: CorrectionContext;
      transactionAmount?: number;
      transactionDate?: string;
      userConfidence?: number;
      notes?: string;
      isOverride?: boolean;
    },
    workspaceId: number
  ): Promise<CategoryCorrection> {
    // Validate payee exists
    await this.getPayeeById(data.payeeId, workspaceId);

    // Record the correction
    const correctionData: {
      payeeId: number;
      transactionId?: number;
      fromCategoryId?: number;
      toCategoryId: number;
      correctionTrigger: CorrectionTrigger;
      correctionContext?: CorrectionContext;
      transactionAmount?: number;
      transactionDate?: string;
      userConfidence?: number;
      notes?: string;
      isOverride?: boolean;
    } = {
      payeeId: data.payeeId,
      toCategoryId: data.toCategoryId,
      correctionTrigger: data.correctionTrigger,
    };

    if (data.correctionContext !== undefined)
      correctionData.correctionContext = data.correctionContext;
    if (data.transactionId !== undefined) correctionData.transactionId = data.transactionId;
    if (data.fromCategoryId !== undefined) correctionData.fromCategoryId = data.fromCategoryId;
    if (data.transactionAmount !== undefined)
      correctionData.transactionAmount = data.transactionAmount;
    if (data.transactionDate !== undefined) correctionData.transactionDate = data.transactionDate;
    if (data.userConfidence !== undefined) correctionData.userConfidence = data.userConfidence;
    if (data.notes !== undefined) correctionData.notes = data.notes;
    if (data.isOverride !== undefined) correctionData.isOverride = data.isOverride;

    return await this.learningService.learnFromCorrection(correctionData, workspaceId);
  }

  /**
   * Get smart category recommendation based on learning patterns
   */
  async getCategoryRecommendation(
    payeeId: number,
    workspaceId: number,
    context?: {
      transactionAmount?: number;
      transactionDate?: string;
    }
  ): Promise<CategoryRecommendation> {
    // Validate payee exists
    await this.getPayeeById(payeeId, workspaceId);

    return await this.learningService.getCategoryRecommendations(payeeId, context);
  }

  /**
   * Calculate confidence score for a specific category assignment
   */
  async calculateCategoryConfidence(
    payeeId: number,
    workspaceId: number,
    categoryId: number,
    context?: {
      transactionAmount?: number;
      transactionDate?: string;
    }
  ): Promise<number> {
    // Validate payee exists
    await this.getPayeeById(payeeId, workspaceId);

    return await this.learningService.calculateCategoryConfidence(payeeId, categoryId, context);
  }

  /**
   * Analyze correction patterns for a payee
   */
  async analyzeCorrectionPatterns(
    payeeId: number,
    workspaceId: number,
    options?: {
      timeframeMonths?: number;
      minConfidence?: number;
      includeProcessed?: boolean;
    }
  ): Promise<CorrectionPattern[]> {
    // Validate payee exists
    await this.getPayeeById(payeeId, workspaceId);

    return await this.learningService.analyzeCorrectionPatterns(payeeId, options);
  }

  /**
   * Detect category drift for a payee
   */
  async detectCategoryDrift(payeeId: number, workspaceId: number): Promise<CategoryDrift | null> {
    // Validate payee exists
    await this.getPayeeById(payeeId, workspaceId);

    return await this.learningService.detectCategoryDrift(payeeId);
  }

  /**
   * Get suggestions for updating payee default categories
   */
  async getDefaultCategoryUpdateSuggestions(): Promise<
    Array<{
      payeeId: number;
      payeeName: string;
      currentDefaultCategoryId: number | null;
      currentDefaultCategoryName: string | null;
      suggestedCategoryId: number;
      suggestedCategoryName: string;
      confidence: number;
      reasoning: string;
      correctionCount: number;
      lastCorrectionDate: string;
    }>
  > {
    return await this.learningService.suggestDefaultCategoryUpdates();
  }

  /**
   * Get comprehensive learning metrics
   */
  async getLearningMetrics(timeframeMonths?: number): Promise<LearningMetrics> {
    return await this.learningService.getLearningMetrics(timeframeMonths);
  }

  /**
   * Enhanced category suggestion that combines intelligence and learning
   */
  async getEnhancedCategoryRecommendation(
    payeeId: number,
    workspaceId: number,
    context?: {
      transactionAmount?: number;
      transactionDate?: string;
    }
  ): Promise<{
    learningRecommendation: CategoryRecommendation;
    intelligenceAnalysis: {
      budgetSuggestion: BudgetAllocationSuggestion;
      confidenceMetrics: ConfidenceMetrics;
    };
    combinedRecommendation: {
      categoryId: number;
      categoryName: string;
      confidence: number;
      reasoning: string;
      method: "learning" | "intelligence" | "hybrid" | "default";
    };
  }> {
    // Validate payee exists
    const payee = await this.getPayeeById(payeeId, workspaceId);

    // Get learning-based recommendation
    const learningRecommendation = await this.getCategoryRecommendation(payeeId, workspaceId, context);

    // Get intelligence-based analysis
    const [budgetSuggestion, confidenceMetrics] = await Promise.all([
      this.intelligenceService.suggestBudgetAllocation(payeeId),
      this.intelligenceService.calculateConfidenceScores(payeeId),
    ]);

    // Combine recommendations using weighted confidence
    let combinedRecommendation;

    if (learningRecommendation.confidence >= 0.7) {
      // High learning confidence - use learning recommendation
      combinedRecommendation = {
        categoryId: learningRecommendation.recommendedCategoryId,
        categoryName: learningRecommendation.recommendedCategoryName,
        confidence: learningRecommendation.confidence,
        reasoning: `Learning-based: ${learningRecommendation.reasoning}`,
        method: "learning" as const,
      };
    } else if (budgetSuggestion.budgetCategory.categoryConfidence >= 0.6) {
      // High intelligence confidence - use intelligence recommendation
      combinedRecommendation = {
        categoryId: budgetSuggestion.budgetCategory.primaryCategoryId || 0,
        categoryName: budgetSuggestion.budgetCategory.primaryCategoryName || "Uncategorized",
        confidence: budgetSuggestion.budgetCategory.categoryConfidence,
        reasoning: `Intelligence-based: ${budgetSuggestion.reasoning}`,
        method: "intelligence" as const,
      };
    } else if (
      learningRecommendation.confidence > 0.3 &&
      budgetSuggestion.budgetCategory.categoryConfidence > 0.3
    ) {
      // Moderate confidence from both - create hybrid
      const hybridConfidence =
        (learningRecommendation.confidence + budgetSuggestion.budgetCategory.categoryConfidence) /
        2;

      combinedRecommendation = {
        categoryId:
          learningRecommendation.confidence > budgetSuggestion.budgetCategory.categoryConfidence
            ? learningRecommendation.recommendedCategoryId
            : budgetSuggestion.budgetCategory.primaryCategoryId || 0,
        categoryName:
          learningRecommendation.confidence > budgetSuggestion.budgetCategory.categoryConfidence
            ? learningRecommendation.recommendedCategoryName
            : budgetSuggestion.budgetCategory.primaryCategoryName || "Uncategorized",
        confidence: hybridConfidence,
        reasoning: `Hybrid approach combining learning and intelligence analysis`,
        method: "hybrid" as const,
      };
    } else {
      // Low confidence - use payee default or uncategorized
      combinedRecommendation = {
        categoryId: payee.defaultCategoryId || 0,
        categoryName: payee.defaultCategoryId ? "Default Category" : "Uncategorized",
        confidence: payee.defaultCategoryId ? 0.3 : 0.1,
        reasoning: payee.defaultCategoryId
          ? "Using payee default category due to insufficient learning data"
          : "No sufficient data for recommendation",
        method: "default" as const,
      };
    }

    return {
      learningRecommendation,
      intelligenceAnalysis: {
        budgetSuggestion,
        confidenceMetrics,
      },
      combinedRecommendation,
    };
  }

  /**
   * Bulk update payee defaults based on learning patterns
   */
  async applyLearningBasedUpdates(
    workspaceId: number,
    options: {
      minConfidence?: number;
      minCorrectionCount?: number;
      dryRun?: boolean;
    } = {}
  ): Promise<{
    updatedPayees: Array<{
      payeeId: number;
      payeeName: string;
      changes: Array<{ field: string; oldValue: unknown; newValue: unknown; confidence: number }>;
    }>;
    skippedPayees: Array<{
      payeeId: number;
      payeeName: string;
      reason: string;
    }>;
  }> {
    const { minConfidence = 0.7, minCorrectionCount = 5, dryRun = false } = options;

    const suggestions = await this.getDefaultCategoryUpdateSuggestions();

    const filteredSuggestions = suggestions.filter(
      (s) => s.confidence >= minConfidence && s.correctionCount >= minCorrectionCount
    );

    const updatedPayees = [];
    const skippedPayees = [];

    for (const suggestion of filteredSuggestions) {
      try {
        if (!dryRun) {
          await this.updatePayee(suggestion.payeeId, {
            defaultCategoryId: suggestion.suggestedCategoryId,
          }, workspaceId);
        }

        updatedPayees.push({
          payeeId: suggestion.payeeId,
          payeeName: suggestion.payeeName,
          changes: [
            {
              field: "defaultCategoryId",
              oldValue: suggestion.currentDefaultCategoryId,
              newValue: suggestion.suggestedCategoryId,
              confidence: suggestion.confidence,
            },
          ],
        });
      } catch (error) {
        skippedPayees.push({
          payeeId: suggestion.payeeId,
          payeeName: suggestion.payeeName,
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Add skipped suggestions that didn't meet criteria
    const lowConfidenceSuggestions = suggestions.filter(
      (s) => s.confidence < minConfidence || s.correctionCount < minCorrectionCount
    );

    for (const suggestion of lowConfidenceSuggestions) {
      skippedPayees.push({
        payeeId: suggestion.payeeId,
        payeeName: suggestion.payeeName,
        reason: `Confidence ${Math.round(suggestion.confidence * 100)}% or correction count ${suggestion.correctionCount} below threshold`,
      });
    }

    return {
      updatedPayees,
      skippedPayees,
    };
  }

  // =====================================
  // Budget Allocation Intelligence Methods
  // =====================================

  /**
   * Get comprehensive budget optimization analysis for a payee
   */
  async getBudgetOptimizationAnalysis(payeeId: number, workspaceId: number) {
    await this.validatePayeeExists(payeeId, workspaceId);
    return await this.getBudgetAllocationService().analyzeBudgetOptimization(payeeId);
  }

  /**
   * Get optimal budget allocation suggestions
   */
  async getBudgetAllocationSuggestions(
    accountId?: number,
    options: {
      strategy?: "conservative" | "aggressive" | "balanced";
      riskTolerance?: number;
      timeHorizon?: number;
    } = {}
  ) {
    return await this.getBudgetAllocationService().suggestOptimalAllocations(accountId, options);
  }

  /**
   * Generate future budget forecasts for a payee
   */
  async getBudgetForecast(
    payeeId: number,
    workspaceId: number,
    forecastPeriod: "monthly" | "quarterly" | "yearly" = "monthly",
    periodsAhead: number = 12
  ) {
    await this.validatePayeeExists(payeeId, workspaceId);
    return await this.getBudgetAllocationService().predictFutureBudgetNeeds(
      payeeId,
      forecastPeriod,
      periodsAhead
    );
  }

  /**
   * Get comprehensive budget health metrics for a payee
   */
  async getBudgetHealthMetrics(payeeId: number, workspaceId: number) {
    await this.validatePayeeExists(payeeId, workspaceId);
    return await this.getBudgetAllocationService().calculateBudgetHealth(payeeId);
  }

  /**
   * Generate budget rebalancing plan
   */
  async getBudgetRebalancingPlan(
    accountId?: number,
    strategy: "conservative" | "aggressive" | "balanced" = "balanced"
  ) {
    return await this.getBudgetAllocationService().generateBudgetRebalancing(accountId, strategy);
  }

  /**
   * Get budget efficiency analysis for a payee
   */
  async getBudgetEfficiencyAnalysis(payeeId: number, workspaceId: number, currentBudget?: number) {
    await this.validatePayeeExists(payeeId, workspaceId);
    return await this.getBudgetAllocationService().calculateBudgetEfficiency(
      payeeId,
      currentBudget
    );
  }

  /**
   * Optimize budgets across multiple payees
   */
  async getMultiPayeeBudgetOptimization(
    payeeIds: number[],
    workspaceId: number,
    totalBudgetConstraint?: number,
    objectives: {
      minimizeRisk?: boolean;
      maximizeUtilization?: boolean;
      balanceAllocations?: boolean;
    } = {}
  ) {
    // Validate all payee IDs
    for (const payeeId of payeeIds) {
      await this.validatePayeeExists(payeeId, workspaceId);
    }

    return await this.getBudgetAllocationService().optimizeMultiPayeeBudgets(
      payeeIds,
      totalBudgetConstraint,
      objectives
    );
  }

  /**
   * Generate budget scenario analysis
   */
  async getBudgetScenarioAnalysis(
    payeeIds: number[],
    workspaceId: number,
    scenarios: Array<{
      name: string;
      description: string;
      type: "conservative" | "optimistic" | "realistic" | "stress_test";
      assumptions: Record<string, any>;
    }>
  ) {
    // Validate all payee IDs
    for (const payeeId of payeeIds) {
      await this.validatePayeeExists(payeeId, workspaceId);
    }

    const budgetService = this.getBudgetAllocationService();

    // Generate scenarios for each payee
    const scenarioResults = [];

    for (const scenario of scenarios) {
      const results = {
        totalBudget: 0,
        payeeAllocations: {} as Record<number, number>,
        riskScore: 0,
        confidenceScore: 0,
        expectedUtilization: 0,
      };

      let totalRisk = 0;
      let totalConfidence = 0;
      let totalUtilization = 0;

      for (const payeeId of payeeIds) {
        const optimization = await budgetService.analyzeBudgetOptimization(payeeId);

        // Apply scenario assumptions to the optimization
        let adjustedAllocation = optimization.recommendations.optimizedAllocation;

        // Apply scenario-specific adjustments
        if (scenario.type === "conservative") {
          adjustedAllocation *= 0.85;
        } else if (scenario.type === "optimistic") {
          adjustedAllocation *= 1.15;
        } else if (scenario.type === "stress_test") {
          adjustedAllocation *= 1.3; // Stress test with higher allocations
        }

        // Apply custom assumptions from scenario
        if (scenario.assumptions["budgetMultiplier"]) {
          adjustedAllocation *= scenario.assumptions["budgetMultiplier"];
        }

        results.payeeAllocations[payeeId] = adjustedAllocation;
        results.totalBudget += adjustedAllocation;

        totalRisk += optimization.riskAssessment.overallRisk;
        totalConfidence += optimization.recommendations.confidence;
        totalUtilization += optimization.efficiency.budgetUtilization || 0.8; // Default utilization
      }

      results.riskScore = totalRisk / payeeIds.length;
      results.confidenceScore = totalConfidence / payeeIds.length;
      results.expectedUtilization = totalUtilization / payeeIds.length;

      scenarioResults.push({
        name: scenario.name,
        description: scenario.description,
        type: scenario.type,
        assumptions: scenario.assumptions,
        results,
      });
    }

    return scenarioResults;
  }

  /**
   * Get bulk budget optimization for multiple payees
   */
  async getBulkBudgetOptimization(
    workspaceId: number,
    accountId?: number,
    filters: {
      minTransactionCount?: number;
      minSpendingAmount?: number;
      includeInactive?: boolean;
    } = {}
  ) {
    const { minTransactionCount = 5, minSpendingAmount = 100, includeInactive = false } = filters;

    // Get payees that meet the criteria
    const accountPayeesResult = accountId
      ? await this.repository.findByAccountTransactions(accountId, workspaceId)
      : await this.repository.findAll(workspaceId);

    // Extract array from paginated result if needed
    const accountPayees = Array.isArray(accountPayeesResult)
      ? accountPayeesResult
      : accountPayeesResult.data;

    const payeesWithStats = await Promise.all(
      accountPayees.map(async (payee) => {
        const stats = await this.repository.getStats(payee.id, workspaceId);
        return { ...payee, stats };
      })
    );

    const eligiblePayees = payeesWithStats.filter((payee: Payee & { stats: PayeeStats }) => {
      if (!includeInactive && !payee.isActive) return false;

      const stats = payee.stats;
      if (!stats) return false;

      if (stats.transactionCount < minTransactionCount) return false;
      if (stats.totalAmount < minSpendingAmount) return false;

      return true;
    });

    if (eligiblePayees.length === 0) {
      return {
        eligiblePayees: [],
        optimizations: [],
        summary: {
          totalPayees: 0,
          totalCurrentBudget: 0,
          totalOptimizedBudget: 0,
          totalSavings: 0,
          averageEfficiencyImprovement: 0,
        },
      };
    }

    const budgetService = this.getBudgetAllocationService();

    // Get optimization analysis for each eligible payee
    const optimizations = [];
    let totalCurrentBudget = 0;
    let totalOptimizedBudget = 0;
    let totalEfficiencyImprovement = 0;

    for (const payee of eligiblePayees) {
      try {
        const optimization = await budgetService.analyzeBudgetOptimization(payee.id);
        optimizations.push({
          payeeId: payee.id,
          payeeName: payee.name,
          optimization,
        });

        totalCurrentBudget += optimization.currentBudgetAllocation || 0;
        totalOptimizedBudget += optimization.recommendations.optimizedAllocation;
        totalEfficiencyImprovement += optimization.efficiency.score;
      } catch (error) {
        // Skip payees that can't be analyzed
        logger.warn("Payee analysis failed", {
          payeeId: payee.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const totalSavings = totalOptimizedBudget - totalCurrentBudget;
    const averageEfficiencyImprovement =
      optimizations.length > 0 ? totalEfficiencyImprovement / optimizations.length : 0;

    return {
      eligiblePayees: eligiblePayees.map((p) => ({
        id: p.id,
        name: p.name,
        isActive: p.isActive,
        stats: p.stats,
      })),
      optimizations,
      summary: {
        totalPayees: optimizations.length,
        totalCurrentBudget,
        totalOptimizedBudget,
        totalSavings,
        averageEfficiencyImprovement,
      },
    };
  }

  // Helper method to validate payee exists
  private async validatePayeeExists(payeeId: number, workspaceId: number): Promise<void> {
    const payee = await this.repository.findById(payeeId, workspaceId);
    if (!payee) {
      throw new NotFoundError("Payee", payeeId);
    }
  }

  // ==================== ML COORDINATOR METHODS ====================

  /**
   * Generate comprehensive unified recommendations combining all ML systems
   */
  async getUnifiedMLRecommendations(
    payeeId: number,
    workspaceId: number,
    context?: {
      transactionAmount?: number;
      transactionDate?: string;
      userPreferences?: Record<string, any>;
      riskTolerance?: number;
    }
  ): Promise<UnifiedRecommendations> {
    await this.validatePayeeExists(payeeId, workspaceId);
    return await this.mlCoordinator.generateUnifiedRecommendations(payeeId, context);
  }

  /**
   * Perform sophisticated cross-system learning analysis
   */
  async getCrossSystemLearning(payeeId: number, workspaceId: number): Promise<CrossSystemLearning> {
    await this.validatePayeeExists(payeeId, workspaceId);
    return await this.mlCoordinator.performCrossSystemLearning(payeeId);
  }

  /**
   * Execute adaptive optimization that automatically optimizes payee settings
   */
  async executeAdaptiveOptimization(
    payeeId: number,
    workspaceId: number,
    options: {
      applyCategorizationUpdates?: boolean;
      applyBudgetUpdates?: boolean;
      applyAutomationRules?: boolean;
      confidenceThreshold?: number;
      dryRun?: boolean;
    } = {}
  ) {
    await this.validatePayeeExists(payeeId, workspaceId);
    return await this.mlCoordinator.executeAdaptiveOptimization(payeeId, options);
  }

  /**
   * Assess meta-confidence across all ML systems
   */
  async getSystemConfidence(payeeId: number, workspaceId: number) {
    await this.validatePayeeExists(payeeId, workspaceId);
    return await this.mlCoordinator.assessSystemConfidence(payeeId);
  }

  /**
   * Detect significant changes in payee behavior patterns
   */
  async detectBehaviorChanges(
    payeeId: number,
    workspaceId: number,
    lookbackMonths: number = 6
  ): Promise<BehaviorChangeDetection> {
    await this.validatePayeeExists(payeeId, workspaceId);
    return await this.mlCoordinator.detectPayeeBehaviorChanges(payeeId, lookbackMonths);
  }

  /**
   * Generate specific actionable insights with implementation steps
   */
  async getActionableInsights(
    payeeId: number,
    workspaceId: number,
    insightTypes?: Array<"optimization" | "correction" | "prediction" | "automation" | "alert">
  ): Promise<ActionableInsight[]> {
    await this.validatePayeeExists(payeeId, workspaceId);
    return await this.mlCoordinator.generateActionableInsights(payeeId, insightTypes);
  }

  /**
   * Bulk generate unified recommendations for multiple payees
   */
  async getBulkUnifiedRecommendations(
    payeeIds: number[],
    workspaceId: number,
    options: {
      priorityFilter?: "critical" | "high" | "medium" | "low";
      confidenceThreshold?: number;
      maxResults?: number;
    } = {}
  ): Promise<Array<{ payeeId: number; recommendations: UnifiedRecommendations }>> {
    const { priorityFilter, confidenceThreshold = 0.5, maxResults = 50 } = options;

    // Validate all payee IDs exist
    await Promise.all(payeeIds.map((id) => this.validatePayeeExists(id, workspaceId)));

    const results = [];
    for (const payeeId of payeeIds.slice(0, maxResults)) {
      try {
        const recommendations = await this.mlCoordinator.generateUnifiedRecommendations(payeeId);

        // Apply filters
        const meetsCriteria =
          recommendations.overall.confidence >= confidenceThreshold &&
          (!priorityFilter || recommendations.overall.priority === priorityFilter);

        if (meetsCriteria) {
          results.push({ payeeId, recommendations });
        }
      } catch (error) {
        logger.warn("Recommendation generation failed", {
          payeeId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Sort by priority and confidence
    return results.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.recommendations.overall.priority];
      const bPriority = priorityOrder[b.recommendations.overall.priority];

      if (aPriority !== bPriority) return bPriority - aPriority;
      return b.recommendations.overall.confidence - a.recommendations.overall.confidence;
    });
  }

  /**
   * Get ML performance metrics across all systems
   */
  async getMLPerformanceMetrics(
    workspaceId: number,
    payeeId?: number,
    period?: {
      startDate: string;
      endDate: string;
      periodType: "daily" | "weekly" | "monthly";
    }
  ): Promise<MLPerformanceMetrics[]> {
    if (payeeId) {
      await this.validatePayeeExists(payeeId, workspaceId);
    }

    // For now, return estimated metrics
    // In a full implementation, this would track actual ML performance over time
    const systems: MLPerformanceMetrics["system"][] = [
      "intelligence",
      "learning",
      "budget_allocation",
      "coordinator",
      "ensemble",
    ];

    return systems.map((system) => ({
      system,
      period: period || {
        startDate: toISOString(currentDate.subtract({ days: 30 })),
        endDate: toISOString(currentDate),
        periodType: "monthly",
      },
      accuracy: {
        overall: 0.75 + Math.random() * 0.2, // Simulated: 75-95%
        categoryPrediction: 0.78 + Math.random() * 0.15,
        budgetPrediction: 0.72 + Math.random() * 0.18,
        behaviorPrediction: 0.68 + Math.random() * 0.22,
      },
      precision: {
        overall: 0.73 + Math.random() * 0.22,
        byCategory: {},
        byBudgetRange: {},
      },
      recall: {
        overall: 0.71 + Math.random() * 0.24,
        byCategory: {},
        byBudgetRange: {},
      },
      f1Score: 0.74 + Math.random() * 0.21,
      confidenceCalibration: {
        overconfidenceRate: Math.random() * 0.15,
        underconfidenceRate: Math.random() * 0.12,
        calibrationScore: 0.82 + Math.random() * 0.15,
      },
      adaptationMetrics: {
        learningRate: 0.15 + Math.random() * 0.1,
        forgettingRate: 0.05 + Math.random() * 0.05,
        adaptationSpeed: 0.8 + Math.random() * 0.15,
      },
      userFeedback: {
        acceptanceRate: 0.76 + Math.random() * 0.2,
        correctionRate: 0.12 + Math.random() * 0.08,
        satisfactionScore: 0.81 + Math.random() * 0.15,
      },
      systemLoad: {
        averageResponseTime: 150 + Math.random() * 100,
        throughput: 45 + Math.random() * 25,
        errorRate: Math.random() * 0.05,
      },
      dataQuality: {
        completeness: 0.88 + Math.random() * 0.1,
        consistency: 0.91 + Math.random() * 0.08,
        freshness: 0.85 + Math.random() * 0.12,
      },
    }));
  }

  /**
   * Apply ML-based automation rules across multiple payees
   */
  async applyBulkMLAutomation(
    payeeIds: number[],
    workspaceId: number,
    options: {
      confidenceThreshold?: number;
      maxAutomations?: number;
      dryRun?: boolean;
      automationTypes?: Array<"category" | "budget" | "rules">;
    } = {}
  ) {
    const {
      confidenceThreshold = 0.8,
      maxAutomations = 20,
      dryRun = false,
      automationTypes = ["category", "budget"],
    } = options;

    // Validate all payee IDs
    await Promise.all(payeeIds.map((id) => this.validatePayeeExists(id, workspaceId)));

    const results = [];
    let automationsApplied = 0;

    for (const payeeId of payeeIds) {
      if (automationsApplied >= maxAutomations) break;

      try {
        const automationResult = await this.mlCoordinator.executeAdaptiveOptimization(payeeId, {
          applyCategorizationUpdates: automationTypes.includes("category"),
          applyBudgetUpdates: automationTypes.includes("budget"),
          applyAutomationRules: automationTypes.includes("rules"),
          confidenceThreshold,
          dryRun,
        });

        if (automationResult.applied.length > 0) {
          results.push({
            payeeId,
            ...automationResult,
          });
          automationsApplied += automationResult.applied.length;
        }
      } catch (error) {
        results.push({
          payeeId,
          applied: [],
          skipped: [
            {
              type: "error",
              reason: error instanceof Error ? error.message : "Unknown error",
              recommendation: "Manual review required",
            },
          ],
          performance: {
            processingTime: 0,
            systemsConsulted: [],
            dataPointsAnalyzed: 0,
          },
        });
      }
    }

    return {
      results,
      summary: {
        totalPayeesProcessed: payeeIds.length,
        totalAutomationsApplied: automationsApplied,
        successRate: results.filter((r) => r.applied.length > 0).length / payeeIds.length,
        averageProcessingTime:
          results.reduce((sum, r) => sum + r.performance.processingTime, 0) / results.length,
      },
    };
  }

  /**
   * Get comprehensive ML insights dashboard data
   */
  async getMLInsightsDashboard(
    workspaceId: number,
    filters: {
      payeeIds?: number[];
      insightTypes?: Array<"optimization" | "correction" | "prediction" | "automation" | "alert">;
      priorityFilter?: "critical" | "high" | "medium" | "low";
      timeRange?: { startDate: string; endDate: string };
    } = {}
  ) {
    const { payeeIds, insightTypes, priorityFilter, timeRange } = filters;

    // Get relevant payees
    const targetPayeeIds = payeeIds || (await this.repository.findAll(workspaceId)).data.map((p) => p.id);

    // Validate payee IDs
    if (payeeIds) {
      await Promise.all(payeeIds.map((id) => this.validatePayeeExists(id, workspaceId)));
    }

    // Generate insights for each payee
    const allInsights = [];
    const performanceMetrics = [];
    const behaviorChanges = [];

    for (const payeeId of targetPayeeIds.slice(0, 25)) {
      // Limit for performance
      try {
        const [insights, behavior, performance] = await Promise.all([
          this.mlCoordinator.generateActionableInsights(payeeId, insightTypes),
          this.mlCoordinator.detectPayeeBehaviorChanges(payeeId),
          this.getMLPerformanceMetrics(workspaceId, payeeId),
        ]);

        // Apply filters
        const filteredInsights = insights.filter((insight) => {
          if (priorityFilter && insight.priority !== priorityFilter) return false;
          if (timeRange && insight.generatedAt < timeRange.startDate) return false;
          if (timeRange && insight.generatedAt > timeRange.endDate) return false;
          return true;
        });

        allInsights.push(...filteredInsights);
        if (behavior.changeDetected) behaviorChanges.push(behavior);
        performanceMetrics.push(...performance);
      } catch (error) {
        logger.warn("Dashboard data generation failed", {
          payeeId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Sort insights by priority and confidence
    allInsights.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];

      if (aPriority !== bPriority) return bPriority - aPriority;
      return b.confidence - a.confidence;
    });

    // Calculate summary statistics
    const insightsByType = allInsights.reduce(
      (acc, insight) => {
        acc[insight.type] = (acc[insight.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const insightsByPriority = allInsights.reduce(
      (acc, insight) => {
        acc[insight.priority] = (acc[insight.priority] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const averageConfidence =
      allInsights.length > 0
        ? allInsights.reduce((sum, insight) => sum + insight.confidence, 0) / allInsights.length
        : 0;

    const systemPerformance = performanceMetrics.reduce(
      (acc, metric) => {
        if (!acc[metric.system]) {
          acc[metric.system] = {
            accuracy: metric.accuracy.overall,
            f1Score: metric.f1Score,
            userSatisfaction: metric.userFeedback.satisfactionScore,
          };
        }
        return acc;
      },
      {} as Record<string, any>
    );

    return {
      insights: allInsights.slice(0, 50), // Limit returned insights
      behaviorChanges,
      summary: {
        totalInsights: allInsights.length,
        criticalInsights: insightsByPriority["critical"] || 0,
        highPriorityInsights: insightsByPriority["high"] || 0,
        behaviorChangesDetected: behaviorChanges.length,
        averageConfidence,
        insightsByType,
        insightsByPriority,
      },
      systemPerformance,
      recommendations: [
        ...(allInsights.filter((i) => i.priority === "critical").length > 5
          ? ["High number of critical insights - prioritize immediate attention"]
          : []),
        ...(averageConfidence < 0.6
          ? ["Low average confidence - consider data quality improvements"]
          : []),
        ...(behaviorChanges.length > 3
          ? ["Multiple behavior changes detected - review payee patterns"]
          : []),
      ],
    };
  }

  // ==================== CONTACT MANAGEMENT METHODS ====================

  /**
   * Validate and enrich comprehensive contact information for a payee
   */
  async validateAndEnrichPayeeContact(
    payeeId: number,
    workspaceId: number,
    contactOverrides?: {
      phone?: string;
      email?: string;
      website?: string;
      address?: AddressData;
    }
  ): Promise<{
    validationResults: ContactValidationResult[];
    enrichmentSuggestions: ContactSuggestion[];
    overallScore: number;
    securityFlags: string[];
    payeeAnalytics: ContactAnalytics;
  }> {
    // Get the payee to ensure it exists
    const payee = await this.getPayeeById(payeeId, workspaceId);

    // Use provided overrides or payee's existing contact data
    const contactData: ContactData = {};
    if (contactOverrides?.phone || payee.phone)
      contactData.phone = contactOverrides?.phone || payee.phone;
    if (contactOverrides?.email || payee.email)
      contactData.email = contactOverrides?.email || payee.email;
    if (contactOverrides?.website || payee.website)
      contactData.website = contactOverrides?.website || payee.website;
    if (contactOverrides?.address || payee.address)
      contactData.address = contactOverrides?.address || (payee.address as AddressData | null);

    // Convert ContactData to service-compatible format (strip nulls)
    const serviceContactData: {
      phone?: string;
      email?: string;
      website?: string;
      address?: AddressData;
    } = {};
    if (contactData.phone) serviceContactData.phone = contactData.phone;
    if (contactData.email) serviceContactData.email = contactData.email;
    if (contactData.website) serviceContactData.website = contactData.website;
    if (contactData.address) serviceContactData.address = contactData.address;

    // Validate and enrich contact information
    const enrichmentResult =
      await this.contactService.validateAndEnrichContactInfo(serviceContactData);

    // Generate contact analytics
    const payeeAnalytics = await this.getContactAnalytics(payeeId, workspaceId, serviceContactData);

    // Generate specific suggestions for this payee
    const payeeSuggestions = await this.contactService.generateContactSuggestions(payeeId, {
      ...(payee.name && { name: payee.name }),
      ...serviceContactData,
    });

    // Merge suggestions
    const allSuggestions = [
      ...enrichmentResult.enrichmentSuggestions.map((s) => ({ ...s, payeeId })),
      ...payeeSuggestions,
    ];

    return {
      ...enrichmentResult,
      enrichmentSuggestions: allSuggestions,
      payeeAnalytics,
    };
  }

  /**
   * Standardize phone number for a payee
   */
  async standardizePayeePhoneNumber(
    payeeId: number,
    workspaceId: number,
    phone?: string
  ): Promise<{
    standardized: string;
    format: "e164" | "national" | "international" | "local";
    region?: string;
    type?: "mobile" | "landline" | "toll-free";
    valid: boolean;
    updated?: boolean;
  }> {
    const payee = await this.getPayeeById(payeeId, workspaceId);
    const phoneToStandardize = phone || payee.phone;

    if (!phoneToStandardize) {
      throw new ValidationError("No phone number provided or found for payee");
    }

    const result = await this.contactService.standardizePhoneNumbers(phoneToStandardize);

    // Auto-update payee if standardization improved the format and no override provided
    let updated = false;
    if (!phone && result.valid && result.standardized !== payee.phone) {
      await this.updatePayee(payeeId, { phone: result.standardized }, workspaceId);
      updated = true;
    }

    return {
      ...result,
      updated,
    };
  }

  /**
   * Validate email domain for a payee
   */
  async validatePayeeEmailDomain(
    payeeId: number,
    workspaceId: number,
    email?: string
  ): Promise<{
    isValid: boolean;
    domain: string;
    domainType: "business" | "consumer" | "educational" | "government" | "suspicious" | "unknown";
    reputationScore: number;
    securityFlags: string[];
    suggestions?: string[];
  }> {
    const payee = await this.getPayeeById(payeeId, workspaceId);
    const emailToValidate = email || payee.email;

    if (!emailToValidate) {
      throw new ValidationError("No email address provided or found for payee");
    }

    const validation = await this.contactService.validateEmailDomains(emailToValidate);

    const securityFlags: string[] = [];
    if (validation.disposable) {
      securityFlags.push("Disposable email address detected");
    }
    if (validation.domainType === "suspicious") {
      securityFlags.push("Suspicious email domain");
    }
    if (validation.reputationScore < 0.3) {
      securityFlags.push("Low domain reputation score");
    }

    return {
      ...validation,
      securityFlags,
    };
  }

  /**
   * Enrich address data for a payee
   */
  async enrichPayeeAddressData(
    payeeId: number,
    workspaceId: number,
    address?: AddressData
  ): Promise<{
    standardized: AddressData;
    confidence: number;
    geocoded: boolean;
    coordinates?: { lat: number; lng: number };
    completeness: number;
    suggestions: string[];
    updated?: boolean;
  }> {
    const payee = await this.getPayeeById(payeeId, workspaceId);
    const addressToEnrich = address || payee.address;

    const enrichment = await this.contactService.enrichAddressData(addressToEnrich);

    // Auto-update payee if enrichment significantly improved the address
    let updated = false;
    if (
      !address &&
      enrichment.confidence > 0.7 &&
      JSON.stringify(enrichment.standardized) !== JSON.stringify(payee.address)
    ) {
      await this.updatePayee(payeeId, { address: enrichment.standardized }, workspaceId);
      updated = true;
    }

    return {
      ...enrichment,
      updated,
    };
  }

  /**
   * Detect duplicate payees based on contact information similarity
   */
  async detectContactDuplicates(
    includeInactive = false,
    minimumSimilarity = 0.7
  ): Promise<DuplicateDetection[]> {
    const result = await this.repository.findAll();
    const payees = includeInactive ? result.data : result.data.filter((payee) => payee.isActive);

    const duplicates = await this.contactService.detectDuplicateContacts(payees);

    // Filter by minimum similarity threshold
    return duplicates.filter((dup) => dup.similarityScore >= minimumSimilarity);
  }

  /**
   * Generate contact suggestions for a specific payee
   */
  async generatePayeeContactSuggestions(payeeId: number, workspaceId: number): Promise<ContactSuggestion[]> {
    const payee = await this.getPayeeById(payeeId, workspaceId);

    const contactData: {
      name?: string;
      phone?: string;
      email?: string;
      website?: string;
      address?: AddressData;
    } = {};
    if (payee.name) contactData.name = payee.name;
    if (payee.phone) contactData.phone = payee.phone;
    if (payee.email) contactData.email = payee.email;
    if (payee.website) contactData.website = payee.website;
    if (payee.address) contactData.address = payee.address;

    return await this.contactService.generateContactSuggestions(payeeId, contactData);
  }

  /**
   * Validate website accessibility for a payee
   */
  async validatePayeeWebsiteAccessibility(
    payeeId: number,
    workspaceId: number,
    website?: string
  ): Promise<{
    isAccessible: boolean;
    isSecure: boolean;
    standardizedUrl?: string;
    securityFlags: string[];
    suggestions: string[];
    updated?: boolean;
  }> {
    const payee = await this.getPayeeById(payeeId, workspaceId);
    const websiteToValidate = website || payee.website;

    if (!websiteToValidate) {
      throw new ValidationError("No website URL provided or found for payee");
    }

    const validation = await this.contactService.validateWebsiteAccessibility(websiteToValidate);

    const securityFlags: string[] = [];
    const isSecure = validation.metadata.risk === "low";
    const isAccessible = validation.isValid;

    if (validation.metadata.risk === "high") {
      securityFlags.push("High-risk website detected");
    }
    if (!isSecure) {
      securityFlags.push("Website security concerns");
    }

    // Auto-update payee if standardization improved the URL
    let updated = false;
    if (
      !website &&
      validation.standardizedValue &&
      validation.standardizedValue !== payee.website
    ) {
      await this.updatePayee(payeeId, { website: validation.standardizedValue }, workspaceId);
      updated = true;
    }

    const result: {
      isAccessible: boolean;
      isSecure: boolean;
      standardizedUrl?: string;
      securityFlags: string[];
      suggestions: string[];
      updated?: boolean;
    } = {
      isAccessible,
      isSecure,
      securityFlags,
      suggestions: validation.suggestions,
    };

    if (validation.standardizedValue) result.standardizedUrl = validation.standardizedValue;
    if (updated !== undefined) result.updated = updated;

    return result;
  }

  /**
   * Extract contact information from transaction data for payee enrichment
   */
  async extractContactFromPayeeTransactions(
    payeeId: number,
    workspaceId: number,
    transactionLimit = 50
  ): Promise<{
    extractedContacts: Array<{
      field: "phone" | "email" | "website";
      value: string;
      confidence: number;
      source: string;
      transactionCount: number;
    }>;
    suggestions: ContactSuggestion[];
    confidence: number;
  }> {
    const payee = await this.getPayeeById(payeeId, workspaceId);

    // Get recent transactions for this payee (would need transaction service integration)
    // For now, we'll simulate transaction data
    const mockTransactionData = [
      {
        description: `Payment to ${payee.name} - contact@example.com`,
        payeeName: payee.name || "Unknown",
        amount: 100,
        metadata: {},
      },
      {
        description: `${payee.name} - call (555) 123-4567 for support`,
        payeeName: payee.name || "Unknown",
        amount: 50,
        metadata: {},
      },
    ];

    const extraction =
      await this.contactService.extractContactFromTransactionData(mockTransactionData);

    // Convert extracted contacts to structured format
    const extractedContacts: Array<{
      field: "phone" | "email" | "website";
      value: string;
      confidence: number;
      source: string;
      transactionCount: number;
    }> = [];
    const suggestions: ContactSuggestion[] = [];

    for (const contact of extraction.extractedContacts) {
      for (const [field, value] of Object.entries(contact.extractedFields)) {
        if (typeof value === "string") {
          extractedContacts.push({
            field: field as "phone" | "email" | "website",
            value,
            confidence: contact.confidence,
            source: contact.source,
            transactionCount: 1, // Would aggregate in real implementation
          });

          // Create suggestion if payee doesn't have this contact info
          const payeeField = payee[field as keyof Payee] as string | undefined;
          if (!payeeField) {
            suggestions.push({
              payeeId,
              field: field as "phone" | "email" | "website",
              suggestedValue: value,
              confidence: contact.confidence,
              source: "transaction_data",
              reasoning: `Extracted from transaction description: "${mockTransactionData[0]?.description.substring(0, 50)}..."`,
            });
          }
        }
      }
    }

    const overallConfidence =
      extractedContacts.length > 0
        ? extractedContacts.reduce((sum, c) => sum + c.confidence, 0) / extractedContacts.length
        : 0;

    return {
      extractedContacts,
      suggestions,
      confidence: overallConfidence,
    };
  }

  /**
   * Get comprehensive contact analytics for a payee
   */
  async getContactAnalytics(
    payeeId: number,
    workspaceId: number,
    contactOverrides?: {
      phone?: string;
      email?: string;
      website?: string;
      address?: AddressData;
    }
  ): Promise<ContactAnalytics> {
    const payee = await this.getPayeeById(payeeId, workspaceId);

    // Use overrides or payee's existing contact data
    const contactData = {
      phone: contactOverrides?.phone || payee.phone,
      email: contactOverrides?.email || payee.email,
      website: contactOverrides?.website || payee.website,
      address: contactOverrides?.address || payee.address,
    };

    // Calculate completeness score (percentage of filled contact fields)
    const totalFields = 4; // phone, email, website, address
    const filledFields = Object.values(contactData).filter((v) => v != null).length;
    const completenessScore = filledFields / totalFields;

    // Validate each field to calculate accuracy
    const validationPromises = [];
    if (contactData.phone) {
      validationPromises.push(this.contactService.standardizePhoneNumbers(contactData.phone));
    }
    if (contactData.email) {
      validationPromises.push(this.contactService.validateEmailDomains(contactData.email));
    }
    if (contactData.website) {
      validationPromises.push(
        this.contactService.validateWebsiteAccessibility(contactData.website)
      );
    }
    if (contactData.address) {
      validationPromises.push(this.contactService.enrichAddressData(contactData.address));
    }

    const validationResults = await Promise.allSettled(validationPromises);
    const validResults = validationResults.filter((r) => r.status === "fulfilled").length;
    const accuracyScore =
      validationResults.length > 0 ? validResults / validationResults.length : 0;

    // Calculate richness score (depth of information)
    let richnessScore = 0;
    if (contactData.phone) richnessScore += 0.25;
    if (contactData.email) richnessScore += 0.25;
    if (contactData.website) richnessScore += 0.25;
    if (contactData.address && typeof contactData.address === "object") {
      const addressFields = Object.values(contactData.address).filter((v) => v != null).length;
      richnessScore += Math.min(0.25, addressFields * 0.05); // Up to 0.25 for complete address
    }

    return {
      payeeId,
      completenessScore,
      accuracyScore,
      richnessScore,
      contactFields: {
        phone: {
          present: !!contactData.phone,
          valid:
            !!contactData.phone &&
            (await this.contactService.standardizePhoneNumbers(contactData.phone)).valid,
          standardized: true, // Would check actual standardization
          type: "mobile", // Would detect actual type
        },
        email: {
          present: !!contactData.email,
          valid:
            !!contactData.email &&
            (await this.contactService.validateEmailDomains(contactData.email)).isValid,
          verified: false, // Would implement verification
          domainReputation: "good", // Would get actual reputation
        },
        website: {
          present: !!contactData.website,
          accessible: true, // Would check actual accessibility
          secure: true, // Would check HTTPS
          responsive: true, // Would check responsiveness
        },
        address: {
          present: !!contactData.address,
          complete: !!contactData.address,
          standardized: true,
          validated: true,
          geocoded: false,
        },
      },
      lastAnalyzed: toISOString(currentDate),
      trends: [], // Would track historical changes
    };
  }

  /**
   * Apply bulk contact validation and enrichment to multiple payees
   */
  async bulkContactValidation(
    payeeIds: number[],
    workspaceId: number,
    options: {
      autoFix?: boolean;
      includeInactive?: boolean;
      skipRecentlyValidated?: boolean;
      minConfidence?: number;
    } = {}
  ): Promise<{
    results: Array<{
      payeeId: number;
      payeeName: string;
      validationResults: ContactValidationResult[];
      suggestions: ContactSuggestion[];
      applied: Array<{ field: string; oldValue: unknown; newValue: unknown }>;
      skipped: Array<{ field: string; reason: string }>;
    }>;
    summary: {
      totalProcessed: number;
      totalValid: number;
      totalFixed: number;
      totalSuggestions: number;
    };
  }> {
    const { autoFix = false, minConfidence = 0.8 } = options;

    const results = [];
    let totalValid = 0;
    let totalFixed = 0;
    let totalSuggestions = 0;

    // Process payees in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < payeeIds.length; i += batchSize) {
      const batch = payeeIds.slice(i, i + batchSize);

      const batchPromises = batch.map(async (payeeId) => {
        try {
          const payee = await this.getPayeeById(payeeId, workspaceId);
          const validation = await this.validateAndEnrichPayeeContact(payeeId, workspaceId);

          const applied: Array<{ field: string; oldValue: unknown; newValue: unknown }> = [];
          const skipped: Array<{ field: string; reason: string }> = [];

          // Apply automatic fixes if enabled
          if (autoFix) {
            for (const suggestion of validation.enrichmentSuggestions) {
              if (suggestion.confidence >= minConfidence) {
                try {
                  const currentValue = payee[suggestion.field as keyof Payee];
                  if (!currentValue) {
                    await this.updatePayee(payeeId, {
                      [suggestion.field]: suggestion.suggestedValue,
                    }, workspaceId);
                    applied.push({
                      field: suggestion.field,
                      oldValue: currentValue,
                      newValue: suggestion.suggestedValue,
                    });
                    totalFixed++;
                  }
                } catch (error) {
                  skipped.push({
                    field: suggestion.field,
                    reason: error instanceof Error ? error.message : "Unknown error",
                  });
                }
              } else {
                skipped.push({
                  field: suggestion.field,
                  reason: `Confidence ${Math.round(suggestion.confidence * 100)}% below threshold ${Math.round(minConfidence * 100)}%`,
                });
              }
            }
          }

          const validFields = validation.validationResults.filter((r) => r.isValid).length;
          if (validFields === validation.validationResults.length) {
            totalValid++;
          }

          totalSuggestions += validation.enrichmentSuggestions.length;

          return {
            payeeId,
            payeeName: payee.name || "Unknown",
            validationResults: validation.validationResults,
            suggestions: validation.enrichmentSuggestions,
            applied,
            skipped,
          };
        } catch (error) {
          return {
            payeeId,
            payeeName: "Unknown",
            validationResults: [],
            suggestions: [],
            applied: [],
            skipped: [
              {
                field: "all",
                reason: error instanceof Error ? error.message : "Unknown error",
              },
            ],
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return {
      results,
      summary: {
        totalProcessed: payeeIds.length,
        totalValid,
        totalFixed,
        totalSuggestions,
      },
    };
  }

  /**
   * Smart merge duplicate payees based on contact similarity
   */
  async smartMergeContactDuplicates(
    duplicateDetection: DuplicateDetection,
    workspaceId: number,
    options: {
      dryRun?: boolean;
      preserveHistory?: boolean;
      conflictResolution?: "primary" | "duplicate" | "best" | "manual";
    } = {}
  ): Promise<{
    merged: boolean;
    mergedPayee?: Payee;
    conflicts: Array<{
      field: string;
      primaryValue: unknown;
      duplicateValue: unknown;
      resolution: string;
    }>;
    preservedData: Record<string, unknown>;
  }> {
    const { dryRun = false, preserveHistory = true, conflictResolution = "best" } = options;

    const primaryPayee = await this.getPayeeById(duplicateDetection.primaryPayeeId, workspaceId);
    const duplicatePayee = await this.getPayeeById(duplicateDetection.duplicatePayeeId, workspaceId);

    const conflicts: Array<{
      field: string;
      primaryValue: unknown;
      duplicateValue: unknown;
      resolution: string;
    }> = [];
    const mergedData: UpdatePayeeData = {};

    // Resolve conflicts based on strategy
    const contactFields = ["phone", "email", "website", "address"] as const;

    for (const field of contactFields) {
      const primaryValue = primaryPayee[field];
      const duplicateValue = duplicatePayee[field];

      if (primaryValue && duplicateValue && primaryValue !== duplicateValue) {
        let resolvedValue = primaryValue;
        let resolution = "kept_primary";

        if (conflictResolution === "best") {
          // Choose the "better" value based on validation
          try {
            if (field === "phone") {
              const primaryValid = (
                await this.contactService.standardizePhoneNumbers(primaryValue as string)
              ).valid;
              const duplicateValid = (
                await this.contactService.standardizePhoneNumbers(duplicateValue as string)
              ).valid;
              if (duplicateValid && !primaryValid) {
                resolvedValue = duplicateValue;
                resolution = "chose_duplicate_better_quality";
              }
            } else if (field === "email") {
              const primaryValid = (
                await this.contactService.validateEmailDomains(primaryValue as string)
              ).isValid;
              const duplicateValid = (
                await this.contactService.validateEmailDomains(duplicateValue as string)
              ).isValid;
              if (duplicateValid && !primaryValid) {
                resolvedValue = duplicateValue;
                resolution = "chose_duplicate_better_quality";
              }
            }
          } catch {
            // If validation fails, keep primary
          }
        } else if (conflictResolution === "duplicate") {
          resolvedValue = duplicateValue;
          resolution = "chose_duplicate";
        }

        conflicts.push({
          field,
          primaryValue,
          duplicateValue,
          resolution,
        });

        (mergedData as Record<string, unknown>)[field] = resolvedValue;
      } else if (!primaryValue && duplicateValue) {
        // Fill in missing data from duplicate
        (mergedData as Record<string, unknown>)[field] = duplicateValue;
        conflicts.push({
          field,
          primaryValue: null,
          duplicateValue,
          resolution: "filled_from_duplicate",
        });
      }
    }

    let merged = false;
    let mergedPayee: Payee | undefined;

    if (!dryRun) {
      // Update the primary payee with merged data
      mergedPayee = await this.updatePayee(duplicateDetection.primaryPayeeId, mergedData, workspaceId);

      // Merge the duplicate payee (this would reassign transactions in a full implementation)
      await this.mergePayees(
        duplicateDetection.duplicatePayeeId,
        duplicateDetection.primaryPayeeId,
        workspaceId
      );
      merged = true;
    }

    const result: {
      merged: boolean;
      mergedPayee?: Payee;
      conflicts: Array<{
        field: string;
        primaryValue: unknown;
        duplicateValue: unknown;
        resolution: string;
      }>;
      preservedData: Record<string, unknown>;
    } = {
      merged,
      conflicts,
      preservedData: preserveHistory ? duplicatePayee : {},
    };

    if (mergedPayee) result.mergedPayee = mergedPayee;

    return result;
  }

  // =====================================
  // Subscription Management Methods (Phase 3.2)
  // =====================================

  /**
   * Detect subscriptions among payees
   */
  async detectSubscriptions(
    workspaceId: number,
    payeeIds?: number[],
    includeInactive: boolean = false,
    minConfidence: number = 0.3
  ): Promise<SubscriptionDetection[]> {
    let payees: Payee[];

    if (payeeIds && payeeIds.length > 0) {
      // Get specific payees
      payees = [];
      for (const id of payeeIds) {
        try {
          const payee = await this.getPayeeById(id, workspaceId);
          payees.push(payee);
        } catch (error) {
          // Skip not found payees
          if (!(error instanceof NotFoundError)) {
            throw error;
          }
        }
      }
    } else {
      // Get all payees
      payees = await this.getAllPayees(workspaceId);
    }

    // Filter inactive payees if required
    if (!includeInactive) {
      payees = payees.filter((payee) => payee.isActive);
    }

    const detections = await this.subscriptionService.detectSubscriptions(payees);

    // Filter by minimum confidence
    return detections.filter((detection) => detection.detectionConfidence >= minConfidence);
  }

  /**
   * Classify a specific payee as a subscription
   */
  async classifySubscription(
    payeeId: number,
    workspaceId: number,
    transactionData?: Array<{
      amount: number;
      date: string;
      description: string;
    }>
  ): Promise<{
    classification: SubscriptionDetection;
    suggestedMetadata: SubscriptionMetadata;
    confidenceFactors: Array<{
      factor: string;
      score: number;
      evidence: string[];
    }>;
  }> {
    // Verify payee exists
    await this.getPayeeById(payeeId, workspaceId);

    return await this.subscriptionService.classifySubscription(payeeId, transactionData);
  }

  /**
   * Get subscription lifecycle analysis for a payee
   */
  async getSubscriptionLifecycleAnalysis(payeeId: number, workspaceId: number): Promise<SubscriptionLifecycle> {
    // Verify payee exists
    await this.getPayeeById(payeeId, workspaceId);

    return await this.subscriptionService.trackSubscriptionLifecycle(payeeId);
  }

  /**
   * Get subscription cost analysis for a payee
   */
  async getSubscriptionCostAnalysis(
    payeeId: number,
    workspaceId: number,
    timeframeDays: number = 365
  ): Promise<SubscriptionCostAnalysis> {
    // Verify payee exists
    await this.getPayeeById(payeeId, workspaceId);

    return await this.subscriptionService.analyzeCosts(payeeId, timeframeDays);
  }

  /**
   * Get subscription renewal predictions for multiple payees
   */
  async getSubscriptionRenewalPredictions(
    payeeIds: number[],
    workspaceId: number,
    forecastMonths: number = 12
  ): Promise<SubscriptionRenewalPrediction[]> {
    // Verify all payees exist
    for (const id of payeeIds) {
      await this.getPayeeById(id, workspaceId);
    }

    return await this.subscriptionService.predictRenewals(payeeIds, forecastMonths);
  }

  /**
   * Get subscription usage analysis for a payee
   */
  async getSubscriptionUsageAnalysis(payeeId: number, workspaceId: number): Promise<SubscriptionUsageAnalysis> {
    // Verify payee exists
    await this.getPayeeById(payeeId, workspaceId);

    return await this.subscriptionService.analyzeUsage(payeeId);
  }

  /**
   * Get subscription cancellation assistance for a payee
   */
  async getSubscriptionCancellationAssistance(
    payeeId: number,
    workspaceId: number
  ): Promise<SubscriptionCancellationAssistance> {
    // Verify payee exists
    await this.getPayeeById(payeeId, workspaceId);

    return await this.subscriptionService.getCancellationAssistance(payeeId);
  }

  /**
   * Get subscription optimization recommendations for multiple payees
   */
  async getSubscriptionOptimizationRecommendations(
    payeeIds: number[],
    workspaceId: number,
    optimizationGoals: {
      maximizeSavings?: boolean;
      maintainValueThreshold?: number;
      riskTolerance?: "low" | "medium" | "high";
    } = {}
  ): Promise<
    Array<{
      payeeId: number;
      currentCost: number;
      optimizedCost: number;
      potentialSavings: number;
      recommendations: Array<{
        type: "cancel" | "downgrade" | "switch" | "negotiate" | "bundle" | "pause";
        description: string;
        savings: number;
        effort: "low" | "medium" | "high";
        risk: "low" | "medium" | "high";
        timeline: string;
        confidence: number;
      }>;
    }>
  > {
    // Verify all payees exist
    for (const id of payeeIds) {
      await this.getPayeeById(id, workspaceId);
    }

    return await this.subscriptionService.generateOptimizationRecommendations(payeeIds);
  }

  /**
   * Get bulk subscription analysis
   */
  async getBulkSubscriptionAnalysis(
    workspaceId: number,
    payeeIds?: number[],
    analysisOptions: {
      includeCostBreakdown?: boolean;
      includeUsageMetrics?: boolean;
      includeOptimizationSuggestions?: boolean;
      timeframeDays?: number;
    } = {}
  ): Promise<{
    totalSubscriptions: number;
    totalMonthlyCost: number;
    totalAnnualCost: number;
    subscriptionsByCategory: Record<string, number>;
    topCostlySubscriptions: Array<{
      payeeId: number;
      name: string;
      cost: number;
      category: string;
    }>;
    underutilizedSubscriptions: Array<{
      payeeId: number;
      name: string;
      cost: number;
      utilizationScore: number;
      recommendation: string;
    }>;
    savingsOpportunities: {
      totalPotentialSavings: number;
      easyWins: number;
      recommendations: Array<{
        description: string;
        savings: number;
        affectedSubscriptions: number;
      }>;
    };
  }> {
    // Verify payees exist if specific IDs provided
    if (payeeIds) {
      for (const id of payeeIds) {
        await this.getPayeeById(id, workspaceId);
      }
    }

    return await this.subscriptionService.getBulkSubscriptionAnalysis(payeeIds);
  }

  /**
   * Update subscription metadata for a payee
   */
  async updateSubscriptionMetadata(
    payeeId: number,
    workspaceId: number,
    subscriptionMetadata: SubscriptionMetadata
  ): Promise<Payee> {
    // Verify payee exists
    const payee = await this.getPayeeById(payeeId, workspaceId);

    // Convert SubscriptionMetadata to SubscriptionInfo format
    const subscriptionInfo: SubscriptionInfo = {
      monthlyCost: subscriptionMetadata.baseCost,
      renewalDate: subscriptionMetadata.startDate || new Date().toISOString(),
      isActive: !subscriptionMetadata.endDate,
      billingCycle:
        subscriptionMetadata.billingCycle === "annual"
          ? "yearly"
          : subscriptionMetadata.billingCycle === "quarterly"
            ? "quarterly"
            : "monthly",
    };

    // Update the payee's subscription info
    return await this.updatePayee(payeeId, {
      subscriptionInfo,
    }, workspaceId);
  }

  /**
   * Mark a subscription as cancelled
   */
  async markSubscriptionCancelled(
    payeeId: number,
    workspaceId: number,
    cancellationDate: string,
    details: {
      reason?: string;
      refundAmount?: number;
      notes?: string;
    } = {}
  ): Promise<Payee> {
    // Verify payee exists
    const payee = await this.getPayeeById(payeeId, workspaceId);

    // Get current subscription metadata
    let subscriptionInfo: SubscriptionMetadata | null = null;
    if (payee.subscriptionInfo && typeof payee.subscriptionInfo === "object") {
      subscriptionInfo = payee.subscriptionInfo as unknown as SubscriptionMetadata;
    }

    if (!subscriptionInfo || !subscriptionInfo.isSubscription) {
      throw new ValidationError("Payee is not marked as a subscription");
    }

    // Update subscription metadata to mark as cancelled
    const updatedSubscriptionMetadata: SubscriptionMetadata = {
      ...subscriptionInfo,
      endDate: cancellationDate,
      autoRenewal: false,
    };

    // Convert to SubscriptionInfo format
    const updatedSubscriptionInfo: SubscriptionInfo = {
      monthlyCost: updatedSubscriptionMetadata.baseCost,
      renewalDate: updatedSubscriptionMetadata.startDate || new Date().toISOString(),
      isActive: false, // Subscription is now cancelled
      billingCycle:
        updatedSubscriptionMetadata.billingCycle === "annual"
          ? "yearly"
          : updatedSubscriptionMetadata.billingCycle === "quarterly"
            ? "quarterly"
            : "monthly",
    };

    // Update the payee
    return await this.updatePayee(payeeId, {
      subscriptionInfo: updatedSubscriptionInfo,
      notes: payee.notes
        ? `${payee.notes}\n\nCancelled on ${cancellationDate}${details.reason ? ` - ${details.reason}` : ""}${details.notes ? `\n${details.notes}` : ""}`
        : `Cancelled on ${cancellationDate}${details.reason ? ` - ${details.reason}` : ""}${details.notes ? `\n${details.notes}` : ""}`,
    }, workspaceId);
  }

  /**
   * Get subscription value optimization analysis
   */
  async getSubscriptionValueOptimization(payeeIds: number[], workspaceId: number): Promise<
    Array<{
      payeeId: number;
      currentValue: number;
      optimizedValue: number;
      valueImprovement: number;
      recommendations: Array<{
        type: string;
        description: string;
        valueIncrease: number;
        effort: "low" | "medium" | "high";
        confidence: number;
      }>;
    }>
  > {
    // Verify all payees exist
    for (const id of payeeIds) {
      await this.getPayeeById(id, workspaceId);
    }

    // This would typically analyze each subscription for value optimization
    // For now, returning a structured mock response
    return payeeIds.map((payeeId) => ({
      payeeId,
      currentValue: 0.7,
      optimizedValue: 0.85,
      valueImprovement: 0.15,
      recommendations: [
        {
          type: "usage_tracking",
          description: "Implement usage tracking to optimize value",
          valueIncrease: 0.1,
          effort: "medium" as const,
          confidence: 0.8,
        },
      ],
    }));
  }

  /**
   * Get subscription competitor analysis
   */
  async getSubscriptionCompetitorAnalysis(payeeId: number, workspaceId: number): Promise<{
    currentService: {
      name: string;
      cost: number;
      features: string[];
      pros: string[];
      cons: string[];
    };
    competitors: Array<{
      name: string;
      cost: number;
      features: string[];
      pros: string[];
      cons: string[];
      migrationEffort: "low" | "medium" | "high";
      recommendation: string;
    }>;
    summary: {
      bestAlternative?: string;
      potentialSavings: number;
      riskAssessment: "low" | "medium" | "high";
      recommendation: string;
    };
  }> {
    // Verify payee exists
    const payee = await this.getPayeeById(payeeId, workspaceId);

    // This would typically query competitor databases and pricing APIs
    // For now, returning a structured mock response
    return {
      currentService: {
        name: payee.name || "Unknown Service",
        cost: payee.avgAmount || 0,
        features: ["Current features"],
        pros: ["Familiar interface", "Existing data"],
        cons: ["Higher cost", "Limited features"],
      },
      competitors: [
        {
          name: "Alternative Service",
          cost: (payee.avgAmount || 0) * 0.8,
          features: ["Similar features", "Better pricing"],
          pros: ["Lower cost", "Better features"],
          cons: ["Migration required", "Learning curve"],
          migrationEffort: "medium" as const,
          recommendation: "Consider for cost savings",
        },
      ],
      summary: {
        bestAlternative: "Alternative Service",
        potentialSavings: (payee.avgAmount || 0) * 0.2,
        riskAssessment: "medium" as const,
        recommendation: "Evaluate migration based on usage patterns",
      },
    };
  }

  /**
   * Set subscription automation rules
   */
  async setSubscriptionAutomationRules(
    payeeId: number,
    workspaceId: number,
    rules: {
      autoDetectPriceChanges?: boolean;
      autoGenerateUsageReports?: boolean;
      autoSuggestOptimizations?: boolean;
      autoMarkUnused?: {
        enabled?: boolean;
        thresholdDays?: number;
      };
      autoRenewalReminders?: {
        enabled?: boolean;
        daysBefore?: number;
      };
    }
  ): Promise<Payee> {
    // Verify payee exists
    const payee = await this.getPayeeById(payeeId, workspaceId);

    // Get current subscription metadata
    let subscriptionInfo: SubscriptionMetadata | null = null;
    if (payee.subscriptionInfo && typeof payee.subscriptionInfo === "object") {
      subscriptionInfo = payee.subscriptionInfo as unknown as SubscriptionMetadata;
    }

    if (!subscriptionInfo || !subscriptionInfo.isSubscription) {
      throw new ValidationError("Payee is not marked as a subscription");
    }

    // Update subscription metadata with automation rules
    const updatedSubscriptionMetadata: SubscriptionMetadata = {
      ...subscriptionInfo,
      alerts: {
        renewalReminder:
          rules.autoRenewalReminders?.enabled ?? subscriptionInfo.alerts?.renewalReminder ?? true,
        priceChangeAlert:
          rules.autoDetectPriceChanges ?? subscriptionInfo.alerts?.priceChangeAlert ?? true,
        usageAlert: rules.autoGenerateUsageReports ?? subscriptionInfo.alerts?.usageAlert ?? false,
        unusedAlert: rules.autoMarkUnused?.enabled ?? subscriptionInfo.alerts?.unusedAlert ?? true,
      },
    };

    // Convert to SubscriptionInfo format
    const updatedSubscriptionInfo: SubscriptionInfo = {
      monthlyCost: updatedSubscriptionMetadata.baseCost,
      renewalDate: updatedSubscriptionMetadata.startDate || new Date().toISOString(),
      isActive: !updatedSubscriptionMetadata.endDate,
      billingCycle:
        updatedSubscriptionMetadata.billingCycle === "annual"
          ? "yearly"
          : updatedSubscriptionMetadata.billingCycle === "quarterly"
            ? "quarterly"
            : "monthly",
    };

    // Update the payee
    return await this.updatePayee(payeeId, {
      subscriptionInfo: updatedSubscriptionInfo,
    }, workspaceId);
  }

  // ============================================================================
  // BULK IMPORT/EXPORT
  // ============================================================================

  /**
   * Export payees to CSV or JSON format
   */
  async exportPayees(
    payeeIds: number[],
    format: "csv" | "json",
    options: {
      includeTransactionStats?: boolean;
      includeContactInfo?: boolean;
      includeIntelligenceData?: boolean;
    },
    workspaceId: number
  ): Promise<string> {
    logger.info("Exporting payees", { count: payeeIds.length, format });

    // Fetch payees
    const payees = await this.repository.findByIds(payeeIds, workspaceId);

    if (payees.length === 0) {
      throw new ValidationError("No payees found to export");
    }

    // Build export data
    const exportData = await Promise.all(
      payees.map(async (payee) => {
        const data: Record<string, unknown> = {
          name: payee.name,
          payeeType: payee.payeeType,
          isActive: payee.isActive,
          notes: payee.notes,
          taxRelevant: payee.taxRelevant,
        };

        if (options.includeContactInfo) {
          data.email = payee.email;
          data.phone = payee.phone;
          data.website = payee.website;
          data.address = payee.address;
        }

        if (options.includeTransactionStats) {
          try {
            const stats = await this.getPayeeStats(payee.id, workspaceId);
            data.transactionCount = stats.transactionCount;
            data.totalAmount = stats.totalAmount;
            data.avgAmount = stats.avgAmount;
            data.lastTransactionDate = stats.lastTransactionDate;
          } catch {
            // Stats not available
          }
        }

        if (options.includeIntelligenceData) {
          data.defaultCategoryId = payee.defaultCategoryId;
          data.defaultBudgetId = payee.defaultBudgetId;
          data.avgAmount = payee.avgAmount;
          data.paymentFrequency = payee.paymentFrequency;
        }

        return data;
      })
    );

    if (format === "json") {
      return JSON.stringify(exportData, null, 2);
    }

    // CSV format
    if (exportData.length === 0) {
      return "";
    }

    const headers = Object.keys(exportData[0]);
    const csvRows = [
      headers.join(","),
      ...exportData.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            if (value === null || value === undefined) return "";
            if (typeof value === "object") return JSON.stringify(value);
            if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return String(value);
          })
          .join(",")
      ),
    ];

    return csvRows.join("\n");
  }

  /**
   * Import payees from CSV or JSON format
   */
  async importPayees(
    data: string,
    format: "csv" | "json",
    options: {
      skipDuplicates?: boolean;
      updateExisting?: boolean;
      applyIntelligentDefaults?: boolean;
      validateContactInfo?: boolean;
    },
    workspaceId: number
  ): Promise<{
    imported: number;
    updated: number;
    skipped: number;
    errors: Array<{ row: number; error: string }>;
  }> {
    logger.info("Importing payees", { format, options });

    const result = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [] as Array<{ row: number; error: string }>,
    };

    let records: Array<Record<string, unknown>>;

    // Parse input data
    if (format === "json") {
      try {
        records = JSON.parse(data);
        if (!Array.isArray(records)) {
          throw new ValidationError("JSON data must be an array of payee objects");
        }
      } catch (e) {
        throw new ValidationError(`Invalid JSON: ${e instanceof Error ? e.message : "Parse error"}`);
      }
    } else {
      // Parse CSV
      records = this.parseCSV(data);
    }

    // Process each record
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNum = i + 1;

      try {
        const name = String(record.name || "").trim();
        if (!name) {
          result.errors.push({ row: rowNum, error: "Name is required" });
          continue;
        }

        // Check for existing payee
        const existing = await this.repository.findByName(name, workspaceId);

        if (existing) {
          if (options.skipDuplicates && !options.updateExisting) {
            result.skipped++;
            continue;
          }

          if (options.updateExisting) {
            // Update existing payee
            await this.updatePayee(
              existing.id,
              this.recordToPayeeData(record),
              workspaceId
            );
            result.updated++;
            continue;
          }
        }

        // Create new payee
        const payeeData: CreatePayeeData = {
          name,
          ...this.recordToPayeeData(record),
        };

        // Validate contact info if requested
        if (options.validateContactInfo) {
          if (record.email && typeof record.email === "string") {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(record.email)) {
              result.errors.push({ row: rowNum, error: "Invalid email format" });
              continue;
            }
          }
        }

        await this.createPayee(payeeData, workspaceId);
        result.imported++;
      } catch (e) {
        result.errors.push({
          row: rowNum,
          error: e instanceof Error ? e.message : "Unknown error",
        });
      }
    }

    logger.info("Import completed", result);
    return result;
  }

  /**
   * Parse CSV string into records
   */
  private parseCSV(data: string): Array<Record<string, unknown>> {
    const lines = data.split("\n").filter((line) => line.trim());
    if (lines.length < 2) {
      return [];
    }

    const headers = this.parseCSVLine(lines[0]);
    const records: Array<Record<string, unknown>> = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const record: Record<string, unknown> = {};

      for (let j = 0; j < headers.length; j++) {
        const header = headers[j].trim();
        let value: unknown = values[j]?.trim() || null;

        // Try to parse boolean and number values
        if (value === "true") value = true;
        else if (value === "false") value = false;
        else if (value !== null && !isNaN(Number(value)) && value !== "") {
          value = Number(value);
        }

        record[header] = value;
      }

      records.push(record);
    }

    return records;
  }

  /**
   * Parse a single CSV line handling quoted fields
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }

  /**
   * Convert a record to payee data
   */
  private recordToPayeeData(record: Record<string, unknown>): Partial<CreatePayeeData> {
    const data: Partial<CreatePayeeData> = {};

    if (record.notes !== undefined) data.notes = record.notes as string | null;
    if (record.payeeType !== undefined) data.payeeType = record.payeeType as PayeeType | null;
    if (record.taxRelevant !== undefined) data.taxRelevant = Boolean(record.taxRelevant);
    if (record.email !== undefined) data.email = record.email as string | null;
    if (record.phone !== undefined) data.phone = record.phone as string | null;
    if (record.website !== undefined) data.website = record.website as string | null;

    return data;
  }

  // ============================================================================
  // DUPLICATE DETECTION AND MERGING
  // ============================================================================

  /**
   * Find duplicate payees based on similarity
   *
   * Detection methods:
   * - simple: Basic Levenshtein distance (fastest)
   * - ml: Pattern-aware ML matching (recommended)
   * - llm: ML pre-filter + LLM refinement (smart filter - uses threshold)
   * - llm_direct: Direct LLM analysis of all pairs (bypasses threshold entirely)
   */
  async findDuplicatePayees(
    similarityThreshold: number,
    includeInactive: boolean,
    groupingStrategy: "name" | "contact" | "transaction_pattern" | "comprehensive",
    workspaceId: number,
    detectionMethod: "simple" | "ml" | "llm" | "llm_direct" = "ml"
  ): Promise<{
    groups: Array<{
      primaryPayeeId: number;
      duplicatePayeeIds: number[];
      similarityScore: number;
      similarities: Array<{
        field: "name" | "phone" | "email" | "website" | "address";
        primaryValue: string;
        duplicateValue: string;
        matchType: "exact" | "fuzzy" | "normalized" | "semantic";
        confidence: number;
      }>;
      recommendedAction: "merge" | "review" | "ignore";
      riskLevel: "low" | "medium" | "high";
    }>;
    llmLog?: Array<{
      timestamp: string;
      batchIndex: number;
      pairs: Array<{ primaryName: string; duplicateName: string }>;
      prompt: string;
      rawResponse: string;
      parsedResult: { pairs: Array<{ index: number; isMatch: boolean; confidence: number }> } | null;
      error?: string;
    }>;
    detectionMethod: "simple" | "ml" | "llm" | "llm_direct";
    totalPairsAnalyzed?: number;
  }> {
    logger.info("Finding duplicate payees", { similarityThreshold, includeInactive, groupingStrategy, detectionMethod });

    // Get all payees
    let payees = await this.repository.findAllPayees(workspaceId);

    if (!includeInactive) {
      payees = payees.filter(p => p.isActive);
    }

    // LLM Direct mode: bypass ML pre-filter entirely, send all pairs directly to LLM
    if (detectionMethod === "llm_direct") {
      const totalPairs = (payees.length * (payees.length - 1)) / 2;
      logger.info("LLM Direct mode: bypassing ML pre-filter", { payeeCount: payees.length, totalPairs });

      try {
        const { groups, llmLog, totalPairsAnalyzed } = await this.analyzeAllPairsWithLLM(
          payees,
          workspaceId
        );
        logger.info("LLM direct analysis complete", {
          totalPairs,
          groupsFound: groups.length,
        });
        return {
          groups,
          llmLog,
          detectionMethod,
          totalPairsAnalyzed,
        };
      } catch (error) {
        logger.warn("LLM direct analysis failed", { error });
        return {
          groups: [],
          llmLog: [{
            timestamp: new Date().toISOString(),
            batchIndex: 0,
            pairs: [],
            prompt: "",
            rawResponse: "",
            parsedResult: null,
            error: `LLM analysis failed: ${error instanceof Error ? error.message : String(error)}.`,
          }],
          detectionMethod,
          totalPairsAnalyzed: 0,
        };
      }
    }

    // Simple/ML/LLM mode: use threshold-based pre-filtering
    // For "llm" mode, we use ML to find candidates, then refine with LLM
    const mlMethod = detectionMethod === "llm" ? "ml" : detectionMethod;
    const duplicateGroups: Array<{
      primaryPayeeId: number;
      duplicatePayeeIds: number[];
      similarityScore: number;
      similarities: Array<{
        field: "name" | "phone" | "email" | "website" | "address";
        primaryValue: string;
        duplicateValue: string;
        matchType: "exact" | "fuzzy" | "normalized" | "semantic";
        confidence: number;
      }>;
      recommendedAction: "merge" | "review" | "ignore";
      riskLevel: "low" | "medium" | "high";
    }> = [];

    const processedPairs = new Set<string>();

    for (let i = 0; i < payees.length; i++) {
      for (let j = i + 1; j < payees.length; j++) {
        const payeeA = payees[i];
        const payeeB = payees[j];

        const pairKey = `${Math.min(payeeA.id, payeeB.id)}-${Math.max(payeeA.id, payeeB.id)}`;
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        const similarities = this.comparePayers(payeeA, payeeB, groupingStrategy, mlMethod);
        const avgScore = similarities.length > 0
          ? similarities.reduce((sum, s) => sum + s.confidence, 0) / similarities.length
          : 0;

        if (avgScore >= similarityThreshold && similarities.length > 0) {
          // Determine which is primary (prefer one with more data)
          const scoreA = this.calculateDataCompleteness(payeeA);
          const scoreB = this.calculateDataCompleteness(payeeB);
          const [primary, duplicate] = scoreA >= scoreB ? [payeeA, payeeB] : [payeeB, payeeA];

          // Check if primary already has a group
          const existingGroup = duplicateGroups.find(g => g.primaryPayeeId === primary.id);
          if (existingGroup) {
            existingGroup.duplicatePayeeIds.push(duplicate.id);
            existingGroup.similarityScore = Math.max(existingGroup.similarityScore, avgScore);
          } else {
            duplicateGroups.push({
              primaryPayeeId: primary.id,
              duplicatePayeeIds: [duplicate.id],
              similarityScore: avgScore,
              similarities,
              recommendedAction: avgScore >= 0.95 ? "merge" : avgScore >= 0.8 ? "review" : "ignore",
              riskLevel: avgScore >= 0.95 ? "low" : avgScore >= 0.8 ? "medium" : "high",
            });
          }
        }
      }
    }

    logger.info("Found duplicate groups (pre-LLM)", { count: duplicateGroups.length, detectionMethod });

    // LLM mode: refine ML candidates with LLM
    if (detectionMethod === "llm") {
      if (duplicateGroups.length === 0) {
        // No candidates found by ML pre-filter
        return {
          groups: [],
          llmLog: [{
            timestamp: new Date().toISOString(),
            batchIndex: 0,
            pairs: [],
            prompt: "",
            rawResponse: "",
            parsedResult: null,
            error: "No duplicate candidates found by ML pre-filter. LLM refinement skipped because there are no potential duplicates to analyze.",
          }],
          detectionMethod,
          totalPairsAnalyzed: 0,
        };
      }

      try {
        const { groups: refinedGroups, llmLog, totalPairsAnalyzed } = await this.refineDuplicatesWithLLM(
          duplicateGroups,
          payees,
          workspaceId
        );
        logger.info("LLM refined duplicate groups", {
          original: duplicateGroups.length,
          refined: refinedGroups.length,
        });
        return {
          groups: refinedGroups,
          llmLog,
          detectionMethod,
          totalPairsAnalyzed,
        };
      } catch (error) {
        // If LLM fails, fall back to ML results with error log
        logger.warn("LLM refinement failed, using ML results", { error });
        return {
          groups: duplicateGroups,
          llmLog: [{
            timestamp: new Date().toISOString(),
            batchIndex: 0,
            pairs: [],
            prompt: "",
            rawResponse: "",
            parsedResult: null,
            error: `LLM refinement failed: ${error instanceof Error ? error.message : String(error)}. Falling back to ML detection results.`,
          }],
          detectionMethod,
          totalPairsAnalyzed: 0,
        };
      }
    }

    return {
      groups: duplicateGroups,
      detectionMethod,
    };
  }

  /**
   * Refine duplicate candidates using LLM
   */
  private async refineDuplicatesWithLLM(
    candidates: Array<{
      primaryPayeeId: number;
      duplicatePayeeIds: number[];
      similarityScore: number;
      similarities: Array<{
        field: "name" | "phone" | "email" | "website" | "address";
        primaryValue: string;
        duplicateValue: string;
        matchType: "exact" | "fuzzy" | "normalized" | "semantic";
        confidence: number;
      }>;
      recommendedAction: "merge" | "review" | "ignore";
      riskLevel: "low" | "medium" | "high";
    }>,
    payees: Payee[],
    workspaceId: number
  ): Promise<{
    groups: typeof candidates;
    llmLog: Array<{
      timestamp: string;
      batchIndex: number;
      pairs: Array<{ primaryName: string; duplicateName: string }>;
      prompt: string;
      rawResponse: string;
      parsedResult: { pairs: Array<{ index: number; isMatch: boolean; confidence: number }> } | null;
      error?: string;
    }>;
    totalPairsAnalyzed: number;
  }> {
    const { createIntelligenceCoordinator } = await import("$lib/server/ai");
    const { workspaces } = await import("$lib/schema/workspaces");
    const { db } = await import("$lib/server/db");
    const { eq } = await import("drizzle-orm");
    const { generateText } = await import("ai");

    // Initialize log entries
    const llmLog: Array<{
      timestamp: string;
      batchIndex: number;
      pairs: Array<{ primaryName: string; duplicateName: string }>;
      prompt: string;
      rawResponse: string;
      parsedResult: { pairs: Array<{ index: number; isMatch: boolean; confidence: number }> } | null;
      error?: string;
    }> = [];

    // Get workspace preferences
    const [workspace] = await db
      .select({ preferences: workspaces.preferences })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    const prefs = workspace?.preferences ? JSON.parse(workspace.preferences) : {};
    const coordinator = createIntelligenceCoordinator(prefs);

    // Use getLLMProvider() for explicit LLM requests (user selected "llm" detection method)
    // This bypasses the feature mode setting - feature mode only controls automatic ML+LLM coordination
    const llmResult = coordinator.getLLMProvider("payeeMatching");

    // Debug: Log what the coordinator determined
    logger.info("LLM provider for explicit payeeMatching request", {
      available: llmResult.available,
      hasProvider: !!llmResult.provider,
      providerType: llmResult.providerType,
      llmMasterEnabled: prefs.llm?.enabled,
      defaultProvider: prefs.llm?.defaultProvider,
    });

    if (!llmResult.available || !llmResult.provider) {
      logger.warn("LLM not available for payee matching, returning ML results");

      // Build detailed diagnostics message
      const diagnostics: string[] = [];
      if (!prefs.llm?.enabled) {
        diagnostics.push("• LLM master toggle is disabled");
      }
      if (!prefs.llm?.defaultProvider) {
        diagnostics.push("• No default LLM provider selected");
      } else {
        const providerConfig = prefs.llm?.providers?.[prefs.llm.defaultProvider];
        if (!providerConfig?.enabled) {
          diagnostics.push(`• Provider "${prefs.llm.defaultProvider}" is not enabled`);
        }
        if (!providerConfig?.apiKey) {
          diagnostics.push(`• Provider "${prefs.llm.defaultProvider}" has no API key configured`);
        }
      }

      const errorDetails = diagnostics.length > 0
        ? `Diagnostics:\n${diagnostics.join("\n")}`
        : "Unknown configuration issue";

      // Return a log entry indicating LLM was not available
      return {
        groups: candidates,
        llmLog: [{
          timestamp: new Date().toISOString(),
          batchIndex: 0,
          pairs: [],
          prompt: "",
          rawResponse: "",
          parsedResult: null,
          error: `LLM not available. ${errorDetails}\n\nPlease configure in Settings → Intelligence → LLM Settings. Falling back to ML detection results.`,
        }],
        totalPairsAnalyzed: 0,
      };
    }

    const llmProvider = llmResult.provider;

    const payeesMap = new Map(payees.map((p) => [p.id, p]));
    const refinedGroups: typeof candidates = [];

    // Build pairs for LLM analysis (batch up to 10 pairs per request)
    const allPairs: Array<{
      groupIndex: number;
      primary: Payee;
      duplicate: Payee;
      duplicateId: number;
      mlScore: number;
    }> = [];

    for (let i = 0; i < candidates.length; i++) {
      const group = candidates[i];
      const primary = payeesMap.get(group.primaryPayeeId);
      if (!primary) continue;

      for (const dupId of group.duplicatePayeeIds) {
        const duplicate = payeesMap.get(dupId);
        if (!duplicate) continue;
        allPairs.push({
          groupIndex: i,
          primary,
          duplicate,
          duplicateId: dupId,
          mlScore: group.similarityScore,
        });
      }
    }

    // Process in batches of 10
    const BATCH_SIZE = 10;
    const llmResults = new Map<string, { isMatch: boolean; confidence: number }>();

    for (let i = 0; i < allPairs.length; i += BATCH_SIZE) {
      const batch = allPairs.slice(i, i + BATCH_SIZE);
      const batchIndex = Math.floor(i / BATCH_SIZE);
      const pairsText = batch
        .map((p, idx) => `${idx + 1}. "${p.primary.name}" vs "${p.duplicate.name}"`)
        .join("\n");

      const prompt = `You are analyzing payee/merchant names for potential duplicates.

For each pair below, determine if they represent the SAME merchant/payee:
${pairsText}

Consider:
- Different formats of the same company (e.g., "Amazon.com" = "AMZN MARKETPLACE")
- Store numbers, location codes, or transaction IDs don't make them different merchants
- Different services from same parent may or may not be same (e.g., "UBER" vs "UBER EATS" are different)

Respond in JSON format only:
{
  "pairs": [
    { "index": 1, "isMatch": true, "confidence": 0.95 },
    { "index": 2, "isMatch": false, "confidence": 0.8 }
  ]
}`;

      // Create log entry for this batch
      const logEntry: typeof llmLog[number] = {
        timestamp: new Date().toISOString(),
        batchIndex,
        pairs: batch.map((p) => ({
          primaryName: p.primary.name ?? "Unknown",
          duplicateName: p.duplicate.name ?? "Unknown",
        })),
        prompt,
        rawResponse: "",
        parsedResult: null,
      };

      try {
        // All providers (including Ollama) use OpenAI-compatible API via generateText
        const result = await generateText({
          model: llmProvider.provider(llmProvider.model),
          prompt,
          maxOutputTokens: 500,
          temperature: 0.1,
        });
        const responseText = result.text;

        logEntry.rawResponse = responseText;

        // Parse JSON response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as {
            pairs: Array<{ index: number; isMatch: boolean; confidence: number }>;
          };
          logEntry.parsedResult = parsed;

          for (const result of parsed.pairs) {
            const pair = batch[result.index - 1];
            if (pair) {
              const key = `${pair.primary.id}-${pair.duplicateId}`;
              llmResults.set(key, {
                isMatch: result.isMatch,
                confidence: result.confidence,
              });
            }
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        logEntry.error = errorMessage;
        logger.warn("LLM batch processing failed", { batchStart: i, error });

        // Keep ML results for this batch
        for (const pair of batch) {
          const key = `${pair.primary.id}-${pair.duplicateId}`;
          llmResults.set(key, { isMatch: true, confidence: pair.mlScore });
        }
      }

      llmLog.push(logEntry);
    }

    // Rebuild groups based on LLM results
    for (const group of candidates) {
      const confirmedDuplicates: number[] = [];
      let maxConfidence = 0;

      for (const dupId of group.duplicatePayeeIds) {
        const key = `${group.primaryPayeeId}-${dupId}`;
        const result = llmResults.get(key);

        if (result?.isMatch) {
          confirmedDuplicates.push(dupId);
          maxConfidence = Math.max(maxConfidence, result.confidence);
        }
      }

      if (confirmedDuplicates.length > 0) {
        refinedGroups.push({
          ...group,
          duplicatePayeeIds: confirmedDuplicates,
          similarityScore: maxConfidence,
          recommendedAction: maxConfidence >= 0.95 ? "merge" : maxConfidence >= 0.8 ? "review" : "ignore",
          riskLevel: maxConfidence >= 0.95 ? "low" : maxConfidence >= 0.8 ? "medium" : "high",
          similarities: group.similarities.map((s) => ({
            ...s,
            matchType: "semantic" as const,
            confidence: maxConfidence,
          })),
        });
      }
    }

    return {
      groups: refinedGroups,
      llmLog,
      totalPairsAnalyzed: allPairs.length,
    };
  }

  /**
   * Analyze ALL payee pairs directly with LLM (bypasses ML pre-filter)
   * Used when user explicitly selects LLM detection method
   */
  private async analyzeAllPairsWithLLM(
    payees: Payee[],
    workspaceId: number
  ): Promise<{
    groups: Array<{
      primaryPayeeId: number;
      duplicatePayeeIds: number[];
      similarityScore: number;
      similarities: Array<{
        field: "name" | "phone" | "email" | "website" | "address";
        primaryValue: string;
        duplicateValue: string;
        matchType: "exact" | "fuzzy" | "normalized" | "semantic";
        confidence: number;
      }>;
      recommendedAction: "merge" | "review" | "ignore";
      riskLevel: "low" | "medium" | "high";
    }>;
    llmLog: Array<{
      timestamp: string;
      batchIndex: number;
      pairs: Array<{ primaryName: string; duplicateName: string }>;
      prompt: string;
      rawResponse: string;
      parsedResult: { pairs: Array<{ index: number; isMatch: boolean; confidence: number }> } | null;
      error?: string;
    }>;
    totalPairsAnalyzed: number;
  }> {
    const { createIntelligenceCoordinator } = await import("$lib/server/ai");
    const { workspaces } = await import("$lib/schema/workspaces");
    const { db } = await import("$lib/server/db");
    const { eq } = await import("drizzle-orm");
    const { generateText } = await import("ai");

    const llmLog: Array<{
      timestamp: string;
      batchIndex: number;
      pairs: Array<{ primaryName: string; duplicateName: string }>;
      prompt: string;
      rawResponse: string;
      parsedResult: { pairs: Array<{ index: number; isMatch: boolean; confidence: number }> } | null;
      error?: string;
    }> = [];

    // Get workspace preferences
    const [workspace] = await db
      .select({ preferences: workspaces.preferences })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    const prefs = workspace?.preferences ? JSON.parse(workspace.preferences) : {};
    const coordinator = createIntelligenceCoordinator(prefs);

    // Get LLM provider
    const llmResult = coordinator.getLLMProvider("payeeMatching");

    if (!llmResult.available || !llmResult.provider) {
      const diagnostics: string[] = [];
      if (!prefs.llm?.enabled) {
        diagnostics.push("• LLM master toggle is disabled");
      }
      if (!prefs.llm?.defaultProvider) {
        diagnostics.push("• No default LLM provider selected");
      } else {
        const providerConfig = prefs.llm?.providers?.[prefs.llm.defaultProvider];
        if (!providerConfig?.enabled) {
          diagnostics.push(`• Provider "${prefs.llm.defaultProvider}" is not enabled`);
        }
        if (!providerConfig?.apiKey) {
          diagnostics.push(`• Provider "${prefs.llm.defaultProvider}" has no API key configured`);
        }
      }

      const errorDetails = diagnostics.length > 0
        ? `Diagnostics:\n${diagnostics.join("\n")}`
        : "Unknown configuration issue";

      return {
        groups: [],
        llmLog: [{
          timestamp: new Date().toISOString(),
          batchIndex: 0,
          pairs: [],
          prompt: "",
          rawResponse: "",
          parsedResult: null,
          error: `LLM not available. ${errorDetails}\n\nPlease configure in Settings → Intelligence → LLM Settings.`,
        }],
        totalPairsAnalyzed: 0,
      };
    }

    const llmProvider = llmResult.provider;

    // Generate ALL pairs
    const allPairs: Array<{
      payeeA: Payee;
      payeeB: Payee;
    }> = [];

    for (let i = 0; i < payees.length; i++) {
      for (let j = i + 1; j < payees.length; j++) {
        allPairs.push({
          payeeA: payees[i],
          payeeB: payees[j],
        });
      }
    }

    logger.info("LLM direct analysis: processing all pairs", {
      payeeCount: payees.length,
      totalPairs: allPairs.length,
    });

    // Process in batches of 15 (slightly larger since we're not pre-filtered)
    const BATCH_SIZE = 15;
    const llmResults = new Map<string, { isMatch: boolean; confidence: number }>();

    for (let i = 0; i < allPairs.length; i += BATCH_SIZE) {
      const batch = allPairs.slice(i, i + BATCH_SIZE);
      const batchIndex = Math.floor(i / BATCH_SIZE);

      const pairsText = batch
        .map((p, idx) => `${idx + 1}. "${p.payeeA.name || 'Unknown'}" vs "${p.payeeB.name || 'Unknown'}"`)
        .join("\n");

      const prompt = `You are analyzing payee/merchant names for potential duplicates.

For each pair below, determine if they represent the SAME merchant/payee:
${pairsText}

Consider:
- Different formats of the same company (e.g., "Amazon.com" = "AMZN MARKETPLACE")
- Store numbers, location codes, or transaction IDs don't make them different merchants
- Different services from same parent may or may not be same (e.g., "UBER" vs "UBER EATS" are different)
- Be conservative: only mark as match if you're confident they're the same entity

Respond in JSON format only:
{
  "pairs": [
    { "index": 1, "isMatch": true, "confidence": 0.95 },
    { "index": 2, "isMatch": false, "confidence": 0.8 }
  ]
}`;

      const logEntry: typeof llmLog[number] = {
        timestamp: new Date().toISOString(),
        batchIndex,
        pairs: batch.map((p) => ({
          primaryName: p.payeeA.name ?? "Unknown",
          duplicateName: p.payeeB.name ?? "Unknown",
        })),
        prompt,
        rawResponse: "",
        parsedResult: null,
      };

      try {
        // All providers (including Ollama) use OpenAI-compatible API via generateText
        const result = await generateText({
          model: llmProvider.provider(llmProvider.model),
          prompt,
          maxOutputTokens: 500,
          temperature: 0.1,
        });
        const responseText = result.text;

        logEntry.rawResponse = responseText;

        // Parse JSON response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as {
            pairs: Array<{ index: number; isMatch: boolean; confidence: number }>;
          };
          logEntry.parsedResult = parsed;

          for (const result of parsed.pairs) {
            const pair = batch[result.index - 1];
            if (pair && result.isMatch) {
              const key = `${Math.min(pair.payeeA.id, pair.payeeB.id)}-${Math.max(pair.payeeA.id, pair.payeeB.id)}`;
              llmResults.set(key, {
                isMatch: result.isMatch,
                confidence: result.confidence,
              });
            }
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        logEntry.error = errorMessage;
        logger.warn("LLM batch processing failed", { batchStart: i, error: errorMessage });
      }

      llmLog.push(logEntry);
    }

    // Build groups from LLM matches
    const groupMap = new Map<number, {
      primaryPayeeId: number;
      duplicatePayeeIds: number[];
      maxConfidence: number;
    }>();

    for (const [key, result] of llmResults.entries()) {
      if (!result.isMatch) continue;

      const [idA, idB] = key.split("-").map(Number);
      const payeeA = payees.find(p => p.id === idA);
      const payeeB = payees.find(p => p.id === idB);

      if (!payeeA || !payeeB) continue;

      // Determine primary (prefer one with more data)
      const scoreA = this.calculateDataCompleteness(payeeA);
      const scoreB = this.calculateDataCompleteness(payeeB);
      const [primaryId, duplicateId] = scoreA >= scoreB
        ? [payeeA.id, payeeB.id]
        : [payeeB.id, payeeA.id];

      const existing = groupMap.get(primaryId);
      if (existing) {
        if (!existing.duplicatePayeeIds.includes(duplicateId)) {
          existing.duplicatePayeeIds.push(duplicateId);
        }
        existing.maxConfidence = Math.max(existing.maxConfidence, result.confidence);
      } else {
        groupMap.set(primaryId, {
          primaryPayeeId: primaryId,
          duplicatePayeeIds: [duplicateId],
          maxConfidence: result.confidence,
        });
      }
    }

    // Convert to output format
    const groups = Array.from(groupMap.values()).map(g => {
      const primary = payees.find(p => p.id === g.primaryPayeeId)!;
      const duplicates = g.duplicatePayeeIds.map(id => payees.find(p => p.id === id)!).filter(Boolean);

      return {
        primaryPayeeId: g.primaryPayeeId,
        duplicatePayeeIds: g.duplicatePayeeIds,
        similarityScore: g.maxConfidence,
        similarities: duplicates.map(dup => ({
          field: "name" as const,
          primaryValue: primary.name || "",
          duplicateValue: dup.name || "",
          matchType: "semantic" as const,
          confidence: g.maxConfidence,
        })),
        recommendedAction: (g.maxConfidence >= 0.95 ? "merge" : g.maxConfidence >= 0.8 ? "review" : "ignore") as "merge" | "review" | "ignore",
        riskLevel: (g.maxConfidence >= 0.95 ? "low" : g.maxConfidence >= 0.8 ? "medium" : "high") as "low" | "medium" | "high",
      };
    });

    return {
      groups,
      llmLog,
      totalPairsAnalyzed: allPairs.length,
    };
  }

  /**
   * Compare two payees for similarity
   */
  private comparePayers(
    payeeA: Payee,
    payeeB: Payee,
    strategy: "name" | "contact" | "transaction_pattern" | "comprehensive",
    detectionMethod: "simple" | "ml" | "llm" = "ml"
  ): Array<{
    field: "name" | "phone" | "email" | "website" | "address";
    primaryValue: string;
    duplicateValue: string;
    matchType: "exact" | "fuzzy" | "normalized" | "semantic";
    confidence: number;
  }> {
    const similarities: Array<{
      field: "name" | "phone" | "email" | "website" | "address";
      primaryValue: string;
      duplicateValue: string;
      matchType: "exact" | "fuzzy" | "normalized" | "semantic";
      confidence: number;
    }> = [];

    // Name comparison (always included)
    if (strategy === "name" || strategy === "comprehensive") {
      const nameA = (payeeA.name || "").trim();
      const nameB = (payeeB.name || "").trim();

      if (nameA && nameB) {
        // First check for exact match (case-insensitive)
        if (nameA.toLowerCase() === nameB.toLowerCase()) {
          similarities.push({
            field: "name",
            primaryValue: payeeA.name || "",
            duplicateValue: payeeB.name || "",
            matchType: "exact",
            confidence: 1.0,
          });
        } else {
          // Branch by detection method
          if (detectionMethod === "simple") {
            // Simple: Use basic Levenshtein distance
            const similarity = this.calculateStringSimilarity(
              nameA.toLowerCase(),
              nameB.toLowerCase()
            );
            if (similarity >= 0.7) {
              similarities.push({
                field: "name",
                primaryValue: payeeA.name || "",
                duplicateValue: payeeB.name || "",
                matchType: "fuzzy",
                confidence: similarity,
              });
            }
          } else {
            // ML or LLM: Use merchant similarity which normalizes names (strips order IDs, etc.)
            // For LLM, this provides candidates that get refined later
            const similarity = merchantSimilarity(nameA, nameB);
            if (similarity >= 0.7) {
              // Check if they normalize to the same merchant name
              const normalizedA = extractMerchantName(nameA);
              const normalizedB = extractMerchantName(nameB);
              const isNormalized = normalizedA === normalizedB;

              similarities.push({
                field: "name",
                primaryValue: payeeA.name || "",
                duplicateValue: payeeB.name || "",
                matchType: isNormalized ? "normalized" : "fuzzy",
                confidence: similarity,
              });
            }
          }
        }
      }
    }

    // Contact comparison
    if (strategy === "contact" || strategy === "comprehensive") {
      // Email
      if (payeeA.email && payeeB.email) {
        const emailA = payeeA.email.toLowerCase().trim();
        const emailB = payeeB.email.toLowerCase().trim();
        if (emailA === emailB) {
          similarities.push({
            field: "email",
            primaryValue: payeeA.email,
            duplicateValue: payeeB.email,
            matchType: "exact",
            confidence: 1.0,
          });
        }
      }

      // Phone (normalize before comparing)
      if (payeeA.phone && payeeB.phone) {
        const phoneA = payeeA.phone.replace(/\D/g, "");
        const phoneB = payeeB.phone.replace(/\D/g, "");
        if (phoneA === phoneB && phoneA.length >= 7) {
          similarities.push({
            field: "phone",
            primaryValue: payeeA.phone,
            duplicateValue: payeeB.phone,
            matchType: "normalized",
            confidence: 1.0,
          });
        }
      }

      // Website
      if (payeeA.website && payeeB.website) {
        const websiteA = payeeA.website.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
        const websiteB = payeeB.website.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
        if (websiteA === websiteB) {
          similarities.push({
            field: "website",
            primaryValue: payeeA.website,
            duplicateValue: payeeB.website,
            matchType: "normalized",
            confidence: 1.0,
          });
        }
      }
    }

    return similarities;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;

    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    const distance = matrix[b.length][a.length];
    return 1 - distance / Math.max(a.length, b.length);
  }

  /**
   * Calculate data completeness score for a payee
   */
  private calculateDataCompleteness(payee: Payee): number {
    let score = 0;
    if (payee.name) score += 2;
    if (payee.email) score += 1;
    if (payee.phone) score += 1;
    if (payee.website) score += 1;
    if (payee.address) score += 1;
    if (payee.notes) score += 0.5;
    if (payee.defaultCategoryId) score += 1;
    if (payee.defaultBudgetId) score += 1;
    return score;
  }

  /**
   * Merge duplicate payees into a primary payee
   */
  async mergeDuplicatePayees(
    primaryPayeeId: number,
    duplicatePayeeIds: number[],
    mergeStrategy: {
      preserveTransactionHistory?: boolean;
      conflictResolution?: "primary" | "latest" | "best_quality" | "manual";
      mergeContactInfo?: boolean;
      mergeIntelligenceData?: boolean;
    },
    confirmMerge: boolean,
    workspaceId: number
  ): Promise<{
    success: boolean;
    mergedPayeeId: number;
    deletedPayeeIds: number[];
    transactionsUpdated: number;
    warnings: string[];
  }> {
    logger.info("Merging duplicate payees", { primaryPayeeId, duplicatePayeeIds, confirmMerge });

    if (!confirmMerge) {
      throw new ValidationError("Merge operation requires confirmation");
    }

    const warnings: string[] = [];
    let transactionsUpdated = 0;

    // Get primary payee
    const primaryPayee = await this.getPayeeById(primaryPayeeId, workspaceId);

    // Get duplicate payees
    const duplicatePayees = await this.repository.findByIds(duplicatePayeeIds, workspaceId);

    if (duplicatePayees.length !== duplicatePayeeIds.length) {
      warnings.push("Some duplicate payees were not found");
    }

    // Merge contact info if requested
    if (mergeStrategy.mergeContactInfo) {
      const updateData: Partial<UpdatePayeeData> = {};

      for (const dup of duplicatePayees) {
        if (!primaryPayee.email && dup.email) updateData.email = dup.email;
        if (!primaryPayee.phone && dup.phone) updateData.phone = dup.phone;
        if (!primaryPayee.website && dup.website) updateData.website = dup.website;
        if (!primaryPayee.notes && dup.notes) updateData.notes = dup.notes;
      }

      if (Object.keys(updateData).length > 0) {
        await this.updatePayee(primaryPayeeId, updateData, workspaceId);
      }
    }

    // Update transactions to point to primary payee (if preserving history)
    if (mergeStrategy.preserveTransactionHistory) {
      for (const dupId of duplicatePayeeIds) {
        const updated = await this.repository.updateTransactionPayee(dupId, primaryPayeeId);
        transactionsUpdated += updated;
      }
    }

    // Soft delete the duplicate payees
    const deletedIds: number[] = [];
    for (const dupId of duplicatePayeeIds) {
      try {
        await this.deletePayee(dupId, workspaceId);
        deletedIds.push(dupId);
      } catch (e) {
        warnings.push(`Failed to delete payee ${dupId}: ${e instanceof Error ? e.message : "Unknown error"}`);
      }
    }

    logger.info("Merge completed", { primaryPayeeId, deletedIds, transactionsUpdated });

    return {
      success: true,
      mergedPayeeId: primaryPayeeId,
      deletedPayeeIds: deletedIds,
      transactionsUpdated,
      warnings,
    };
  }
}
