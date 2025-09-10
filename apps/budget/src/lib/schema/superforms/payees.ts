import {z} from "zod";

// Superform-compatible schemas for payees (not using drizzle-zod)
export const superformInsertPayeeSchema = z.object({
  id: z.number().optional(),
  name: z
    .string()
    .transform((val) => val?.trim())
    .pipe(
      z
        .string()
        .min(1, "Payee name is required")
        .max(50, "Payee name must be less than 50 characters")
        .regex(/^[a-zA-Z0-9\s\-_&']+$/, "Payee name contains invalid characters")
    ),
  notes: z
    .string()
    .transform((val) => val?.trim())
    .pipe(z.string().max(500, "Notes must be less than 500 characters"))
    .optional()
    .nullable(),
  dateCreated: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  deletedAt: z.string().optional().nullable(),
});

export const superformUpdatePayeeSchema = z.object({
  id: z.number().positive(),
  name: z
    .string()
    .transform((val) => val?.trim())
    .pipe(
      z
        .string()
        .min(1, "Payee name is required")
        .max(50, "Payee name must be less than 50 characters")
        .regex(/^[a-zA-Z0-9\s\-_&']+$/, "Payee name contains invalid characters")
    )
    .optional(),
  notes: z
    .string()
    .transform((val) => val?.trim())
    .pipe(z.string().max(500, "Notes must be less than 500 characters"))
    .optional()
    .nullable(),
});

export type SuperformInsertPayeeSchema = typeof superformInsertPayeeSchema;
export type SuperformUpdatePayeeSchema = typeof superformUpdatePayeeSchema;
