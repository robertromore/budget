import { z } from "zod/v4";

// Superforms-compatible schemas for views
export const viewFormSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(2, "Name must contain at least 2 characters"),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  filters: z.optional(
    z
      .array(
        z.object({
          column: z.string(),
          filter: z.string(),
          value: z.array(z.unknown()),
        })
      )
      .or(z.null())
  ),
  display: z.optional(
    z
      .object({
        grouping: z.optional(z.array(z.string())),
        sort: z.optional(
          z.array(
            z.object({
              desc: z.boolean(),
              id: z.string(),
            })
          )
        ),
        expanded: z.optional(z.record(z.string(), z.boolean())),
        visibility: z.optional(z.record(z.string(), z.boolean())),
      })
      .or(z.null())
  ),
  dirty: z.boolean().optional(),
});

export const removeViewFormSchema = z.object({ 
  id: z.number().nonnegative() 
});

export const removeViewsFormSchema = z.object({ 
  entities: z.array(z.number().nonnegative()) 
});

export type ViewFormSchema = typeof viewFormSchema;
export type RemoveViewFormSchema = typeof removeViewFormSchema;
export type RemoveViewsFormSchema = typeof removeViewsFormSchema;