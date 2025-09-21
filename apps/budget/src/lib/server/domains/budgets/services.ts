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
  CreateBudgetPeriodData,
  UpdateBudgetPeriodData,
  CreateBudgetAllocationData,
  UpdateBudgetAllocationData,
  BudgetFilters,
  PeriodFilters,
  AllocationFilters,
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

    // Validate budget type
    const validTypes = ["account-monthly", "category-envelope", "goal-based", "scheduled-expense"];
    if (!validTypes.includes(data.type)) {
      throw new ValidationError(`Invalid budget type: ${data.type}`);
    }

    // Validate enforcement level
    const validEnforcement = ["none", "warning", "strict"];
    if (data.enforcement && !validEnforcement.includes(data.enforcement)) {
      throw new ValidationError(`Invalid enforcement level: ${data.enforcement}`);
    }

    // Validate metadata based on budget type
    const validatedMetadata = this.validateBudgetMetadata(data.type, data.metadata);

    // Create the budget
    const budget = await this.budgetRepository.createBudget({
      name: sanitizedName,
      description: sanitizedDescription,
      type: data.type,
      enforcement: data.enforcement || "warning",
      isActive: data.isActive ?? true,
      metadata: validatedMetadata ? JSON.stringify(validatedMetadata) : null
    });

    // Associate accounts if provided
    if (data.accountIds && data.accountIds.length > 0) {
      for (const accountId of data.accountIds) {
        await this.budgetRepository.addAccountToBudget(budget.id, accountId);
      }
    }

    // Associate categories if provided
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
    // Sanitize search query if provided
    if (filters.search) {
      filters.search = InputSanitizer.sanitizeText(filters.search, {
        maxLength: 100,
        allowEmpty: true
      }) || undefined;
    }

    return await this.budgetRepository.getBudgets(filters, pagination);
  }

  async updateBudget(id: number, data: UpdateBudgetData): Promise<void> {
    // Check if budget exists
    await this.getBudgetById(id);

    // Validate and sanitize input
    const updates: any = {};

    if (data.name !== undefined) {
      updates.name = InputSanitizer.sanitizeText(data.name, {
        required: true,
        maxLength: 100
      });
    }

    if (data.description !== undefined) {
      updates.description = data.description
        ? InputSanitizer.sanitizeText(data.description, { maxLength: 500 })
        : null;
    }

    if (data.type !== undefined) {
      const validTypes = ["account-monthly", "category-envelope", "goal-based", "scheduled-expense"];
      if (!validTypes.includes(data.type)) {
        throw new ValidationError(`Invalid budget type: ${data.type}`);
      }
      updates.type = data.type;
    }

    if (data.enforcement !== undefined) {
      const validEnforcement = ["none", "warning", "strict"];
      if (!validEnforcement.includes(data.enforcement)) {
        throw new ValidationError(`Invalid enforcement level: ${data.enforcement}`);
      }
      updates.enforcement = data.enforcement;
    }

    if (data.isActive !== undefined) {
      updates.isActive = data.isActive;
    }

    if (data.metadata !== undefined) {
      const currentBudget = await this.getBudgetById(id);
      const validatedMetadata = this.validateBudgetMetadata(
        data.type || currentBudget.type,
        data.metadata
      );
      updates.metadata = validatedMetadata ? JSON.stringify(validatedMetadata) : null;
    }

    await this.budgetRepository.updateBudget(id, updates);
  }

  async deleteBudget(id: number): Promise<void> {
    // Check if budget exists
    await this.getBudgetById(id);

    // Check if budget has active allocations
    const allocations = await this.budgetRepository.getBudgetAllocations({ budgetId: id });
    if (allocations.data.length > 0) {
      throw new ConflictError(
        "Cannot delete budget with existing allocations. Remove all allocations first."
      );
    }

    await this.budgetRepository.deleteBudget(id);
  }

  // Budget summary and progress tracking
  async getBudgetSummary(budgetId: number, date?: string): Promise<BudgetSummary> {
    const budget = await this.getBudgetByIdWithRelations(budgetId);

    // Calculate totals
    const totalAllocated = this.calculateTotalAllocated(budget);
    const totalSpent = await this.budgetRepository.getBudgetSpending(budgetId);
    const totalRemaining = totalAllocated - totalSpent;
    const percentageUsed = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;
    const isOverBudget = totalSpent > totalAllocated;

    // Find active period
    const activePeriod = this.findActivePeriod(budget.periods || [], date);

    // Get recent allocations
    const recentAllocations = await this.budgetRepository.getBudgetAllocations(
      { budgetId },
      { limit: 5, sortBy: "createdAt", sortOrder: "desc" }
    );

    return {
      budget,
      totalAllocated,
      totalSpent,
      totalRemaining,
      percentageUsed,
      isOverBudget,
      activePeriod,
      recentAllocations: recentAllocations.data
    };
  }

  async getBudgetProgress(budgetId: number, periodId?: number): Promise<BudgetProgress> {
    const budget = await this.getBudgetById(budgetId);
    const spent = await this.budgetRepository.getBudgetSpending(budgetId, periodId);

    let allocated = 0;

    if (budget.type === "account-monthly" && budget.metadata) {
      const metadata = JSON.parse(budget.metadata) as AccountMonthlyMetadata;
      allocated = metadata.monthlyLimit || 0;
    } else if (budget.type === "goal-based" && budget.metadata) {
      const metadata = JSON.parse(budget.metadata) as GoalBasedMetadata;
      allocated = metadata.targetAmount || 0;
    }

    const remaining = allocated - spent;
    const percentageUsed = allocated > 0 ? (spent / allocated) * 100 : 0;
    const isOverBudget = spent > allocated;

    return {
      budgetId,
      periodId,
      allocated,
      spent,
      remaining,
      percentageUsed,
      isOverBudget
    };
  }

  // Budget allocation operations
  async createAllocation(data: CreateBudgetAllocationData): Promise<void> {
    // Validate the allocation
    const validation = await this.validateProposedAllocation(
      data.transactionId,
      data.allocatedAmount
    );

    if (!validation.isValid) {
      throw new ValidationError(`Invalid allocation: ${validation.issues.join(", ")}`);
    }

    // Check if budget exists
    await this.getBudgetById(data.budgetId);

    await this.budgetRepository.createBudgetAllocation({
      budgetId: data.budgetId,
      transactionId: data.transactionId,
      periodId: data.periodId,
      allocatedAmount: data.allocatedAmount,
      percentage: data.percentage,
      assignmentType: data.assignmentType || "manual",
      notes: data.notes ? InputSanitizer.sanitizeText(data.notes, { maxLength: 500 }) : undefined
    });
  }

  async updateAllocation(id: number, data: UpdateBudgetAllocationData): Promise<void> {
    // Validate updates if allocation amount is being changed
    if (data.allocatedAmount !== undefined) {
      // Get existing allocation to check transaction
      const allocations = await this.budgetRepository.getBudgetAllocations({ budgetId: undefined });
      const allocation = allocations.data.find(a => a.id === id);

      if (!allocation) {
        throw new NotFoundError(`Budget allocation with ID ${id} not found`);
      }

      const validation = await this.validateProposedAllocation(
        allocation.transactionId,
        data.allocatedAmount,
        id
      );

      if (!validation.isValid) {
        throw new ValidationError(`Invalid allocation update: ${validation.issues.join(", ")}`);
      }
    }

    const updates: any = {};

    if (data.allocatedAmount !== undefined) {
      updates.allocatedAmount = data.allocatedAmount;
    }

    if (data.percentage !== undefined) {
      updates.percentage = data.percentage;
    }

    if (data.assignmentType !== undefined) {
      updates.assignmentType = data.assignmentType;
    }

    if (data.notes !== undefined) {
      updates.notes = data.notes ? InputSanitizer.sanitizeText(data.notes, { maxLength: 500 }) : null;
    }

    await this.budgetRepository.updateBudgetAllocation(id, updates);
  }

  async deleteAllocation(id: number): Promise<void> {
    await this.budgetRepository.deleteBudgetAllocation(id);
  }

  async getAllocationsByTransaction(transactionId: number) {
    return await this.budgetRepository.getTransactionAllocations(transactionId);
  }

  async getAllocationsByBudget(budgetId: number, filters: AllocationFilters = {}) {
    return await this.budgetRepository.getBudgetAllocations(
      { ...filters, budgetId },
      { sortBy: "createdAt", sortOrder: "desc" }
    );
  }

  // Validation methods
  async validateProposedAllocation(
    transactionId: number,
    newAmount: number,
    excludeAllocationId?: number
  ): Promise<AllocationValidationResult> {
    // Get transaction details
    const transaction = await this.transactionRepository.getTransactionById(transactionId);
    if (!transaction) {
      return {
        isValid: false,
        issues: ["Transaction not found"],
        totalAllocated: 0,
        remainingAmount: 0,
        canProceed: false
      };
    }

    // Get existing allocations for this transaction
    const existingAllocations = await this.budgetRepository.getTransactionAllocations(transactionId);

    // Calculate total allocated (excluding the one being updated)
    const totalAllocated = existingAllocations
      .filter(a => a.id !== excludeAllocationId)
      .reduce((sum, a) => sum + a.allocatedAmount, 0);

    const newTotalAllocated = totalAllocated + newAmount;
    const transactionAmount = Math.abs(transaction.amount);
    const remainingAmount = transactionAmount - newTotalAllocated;

    const issues: string[] = [];
    let isValid = true;
    let canProceed = true;

    // Check if total allocation exceeds transaction amount
    if (newTotalAllocated > transactionAmount) {
      issues.push(`Total allocation (${newTotalAllocated}) exceeds transaction amount (${transactionAmount})`);
      isValid = false;
    }

    // Check if new amount is negative
    if (newAmount < 0) {
      issues.push("Allocation amount cannot be negative");
      isValid = false;
      canProceed = false;
    }

    // Check if new amount is zero
    if (newAmount === 0) {
      issues.push("Allocation amount cannot be zero");
      isValid = false;
    }

    return {
      isValid,
      issues,
      totalAllocated: newTotalAllocated,
      remainingAmount,
      canProceed
    };
  }

  async isTransactionFullyAllocated(transactionId: number): Promise<boolean> {
    const transaction = await this.transactionRepository.getTransactionById(transactionId);
    if (!transaction) return false;

    const totalAllocated = await this.budgetRepository.getTotalAllocatedForTransaction(transactionId);
    const transactionAmount = Math.abs(transaction.amount);

    return totalAllocated >= transactionAmount;
  }

  // Account and category association methods
  async addAccountToBudget(budgetId: number, accountId: number): Promise<void> {
    // Check if budget exists
    await this.getBudgetById(budgetId);

    // Check if association already exists
    const existingAccounts = await this.budgetRepository.getBudgetAccounts(budgetId);
    if (existingAccounts.some(ba => ba.accountId === accountId)) {
      throw new ConflictError("Account is already associated with this budget");
    }

    await this.budgetRepository.addAccountToBudget(budgetId, accountId);
  }

  async addCategoryToBudget(
    budgetId: number,
    categoryId: number,
    allocatedAmount: number = 0
  ): Promise<void> {
    // Check if budget exists
    await this.getBudgetById(budgetId);

    // Validate allocated amount
    if (allocatedAmount < 0) {
      throw new ValidationError("Allocated amount cannot be negative");
    }

    // Check if association already exists
    const existingCategories = await this.budgetRepository.getBudgetCategories(budgetId);
    if (existingCategories.some(bc => bc.categoryId === categoryId)) {
      throw new ConflictError("Category is already associated with this budget");
    }

    await this.budgetRepository.addCategoryToBudget(budgetId, categoryId, allocatedAmount);
  }

  async removeAccountFromBudget(budgetId: number, accountId: number): Promise<void> {
    // Check if budget exists
    await this.getBudgetById(budgetId);

    // Check if association exists
    const existingAccounts = await this.budgetRepository.getBudgetAccounts(budgetId);
    if (!existingAccounts.some(ba => ba.accountId === accountId)) {
      throw new NotFoundError("Account is not associated with this budget");
    }

    await this.budgetRepository.removeAccountFromBudget(budgetId, accountId);
  }

  async removeCategoryFromBudget(budgetId: number, categoryId: number): Promise<void> {
    // Check if budget exists
    await this.getBudgetById(budgetId);

    // Check if association exists
    const existingCategories = await this.budgetRepository.getBudgetCategories(budgetId);
    if (!existingCategories.some(bc => bc.categoryId === categoryId)) {
      throw new NotFoundError("Category is not associated with this budget");
    }

    await this.budgetRepository.removeCategoryFromBudget(budgetId, categoryId);
  }

  // Budget period management methods
  async createBudgetPeriod(data: CreateBudgetPeriodData) {
    // Check if budget exists
    await this.getBudgetById(data.budgetId);

    // Validate date range
    if (data.startDate >= data.endDate) {
      throw new ValidationError("Start date must be before end date");
    }

    // Validate allocated amount
    if (data.allocated < 0) {
      throw new ValidationError("Allocated amount cannot be negative");
    }

    // Check for overlapping periods
    const existingPeriods = await this.budgetRepository.getBudgetPeriods({
      budgetId: data.budgetId
    });

    const hasOverlap = existingPeriods.data.some(period =>
      (data.startDate <= period.endDate && data.endDate >= period.startDate)
    );

    if (hasOverlap) {
      throw new ConflictError("Period dates overlap with existing period");
    }

    return await this.budgetRepository.createBudgetPeriod({
      budgetId: data.budgetId,
      name: InputSanitizer.sanitizeText(data.name, { required: true, maxLength: 100 }),
      startDate: data.startDate,
      endDate: data.endDate,
      allocated: data.allocated,
      rollover: data.rollover || 0,
      spent: 0,
      status: "upcoming"
    });
  }

  async updateBudgetPeriod(id: number, data: UpdateBudgetPeriodData): Promise<void> {
    // Validate input data
    if (data.name) {
      data.name = InputSanitizer.sanitizeText(data.name, { required: true, maxLength: 100 });
    }

    if (data.allocated !== undefined && data.allocated < 0) {
      throw new ValidationError("Allocated amount cannot be negative");
    }

    if (data.startDate && data.endDate && data.startDate >= data.endDate) {
      throw new ValidationError("Start date must be before end date");
    }

    await this.budgetRepository.updateBudgetPeriod(id, data);
  }

  async getBudgetPeriods(
    filters: PeriodFilters = {},
    pagination?: PaginationParams
  ) {
    return await this.budgetRepository.getBudgetPeriods(filters, pagination);
  }

  async deleteBudgetPeriod(id: number): Promise<void> {
    await this.budgetRepository.deleteBudgetPeriod(id);
  }

  // Private helper methods
  private validateBudgetMetadata(
    type: string,
    metadata?: Record<string, any>
  ): Record<string, any> | null {
    if (!metadata) return null;

    try {
      switch (type) {
        case "account-monthly":
          return this.validateAccountMonthlyMetadata(metadata);
        case "category-envelope":
          return this.validateCategoryEnvelopeMetadata(metadata);
        case "goal-based":
          return this.validateGoalBasedMetadata(metadata);
        case "scheduled-expense":
          return this.validateScheduledExpenseMetadata(metadata);
        default:
          return metadata;
      }
    } catch (error) {
      throw new ValidationError(`Invalid metadata for ${type} budget: ${error.message}`);
    }
  }

  private validateAccountMonthlyMetadata(metadata: any): AccountMonthlyMetadata {
    if (typeof metadata.monthlyLimit !== "number" || metadata.monthlyLimit <= 0) {
      throw new Error("monthlyLimit must be a positive number");
    }

    const validated: AccountMonthlyMetadata = {
      monthlyLimit: metadata.monthlyLimit
    };

    if (metadata.warningThreshold !== undefined) {
      if (typeof metadata.warningThreshold !== "number" ||
          metadata.warningThreshold < 0 ||
          metadata.warningThreshold > 100) {
        throw new Error("warningThreshold must be a number between 0 and 100");
      }
      validated.warningThreshold = metadata.warningThreshold;
    }

    if (metadata.includeSubcategories !== undefined) {
      validated.includeSubcategories = Boolean(metadata.includeSubcategories);
    }

    return validated;
  }

  private validateCategoryEnvelopeMetadata(metadata: any): CategoryEnvelopeMetadata {
    const validated: CategoryEnvelopeMetadata = {
      allowRollover: Boolean(metadata.allowRollover)
    };

    if (metadata.rolloverLimit !== undefined) {
      if (typeof metadata.rolloverLimit !== "number" || metadata.rolloverLimit < 0) {
        throw new Error("rolloverLimit must be a non-negative number");
      }
      validated.rolloverLimit = metadata.rolloverLimit;
    }

    if (metadata.autoAllocate !== undefined) {
      validated.autoAllocate = Boolean(metadata.autoAllocate);
    }

    if (metadata.allocationMethod !== undefined) {
      if (!["equal", "weighted", "manual"].includes(metadata.allocationMethod)) {
        throw new Error("allocationMethod must be 'equal', 'weighted', or 'manual'");
      }
      validated.allocationMethod = metadata.allocationMethod;
    }

    return validated;
  }

  private validateGoalBasedMetadata(metadata: any): GoalBasedMetadata {
    if (typeof metadata.targetAmount !== "number" || metadata.targetAmount <= 0) {
      throw new Error("targetAmount must be a positive number");
    }

    if (typeof metadata.targetDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(metadata.targetDate)) {
      throw new Error("targetDate must be a valid date string (YYYY-MM-DD)");
    }

    if (!["spending", "saving"].includes(metadata.goalType)) {
      throw new Error("goalType must be 'spending' or 'saving'");
    }

    const validated: GoalBasedMetadata = {
      targetAmount: metadata.targetAmount,
      targetDate: metadata.targetDate,
      goalType: metadata.goalType
    };

    if (metadata.autoTransfer !== undefined) {
      validated.autoTransfer = Boolean(metadata.autoTransfer);
    }

    if (metadata.transferAccountId !== undefined) {
      if (typeof metadata.transferAccountId !== "number" || metadata.transferAccountId <= 0) {
        throw new Error("transferAccountId must be a positive number");
      }
      validated.transferAccountId = metadata.transferAccountId;
    }

    return validated;
  }

  private validateScheduledExpenseMetadata(metadata: any): ScheduledExpenseMetadata {
    if (typeof metadata.scheduleId !== "number" || metadata.scheduleId <= 0) {
      throw new Error("scheduleId must be a positive number");
    }

    const validated: ScheduledExpenseMetadata = {
      scheduleId: metadata.scheduleId
    };

    if (metadata.bufferPercentage !== undefined) {
      if (typeof metadata.bufferPercentage !== "number" || metadata.bufferPercentage < 0) {
        throw new Error("bufferPercentage must be a non-negative number");
      }
      validated.bufferPercentage = metadata.bufferPercentage;
    }

    if (metadata.autoAllocate !== undefined) {
      validated.autoAllocate = Boolean(metadata.autoAllocate);
    }

    if (metadata.lookAheadMonths !== undefined) {
      if (typeof metadata.lookAheadMonths !== "number" || metadata.lookAheadMonths <= 0) {
        throw new Error("lookAheadMonths must be a positive number");
      }
      validated.lookAheadMonths = metadata.lookAheadMonths;
    }

    return validated;
  }

  private calculateTotalAllocated(budget: BudgetWithRelations): number {
    if (budget.type === "account-monthly" && budget.metadata) {
      const metadata = JSON.parse(budget.metadata) as AccountMonthlyMetadata;
      return metadata.monthlyLimit || 0;
    }

    if (budget.type === "category-envelope" && budget.categories) {
      return budget.categories.reduce((sum, cat) => sum + cat.allocatedAmount, 0);
    }

    if (budget.type === "goal-based" && budget.metadata) {
      const metadata = JSON.parse(budget.metadata) as GoalBasedMetadata;
      return metadata.targetAmount || 0;
    }

    return 0;
  }

  private findActivePeriod(periods: any[], date?: string) {
    const targetDate = date || new Date().toISOString().split('T')[0];

    return periods?.find(p =>
      p.startDate <= targetDate &&
      p.endDate >= targetDate &&
      p.status === "active"
    ) || null;
  }
}