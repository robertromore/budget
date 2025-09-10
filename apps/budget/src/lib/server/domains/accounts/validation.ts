import {z} from "zod";
import {VALIDATION_CONFIG} from "$lib/server/config/validation";

/**
 * Account-specific validation schemas
 */
export const accountValidationSchemas = {
  // Create account schema
  create: z.object({
    name: z
      .string()
      .trim()
      .min(
        VALIDATION_CONFIG.ACCOUNT.NAME.MIN,
        `Account name must be at least ${VALIDATION_CONFIG.ACCOUNT.NAME.MIN} characters`
      )
      .max(
        VALIDATION_CONFIG.ACCOUNT.NAME.MAX,
        `Account name must be less than ${VALIDATION_CONFIG.ACCOUNT.NAME.MAX} characters`
      )
      .refine((val) => {
        // No HTML/script tags
        return !/<[^>]*>/g.test(val);
      }, "Account name cannot contain HTML"),

    notes: z
      .string()
      .trim()
      .max(
        VALIDATION_CONFIG.ACCOUNT.NOTES.MAX,
        `Notes must be less than ${VALIDATION_CONFIG.ACCOUNT.NOTES.MAX} characters`
      )
      .optional()
      .transform((val) => val || undefined),

    initialBalance: z
      .number()
      .min(
        VALIDATION_CONFIG.TRANSACTION.AMOUNT.MIN,
        `Balance cannot be less than ${VALIDATION_CONFIG.TRANSACTION.AMOUNT.MIN}`
      )
      .max(
        VALIDATION_CONFIG.TRANSACTION.AMOUNT.MAX,
        `Balance cannot be greater than ${VALIDATION_CONFIG.TRANSACTION.AMOUNT.MAX}`
      )
      .default(0),
  }),

  // Update account schema
  update: z.object({
    id: z.number().positive("Account ID must be positive"),

    name: z
      .string()
      .trim()
      .min(
        VALIDATION_CONFIG.ACCOUNT.NAME.MIN,
        `Account name must be at least ${VALIDATION_CONFIG.ACCOUNT.NAME.MIN} characters`
      )
      .max(
        VALIDATION_CONFIG.ACCOUNT.NAME.MAX,
        `Account name must be less than ${VALIDATION_CONFIG.ACCOUNT.NAME.MAX} characters`
      )
      .refine((val) => {
        return !/<[^>]*>/g.test(val);
      }, "Account name cannot contain HTML")
      .optional(),

    notes: z
      .string()
      .trim()
      .max(
        VALIDATION_CONFIG.ACCOUNT.NOTES.MAX,
        `Notes must be less than ${VALIDATION_CONFIG.ACCOUNT.NOTES.MAX} characters`
      )
      .optional()
      .transform((val) => val || undefined),

    balance: z
      .number()
      .min(
        VALIDATION_CONFIG.TRANSACTION.AMOUNT.MIN,
        `Balance cannot be less than ${VALIDATION_CONFIG.TRANSACTION.AMOUNT.MIN}`
      )
      .max(
        VALIDATION_CONFIG.TRANSACTION.AMOUNT.MAX,
        `Balance cannot be greater than ${VALIDATION_CONFIG.TRANSACTION.AMOUNT.MAX}`
      )
      .optional(),
  }),

  // Get by ID schema
  byId: z.object({
    id: z.number().positive("Account ID must be positive"),
  }),

  // Get by slug schema
  bySlug: z.object({
    slug: z
      .string()
      .trim()
      .min(
        VALIDATION_CONFIG.ACCOUNT.SLUG.MIN,
        `Slug must be at least ${VALIDATION_CONFIG.ACCOUNT.SLUG.MIN} characters`
      )
      .max(
        VALIDATION_CONFIG.ACCOUNT.SLUG.MAX,
        `Slug must be less than ${VALIDATION_CONFIG.ACCOUNT.SLUG.MAX} characters`
      )
      .regex(
        /^[a-z0-9\-_]+$/,
        "Slug can only contain lowercase letters, numbers, hyphens, and underscores"
      ),
  }),

  // Search schema
  search: z.object({
    query: z
      .string()
      .trim()
      .min(1, "Search query is required")
      .max(100, "Search query must be less than 100 characters"),
    limit: z.number().min(1).max(50).default(10),
  }),

  // Delete schema
  delete: z.object({
    id: z.number().positive("Account ID must be positive"),
  }),

  // Update balance schema
  updateBalance: z.object({
    id: z.number().positive("Account ID must be positive"),
    balance: z
      .number()
      .min(
        VALIDATION_CONFIG.TRANSACTION.AMOUNT.MIN,
        `Balance cannot be less than ${VALIDATION_CONFIG.TRANSACTION.AMOUNT.MIN}`
      )
      .max(
        VALIDATION_CONFIG.TRANSACTION.AMOUNT.MAX,
        `Balance cannot be greater than ${VALIDATION_CONFIG.TRANSACTION.AMOUNT.MAX}`
      ),
  }),
} as const;
