import validator from "validator";
import { z } from "zod";

// Superform-compatible schemas for category groups (not using drizzle-zod)
export const superformInsertCategoryGroupSchema = z.object({
  id: z.number().optional(),
  name: z
    .string()
    .transform((val) => val?.trim())
    .pipe(
      z
        .string()
        .min(1, "Category group name is required")
        .max(100, "Category group name must be less than 100 characters")
        .refine((val) => {
          // Only reject XSS/HTML injection patterns and structural characters
          if (validator.contains(val, "<") || validator.contains(val, ">")) return false;
          if (validator.contains(val, "{") || validator.contains(val, "}")) return false;
          return true;
        }, "Category group name contains invalid characters")
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
  groupIcon: z.string().optional().nullable(),
  groupColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format")
    .optional()
    .nullable(),
  sortOrder: z.number().nonnegative().optional(),
  slug: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const superformUpdateCategoryGroupSchema = z.object({
  id: z.number().positive(),
  name: z
    .string()
    .transform((val) => val?.trim())
    .pipe(
      z
        .string()
        .min(1, "Category group name is required")
        .max(100, "Category group name must be less than 100 characters")
        .refine((val) => {
          if (validator.contains(val, "<") || validator.contains(val, ">")) return false;
          if (validator.contains(val, "{") || validator.contains(val, "}")) return false;
          return true;
        }, "Category group name contains invalid characters")
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
  groupIcon: z.string().optional().nullable(),
  groupColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format")
    .optional()
    .nullable(),
  sortOrder: z.number().nonnegative().optional(),
});

export type SuperformInsertCategoryGroupSchema = typeof superformInsertCategoryGroupSchema;
export type SuperformUpdateCategoryGroupSchema = typeof superformUpdateCategoryGroupSchema;
