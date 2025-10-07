import {z} from "zod";
import validator from "validator";
import {categoryTypeEnum, taxCategories, spendingPriorityEnum, incomeReliabilityEnum} from "$lib/schema/categories";

// Superform-compatible schemas for categories (not using drizzle-zod)
export const superformInsertCategorySchema = z.object({
  id: z.number().optional(),
  parentId: z.number().optional().nullable(),
  name: z
    .string()
    .transform((val) => val?.trim())
    .pipe(
      z
        .string()
        .min(1, "Category name is required")
        .max(50, "Category name must be less than 50 characters")
        .refine((val) => {
          // Only reject XSS/HTML injection patterns and structural characters
          if (validator.contains(val, "<") || validator.contains(val, ">")) return false;
          if (validator.contains(val, "{") || validator.contains(val, "}")) return false;
          if (validator.contains(val, "[") || validator.contains(val, "]")) return false;
          if (validator.contains(val, "\\") || validator.contains(val, "|")) return false;
          return true;
        }, "Category name contains invalid characters")
    ),
  notes: z
    .string()
    .transform((val) => val?.trim())
    .pipe(
      z
        .string()
        .max(500, "Notes must be less than 500 characters")
        .refine((val) => {
          if (!val) return true; // Allow empty/null values
          // Reject any HTML tags
          if (validator.contains(val, "<") || validator.contains(val, ">")) {
            return false;
          }
          return true;
        }, "Notes cannot contain HTML tags")
    )
    .optional()
    .nullable(),
  categoryType: z.enum(categoryTypeEnum).optional(),
  categoryIcon: z.string().optional().nullable(),
  categoryColor: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().optional(),
  isTaxDeductible: z.boolean().optional(),
  taxCategory: z.enum(taxCategories).optional().nullable(),
  deductiblePercentage: z.number().optional().nullable(),
  isSeasonal: z.boolean().optional(),
  seasonalMonths: z.array(z.string()).optional().nullable(),
  expectedMonthlyMin: z.number().optional().nullable(),
  expectedMonthlyMax: z.number().optional().nullable(),
  spendingPriority: z.enum(spendingPriorityEnum).optional().nullable(),
  incomeReliability: z.enum(incomeReliabilityEnum).optional().nullable(),
  dateCreated: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  deletedAt: z.string().optional().nullable(),
});

export const superformUpdateCategorySchema = z.object({
  id: z.number().positive(),
  parentId: z.number().optional().nullable(),
  name: z
    .string()
    .transform((val) => val?.trim())
    .pipe(
      z
        .string()
        .min(1, "Category name is required")
        .max(50, "Category name must be less than 50 characters")
        .refine((val) => {
          // Only reject XSS/HTML injection patterns and structural characters
          if (validator.contains(val, "<") || validator.contains(val, ">")) return false;
          if (validator.contains(val, "{") || validator.contains(val, "}")) return false;
          if (validator.contains(val, "[") || validator.contains(val, "]")) return false;
          if (validator.contains(val, "\\") || validator.contains(val, "|")) return false;
          return true;
        }, "Category name contains invalid characters")
    )
    .optional(),
  notes: z
    .string()
    .transform((val) => val?.trim())
    .pipe(
      z
        .string()
        .max(500, "Notes must be less than 500 characters")
        .refine((val) => {
          if (!val) return true; // Allow empty/null values
          // Reject any HTML tags
          if (validator.contains(val, "<") || validator.contains(val, ">")) {
            return false;
          }
          return true;
        }, "Notes cannot contain HTML tags")
    )
    .optional()
    .nullable(),
});

export type SuperformInsertCategorySchema = typeof superformInsertCategorySchema;
export type SuperformUpdateCategorySchema = typeof superformUpdateCategorySchema;
