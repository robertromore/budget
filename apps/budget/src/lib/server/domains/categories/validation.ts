import { isNotEmptyObject } from "$lib/utils";
import { z } from "zod";

/**
 * Create category validation schema
 */
export const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, "Category name is required")
    .max(255, "Category name must be less than 255 characters")
    .trim(),
  notes: z
    .string()
    .max(1000, "Notes must be less than 1000 characters")
    .optional()
    .nullable()
    .transform((val) => val || null),
});

/**
 * Update category validation schema
 */
export const updateCategorySchema = z
  .object({
    name: z
      .string()
      .min(1, "Category name cannot be empty")
      .max(255, "Category name must be less than 255 characters")
      .trim()
      .optional(),
    notes: z
      .string()
      .max(1000, "Notes must be less than 1000 characters")
      .optional()
      .nullable()
      .transform((val) => val || null),
  })
  .refine((data) => isNotEmptyObject(data), {
    message: "At least one field must be provided for update",
  });

/**
 * Delete category validation schema
 */
export const deleteCategorySchema = z.object({
  id: z.number().int().positive("Invalid category ID"),
  force: z.boolean().optional().default(false),
});

/**
 * Bulk delete categories validation schema
 */
export const bulkDeleteCategoriesSchema = z.object({
  ids: z
    .array(z.number().int().positive())
    .min(1, "At least one category ID is required")
    .max(100, "Cannot delete more than 100 categories at once"),
  force: z.boolean().optional().default(false),
});

/**
 * Search categories validation schema
 */
export const searchCategoriesSchema = z.object({
  query: z
    .string()
    .max(255, "Search query must be less than 255 characters")
    .optional()
    .default(""),
  limit: z.number().int().positive().max(100, "Limit cannot exceed 100").optional().default(50),
});

/**
 * Get category by ID validation schema
 */
export const getCategorySchema = z.object({
  id: z.number().int().positive("Invalid category ID"),
  includeStats: z.boolean().optional().default(false),
});

/**
 * Get categories by account validation schema
 */
export const getCategoriesByAccountSchema = z.object({
  accountId: z.number().int().positive("Invalid account ID"),
});

/**
 * Get top categories validation schema
 */
export const getTopCategoriesSchema = z.object({
  limit: z.number().int().positive().max(100, "Limit cannot exceed 100").optional().default(10),
  accountId: z.number().int().positive("Invalid account ID").optional(),
});

/**
 * Merge categories validation schema
 */
export const mergeCategoriesSchema = z
  .object({
    sourceId: z.number().int().positive("Invalid source category ID"),
    targetId: z.number().int().positive("Invalid target category ID"),
  })
  .refine((data) => data.sourceId !== data.targetId, {
    message: "Source and target category cannot be the same",
  });

/**
 * Category analytics validation schema
 */
export const getCategoryAnalyticsSchema = z.object({
  id: z.number().int().positive("Invalid category ID"),
  includeProjections: z.boolean().optional().default(false),
});

/**
 * Category usage summary validation schema
 */
export const getCategoryUsageSummarySchema = z.object({
  includeInactive: z.boolean().optional().default(false),
});

/**
 * Category ID parameter validation
 */
export const categoryIdSchema = z.object({
  id: z.coerce.number().int().positive("Invalid category ID"),
});

/**
 * Type exports for use in services and routes
 */
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type DeleteCategoryInput = z.infer<typeof deleteCategorySchema>;
export type BulkDeleteCategoriesInput = z.infer<typeof bulkDeleteCategoriesSchema>;
export type SearchCategoriesInput = z.infer<typeof searchCategoriesSchema>;
export type GetCategoryInput = z.infer<typeof getCategorySchema>;
export type GetCategoriesByAccountInput = z.infer<typeof getCategoriesByAccountSchema>;
export type GetTopCategoriesInput = z.infer<typeof getTopCategoriesSchema>;
export type MergeCategoriesInput = z.infer<typeof mergeCategoriesSchema>;
export type GetCategoryAnalyticsInput = z.infer<typeof getCategoryAnalyticsSchema>;
export type GetCategoryUsageSummaryInput = z.infer<typeof getCategoryUsageSummarySchema>;
export type CategoryIdInput = z.infer<typeof categoryIdSchema>;
