import {
  PayeeRepository,
  type UpdatePayeeData,
  type PayeeStats,
  type PayeeSuggestions,
  type PayeeIntelligence,
  type PayeeSearchFilters
} from "./repository";
import {
  PayeeIntelligenceService,
  type SpendingAnalysis,
  type SeasonalPattern,
  type DayOfWeekPattern,
  type FrequencyAnalysis,
  type TransactionPrediction,
  type BudgetAllocationSuggestion,
  type ConfidenceMetrics
} from "./intelligence";
import {
  CategoryLearningService,
  type CategoryCorrection,
  type CorrectionPattern,
  type CategoryRecommendation,
  type LearningMetrics,
  type CategoryDrift
} from "./category-learning";
import {
  PayeeMLCoordinator,
  type UnifiedRecommendations,
  type CrossSystemLearning,
  type BehaviorChangeDetection,
  type ActionableInsight,
  type MLPerformanceMetrics
} from "./ml-coordinator";
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
 * Service for payee business logic with advanced intelligence capabilities
 */
export class PayeeService {
  private intelligenceService: PayeeIntelligenceService;
  private learningService: CategoryLearningService;
  private mlCoordinator: PayeeMLCoordinator;

  constructor(
    private repository: PayeeRepository = new PayeeRepository()
  ) {
    this.intelligenceService = new PayeeIntelligenceService();
    this.learningService = new CategoryLearningService();
    this.mlCoordinator = new PayeeMLCoordinator();
  }

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

  // ==================== ADVANCED INTELLIGENCE METHODS ====================

  /**
   * Analyze comprehensive spending patterns for a payee using advanced algorithms
   */
  async analyzeAdvancedSpendingPatterns(id: number): Promise<SpendingAnalysis> {
    await this.getPayeeById(id); // Verify exists
    return await this.intelligenceService.analyzeSpendingPatterns(id);
  }

  /**
   * Detect seasonal spending patterns with statistical analysis
   */
  async detectSeasonalPatterns(id: number): Promise<SeasonalPattern[]> {
    await this.getPayeeById(id); // Verify exists
    return await this.intelligenceService.detectSeasonality(id);
  }

  /**
   * Analyze day-of-week spending preferences
   */
  async analyzeDayOfWeekPatterns(id: number): Promise<DayOfWeekPattern[]> {
    await this.getPayeeById(id); // Verify exists
    return await this.intelligenceService.analyzeDayOfWeekPatterns(id);
  }

  /**
   * Advanced frequency pattern analysis with irregular pattern support
   */
  async analyzeAdvancedFrequencyPatterns(id: number): Promise<FrequencyAnalysis> {
    await this.getPayeeById(id); // Verify exists
    return await this.intelligenceService.analyzeFrequencyPattern(id);
  }

  /**
   * Predict next transaction timing and amount using machine learning patterns
   */
  async predictNextTransaction(id: number): Promise<TransactionPrediction> {
    await this.getPayeeById(id); // Verify exists
    return await this.intelligenceService.predictNextTransaction(id);
  }

  /**
   * Generate smart budget allocation suggestions with seasonal adjustments
   */
  async generateBudgetAllocationSuggestion(id: number): Promise<BudgetAllocationSuggestion> {
    await this.getPayeeById(id); // Verify exists
    return await this.intelligenceService.suggestBudgetAllocation(id);
  }

  /**
   * Calculate comprehensive confidence scores for all intelligence predictions
   */
  async calculateIntelligenceConfidence(id: number): Promise<ConfidenceMetrics> {
    await this.getPayeeById(id); // Verify exists
    return await this.intelligenceService.calculateConfidenceScores(id);
  }

  /**
   * Get comprehensive payee intelligence analysis combining all advanced features
   */
  async getComprehensiveIntelligence(id: number): Promise<{
    payee: Payee;
    spendingAnalysis: SpendingAnalysis;
    seasonalPatterns: SeasonalPattern[];
    dayOfWeekPatterns: DayOfWeekPattern[];
    frequencyAnalysis: FrequencyAnalysis;
    transactionPrediction: TransactionPrediction;
    budgetSuggestion: BudgetAllocationSuggestion;
    confidenceMetrics: ConfidenceMetrics;
  }> {
    const payee = await this.getPayeeById(id); // Verify exists

    // Run all intelligence analysis in parallel for efficiency
    const [
      spendingAnalysis,
      seasonalPatterns,
      dayOfWeekPatterns,
      frequencyAnalysis,
      transactionPrediction,
      budgetSuggestion,
      confidenceMetrics
    ] = await Promise.all([
      this.intelligenceService.analyzeSpendingPatterns(id),
      this.intelligenceService.detectSeasonality(id),
      this.intelligenceService.analyzeDayOfWeekPatterns(id),
      this.intelligenceService.analyzeFrequencyPattern(id),
      this.intelligenceService.predictNextTransaction(id),
      this.intelligenceService.suggestBudgetAllocation(id),
      this.intelligenceService.calculateConfidenceScores(id)
    ]);

    return {
      payee,
      spendingAnalysis,
      seasonalPatterns,
      dayOfWeekPatterns,
      frequencyAnalysis,
      transactionPrediction,
      budgetSuggestion,
      confidenceMetrics
    };
  }

  /**
   * Apply machine learning insights to automatically improve payee defaults
   */
  async applyIntelligentOptimizations(id: number, options: {
    updateCategory?: boolean;
    updateBudget?: boolean;
    updateFrequency?: boolean;
    updateAmount?: boolean;
    minConfidence?: number;
  } = {}): Promise<{
    updated: boolean;
    changes: Array<{field: string; oldValue: any; newValue: any; confidence: number}>;
    recommendations: Array<{field: string; suggestion: any; confidence: number; reason: string}>;
  }> {
    const {
      updateCategory = true,
      updateBudget = true,
      updateFrequency = true,
      updateAmount = true,
      minConfidence = 0.7
    } = options;

    const payee = await this.getPayeeById(id);
    const budgetSuggestion = await this.intelligenceService.suggestBudgetAllocation(id);
    const frequencyAnalysis = await this.intelligenceService.analyzeFrequencyPattern(id);
    const spendingAnalysis = await this.intelligenceService.analyzeSpendingPatterns(id);

    const changes: Array<{field: string; oldValue: any; newValue: any; confidence: number}> = [];
    const recommendations: Array<{field: string; suggestion: any; confidence: number; reason: string}> = [];
    const updateData: Partial<UpdatePayeeData> = {};

    // Update category if confidence is high enough
    if (updateCategory && budgetSuggestion.budgetCategory.categoryConfidence >= minConfidence &&
        budgetSuggestion.budgetCategory.primaryCategoryId &&
        payee.defaultCategoryId !== budgetSuggestion.budgetCategory.primaryCategoryId) {

      changes.push({
        field: 'defaultCategoryId',
        oldValue: payee.defaultCategoryId,
        newValue: budgetSuggestion.budgetCategory.primaryCategoryId,
        confidence: budgetSuggestion.budgetCategory.categoryConfidence
      });
      updateData.defaultCategoryId = budgetSuggestion.budgetCategory.primaryCategoryId;
    } else if (budgetSuggestion.budgetCategory.primaryCategoryId &&
               budgetSuggestion.budgetCategory.categoryConfidence < minConfidence) {
      recommendations.push({
        field: 'defaultCategoryId',
        suggestion: budgetSuggestion.budgetCategory.primaryCategoryId,
        confidence: budgetSuggestion.budgetCategory.categoryConfidence,
        reason: `Category suggestion confidence (${Math.round(budgetSuggestion.budgetCategory.categoryConfidence * 100)}%) below threshold (${Math.round(minConfidence * 100)}%)`
      });
    }

    // Update payment frequency if detected with high confidence
    if (updateFrequency && frequencyAnalysis.confidence >= minConfidence &&
        frequencyAnalysis.detectedFrequency &&
        payee.paymentFrequency !== frequencyAnalysis.detectedFrequency) {

      changes.push({
        field: 'paymentFrequency',
        oldValue: payee.paymentFrequency,
        newValue: frequencyAnalysis.detectedFrequency,
        confidence: frequencyAnalysis.confidence
      });
      updateData.paymentFrequency = frequencyAnalysis.detectedFrequency;
    } else if (frequencyAnalysis.detectedFrequency && frequencyAnalysis.confidence < minConfidence) {
      recommendations.push({
        field: 'paymentFrequency',
        suggestion: frequencyAnalysis.detectedFrequency,
        confidence: frequencyAnalysis.confidence,
        reason: `Frequency detection confidence (${Math.round(frequencyAnalysis.confidence * 100)}%) below threshold (${Math.round(minConfidence * 100)}%)`
      });
    }

    // Update average amount if significantly different and confident
    if (updateAmount && spendingAnalysis.transactionCount >= 5) {
      const currentAvg = payee.avgAmount || 0;
      const suggestedAvg = spendingAnalysis.averageAmount;
      const difference = Math.abs(currentAvg - suggestedAvg);
      const percentDifference = currentAvg > 0 ? difference / currentAvg : 1;

      if (percentDifference > 0.1) { // 10% difference threshold
        const confidence = Math.min(1, spendingAnalysis.transactionCount / 10) * (1 - Math.min(1, spendingAnalysis.volatility));

        if (confidence >= minConfidence) {
          changes.push({
            field: 'avgAmount',
            oldValue: payee.avgAmount,
            newValue: suggestedAvg,
            confidence
          });
          updateData.avgAmount = suggestedAvg;
        } else {
          recommendations.push({
            field: 'avgAmount',
            suggestion: suggestedAvg,
            confidence,
            reason: `Amount analysis confidence (${Math.round(confidence * 100)}%) below threshold due to volatility or limited data`
          });
        }
      }
    }

    // Apply updates if any
    let updated = false;
    if (Object.keys(updateData).length > 0) {
      await this.updatePayee(id, updateData);
      updated = true;
    }

    return {
      updated,
      changes,
      recommendations
    };
  }

  /**
   * Bulk intelligence analysis for multiple payees with performance optimization
   */
  async bulkIntelligenceAnalysis(payeeIds: number[], options: {
    includeSpendingAnalysis?: boolean;
    includeSeasonalPatterns?: boolean;
    includeFrequencyAnalysis?: boolean;
    includePredictions?: boolean;
    minTransactionCount?: number;
  } = {}): Promise<Array<{
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
  }>> {
    const {
      includeSpendingAnalysis = true,
      includeSeasonalPatterns = false,
      includeFrequencyAnalysis = false,
      includePredictions = false,
      minTransactionCount = 3
    } = options;

    const results = [];

    // Process payees in batches to avoid overwhelming the database
    const batchSize = 10;
    for (let i = 0; i < payeeIds.length; i += batchSize) {
      const batch = payeeIds.slice(i, i + batchSize);

      const batchPromises = batch.map(async (payeeId) => {
        try {
          const payee = await this.getPayeeById(payeeId);

          // Check if payee has sufficient transaction history
          const stats = await this.getPayeeStats(payeeId);
          if (stats.transactionCount < minTransactionCount) {
            return {
              payeeId,
              payeeName: payee.name || 'Unknown',
              analysis: {},
              error: `Insufficient transaction history (${stats.transactionCount} transactions, minimum ${minTransactionCount} required)`
            };
          }

          const analysis: any = {};

          // Run requested analyses
          if (includeSpendingAnalysis) {
            analysis.spendingAnalysis = await this.intelligenceService.analyzeSpendingPatterns(payeeId);
          }

          if (includeSeasonalPatterns) {
            analysis.seasonalPatterns = await this.intelligenceService.detectSeasonality(payeeId);
          }

          if (includeFrequencyAnalysis) {
            analysis.frequencyAnalysis = await this.intelligenceService.analyzeFrequencyPattern(payeeId);
          }

          if (includePredictions) {
            analysis.transactionPrediction = await this.intelligenceService.predictNextTransaction(payeeId);
          }

          // Always include confidence metrics for any analysis
          if (Object.keys(analysis).length > 0) {
            analysis.confidence = await this.intelligenceService.calculateConfidenceScores(payeeId);
          }

          return {
            payeeId,
            payeeName: payee.name || 'Unknown',
            analysis
          };

        } catch (error) {
          return {
            payeeId,
            payeeName: 'Unknown',
            analysis: {},
            error: error instanceof Error ? error.message : 'Unknown error'
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
  async recordCategoryCorrection(data: {
    payeeId: number;
    transactionId?: number;
    fromCategoryId?: number;
    toCategoryId: number;
    correctionTrigger: string;
    correctionContext?: string;
    transactionAmount?: number;
    transactionDate?: string;
    userConfidence?: number;
    notes?: string;
    isOverride?: boolean;
  }): Promise<CategoryCorrection> {
    // Validate payee exists
    await this.getPayeeById(data.payeeId);

    // Record the correction
    return await this.learningService.learnFromCorrection({
      payeeId: data.payeeId,
      transactionId: data.transactionId,
      fromCategoryId: data.fromCategoryId,
      toCategoryId: data.toCategoryId,
      correctionTrigger: data.correctionTrigger as any,
      correctionContext: data.correctionContext as any,
      transactionAmount: data.transactionAmount,
      transactionDate: data.transactionDate,
      userConfidence: data.userConfidence,
      notes: data.notes,
      isOverride: data.isOverride,
    });
  }

  /**
   * Get smart category recommendation based on learning patterns
   */
  async getCategoryRecommendation(
    payeeId: number,
    context?: {
      transactionAmount?: number;
      transactionDate?: string;
    }
  ): Promise<CategoryRecommendation> {
    // Validate payee exists
    await this.getPayeeById(payeeId);

    return await this.learningService.getCategoryRecommendations(payeeId, context);
  }

  /**
   * Calculate confidence score for a specific category assignment
   */
  async calculateCategoryConfidence(
    payeeId: number,
    categoryId: number,
    context?: {
      transactionAmount?: number;
      transactionDate?: string;
    }
  ): Promise<number> {
    // Validate payee exists
    await this.getPayeeById(payeeId);

    return await this.learningService.calculateCategoryConfidence(payeeId, categoryId, context);
  }

  /**
   * Analyze correction patterns for a payee
   */
  async analyzeCorrectionPatterns(
    payeeId: number,
    options?: {
      timeframeMonths?: number;
      minConfidence?: number;
      includeProcessed?: boolean;
    }
  ): Promise<CorrectionPattern[]> {
    // Validate payee exists
    await this.getPayeeById(payeeId);

    return await this.learningService.analyzeCorrectionPatterns(payeeId, options);
  }

  /**
   * Detect category drift for a payee
   */
  async detectCategoryDrift(payeeId: number): Promise<CategoryDrift | null> {
    // Validate payee exists
    await this.getPayeeById(payeeId);

    return await this.learningService.detectCategoryDrift(payeeId);
  }

  /**
   * Get suggestions for updating payee default categories
   */
  async getDefaultCategoryUpdateSuggestions(): Promise<Array<{
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
  }>> {
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
      method: 'learning' | 'intelligence' | 'hybrid' | 'default';
    };
  }> {
    // Validate payee exists
    const payee = await this.getPayeeById(payeeId);

    // Get learning-based recommendation
    const learningRecommendation = await this.getCategoryRecommendation(payeeId, context);

    // Get intelligence-based analysis
    const [budgetSuggestion, confidenceMetrics] = await Promise.all([
      this.intelligenceService.suggestBudgetAllocation(payeeId),
      this.intelligenceService.calculateConfidenceScores(payeeId)
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
        method: 'learning' as const,
      };
    } else if (budgetSuggestion.budgetCategory.categoryConfidence >= 0.6) {
      // High intelligence confidence - use intelligence recommendation
      combinedRecommendation = {
        categoryId: budgetSuggestion.budgetCategory.primaryCategoryId || 0,
        categoryName: budgetSuggestion.budgetCategory.primaryCategoryName || 'Uncategorized',
        confidence: budgetSuggestion.budgetCategory.categoryConfidence,
        reasoning: `Intelligence-based: ${budgetSuggestion.reasoning}`,
        method: 'intelligence' as const,
      };
    } else if (learningRecommendation.confidence > 0.3 && budgetSuggestion.budgetCategory.categoryConfidence > 0.3) {
      // Moderate confidence from both - create hybrid
      const hybridConfidence = (learningRecommendation.confidence + budgetSuggestion.budgetCategory.categoryConfidence) / 2;

      combinedRecommendation = {
        categoryId: learningRecommendation.confidence > budgetSuggestion.budgetCategory.categoryConfidence
          ? learningRecommendation.recommendedCategoryId
          : (budgetSuggestion.budgetCategory.primaryCategoryId || 0),
        categoryName: learningRecommendation.confidence > budgetSuggestion.budgetCategory.categoryConfidence
          ? learningRecommendation.recommendedCategoryName
          : (budgetSuggestion.budgetCategory.primaryCategoryName || 'Uncategorized'),
        confidence: hybridConfidence,
        reasoning: `Hybrid approach combining learning and intelligence analysis`,
        method: 'hybrid' as const,
      };
    } else {
      // Low confidence - use payee default or uncategorized
      combinedRecommendation = {
        categoryId: payee.defaultCategoryId || 0,
        categoryName: payee.defaultCategoryId ? 'Default Category' : 'Uncategorized',
        confidence: payee.defaultCategoryId ? 0.3 : 0.1,
        reasoning: payee.defaultCategoryId
          ? 'Using payee default category due to insufficient learning data'
          : 'No sufficient data for recommendation',
        method: 'default' as const,
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
  async applyLearningBasedUpdates(options: {
    minConfidence?: number;
    minCorrectionCount?: number;
    dryRun?: boolean;
  } = {}): Promise<{
    updatedPayees: Array<{
      payeeId: number;
      payeeName: string;
      changes: Array<{field: string; oldValue: any; newValue: any; confidence: number}>;
    }>;
    skippedPayees: Array<{
      payeeId: number;
      payeeName: string;
      reason: string;
    }>;
  }> {
    const {
      minConfidence = 0.7,
      minCorrectionCount = 5,
      dryRun = false
    } = options;

    const suggestions = await this.getDefaultCategoryUpdateSuggestions();

    const filteredSuggestions = suggestions.filter(s =>
      s.confidence >= minConfidence && s.correctionCount >= minCorrectionCount
    );

    const updatedPayees = [];
    const skippedPayees = [];

    for (const suggestion of filteredSuggestions) {
      try {
        if (!dryRun) {
          await this.updatePayee(suggestion.payeeId, {
            defaultCategoryId: suggestion.suggestedCategoryId
          });
        }

        updatedPayees.push({
          payeeId: suggestion.payeeId,
          payeeName: suggestion.payeeName,
          changes: [{
            field: 'defaultCategoryId',
            oldValue: suggestion.currentDefaultCategoryId,
            newValue: suggestion.suggestedCategoryId,
            confidence: suggestion.confidence,
          }],
        });
      } catch (error) {
        skippedPayees.push({
          payeeId: suggestion.payeeId,
          payeeName: suggestion.payeeName,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Add skipped suggestions that didn't meet criteria
    const lowConfidenceSuggestions = suggestions.filter(s =>
      s.confidence < minConfidence || s.correctionCount < minCorrectionCount
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
  async getBudgetOptimizationAnalysis(payeeId: number) {
    await this.validatePayeeExists(payeeId);
    const {BudgetAllocationService} = await import('./budget-allocation');
    const budgetService = new BudgetAllocationService();
    return await budgetService.analyzeBudgetOptimization(payeeId);
  }

  /**
   * Get optimal budget allocation suggestions
   */
  async getBudgetAllocationSuggestions(
    accountId?: number,
    options: {
      strategy?: 'conservative' | 'aggressive' | 'balanced';
      riskTolerance?: number;
      timeHorizon?: number;
    } = {}
  ) {
    const {BudgetAllocationService} = await import('./budget-allocation');
    const budgetService = new BudgetAllocationService();
    return await budgetService.suggestOptimalAllocations(accountId, options);
  }

  /**
   * Generate future budget forecasts for a payee
   */
  async getBudgetForecast(
    payeeId: number,
    forecastPeriod: 'monthly' | 'quarterly' | 'yearly' = 'monthly',
    periodsAhead: number = 12
  ) {
    await this.validatePayeeExists(payeeId);
    const {BudgetAllocationService} = await import('./budget-allocation');
    const budgetService = new BudgetAllocationService();
    return await budgetService.predictFutureBudgetNeeds(payeeId, forecastPeriod, periodsAhead);
  }

  /**
   * Get comprehensive budget health metrics for a payee
   */
  async getBudgetHealthMetrics(payeeId: number) {
    await this.validatePayeeExists(payeeId);
    const {BudgetAllocationService} = await import('./budget-allocation');
    const budgetService = new BudgetAllocationService();
    return await budgetService.calculateBudgetHealth(payeeId);
  }

  /**
   * Generate budget rebalancing plan
   */
  async getBudgetRebalancingPlan(
    accountId?: number,
    strategy: 'conservative' | 'aggressive' | 'balanced' = 'balanced'
  ) {
    const {BudgetAllocationService} = await import('./budget-allocation');
    const budgetService = new BudgetAllocationService();
    return await budgetService.generateBudgetRebalancing(accountId, strategy);
  }

  /**
   * Get budget efficiency analysis for a payee
   */
  async getBudgetEfficiencyAnalysis(payeeId: number, currentBudget?: number) {
    await this.validatePayeeExists(payeeId);
    const {BudgetAllocationService} = await import('./budget-allocation');
    const budgetService = new BudgetAllocationService();
    return await budgetService.calculateBudgetEfficiency(payeeId, currentBudget);
  }

  /**
   * Optimize budgets across multiple payees
   */
  async getMultiPayeeBudgetOptimization(
    payeeIds: number[],
    totalBudgetConstraint?: number,
    objectives: {
      minimizeRisk?: boolean;
      maximizeUtilization?: boolean;
      balanceAllocations?: boolean;
    } = {}
  ) {
    // Validate all payee IDs
    for (const payeeId of payeeIds) {
      await this.validatePayeeExists(payeeId);
    }

    const {BudgetAllocationService} = await import('./budget-allocation');
    const budgetService = new BudgetAllocationService();
    return await budgetService.optimizeMultiPayeeBudgets(payeeIds, totalBudgetConstraint, objectives);
  }

  /**
   * Generate budget scenario analysis
   */
  async getBudgetScenarioAnalysis(
    payeeIds: number[],
    scenarios: Array<{
      name: string;
      description: string;
      type: 'conservative' | 'optimistic' | 'realistic' | 'stress_test';
      assumptions: Record<string, any>;
    }>
  ) {
    // Validate all payee IDs
    for (const payeeId of payeeIds) {
      await this.validatePayeeExists(payeeId);
    }

    const {BudgetAllocationService} = await import('./budget-allocation');
    const budgetService = new BudgetAllocationService();

    // Generate scenarios for each payee
    const scenarioResults = [];

    for (const scenario of scenarios) {
      const results = {
        totalBudget: 0,
        payeeAllocations: {} as Record<number, number>,
        riskScore: 0,
        confidenceScore: 0,
        expectedUtilization: 0
      };

      let totalRisk = 0;
      let totalConfidence = 0;
      let totalUtilization = 0;

      for (const payeeId of payeeIds) {
        const optimization = await budgetService.analyzeBudgetOptimization(payeeId);

        // Apply scenario assumptions to the optimization
        let adjustedAllocation = optimization.recommendations.optimizedAllocation;

        // Apply scenario-specific adjustments
        if (scenario.type === 'conservative') {
          adjustedAllocation *= 0.85;
        } else if (scenario.type === 'optimistic') {
          adjustedAllocation *= 1.15;
        } else if (scenario.type === 'stress_test') {
          adjustedAllocation *= 1.3; // Stress test with higher allocations
        }

        // Apply custom assumptions from scenario
        if (scenario.assumptions.budgetMultiplier) {
          adjustedAllocation *= scenario.assumptions.budgetMultiplier;
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
        results
      });
    }

    return scenarioResults;
  }

  /**
   * Get bulk budget optimization for multiple payees
   */
  async getBulkBudgetOptimization(
    accountId?: number,
    filters: {
      minTransactionCount?: number;
      minSpendingAmount?: number;
      includeInactive?: boolean;
    } = {}
  ) {
    const {
      minTransactionCount = 5,
      minSpendingAmount = 100,
      includeInactive = false
    } = filters;

    // Get payees that meet the criteria
    const payeesWithStats = await this.repository.getPayeesWithStats(accountId);

    const eligiblePayees = payeesWithStats.filter(payee => {
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
          averageEfficiencyImprovement: 0
        }
      };
    }

    const {BudgetAllocationService} = await import('./budget-allocation');
    const budgetService = new BudgetAllocationService();

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
          optimization
        });

        totalCurrentBudget += optimization.currentBudgetAllocation || 0;
        totalOptimizedBudget += optimization.recommendations.optimizedAllocation;
        totalEfficiencyImprovement += optimization.efficiency.score;
      } catch (error) {
        // Skip payees that can't be analyzed
        console.warn(`Failed to analyze payee ${payee.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const totalSavings = totalOptimizedBudget - totalCurrentBudget;
    const averageEfficiencyImprovement = optimizations.length > 0
      ? totalEfficiencyImprovement / optimizations.length
      : 0;

    return {
      eligiblePayees: eligiblePayees.map(p => ({
        id: p.id,
        name: p.name,
        isActive: p.isActive,
        stats: p.stats
      })),
      optimizations,
      summary: {
        totalPayees: optimizations.length,
        totalCurrentBudget,
        totalOptimizedBudget,
        totalSavings,
        averageEfficiencyImprovement
      }
    };
  }

  // Helper method to validate payee exists
  private async validatePayeeExists(payeeId: number): Promise<void> {
    const payee = await this.repository.findById(payeeId);
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
    context?: {
      transactionAmount?: number;
      transactionDate?: string;
      userPreferences?: Record<string, any>;
      riskTolerance?: number;
    }
  ): Promise<UnifiedRecommendations> {
    await this.validatePayeeExists(payeeId);
    return await this.mlCoordinator.generateUnifiedRecommendations(payeeId, context);
  }

  /**
   * Perform sophisticated cross-system learning analysis
   */
  async getCrossSystemLearning(payeeId: number): Promise<CrossSystemLearning> {
    await this.validatePayeeExists(payeeId);
    return await this.mlCoordinator.performCrossSystemLearning(payeeId);
  }

  /**
   * Execute adaptive optimization that automatically optimizes payee settings
   */
  async executeAdaptiveOptimization(
    payeeId: number,
    options: {
      applyCategorizationUpdates?: boolean;
      applyBudgetUpdates?: boolean;
      applyAutomationRules?: boolean;
      confidenceThreshold?: number;
      dryRun?: boolean;
    } = {}
  ) {
    await this.validatePayeeExists(payeeId);
    return await this.mlCoordinator.executeAdaptiveOptimization(payeeId, options);
  }

  /**
   * Assess meta-confidence across all ML systems
   */
  async getSystemConfidence(payeeId: number) {
    await this.validatePayeeExists(payeeId);
    return await this.mlCoordinator.assessSystemConfidence(payeeId);
  }

  /**
   * Detect significant changes in payee behavior patterns
   */
  async detectBehaviorChanges(
    payeeId: number,
    lookbackMonths: number = 6
  ): Promise<BehaviorChangeDetection> {
    await this.validatePayeeExists(payeeId);
    return await this.mlCoordinator.detectPayeeBehaviorChanges(payeeId, lookbackMonths);
  }

  /**
   * Generate specific actionable insights with implementation steps
   */
  async getActionableInsights(
    payeeId: number,
    insightTypes?: Array<'optimization' | 'correction' | 'prediction' | 'automation' | 'alert'>
  ): Promise<ActionableInsight[]> {
    await this.validatePayeeExists(payeeId);
    return await this.mlCoordinator.generateActionableInsights(payeeId, insightTypes);
  }

  /**
   * Bulk generate unified recommendations for multiple payees
   */
  async getBulkUnifiedRecommendations(
    payeeIds: number[],
    options: {
      priorityFilter?: 'critical' | 'high' | 'medium' | 'low';
      confidenceThreshold?: number;
      maxResults?: number;
    } = {}
  ): Promise<Array<{payeeId: number; recommendations: UnifiedRecommendations}>> {
    const {priorityFilter, confidenceThreshold = 0.5, maxResults = 50} = options;

    // Validate all payee IDs exist
    await Promise.all(payeeIds.map(id => this.validatePayeeExists(id)));

    const results = [];
    for (const payeeId of payeeIds.slice(0, maxResults)) {
      try {
        const recommendations = await this.mlCoordinator.generateUnifiedRecommendations(payeeId);

        // Apply filters
        const meetsCriteria =
          recommendations.overall.confidence >= confidenceThreshold &&
          (!priorityFilter || recommendations.overall.priority === priorityFilter);

        if (meetsCriteria) {
          results.push({payeeId, recommendations});
        }
      } catch (error) {
        console.warn(`Failed to generate recommendations for payee ${payeeId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Sort by priority and confidence
    return results.sort((a, b) => {
      const priorityOrder = {critical: 4, high: 3, medium: 2, low: 1};
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
    payeeId?: number,
    period?: {
      startDate: string;
      endDate: string;
      periodType: 'daily' | 'weekly' | 'monthly';
    }
  ): Promise<MLPerformanceMetrics[]> {
    if (payeeId) {
      await this.validatePayeeExists(payeeId);
    }

    // For now, return estimated metrics
    // In a full implementation, this would track actual ML performance over time
    const systems: MLPerformanceMetrics['system'][] = [
      'intelligence', 'learning', 'budget_allocation', 'coordinator', 'ensemble'
    ];

    return systems.map(system => ({
      system,
      period: period || {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
        periodType: 'monthly'
      },
      accuracy: {
        overall: 0.75 + Math.random() * 0.2, // Simulated: 75-95%
        categoryPrediction: 0.78 + Math.random() * 0.15,
        budgetPrediction: 0.72 + Math.random() * 0.18,
        behaviorPrediction: 0.68 + Math.random() * 0.22
      },
      precision: {
        overall: 0.73 + Math.random() * 0.22,
        byCategory: {},
        byBudgetRange: {}
      },
      recall: {
        overall: 0.71 + Math.random() * 0.24,
        byCategory: {},
        byBudgetRange: {}
      },
      f1Score: 0.74 + Math.random() * 0.21,
      confidenceCalibration: {
        overconfidenceRate: Math.random() * 0.15,
        underconfidenceRate: Math.random() * 0.12,
        calibrationScore: 0.82 + Math.random() * 0.15
      },
      adaptationMetrics: {
        learningRate: 0.15 + Math.random() * 0.1,
        forgettingRate: 0.05 + Math.random() * 0.05,
        adaptationSpeed: 0.8 + Math.random() * 0.15
      },
      userFeedback: {
        acceptanceRate: 0.76 + Math.random() * 0.2,
        correctionRate: 0.12 + Math.random() * 0.08,
        satisfactionScore: 0.81 + Math.random() * 0.15
      },
      systemLoad: {
        averageResponseTime: 150 + Math.random() * 100,
        throughput: 45 + Math.random() * 25,
        errorRate: Math.random() * 0.05
      },
      dataQuality: {
        completeness: 0.88 + Math.random() * 0.1,
        consistency: 0.91 + Math.random() * 0.08,
        freshness: 0.85 + Math.random() * 0.12
      }
    }));
  }

  /**
   * Apply ML-based automation rules across multiple payees
   */
  async applyBulkMLAutomation(
    payeeIds: number[],
    options: {
      confidenceThreshold?: number;
      maxAutomations?: number;
      dryRun?: boolean;
      automationTypes?: Array<'category' | 'budget' | 'rules'>;
    } = {}
  ) {
    const {
      confidenceThreshold = 0.8,
      maxAutomations = 20,
      dryRun = false,
      automationTypes = ['category', 'budget']
    } = options;

    // Validate all payee IDs
    await Promise.all(payeeIds.map(id => this.validatePayeeExists(id)));

    const results = [];
    let automationsApplied = 0;

    for (const payeeId of payeeIds) {
      if (automationsApplied >= maxAutomations) break;

      try {
        const automationResult = await this.mlCoordinator.executeAdaptiveOptimization(payeeId, {
          applyCategorizationUpdates: automationTypes.includes('category'),
          applyBudgetUpdates: automationTypes.includes('budget'),
          applyAutomationRules: automationTypes.includes('rules'),
          confidenceThreshold,
          dryRun
        });

        if (automationResult.applied.length > 0) {
          results.push({
            payeeId,
            ...automationResult
          });
          automationsApplied += automationResult.applied.length;
        }
      } catch (error) {
        results.push({
          payeeId,
          applied: [],
          skipped: [{
            type: 'error',
            reason: error instanceof Error ? error.message : 'Unknown error',
            recommendation: 'Manual review required'
          }],
          performance: {
            processingTime: 0,
            systemsConsulted: [],
            dataPointsAnalyzed: 0
          }
        });
      }
    }

    return {
      results,
      summary: {
        totalPayeesProcessed: payeeIds.length,
        totalAutomationsApplied: automationsApplied,
        successRate: results.filter(r => r.applied.length > 0).length / payeeIds.length,
        averageProcessingTime: results.reduce((sum, r) => sum + r.performance.processingTime, 0) / results.length
      }
    };
  }

  /**
   * Get comprehensive ML insights dashboard data
   */
  async getMLInsightsDashboard(
    filters: {
      payeeIds?: number[];
      insightTypes?: Array<'optimization' | 'correction' | 'prediction' | 'automation' | 'alert'>;
      priorityFilter?: 'critical' | 'high' | 'medium' | 'low';
      timeRange?: {startDate: string; endDate: string};
    } = {}
  ) {
    const {payeeIds, insightTypes, priorityFilter, timeRange} = filters;

    // Get relevant payees
    const targetPayeeIds = payeeIds || (await this.repository.findAll()).map(p => p.id);

    // Validate payee IDs
    if (payeeIds) {
      await Promise.all(payeeIds.map(id => this.validatePayeeExists(id)));
    }

    // Generate insights for each payee
    const allInsights = [];
    const performanceMetrics = [];
    const behaviorChanges = [];

    for (const payeeId of targetPayeeIds.slice(0, 25)) { // Limit for performance
      try {
        const [insights, behavior, performance] = await Promise.all([
          this.mlCoordinator.generateActionableInsights(payeeId, insightTypes),
          this.mlCoordinator.detectPayeeBehaviorChanges(payeeId),
          this.getMLPerformanceMetrics(payeeId)
        ]);

        // Apply filters
        const filteredInsights = insights.filter(insight => {
          if (priorityFilter && insight.priority !== priorityFilter) return false;
          if (timeRange && insight.generatedAt < timeRange.startDate) return false;
          if (timeRange && insight.generatedAt > timeRange.endDate) return false;
          return true;
        });

        allInsights.push(...filteredInsights);
        if (behavior.changeDetected) behaviorChanges.push(behavior);
        performanceMetrics.push(...performance);
      } catch (error) {
        console.warn(`Failed to generate dashboard data for payee ${payeeId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Sort insights by priority and confidence
    allInsights.sort((a, b) => {
      const priorityOrder = {critical: 4, high: 3, medium: 2, low: 1};
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];

      if (aPriority !== bPriority) return bPriority - aPriority;
      return b.confidence - a.confidence;
    });

    // Calculate summary statistics
    const insightsByType = allInsights.reduce((acc, insight) => {
      acc[insight.type] = (acc[insight.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const insightsByPriority = allInsights.reduce((acc, insight) => {
      acc[insight.priority] = (acc[insight.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const averageConfidence = allInsights.length > 0
      ? allInsights.reduce((sum, insight) => sum + insight.confidence, 0) / allInsights.length
      : 0;

    const systemPerformance = performanceMetrics.reduce((acc, metric) => {
      if (!acc[metric.system]) {
        acc[metric.system] = {
          accuracy: metric.accuracy.overall,
          f1Score: metric.f1Score,
          userSatisfaction: metric.userFeedback.satisfactionScore
        };
      }
      return acc;
    }, {} as Record<string, any>);

    return {
      insights: allInsights.slice(0, 50), // Limit returned insights
      behaviorChanges,
      summary: {
        totalInsights: allInsights.length,
        criticalInsights: insightsByPriority.critical || 0,
        highPriorityInsights: insightsByPriority.high || 0,
        behaviorChangesDetected: behaviorChanges.length,
        averageConfidence,
        insightsByType,
        insightsByPriority
      },
      systemPerformance,
      recommendations: [
        ...(allInsights.filter(i => i.priority === 'critical').length > 5
          ? ['High number of critical insights - prioritize immediate attention']
          : []),
        ...(averageConfidence < 0.6
          ? ['Low average confidence - consider data quality improvements']
          : []),
        ...(behaviorChanges.length > 3
          ? ['Multiple behavior changes detected - review payee patterns']
          : [])
      ]
    };
  }
}