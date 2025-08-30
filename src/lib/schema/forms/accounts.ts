import { z } from "zod/v4";

// Superforms-compatible schemas for accounts
export const accountFormSchema = z.object({
  id: z.number().optional(),
  cuid: z.string().nullable().optional(),
  name: z.string().min(2, "Name must contain at least 2 characters").max(30),
  slug: z.string(),
  closed: z.boolean().default(false).optional(),
  notes: z.string().nullable().optional(),
  dateOpened: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  deletedAt: z.string().nullable().optional(),
});

export const removeAccountFormSchema = z.object({ 
  id: z.number().nonnegative() 
});

export type AccountFormSchema = typeof accountFormSchema;
export type RemoveAccountFormSchema = typeof removeAccountFormSchema;