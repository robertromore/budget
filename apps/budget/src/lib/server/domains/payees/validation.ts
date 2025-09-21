import {z} from "zod";

/**
 * Create payee validation schema
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
});

/**
 * Update payee validation schema
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
 * Search payees validation schema
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
 * Get payee by ID validation schema
 */
export const getPayeeSchema = z.object({
  id: z.number().int().positive("Invalid payee ID"),
  includeStats: z.boolean().optional().default(false),
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
 * Type exports for use in services and routes
 */
export type CreatePayeeInput = z.infer<typeof createPayeeSchema>;
export type UpdatePayeeInput = z.infer<typeof updatePayeeSchema>;
export type DeletePayeeInput = z.infer<typeof deletePayeeSchema>;
export type BulkDeletePayeesInput = z.infer<typeof bulkDeletePayeesSchema>;
export type SearchPayeesInput = z.infer<typeof searchPayeesSchema>;
export type GetPayeeInput = z.infer<typeof getPayeeSchema>;
export type GetPayeesByAccountInput = z.infer<typeof getPayeesByAccountSchema>;
export type MergePayeesInput = z.infer<typeof mergePayeesSchema>;
export type PayeeIdInput = z.infer<typeof payeeIdSchema>;