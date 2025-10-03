import {z} from "zod";

// Superform-compatible schemas for schedules (not using drizzle-zod)
export const superformInsertScheduleSchema = z.object({
  id: z.number().optional(),
  name: z
    .string()
    .transform((val) => val?.trim())
    .pipe(
      z
        .string()
        .min(2, "Schedule name must be at least 2 characters")
        .max(30, "Schedule name must be less than 30 characters")
    ),
  slug: z
    .string()
    .optional()
    .transform((val) => val?.trim()?.toLowerCase() || undefined)
    .pipe(
      z
        .string()
        .min(2, "Slug must be at least 2 characters")
        .max(30, "Slug must be less than 30 characters")
        .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
        .optional()
    ),
  status: z.enum(["active", "inactive"]).default("active"),
  amount: z.number().default(0),
  amount_2: z.number().default(0),
  amount_type: z.enum(["exact", "approximate", "range"]).default("exact"),
  recurring: z.boolean().default(false),
  auto_add: z.boolean().default(false),
  dateId: z.number().optional().nullable(),
  payeeId: z.number().positive("Payee is required"),
  categoryId: z.number().optional().nullable(),
  accountId: z.number().positive("Account is required"),
  repeating_date: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const superformUpdateScheduleSchema = z.object({
  id: z.number().positive(),
  name: z
    .string()
    .transform((val) => val?.trim())
    .pipe(
      z
        .string()
        .min(2, "Schedule name must be at least 2 characters")
        .max(30, "Schedule name must be less than 30 characters")
    )
    .optional(),
  slug: z
    .string()
    .transform((val) => val?.trim()?.toLowerCase() || undefined)
    .pipe(
      z
        .string()
        .min(2, "Slug must be at least 2 characters")
        .max(30, "Slug must be less than 30 characters")
        .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
        .optional()
    )
    .optional(),
  status: z.enum(["active", "inactive"]).optional(),
  amount: z.number().optional(),
  amount_2: z.number().optional(),
  amount_type: z.enum(["exact", "approximate", "range"]).optional(),
  recurring: z.boolean().optional(),
  auto_add: z.boolean().optional(),
  dateId: z.number().optional().nullable(),
  payeeId: z.number().positive("Payee is required").optional(),
  categoryId: z.number().optional().nullable(),
  accountId: z.number().positive("Account is required").optional(),
});

export type SuperformInsertScheduleSchema = typeof superformInsertScheduleSchema;
export type SuperformUpdateScheduleSchema = typeof superformUpdateScheduleSchema;
