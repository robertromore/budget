import { z } from "zod";
import { accountTypeKeys } from "$lib/schema/accounts";

// Superform-compatible schemas for accounts (not using drizzle-zod)
export const superformInsertAccountSchema = z.object({
  id: z.number().optional(),
  cuid: z.string().optional(),
  name: z
    .string()
    .min(1, "Account name is required")
    .min(2, "Account name must be at least 2 characters")
    .max(50, "Account name must be less than 50 characters")
    .regex(/^[a-zA-Z0-9\s\-_.'&()]+$/, "Account name contains invalid characters"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(30, "Slug must be less than 30 characters")
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
    .optional(),
  closed: z.boolean().optional(),
  notes: z.string().max(500, "Notes must be less than 500 characters").optional().nullable(),
  dateOpened: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  deletedAt: z.string().optional().nullable(),
  // Additional fields added to database schema
  accountType: z.enum(accountTypeKeys).optional(),
  institution: z.string().max(100, "Institution name must be less than 100 characters").optional(),
  accountIcon: z.string().max(50, "Account icon name must be less than 50 characters").optional(),
  accountColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Account color must be a valid hex color").optional(),
  initialBalance: z.number().optional(),
  accountNumberLast4: z.string().max(4, "Account number last 4 must be 4 characters or less").optional(),
  onBudget: z.coerce.boolean().default(true),
});

export const superformUpdateAccountSchema = z.object({
  id: z.number().positive(),
  name: z
    .string()
    .transform((val) => val?.trim())
    .pipe(
      z
        .string()
        .min(2, "Account name must be at least 2 characters")
        .max(50, "Account name must be less than 50 characters")
        .regex(/^[a-zA-Z0-9\s\-_.'&()]+$/, "Account name contains invalid characters")
    )
    .optional(),
  slug: z
    .string()
    .transform((val) => val?.trim()?.toLowerCase())
    .pipe(
      z
        .string()
        .min(2, "Slug must be at least 2 characters")
        .max(30, "Slug must be less than 30 characters")
        .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
    )
    .optional(),
  notes: z
    .string()
    .transform((val) => val?.trim())
    .pipe(z.string().max(500, "Notes must be less than 500 characters"))
    .optional()
    .nullable(),
  closed: z.boolean().optional(),
  onBudget: z.coerce.boolean().optional(),
});

export type SuperformInsertAccountSchema = typeof superformInsertAccountSchema;
export type SuperformUpdateAccountSchema = typeof superformUpdateAccountSchema;
