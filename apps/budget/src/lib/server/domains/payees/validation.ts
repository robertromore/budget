import {z} from "zod";
import {payeeTypes, paymentFrequencies} from "$lib/schema";

/**
 * Create payee validation schema with enhanced budgeting fields
 */
export const createPayeeSchema = z.object({
  name: z
    .string()
    .min(1, "Payee name is required")
    .max(255, "Payee name must be less than 255 characters")
    .trim(),
  notes: z
    .string()
    .max(1000, "Notes must be less than 1000 characters")
    .optional()
    .nullable()
    .transform(val => val || null),

  // Budgeting Integration Fields
  defaultCategoryId: z.number().int().optional().nullable(),
  defaultBudgetId: z.number().int().optional().nullable(),
  payeeType: z.enum(payeeTypes).optional().nullable(),

  // Analytics Support Fields
  taxRelevant: z.boolean().optional().default(false),

  // Contact Information Fields
  website: z.string().optional().nullable().refine((val) => !val || val.trim() === '' || z.string().url().safeParse(val).success, {
    message: "Invalid website URL"
  }),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().optional().nullable().refine((val) => !val || val.trim() === '' || z.string().email().safeParse(val).success, {
    message: "Invalid email address"
  }),

  // Organization Fields
  address: z.any().optional().nullable(), // JSON field
  accountNumber: z.string().max(100).optional().nullable(),

  // Advanced Features Fields
  alertThreshold: z.number().min(0).optional().nullable(),
  isSeasonal: z.boolean().optional().default(false),
  subscriptionInfo: z.any().optional().nullable(), // JSON field
  tags: z.any().optional().nullable(), // JSON field

  // Payment Processing Fields
  preferredPaymentMethods: z.any().optional().nullable(), // JSON field
  merchantCategoryCode: z.string().length(4).regex(/^\d{4}$/).optional().nullable(),
});

/**
 * Update payee validation schema with all enhanced fields
 */
export const updatePayeeSchema = z.object({
  name: z
    .string()
    .min(1, "Payee name cannot be empty")
    .max(255, "Payee name must be less than 255 characters")
    .trim()
    .optional(),
  notes: z
    .string()
    .max(1000, "Notes must be less than 1000 characters")
    .optional()
    .nullable()
    .transform(val => val || null),

  // Budgeting Integration Fields
  defaultCategoryId: z.number().int().optional().nullable(),
  defaultBudgetId: z.number().int().optional().nullable(),
  payeeType: z.enum(payeeTypes).optional().nullable(),

  // Transaction Automation Fields
  avgAmount: z.number().optional().nullable(),
  paymentFrequency: z.enum(paymentFrequencies).optional().nullable(),
  lastTransactionDate: z.string().optional().nullable(),

  // Analytics Support Fields
  taxRelevant: z.boolean().optional(),
  isActive: z.boolean().optional(),

  // Contact Information Fields
  website: z.string().optional().nullable().refine((val) => !val || val.trim() === '' || z.string().url().safeParse(val).success, {
    message: "Invalid website URL"
  }),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().optional().nullable().refine((val) => !val || val.trim() === '' || z.string().email().safeParse(val).success, {
    message: "Invalid email address"
  }),

  // Organization Fields
  address: z.any().optional().nullable(),
  accountNumber: z.string().max(100).optional().nullable(),

  // Advanced Features Fields
  alertThreshold: z.number().min(0).optional().nullable(),
  isSeasonal: z.boolean().optional(),
  subscriptionInfo: z.any().optional().nullable(),
  tags: z.any().optional().nullable(),

  // Payment Processing Fields
  preferredPaymentMethods: z.any().optional().nullable(),
  merchantCategoryCode: z.string().length(4).regex(/^\d{4}$/).optional().nullable(),
}).refine(
  data => Object.keys(data).length > 0,
  {message: "At least one field must be provided for update"}
);

/**
 * Delete payee validation schema
 */
export const deletePayeeSchema = z.object({
  id: z.number().int().positive("Invalid payee ID"),
  force: z.boolean().optional().default(false),
});

/**
 * Bulk delete payees validation schema
 */
export const bulkDeletePayeesSchema = z.object({
  ids: z
    .array(z.number().int().positive())
    .min(1, "At least one payee ID is required")
    .max(100, "Cannot delete more than 100 payees at once"),
  force: z.boolean().optional().default(false),
});

/**
 * Basic search payees validation schema
 */
export const searchPayeesSchema = z.object({
  query: z
    .string()
    .max(255, "Search query must be less than 255 characters")
    .optional()
    .default(""),
  limit: z
    .number()
    .int()
    .positive()
    .max(100, "Limit cannot exceed 100")
    .optional()
    .default(50),
});

/**
 * Advanced search payees validation schema with filters
 */
export const advancedSearchPayeesSchema = z.object({
  query: z.string().max(255).optional(),
  payeeType: z.enum(payeeTypes).optional(),
  isActive: z.boolean().optional(),
  taxRelevant: z.boolean().optional(),
  hasDefaultCategory: z.boolean().optional(),
  hasDefaultBudget: z.boolean().optional(),
  minAvgAmount: z.number().positive().optional(),
  maxAvgAmount: z.number().positive().optional(),
  paymentFrequency: z.enum(paymentFrequencies).optional(),
  lastTransactionBefore: z.string().optional(),
  lastTransactionAfter: z.string().optional(),
});

/**
 * Get payee by ID validation schema
 */
export const getPayeeSchema = z.object({
  id: z.number().int().positive("Invalid payee ID"),
  includeStats: z.boolean().optional().default(false),
  includeRelations: z.boolean().optional().default(false),
  includeSuggestions: z.boolean().optional().default(false),
});

/**
 * Get payees by account validation schema
 */
export const getPayeesByAccountSchema = z.object({
  accountId: z.number().int().positive("Invalid account ID"),
});

/**
 * Merge payees validation schema
 */
export const mergePayeesSchema = z.object({
  sourceId: z.number().int().positive("Invalid source payee ID"),
  targetId: z.number().int().positive("Invalid target payee ID"),
}).refine(
  data => data.sourceId !== data.targetId,
  {message: "Source and target payee cannot be the same"}
);

/**
 * Payee ID parameter validation
 */
export const payeeIdSchema = z.object({
  id: z.coerce.number().int().positive("Invalid payee ID"),
});

/**
 * Apply intelligent defaults validation schema
 */
export const applyIntelligentDefaultsSchema = z.object({
  id: z.number().int().positive("Invalid payee ID"),
  applyCategory: z.boolean().optional().default(true),
  applyBudget: z.boolean().optional().default(true),
});

/**
 * Get payees by type validation schema
 */
export const getPayeesByTypeSchema = z.object({
  payeeType: z.enum(payeeTypes),
});

/**
 * Update calculated fields validation schema
 */
export const updateCalculatedFieldsSchema = z.object({
  payeeId: z.number().int().positive().optional(), // If omitted, updates all payees
});

// ==================== INTELLIGENCE VALIDATION SCHEMAS ====================

/**
 * Intelligence analysis validation schema
 */
export const intelligenceAnalysisSchema = z.object({
  payeeId: z.number().int().positive(),
});

/**
 * Comprehensive intelligence analysis validation schema
 */
export const comprehensiveIntelligenceSchema = z.object({
  payeeId: z.number().int().positive(),
});

/**
 * Apply intelligent optimizations validation schema
 */
export const applyIntelligentOptimizationsSchema = z.object({
  payeeId: z.number().int().positive(),
  options: z.object({
    updateCategory: z.boolean().optional().default(true),
    updateBudget: z.boolean().optional().default(true),
    updateFrequency: z.boolean().optional().default(true),
    updateAmount: z.boolean().optional().default(true),
    minConfidence: z.number().min(0).max(1).optional().default(0.7),
  }).optional().default({}),
});

/**
 * Bulk intelligence analysis validation schema
 */
export const bulkIntelligenceAnalysisSchema = z.object({
  payeeIds: z.array(z.number().int().positive()).min(1).max(50), // Limit to 50 payees at once
  options: z.object({
    includeSpendingAnalysis: z.boolean().optional().default(true),
    includeSeasonalPatterns: z.boolean().optional().default(false),
    includeFrequencyAnalysis: z.boolean().optional().default(false),
    includePredictions: z.boolean().optional().default(false),
    minTransactionCount: z.number().int().min(1).optional().default(3),
  }).optional().default({}),
});

/**
 * Transaction prediction validation schema
 */
export const transactionPredictionSchema = z.object({
  payeeId: z.number().int().positive(),
});

/**
 * Budget allocation suggestion validation schema
 */
export const budgetAllocationSuggestionSchema = z.object({
  payeeId: z.number().int().positive(),
});

/**
 * Confidence metrics validation schema
 */
export const confidenceMetricsSchema = z.object({
  payeeId: z.number().int().positive(),
});

/**
 * Seasonal patterns validation schema
 */
export const seasonalPatternsSchema = z.object({
  payeeId: z.number().int().positive(),
});

/**
 * Day of week patterns validation schema
 */
export const dayOfWeekPatternsSchema = z.object({
  payeeId: z.number().int().positive(),
});

/**
 * Advanced frequency analysis validation schema
 */
export const advancedFrequencyAnalysisSchema = z.object({
  payeeId: z.number().int().positive(),
});

/**
 * Advanced spending analysis validation schema
 */
export const advancedSpendingAnalysisSchema = z.object({
  payeeId: z.number().int().positive(),
});

/**
 * Type exports for use in services and routes
 */
export type CreatePayeeInput = z.infer<typeof createPayeeSchema>;
export type UpdatePayeeInput = z.infer<typeof updatePayeeSchema>;
export type DeletePayeeInput = z.infer<typeof deletePayeeSchema>;
export type BulkDeletePayeesInput = z.infer<typeof bulkDeletePayeesSchema>;
export type SearchPayeesInput = z.infer<typeof searchPayeesSchema>;
export type AdvancedSearchPayeesInput = z.infer<typeof advancedSearchPayeesSchema>;
export type GetPayeeInput = z.infer<typeof getPayeeSchema>;
export type GetPayeesByAccountInput = z.infer<typeof getPayeesByAccountSchema>;
export type GetPayeesByTypeInput = z.infer<typeof getPayeesByTypeSchema>;
export type MergePayeesInput = z.infer<typeof mergePayeesSchema>;
export type PayeeIdInput = z.infer<typeof payeeIdSchema>;
export type ApplyIntelligentDefaultsInput = z.infer<typeof applyIntelligentDefaultsSchema>;
export type UpdateCalculatedFieldsInput = z.infer<typeof updateCalculatedFieldsSchema>;

// Intelligence validation type exports
export type IntelligenceAnalysisInput = z.infer<typeof intelligenceAnalysisSchema>;
export type ComprehensiveIntelligenceInput = z.infer<typeof comprehensiveIntelligenceSchema>;
export type ApplyIntelligentOptimizationsInput = z.infer<typeof applyIntelligentOptimizationsSchema>;
export type BulkIntelligenceAnalysisInput = z.infer<typeof bulkIntelligenceAnalysisSchema>;
export type TransactionPredictionInput = z.infer<typeof transactionPredictionSchema>;
export type BudgetAllocationSuggestionInput = z.infer<typeof budgetAllocationSuggestionSchema>;
export type ConfidenceMetricsInput = z.infer<typeof confidenceMetricsSchema>;
export type SeasonalPatternsInput = z.infer<typeof seasonalPatternsSchema>;
export type DayOfWeekPatternsInput = z.infer<typeof dayOfWeekPatternsSchema>;
export type AdvancedFrequencyAnalysisInput = z.infer<typeof advancedFrequencyAnalysisSchema>;
export type AdvancedSpendingAnalysisInput = z.infer<typeof advancedSpendingAnalysisSchema>;