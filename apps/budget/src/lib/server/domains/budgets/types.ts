import type {
  Budget,
  NewBudget,
  BudgetAccount,
  NewBudgetAccount,
  BudgetCategory,
  NewBudgetCategory,
  BudgetPeriod,
  NewBudgetPeriod,
  BudgetAllocation,
  NewBudgetAllocation
} from "$lib/schema/budgets";
import type { Account } from "$lib/schema/accounts";
import type { Category } from "$lib/schema/categories";
import type { Transaction } from "$lib/schema/transactions";

// Domain Types
export type {
  Budget,
  NewBudget,
  BudgetAccount,
  NewBudgetAccount,
  BudgetCategory,
  NewBudgetCategory,
  BudgetPeriod,
  NewBudgetPeriod,
  BudgetAllocation,
  NewBudgetAllocation
};

// Extended budget types with relations
export interface BudgetWithRelations extends Budget {
  accounts?: Account[];
  categories?: BudgetCategory[];
  periods?: BudgetPeriod[];
  allocations?: BudgetAllocation[];
}

export interface BudgetCategoryWithCategory extends BudgetCategory {
  category: Category;
}

export interface BudgetAllocationWithTransaction extends BudgetAllocation {
  transaction: Transaction;
}

// Service layer types
export interface CreateBudgetData {
  name: string;
  description?: string;
  type: "account-monthly" | "category-envelope" | "goal-based" | "scheduled-expense";
  enforcement?: "none" | "warning" | "strict";
  isActive?: boolean;
  metadata?: Record<string, any>;
  accountIds?: number[];
  categoryIds?: number[];
}

export interface UpdateBudgetData {
  name?: string;
  description?: string;
  type?: "account-monthly" | "category-envelope" | "goal-based" | "scheduled-expense";
  enforcement?: "none" | "warning" | "strict";
  isActive?: boolean;
  metadata?: Record<string, any>;
}

export interface CreateBudgetPeriodData {
  budgetId: number;
  name: string;
  startDate: string;
  endDate: string;
  allocated: number;
  rollover?: number;
}

export interface UpdateBudgetPeriodData {
  name?: string;
  startDate?: string;
  endDate?: string;
  allocated?: number;
  spent?: number;
  rollover?: number;
  status?: "upcoming" | "active" | "completed" | "archived";
}

export interface CreateBudgetAllocationData {
  budgetId: number;
  transactionId: number;
  periodId?: number;
  allocatedAmount: number;
  percentage?: number;
  assignmentType?: "automatic" | "manual" | "split";
  notes?: string;
}

export interface UpdateBudgetAllocationData {
  allocatedAmount?: number;
  percentage?: number;
  assignmentType?: "automatic" | "manual" | "split";
  notes?: string;
}

// Filter and pagination types
export interface BudgetFilters {
  type?: "account-monthly" | "category-envelope" | "goal-based" | "scheduled-expense";
  enforcement?: "none" | "warning" | "strict";
  isActive?: boolean;
  accountId?: number;
  categoryId?: number;
  search?: string;
}

export interface PeriodFilters {
  budgetId?: number;
  status?: "upcoming" | "active" | "completed" | "archived";
  startDate?: string;
  endDate?: string;
}

export interface AllocationFilters {
  budgetId?: number;
  transactionId?: number;
  periodId?: number;
  assignmentType?: "automatic" | "manual" | "split";
  startDate?: string;
  endDate?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Budget summary and statistics
export interface BudgetSummary {
  budget: Budget;
  totalAllocated: number;
  totalSpent: number;
  totalRemaining: number;
  percentageUsed: number;
  isOverBudget: boolean;
  activePeriod?: BudgetPeriod;
  recentAllocations: BudgetAllocationWithTransaction[];
}

export interface BudgetProgress {
  budgetId: number;
  periodId?: number;
  allocated: number;
  spent: number;
  remaining: number;
  percentageUsed: number;
  isOverBudget: boolean;
  projectedSpending?: number;
  daysRemaining?: number;
}

// Validation and business logic types
export interface AllocationValidationResult {
  isValid: boolean;
  issues: string[];
  totalAllocated: number;
  remainingAmount: number;
  canProceed: boolean;
}

export interface BudgetConstraint {
  budgetId: number;
  type: "spending_limit" | "category_limit" | "period_limit";
  limit: number;
  current: number;
  remaining: number;
  isViolated: boolean;
}

// Metadata types for different budget types
export interface AccountMonthlyMetadata {
  monthlyLimit: number;
  warningThreshold?: number; // Percentage
  includeSubcategories?: boolean;
}

export interface CategoryEnvelopeMetadata {
  allowRollover: boolean;
  rolloverLimit?: number; // Maximum periods to rollover
  autoAllocate?: boolean;
  allocationMethod?: "equal" | "weighted" | "manual";
}

export interface GoalBasedMetadata {
  targetAmount: number;
  targetDate: string;
  goalType: "spending" | "saving";
  autoTransfer?: boolean;
  transferAccountId?: number;
}

export interface ScheduledExpenseMetadata {
  scheduleId: number;
  bufferPercentage?: number;
  autoAllocate?: boolean;
  lookAheadMonths?: number;
}