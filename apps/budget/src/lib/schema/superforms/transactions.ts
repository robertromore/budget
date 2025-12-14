import { z } from "zod";

// Superform-compatible schemas for transactions (not using drizzle-zod)
export const superformInsertTransactionSchema = z.object({
  id: z.number().optional(),
  accountId: z.number().positive("Account is required"),
  parentId: z.number().nullish(),
  status: z.enum(["cleared", "pending", "scheduled"]).default("pending"),
  payeeId: z.number().nullish(),
  amount: z.number(),
  categoryId: z.number().nullish(),
  notes: z.string().max(500, "Notes must be less than 500 characters").nullish(),
  date: z.string().optional(),
  scheduleId: z.number().nullish(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  deletedAt: z.string().nullish(),
});

export const superformUpdateTransactionSchema = z.object({
  id: z.number().positive(),
  accountId: z.number().optional(),
  parentId: z.number().nullish(),
  status: z.enum(["cleared", "pending", "scheduled"]).optional(),
  payeeId: z.number().nullish(),
  amount: z.number().optional(),
  categoryId: z.number().nullish(),
  notes: z.string().max(500, "Notes must be less than 500 characters").nullish(),
  date: z.string().optional(),
  scheduleId: z.number().nullish(),
});

export const superformDeleteTransactionSchema = z.object({
  id: z.number().positive("Transaction ID is required"),
});

export type SuperformInsertTransactionSchema = typeof superformInsertTransactionSchema;
export type SuperformUpdateTransactionSchema = typeof superformUpdateTransactionSchema;
export type SuperformDeleteTransactionSchema = typeof superformDeleteTransactionSchema;
