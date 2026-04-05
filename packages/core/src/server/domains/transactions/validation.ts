import { z } from "zod";

/**
 * Schema for budget allocation
 */
export const budgetAllocationSchema = z.object({
  budgetId: z.number().positive("Budget ID must be a positive number"),
  amount: z.number().refine((val) => val !== 0, "Allocation amount cannot be zero"),
});

/**
 * Schema for creating a transaction
 */
export const createTransactionSchema = z.object({
  accountId: z.number().positive("Account ID must be a positive number"),
  amount: z.number().refine((val) => val !== 0, "Amount cannot be zero"),
  date: z.string().min(1, "Date is required"),
  payeeId: z.number().positive().nullable().optional(),
  categoryId: z.number().positive().nullable().optional(),
  notes: z.string().max(500, "Notes must be 500 characters or less").nullable().optional(),
  status: z.enum(["cleared", "pending", "scheduled"]).optional(),
  budgetId: z.number().positive().nullable().optional(),
  budgetAllocation: z.number().nullable().optional(),
  budgetAllocations: z.array(budgetAllocationSchema).optional(),
  autoAssignBudgets: z.boolean().optional(),
});

/**
 * Schema for creating a transaction with auto-population support
 */
export const createTransactionWithAutoPopulationSchema = createTransactionSchema.extend({
  autoPopulateFromPayee: z.boolean().optional().default(true),
  allowPayeeOverrides: z.boolean().optional().default(true),
  updatePayeeStats: z.boolean().optional().default(true),
});

/**
 * Schema for transaction suggestions request
 */
export const transactionSuggestionRequestSchema = z.object({
  payeeId: z.number().positive("Payee ID must be a positive number"),
  amount: z.number().optional(),
});

/**
 * Schema for payee intelligence request
 */
export const payeeIntelligenceRequestSchema = z.object({
  payeeId: z.number().positive("Payee ID must be a positive number"),
});

/**
 * Schema for updating a transaction
 */
export const updateTransactionSchema = z.object({
  amount: z
    .number()
    .refine((val) => val !== 0, "Amount cannot be zero")
    .optional(),
  date: z.string().min(1, "Date is required").optional(),
  payeeId: z.number().positive().nullable().optional(),
  categoryId: z.number().positive().nullable().optional(),
  notes: z.string().max(500, "Notes must be 500 characters or less").nullable().optional(),
  status: z.enum(["cleared", "pending", "scheduled"]).optional(),
  budgetId: z.number().positive().nullable().optional(),
  budgetAllocation: z.number().nullable().optional(),
  budgetAllocations: z.array(budgetAllocationSchema).optional(),
  autoAssignBudgets: z.boolean().optional(),
});

/**
 * Schema for transaction filters
 */
export const transactionFiltersSchema = z.object({
  accountId: z.number().positive().optional(),
  categoryId: z.number().positive().optional(),
  payeeId: z.number().positive().optional(),
  status: z.enum(["cleared", "pending", "scheduled"]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  searchQuery: z.string().max(100).optional(),
  sortBy: z.enum(["date", "amount", "status"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

/**
 * Schema for pagination
 */
export const paginationSchema = z.object({
  page: z.number().min(0).default(0),
  pageSize: z.number().min(1).max(100).default(50),
});

/**
 * Schema for bulk delete
 */
export const bulkDeleteSchema = z.object({
  ids: z.array(z.number().positive()).min(1, "At least one ID is required"),
});

/**
 * Schema for transaction query with pagination
 */
export const transactionQuerySchema = z.object({
  filters: transactionFiltersSchema.optional(),
  pagination: paginationSchema.optional(),
});
