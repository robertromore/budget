import validator from "validator";
import { z } from "zod";
import { isValidIconName } from "$lib/utils/icon-validation";

// Superform-compatible schemas for payee categories (not using drizzle-zod)
export const superformInsertPayeeCategorySchema = z.object({
  id: z.number().optional(),
  name: z
    .string()
    .transform((val) => val?.trim())
    .pipe(
      z
        .string()
        .min(1, "Payee category name is required")
        .max(50, "Payee category name must be less than 50 characters")
        .refine((val) => {
          // Only reject XSS/HTML injection patterns and structural characters
          if (validator.contains(val, "<") || validator.contains(val, ">")) return false;
          if (validator.contains(val, "{") || validator.contains(val, "}")) return false;
          if (validator.contains(val, "[") || validator.contains(val, "]")) return false;
          if (validator.contains(val, "\\") || validator.contains(val, "|")) return false;
          return true;
        }, "Payee category name contains invalid characters")
    ),
  description: z
    .string()
    .transform((val) => val?.trim())
    .pipe(
      z
        .string()
        .max(500, "Description must be less than 500 characters")
        .refine((val) => {
          if (!val) return true; // Allow empty/null values
          // Reject any HTML tags
          if (validator.contains(val, "<") || validator.contains(val, ">")) {
            return false;
          }
          return true;
        }, "Description cannot contain HTML tags")
    )
    .optional()
    .nullable(),
  icon: z
    .string()
    .refine((val) => !val || isValidIconName(val), "Invalid icon selection")
    .optional()
    .nullable(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex code")
    .optional()
    .nullable(),
  displayOrder: z.number().nonnegative().optional(),
  isActive: z.boolean().optional(),
  slug: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const superformUpdatePayeeCategorySchema = z.object({
  id: z.number().positive(),
  name: z
    .string()
    .transform((val) => val?.trim())
    .pipe(
      z
        .string()
        .min(1, "Payee category name is required")
        .max(50, "Payee category name must be less than 50 characters")
        .refine((val) => {
          if (validator.contains(val, "<") || validator.contains(val, ">")) return false;
          if (validator.contains(val, "{") || validator.contains(val, "}")) return false;
          if (validator.contains(val, "[") || validator.contains(val, "]")) return false;
          if (validator.contains(val, "\\") || validator.contains(val, "|")) return false;
          return true;
        }, "Payee category name contains invalid characters")
    )
    .optional(),
  description: z
    .string()
    .transform((val) => val?.trim())
    .pipe(
      z
        .string()
        .max(500, "Description must be less than 500 characters")
        .refine((val) => {
          if (!val) return true;
          if (validator.contains(val, "<") || validator.contains(val, ">")) {
            return false;
          }
          return true;
        }, "Description cannot contain HTML tags")
    )
    .optional()
    .nullable(),
  icon: z
    .string()
    .refine((val) => !val || isValidIconName(val), "Invalid icon selection")
    .optional()
    .nullable(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex code")
    .optional()
    .nullable(),
  displayOrder: z.number().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

export type SuperformInsertPayeeCategorySchema = typeof superformInsertPayeeCategorySchema;
export type SuperformUpdatePayeeCategorySchema = typeof superformUpdatePayeeCategorySchema;
