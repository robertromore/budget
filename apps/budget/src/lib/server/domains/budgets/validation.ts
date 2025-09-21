import { z } from "zod";

// Budget creation and update schemas
export const createBudgetSchema = z.object({
  name: z.string().min(1, "Budget name is required").max(100),
  description: z.string().max(500).optional(),
  type: z.enum(["account-monthly", "category-envelope", "goal-based", "scheduled-expense"]),
  enforcement: z.enum(["none", "warning", "strict"]).default("warning"),
  isActive: z.boolean().default(true),
  metadata: z.object({}).passthrough().optional(),
  accountIds: z.array(z.number().positive()).optional(),
  categoryIds: z.array(z.number().positive()).optional()
});

export const updateBudgetSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  type: z.enum(["account-monthly", "category-envelope", "goal-based", "scheduled-expense"]).optional(),
  enforcement: z.enum(["none", "warning", "strict"]).optional(),
  isActive: z.boolean().optional(),
  metadata: z.object({}).passthrough().optional()
});

// Filter schemas
export const budgetFiltersSchema = z.object({
  type: z.enum(["account-monthly", "category-envelope", "goal-based", "scheduled-expense"]).optional(),
  enforcement: z.enum(["none", "warning", "strict"]).optional(),
  isActive: z.boolean().optional(),
  accountId: z.number().positive().optional(),
  categoryId: z.number().positive().optional(),
  search: z.string().optional()
});

export const periodFiltersSchema = z.object({
  budgetId: z.number().positive().optional(),
  status: z.enum(["upcoming", "active", "completed", "archived"]).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional()
});

export const allocationFiltersSchema = z.object({
  budgetId: z.number().positive().optional(),
  transactionId: z.number().positive().optional(),
  periodId: z.number().positive().optional(),
  assignmentType: z.enum(["automatic", "manual", "split"]).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional()
});

// Common pagination schema (reusable across domains)
export const paginationSchema = z.object({
  page: z.number().positive().default(1),
  limit: z.number().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc")
});

// Budget period schemas
export const createBudgetPeriodSchema = z.object({
  budgetId: z.number().positive(),
  name: z.string().min(1, "Period name is required").max(100),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  allocated: z.number().min(0, "Allocated amount must be positive"),
  rollover: z.number().default(0)
});

export const updateBudgetPeriodSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
  allocated: z.number().min(0).optional(),
  spent: z.number().optional(),
  rollover: z.number().optional(),
  status: z.enum(["upcoming", "active", "completed", "archived"]).optional()
});

// Budget allocation schemas
export const createAllocationSchema = z.object({
  budgetId: z.number().positive(),
  transactionId: z.number().positive(),
  periodId: z.number().positive().optional(),
  allocatedAmount: z.number(),
  percentage: z.number().min(0).max(100).optional(),
  assignmentType: z.enum(["automatic", "manual", "split"]).default("manual"),
  notes: z.string().max(500).optional()
});

export const updateAllocationSchema = z.object({
  allocatedAmount: z.number().optional(),
  percentage: z.number().min(0).max(100).optional(),
  assignmentType: z.enum(["automatic", "manual", "split"]).optional(),
  notes: z.string().max(500).optional()
});

// Validation and business logic schemas
export const validateAllocationSchema = z.object({
  transactionId: z.number().positive(),
  budgetId: z.number().positive(),
  proposedAmount: z.number(),
  periodId: z.number().positive().optional()
});

// Account and category association schemas
export const addAccountToBudgetSchema = z.object({
  budgetId: z.number().positive(),
  accountId: z.number().positive()
});

export const removeAccountFromBudgetSchema = z.object({
  budgetId: z.number().positive(),
  accountId: z.number().positive()
});

export const addCategoryToBudgetSchema = z.object({
  budgetId: z.number().positive(),
  categoryId: z.number().positive(),
  allocatedAmount: z.number().min(0, "Allocated amount must be positive").default(0)
});

export const removeCategoryFromBudgetSchema = z.object({
  budgetId: z.number().positive(),
  categoryId: z.number().positive()
});

// Query parameter schemas
export const budgetIdSchema = z.object({
  id: z.number().positive()
});

export const budgetProgressQuerySchema = z.object({
  budgetId: z.number().positive(),
  periodId: z.number().positive().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional()
});

export const transactionAllocationQuerySchema = z.object({
  transactionId: z.number().positive()
});

export const budgetAllocationsQuerySchema = z.object({
  budgetId: z.number().positive(),
  filters: allocationFiltersSchema.optional()
});