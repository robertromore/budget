import { z } from "zod/v4";

// Superforms-compatible schemas for categories
export const categoryFormSchema = z.object({
  id: z.number().optional(),
  parentId: z.number().nullable().optional(),
  name: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  dateCreated: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  deletedAt: z.string().nullable().optional(),
});

export const removeCategoryFormSchema = z.object({ 
  id: z.number().nonnegative() 
});

export const removeCategoriesFormSchema = z.object({ 
  entities: z.array(z.number().nonnegative()) 
});

export type CategoryFormSchema = typeof categoryFormSchema;
export type RemoveCategoryFormSchema = typeof removeCategoryFormSchema;
export type RemoveCategoriesFormSchema = typeof removeCategoriesFormSchema;