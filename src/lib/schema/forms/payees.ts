import { z } from "zod/v4";

// Superforms-compatible schemas for payees
export const payeeFormSchema = z.object({
  id: z.number().optional(),
  name: z.string()
    .min(1, { message: "required" })
    .max(30)
    .nullable()
    .optional(),
  notes: z.string().nullable().optional(),
  dateCreated: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  deletedAt: z.string().nullable().optional(),
});

export const removePayeeFormSchema = z.object({ 
  id: z.number().nonnegative() 
});

export const removePayeesFormSchema = z.object({ 
  entities: z.array(z.number().nonnegative()) 
});

export type PayeeFormSchema = typeof payeeFormSchema;
export type RemovePayeeFormSchema = typeof removePayeeFormSchema;
export type RemovePayeesFormSchema = typeof removePayeesFormSchema;