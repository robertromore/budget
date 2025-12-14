import { columnMappingSchema } from "$lib/schema/import-profiles";
import { z } from "zod/v4";

// Create profile schema
export const createImportProfileSchema = z.object({
  name: z
    .string()
    .min(1, "Profile name is required")
    .min(2, "Profile name must be at least 2 characters")
    .max(100, "Profile name must be less than 100 characters"),
  columnSignature: z.string().max(1000).optional().nullable(),
  filenamePattern: z.string().max(200).optional().nullable(),
  accountId: z.number().positive().optional().nullable(),
  isAccountDefault: z.boolean().optional().default(false),
  mapping: columnMappingSchema,
});

export type CreateImportProfileInput = z.infer<typeof createImportProfileSchema>;

// Update profile schema
export const updateImportProfileSchema = z.object({
  id: z.number().positive(),
  name: z
    .string()
    .min(2, "Profile name must be at least 2 characters")
    .max(100, "Profile name must be less than 100 characters")
    .optional(),
  filenamePattern: z.string().max(200).optional().nullable(),
  accountId: z.number().positive().optional().nullable(),
  isAccountDefault: z.boolean().optional(),
  mapping: columnMappingSchema.optional(),
});

export type UpdateImportProfileInput = z.infer<typeof updateImportProfileSchema>;

// Delete profile schema
export const deleteImportProfileSchema = z.object({
  id: z.number().positive(),
});

export type DeleteImportProfileInput = z.infer<typeof deleteImportProfileSchema>;

// Find match schema
export const findMatchSchema = z.object({
  headers: z.array(z.string()),
  filename: z.string().optional(),
  accountId: z.number().positive().optional(),
});

export type FindMatchInput = z.infer<typeof findMatchSchema>;

// Set account default schema
export const setAccountDefaultSchema = z.object({
  profileId: z.number().positive(),
  accountId: z.number().positive(),
});

export type SetAccountDefaultInput = z.infer<typeof setAccountDefaultSchema>;

// Profile ID schema
export const importProfileIdSchema = z.object({
  id: z.number().positive(),
});

export type ImportProfileIdInput = z.infer<typeof importProfileIdSchema>;
