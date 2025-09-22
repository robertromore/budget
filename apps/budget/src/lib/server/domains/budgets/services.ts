import { BudgetRepository } from "./repository";
import { TransactionRepository } from "../transactions/repository";
import type {
  Budget,
  BudgetWithRelations,
  BudgetSummary,
  BudgetProgress,
  AllocationValidationResult,
  CreateBudgetData,
  UpdateBudgetData,
  CreateBudgetPeriodTemplateData,
  UpdateBudgetPeriodTemplateData,
  CreateBudgetPeriodInstanceData,
  UpdateBudgetPeriodInstanceData,
  CreateBudgetTransactionData,
  UpdateBudgetTransactionData,
  BudgetFilters,
  PeriodFilters,
  TransactionFilters,
  PaginationParams,
  PaginatedResult,
  BudgetConstraint,
  AccountMonthlyMetadata,
  CategoryEnvelopeMetadata,
  GoalBasedMetadata,
  ScheduledExpenseMetadata
} from "./types";
import { ValidationError, NotFoundError, ConflictError } from "$lib/server/shared/types/errors";
import { InputSanitizer } from "$lib/server/shared/validation";

export class BudgetService {
  private budgetRepository: BudgetRepository;
  private transactionRepository: TransactionRepository;

  constructor() {
    this.budgetRepository = new BudgetRepository();
    this.transactionRepository = new TransactionRepository();
  }

  // Budget CRUD operations
  async createBudget(data: CreateBudgetData): Promise<Budget> {
    // Validate and sanitize input
    const sanitizedName = InputSanitizer.sanitizeText(data.name, {
      required: true,
      maxLength: 100
    });

    const sanitizedDescription = data.description
      ? InputSanitizer.sanitizeText(data.description, { maxLength: 500 })
      : undefined;

    // Validate budget type and scope compatibility
    this.validateBudgetTypeAndScope(data.type, data.scope);

    // Create budget with new schema fields
    const budget = await this.budgetRepository.createBudget({
      name: sanitizedName,
      description: sanitizedDescription,
      type: data.type,
      scope: data.scope || "account",
      status: data.status || "active",
      enforcementLevel: data.enforcementLevel || "warning",
      metadata: data.metadata || {}
    });

    // Add initial account associations if provided
    if (data.accountIds && data.accountIds.length > 0) {
      for (const accountId of data.accountIds) {
        await this.budgetRepository.addAccountToBudget(budget.id, accountId);
      }
    }

    // Add initial category associations if provided
    if (data.categoryIds && data.categoryIds.length > 0) {
      for (const categoryId of data.categoryIds) {
        await this.budgetRepository.addCategoryToBudget(budget.id, categoryId, 0);
      }
    }

    return budget;
  }

  async getBudgetById(id: number): Promise<Budget> {
    const budget = await this.budgetRepository.getBudgetById(id);
    if (!budget) {
      throw new NotFoundError(`Budget with ID ${id} not found`);
    }
    return budget;
  }

  async getBudgetByIdWithRelations(id: number): Promise<BudgetWithRelations> {
    const budget = await this.budgetRepository.getBudgetByIdWithRelations(id);
    if (!budget) {
      throw new NotFoundError(`Budget with ID ${id} not found`);
    }
    return budget;
  }

  async getBudgets(
    filters: BudgetFilters = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResult<Budget>> {
    return await this.budgetRepository.getBudgets(filters, pagination);
  }

  async updateBudget(id: number, data: UpdateBudgetData): Promise<void> {
    const existingBudget = await this.budgetRepository.getBudgetById(id);
    if (!existingBudget) {
      throw new NotFoundError(`Budget with ID ${id} not found`);
    }

    // Sanitize text fields if provided
    const updates: Partial<CreateBudgetData> = {};

    if (data.name !== undefined) {
      updates.name = InputSanitizer.sanitizeText(data.name, {
        required: true,
        maxLength: 100
      });
    }

    if (data.description !== undefined) {
      if (data.description) {
        updates.description = InputSanitizer.sanitizeText(data.description, { maxLength: 500 });
      }
      // Don't set undefined for exactOptionalPropertyTypes compliance
    }

    if (data.type !== undefined) {
      updates.type = data.type;
    }

    if (data.scope !== undefined) {
      updates.scope = data.scope;
    }

    if (data.status !== undefined) {
      updates.status = data.status;
    }

    if (data.enforcementLevel !== undefined) {
      updates.enforcementLevel = data.enforcementLevel;
    }

    if (data.metadata !== undefined) {
      updates.metadata = data.metadata;
    }

    await this.budgetRepository.updateBudget(id, updates);
  }

  async deleteBudget(id: number): Promise<void> {
    const budget = await this.budgetRepository.getBudgetById(id);
    if (!budget) {
      throw new NotFoundError(`Budget with ID ${id} not found`);
    }

    await this.budgetRepository.deleteBudget(id);
  }

  // Budget-Account associations
  async addAccountToBudget(budgetId: number, accountId: number): Promise<void> {
    const budget = await this.budgetRepository.getBudgetById(budgetId);
    if (!budget) {
      throw new NotFoundError(`Budget with ID ${budgetId} not found`);
    }

    try {
      await this.budgetRepository.addAccountToBudget(budgetId, accountId);
    } catch (error: any) {
      if (error.message?.includes("UNIQUE constraint failed")) {
        throw new ConflictError("Account is already associated with this budget");
      }
      throw error;
    }
  }

  async removeAccountFromBudget(budgetId: number, accountId: number): Promise<void> {
    await this.budgetRepository.removeAccountFromBudget(budgetId, accountId);
  }

  // Budget-Category associations
  async addCategoryToBudget(
    budgetId: number,
    categoryId: number,
    allocatedAmount: number = 0
  ): Promise<void> {
    const budget = await this.budgetRepository.getBudgetById(budgetId);
    if (!budget) {
      throw new NotFoundError(`Budget with ID ${budgetId} not found`);
    }

    if (allocatedAmount < 0) {
      throw new ValidationError("Allocated amount cannot be negative");
    }

    try {
      await this.budgetRepository.addCategoryToBudget(budgetId, categoryId, allocatedAmount);
    } catch (error: any) {
      if (error.message?.includes("UNIQUE constraint failed")) {
        throw new ConflictError("Category is already associated with this budget");
      }
      throw error;
    }
  }

  async removeCategoryFromBudget(budgetId: number, categoryId: number): Promise<void> {
    await this.budgetRepository.removeCategoryFromBudget(budgetId, categoryId);
  }

  // Budget Period Templates
  async createBudgetPeriodTemplate(data: CreateBudgetPeriodTemplateData): Promise<any> {
    const budget = await this.budgetRepository.getBudgetById(data.budgetId);
    if (!budget) {
      throw new NotFoundError(`Budget with ID ${data.budgetId} not found`);
    }

    // Validate template configuration based on type
    this.validatePeriodTemplate(data);

    return await this.budgetRepository.createBudgetPeriodTemplate(data);
  }

  async getBudgetPeriodTemplates(budgetId: number): Promise<any[]> {
    return await this.budgetRepository.getBudgetPeriodTemplates(budgetId);
  }

  async updateBudgetPeriodTemplate(id: number, data: UpdateBudgetPeriodTemplateData): Promise<void> {
    const template = await this.budgetRepository.getBudgetPeriodTemplateById(id);
    if (!template) {
      throw new NotFoundError(`Budget period template with ID ${id} not found`);
    }

    if (Object.keys(data).length > 0) {
      // Validate if type is being changed
      if (data.type) {
        this.validatePeriodTemplate({ ...template, ...data } as CreateBudgetPeriodTemplateData);
      }
    }

    await this.budgetRepository.updateBudgetPeriodTemplate(id, data);
  }

  async deleteBudgetPeriodTemplate(id: number): Promise<void> {
    const template = await this.budgetRepository.getBudgetPeriodTemplateById(id);
    if (!template) {
      throw new NotFoundError(`Budget period template with ID ${id} not found`);
    }

    await this.budgetRepository.deleteBudgetPeriodTemplate(id);
  }

  // Budget Period Instances
  async createBudgetPeriodInstance(data: CreateBudgetPeriodInstanceData): Promise<any> {
    const template = await this.budgetRepository.getBudgetPeriodTemplateById(data.templateId);
    if (!template) {
      throw new NotFoundError(`Budget period template with ID ${data.templateId} not found`);
    }

    // Validate date range
    if (new Date(data.startDate) >= new Date(data.endDate)) {
      throw new ValidationError("Start date must be before end date");
    }

    if (data.allocatedAmount < 0) {
      throw new ValidationError("Allocated amount cannot be negative");
    }

    return await this.budgetRepository.createBudgetPeriodInstance(data);
  }

  async getBudgetPeriodInstances(
    filters: PeriodFilters = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResult<any>> {
    return await this.budgetRepository.getBudgetPeriodInstances(filters, pagination);
  }

  async updateBudgetPeriodInstance(id: number, data: UpdateBudgetPeriodInstanceData): Promise<void> {
    const instance = await this.budgetRepository.getBudgetPeriodInstanceById(id);
    if (!instance) {
      throw new NotFoundError(`Budget period instance with ID ${id} not found`);
    }

    // Validate date range if dates are being updated
    if (data.startDate || data.endDate) {
      const startDate = data.startDate || instance.startDate;
      const endDate = data.endDate || instance.endDate;

      if (new Date(startDate) >= new Date(endDate)) {
        throw new ValidationError("Start date must be before end date");
      }
    }

    if (data.allocatedAmount !== undefined && data.allocatedAmount < 0) {
      throw new ValidationError("Allocated amount cannot be negative");
    }

    await this.budgetRepository.updateBudgetPeriodInstance(id, data);
  }

  async deleteBudgetPeriodInstance(id: number): Promise<void> {
    const instance = await this.budgetRepository.getBudgetPeriodInstanceById(id);
    if (!instance) {
      throw new NotFoundError(`Budget period instance with ID ${id} not found`);
    }

    await this.budgetRepository.deleteBudgetPeriodInstance(id);
  }

  // Budget Transactions (replaces allocations)
  async createBudgetTransaction(data: CreateBudgetTransactionData): Promise<any> {
    // Validate the proposed allocation
    const validation = await this.validateProposedAllocation(
      data.transactionId,
      data.allocatedAmount
    );

    if (!validation.isValid) {
      throw new ValidationError(`Invalid allocation: ${validation.issues.join(", ")}`);
    }

    // Create the budget transaction with audit trail
    return await this.budgetRepository.createBudgetTransaction({
      budgetId: data.budgetId,
      transactionId: data.transactionId,
      allocatedAmount: data.allocatedAmount,
      autoAssigned: data.autoAssigned ?? true,
      assignedBy: data.assignedBy,
      assignedAt: new Date().toISOString()
    });
  }

  async updateBudgetTransaction(id: number, data: UpdateBudgetTransactionData): Promise<void> {
    // Validate updates if allocation amount is being changed
    if (data.allocatedAmount !== undefined) {
      // Get existing transaction to check validation
      const transaction = await this.budgetRepository.getBudgetTransactionById(id);

      if (!transaction) {
        throw new NotFoundError(`Budget transaction with ID ${id} not found`);
      }

      const validation = await this.validateProposedAllocation(
        transaction.transactionId,
        data.allocatedAmount,
        id
      );

      if (!validation.isValid) {
        throw new ValidationError(`Invalid allocation update: ${validation.issues.join(", ")}`);
      }
    }

    await this.budgetRepository.updateBudgetTransaction(id, data);
  }

  async deleteBudgetTransaction(id: number): Promise<void> {
    const transaction = await this.budgetRepository.getBudgetTransactionById(id);
    if (!transaction) {
      throw new NotFoundError(`Budget transaction with ID ${id} not found`);
    }

    await this.budgetRepository.deleteBudgetTransaction(id);
  }

  async getBudgetTransactionsByBudget(
    budgetId: number,
    filters: TransactionFilters = {}
  ): Promise<any[]> {
    const result = await this.budgetRepository.getBudgetTransactions({
      ...filters,
      budgetId
    });
    return result.data;
  }

  async getBudgetTransactionsByTransaction(transactionId: number): Promise<any[]> {
    return await this.budgetRepository.getBudgetTransactionsByTransaction(transactionId);
  }

  async isTransactionFullyAllocated(transactionId: number): Promise<boolean> {
    const transaction = await this.transactionRepository.findById(transactionId);
    if (!transaction) {
      throw new NotFoundError(`Transaction with ID ${transactionId} not found`);
    }

    const budgetTransactions = await this.budgetRepository.getBudgetTransactionsByTransaction(transactionId);
    const totalAllocated = budgetTransactions.reduce((sum, bt) => sum + bt.allocatedAmount, 0);
    return Math.abs(totalAllocated) === Math.abs(transaction.amount);
  }

  // Allocation validation following design plan rules
  async validateProposedAllocation(
    transactionId: number,
    newAmount: number,
    excludeBudgetTransactionId?: number
  ): Promise<AllocationValidationResult> {
    // Get the source transaction
    const transaction = await this.transactionRepository.findById(transactionId);
    if (!transaction) {
      throw new NotFoundError(`Transaction with ID ${transactionId} not found`);
    }

    // Get existing budget transactions for this transaction
    const existingBudgetTransactions = await this.budgetRepository.getBudgetTransactionsByTransaction(transactionId);

    // Calculate total allocated (excluding the one being updated)
    const totalAllocated = existingBudgetTransactions
      .filter(bt => bt.id !== excludeBudgetTransactionId)
      .reduce((sum, bt) => sum + bt.allocatedAmount, 0);

    const newTotalAllocated = totalAllocated + newAmount;
    const transactionAmount = transaction.amount;
    const absTransactionAmount = Math.abs(transactionAmount);
    const remainingAmount = absTransactionAmount - Math.abs(newTotalAllocated);

    const issues: string[] = [];
    let isValid = true;
    let canProceed = true;

    // Check sign consistency: allocation must have same sign as transaction OR be zero
    if (newAmount !== 0) {
      const transactionIsNegative = transactionAmount < 0;
      const allocationIsNegative = newAmount < 0;

      if (transactionIsNegative !== allocationIsNegative) {
        issues.push(`Allocation amount sign must match transaction amount sign (transaction: ${transactionAmount}, allocation: ${newAmount})`);
        isValid = false;
        canProceed = false;
      }
    }

    // Check if total allocation exceeds transaction amount (using absolute values)
    if (Math.abs(newTotalAllocated) > absTransactionAmount) {
      issues.push(`Total allocation absolute value (${Math.abs(newTotalAllocated)}) exceeds transaction absolute value (${absTransactionAmount})`);
      isValid = false;
    }

    // Zero allocations are explicitly allowed for audit trail preservation

    return {
      isValid,
      issues,
      totalAllocated: newTotalAllocated,
      remainingAmount,
      canProceed
    };
  }

  // Budget analysis and reporting
  async getBudgetSummary(budgetId: number, date?: string): Promise<BudgetSummary> {
    const budget = await this.budgetRepository.getBudgetByIdWithRelations(budgetId);
    if (!budget) {
      throw new NotFoundError(`Budget with ID ${budgetId} not found`);
    }

    const totalSpent = await this.budgetRepository.getBudgetSpending(budgetId);
    const recentTransactions = await this.getBudgetTransactionsByBudget(budgetId);

    // Calculate totals based on budget type
    let totalAllocated = 0;
    if (budget.type === "category-envelope") {
      // For envelope budgets, sum category allocations
      totalAllocated = budget.categories?.reduce((sum, cat) => sum + (cat.allocatedAmount || 0), 0) || 0;
    } else {
      // For other types, derive from metadata or period instances
      totalAllocated = this.calculateBudgetAllocated(budget);
    }

    const totalRemaining = totalAllocated + totalSpent; // totalSpent is negative for expenses
    const percentageUsed = totalAllocated > 0 ? Math.abs(totalSpent / totalAllocated) * 100 : 0;
    const isOverBudget = Math.abs(totalSpent) > totalAllocated;

    return {
      budget,
      totalAllocated,
      totalSpent,
      totalRemaining,
      percentageUsed,
      isOverBudget,
      activePeriod: this.findActivePeriod(budget.periodInstances || [], date),
      recentTransactions: recentTransactions.slice(0, 5) // Recent 5 transactions
    };
  }

  async getBudgetProgress(budgetId: number, periodId?: number): Promise<BudgetProgress> {
    const budget = await this.budgetRepository.getBudgetById(budgetId);
    if (!budget) {
      throw new NotFoundError(`Budget with ID ${budgetId} not found`);
    }

    let allocated = 0;
    let spent = 0;

    if (periodId) {
      const instance = await this.budgetRepository.getBudgetPeriodInstanceById(periodId);
      if (!instance) {
        throw new NotFoundError(`Budget period instance with ID ${periodId} not found`);
      }
      allocated = instance.allocatedAmount;
      spent = instance.actualAmount;
    } else {
      // Calculate overall budget progress
      allocated = this.calculateBudgetAllocated(budget);
      spent = await this.budgetRepository.getBudgetSpending(budgetId);
    }

    const remaining = allocated + spent; // spent is negative for expenses
    const percentageUsed = allocated > 0 ? Math.abs(spent / allocated) * 100 : 0;
    const isOverBudget = Math.abs(spent) > allocated;

    return {
      budgetId,
      ...(periodId !== undefined && { periodId }),
      allocated,
      spent,
      remaining,
      percentageUsed,
      isOverBudget
    };
  }

  // Private helper methods
  private validateBudgetTypeAndScope(type: string, scope?: string): void {
    // Validate type-scope compatibility based on design plan
    const validCombinations: Record<string, string[]> = {
      "account-monthly": ["account"],
      "category-envelope": ["category", "mixed"],
      "goal-based": ["global", "account", "category"],
      "scheduled-expense": ["account", "category", "mixed"]
    };

    const validScopes = validCombinations[type];
    if (scope && validScopes && !validScopes.includes(scope)) {
      throw new ValidationError(`Budget type '${type}' is not compatible with scope '${scope}'`);
    }
  }

  private validatePeriodTemplate(data: CreateBudgetPeriodTemplateData): void {
    if (data.type === "weekly" && !data.startDayOfWeek) {
      throw new ValidationError("Weekly templates require startDayOfWeek");
    }

    if (data.type === "monthly" && !data.startDayOfMonth) {
      throw new ValidationError("Monthly templates require startDayOfMonth");
    }

    if (data.type === "yearly" && (!data.startDayOfMonth || !data.startMonth)) {
      throw new ValidationError("Yearly templates require startDayOfMonth and startMonth");
    }

    if (data.startDayOfWeek && (data.startDayOfWeek < 1 || data.startDayOfWeek > 7)) {
      throw new ValidationError("startDayOfWeek must be between 1 (Monday) and 7 (Sunday)");
    }

    if (data.startDayOfMonth && (data.startDayOfMonth < 1 || data.startDayOfMonth > 31)) {
      throw new ValidationError("startDayOfMonth must be between 1 and 31");
    }

    if (data.startMonth && (data.startMonth < 1 || data.startMonth > 12)) {
      throw new ValidationError("startMonth must be between 1 and 12");
    }
  }

  private calculateBudgetAllocated(budget: any): number {
    // Calculate allocated amount based on budget type and metadata
    if (budget.metadata?.totalAllocated) {
      return budget.metadata.totalAllocated;
    }

    // Fallback to period instances if available
    if (budget.periodInstances?.length > 0) {
      return budget.periodInstances.reduce((sum: number, instance: any) =>
        sum + (instance.allocatedAmount || 0), 0);
    }

    return 0;
  }

  private findActivePeriod(periods: any[], date?: string): any {
    const targetDate = date || new Date().toISOString().split('T')[0];

    if (!periods || !targetDate) return null;

    // In the new schema, a period is "active" if the target date falls within its date range
    return periods.find(p =>
      p.startDate <= targetDate &&
      p.endDate >= targetDate
    ) || null;
  }
}