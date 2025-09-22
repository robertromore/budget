import type {
  Budget,
  NewBudget,
  BudgetGroup,
  NewBudgetGroup,
  BudgetGroupMembership,
  NewBudgetGroupMembership,
  BudgetPeriodTemplate,
  NewBudgetPeriodTemplate,
  BudgetPeriodInstance,
  NewBudgetPeriodInstance,
  BudgetAccount,
  NewBudgetAccount,
  BudgetCategory,
  NewBudgetCategory,
  BudgetTransaction,
  NewBudgetTransaction
} from "$lib/schema/budgets";
import type { accounts } from "$lib/schema/accounts";
import type { Category } from "$lib/schema/categories";
import type { Transaction } from "$lib/schema/transactions";

// Domain Types
export type {
  Budget,
  NewBudget,
  BudgetGroup,
  NewBudgetGroup,
  BudgetGroupMembership,
  NewBudgetGroupMembership,
  BudgetPeriodTemplate,
  NewBudgetPeriodTemplate,
  BudgetPeriodInstance,
  NewBudgetPeriodInstance,
  BudgetAccount,
  NewBudgetAccount,
  BudgetCategory,
  NewBudgetCategory,
  BudgetTransaction,
  NewBudgetTransaction
};

// Extended budget types with relations
export interface BudgetWithRelations extends Budget {
  accounts?: (typeof accounts.$inferSelect)[];
  categories?: BudgetCategory[];
  periodTemplates?: BudgetPeriodTemplate[];
  periodInstances?: BudgetPeriodInstance[];
  transactions?: BudgetTransaction[];
  groups?: BudgetGroup[];
}

export interface BudgetCategoryWithCategory extends BudgetCategory {
  category: Category;
}

export interface BudgetTransactionWithTransaction extends BudgetTransaction {
  transaction: Transaction;
}

// Service layer types
export interface CreateBudgetData {
  name: string;
  description?: string;
  type: "account-monthly" | "category-envelope" | "goal-based" | "scheduled-expense";
  scope?: "account" | "category" | "global" | "mixed";
  status?: "active" | "inactive" | "archived";
  enforcementLevel?: "none" | "warning" | "strict";
  metadata?: Record<string, any>;
  accountIds?: number[];
  categoryIds?: number[];
}

export interface UpdateBudgetData {
  name?: string;
  description?: string;
  type?: "account-monthly" | "category-envelope" | "goal-based" | "scheduled-expense";
  scope?: "account" | "category" | "global" | "mixed";
  status?: "active" | "inactive" | "archived";
  enforcementLevel?: "none" | "warning" | "strict";
  metadata?: Record<string, any>;
}

export interface CreateBudgetPeriodTemplateData {
  budgetId: number;
  type: "weekly" | "monthly" | "quarterly" | "yearly" | "custom";
  intervalCount?: number;
  startDayOfWeek?: number;
  startDayOfMonth?: number;
  startMonth?: number;
  timezone?: string;
}

export interface UpdateBudgetPeriodTemplateData {
  type?: "weekly" | "monthly" | "quarterly" | "yearly" | "custom";
  intervalCount?: number;
  startDayOfWeek?: number;
  startDayOfMonth?: number;
  startMonth?: number;
  timezone?: string;
}

export interface CreateBudgetPeriodInstanceData {
  templateId: number;
  startDate: string;
  endDate: string;
  allocatedAmount: number;
  rolloverAmount?: number;
}

export interface UpdateBudgetPeriodInstanceData {
  startDate?: string;
  endDate?: string;
  allocatedAmount?: number;
  rolloverAmount?: number;
  actualAmount?: number;
}

export interface CreateBudgetTransactionData {
  budgetId: number;
  transactionId: number;
  allocatedAmount: number;
  autoAssigned?: boolean;
  assignedBy?: string;
}

export interface UpdateBudgetTransactionData {
  allocatedAmount?: number;
  autoAssigned?: boolean;
  assignedBy?: string;
}

// Filter and pagination types
export interface BudgetFilters {
  type?: "account-monthly" | "category-envelope" | "goal-based" | "scheduled-expense";
  scope?: "account" | "category" | "global" | "mixed";
  status?: "active" | "inactive" | "archived";
  enforcementLevel?: "none" | "warning" | "strict";
  accountId?: number;
  categoryId?: number;
  search?: string;
}

export interface PeriodFilters {
  budgetId?: number;
  startDate?: string;
  endDate?: string;
}

export interface TransactionFilters {
  budgetId?: number;
  transactionId?: number;
  autoAssigned?: boolean;
  assignedBy?: string;
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
  activePeriod?: BudgetPeriodInstance;
  recentTransactions: BudgetTransactionWithTransaction[];
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