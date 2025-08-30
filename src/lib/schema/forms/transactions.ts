import { z } from "zod/v4";

// Superforms-compatible schemas for transactions
export const transactionFormSchema = z.object({
  id: z.number().optional(),
  accountId: z.number(),
  parentId: z.number().nullable().optional(),
  status: z.enum(["cleared", "pending", "scheduled"]).default("pending").optional(),
  payeeId: z.number().nullable().optional(),
  amount: z.number().default(0),
  categoryId: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  date: z.string(),
  scheduleId: z.number().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  deletedAt: z.string().nullable().optional(),
});

export const removeTransactionsFormSchema = z.object({
  entities: z.array(z.number().nonnegative()),
  accountId: z.number(),
});

export type TransactionFormSchema = typeof transactionFormSchema;
export type RemoveTransactionsFormSchema = typeof removeTransactionsFormSchema;