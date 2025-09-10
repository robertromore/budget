import { z } from "zod";
import validator from "validator";

// Superform-compatible schemas for transactions (not using drizzle-zod)
export const superformInsertTransactionSchema = z.object({
  id: z.number().optional(),
  accountId: z.number().positive("Account is required"),
  parentId: z.number().optional().nullable(),
  status: z.enum(["cleared", "pending", "scheduled"]).default("pending"),
  payeeId: z.number().optional().nullable(),
  amount: z.number()
    .refine((val) => val !== 0, "Amount cannot be zero")
    .refine((val) => Math.abs(val) <= 999999.99, "Amount cannot exceed $999,999.99"),
  categoryId: z.number().optional().nullable(),
  notes: z.string()
    .transform(val => val?.trim())
    .pipe(
      z.string()
        .max(500, "Notes must be less than 500 characters")
        .refine((val) => {
          if (!val) return true; // Allow empty/null values
          // Reject any HTML tags
          if (validator.contains(val, '<') || validator.contains(val, '>')) {
            return false;
          }
          return true;
        }, "Notes cannot contain HTML tags")
    )
    .optional()
    .nullable(),
  date: z.string().optional(),
  scheduleId: z.number().optional().nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  deletedAt: z.string().optional().nullable(),
});

export const superformUpdateTransactionSchema = z.object({
  id: z.number().positive(),
  accountId: z.number().positive("Account is required").optional(),
  parentId: z.number().optional().nullable(),
  status: z.enum(["cleared", "pending", "scheduled"]).optional(),
  payeeId: z.number().optional().nullable(),
  amount: z.number()
    .refine((val) => val !== 0, "Amount cannot be zero")
    .refine((val) => Math.abs(val) <= 999999.99, "Amount cannot exceed $999,999.99")
    .optional(),
  categoryId: z.number().optional().nullable(),
  notes: z.string()
    .transform(val => val?.trim())
    .pipe(
      z.string()
        .max(500, "Notes must be less than 500 characters")
        .refine((val) => {
          if (!val) return true; // Allow empty/null values
          // Reject any HTML tags
          if (validator.contains(val, '<') || validator.contains(val, '>')) {
            return false;
          }
          return true;
        }, "Notes cannot contain HTML tags")
    )
    .optional()
    .nullable(),
  date: z.string().optional(),
  scheduleId: z.number().optional().nullable(),
});

export type SuperformInsertTransactionSchema = typeof superformInsertTransactionSchema;
export type SuperformUpdateTransactionSchema = typeof superformUpdateTransactionSchema;