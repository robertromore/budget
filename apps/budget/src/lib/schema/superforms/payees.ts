import {z} from "zod";

// Import enum types from main payee schema
const payeeTypes = [
  "merchant",
  "utility",
  "employer",
  "financial_institution",
  "government",
  "individual"
] as const;

const paymentFrequencies = [
  "weekly",
  "bi_weekly",
  "monthly",
  "quarterly",
  "annual",
  "irregular"
] as const;

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

  // Budgeting Integration Fields
  defaultCategoryId: z.number().positive("Invalid category ID").optional().nullable(),
  defaultBudgetId: z.number().positive("Invalid budget ID").optional().nullable(),
  payeeType: z.enum(payeeTypes).optional().nullable(),

  // Transaction Automation Fields
  avgAmount: z.number().positive("Average amount must be positive").optional().nullable(),
  paymentFrequency: z.enum(paymentFrequencies).optional().nullable(),
  lastTransactionDate: z.string().optional().nullable(),

  // Analytics Support Fields
  taxRelevant: z.boolean().default(false),
  isActive: z.boolean().default(true),

  // Contact Information Fields
  website: z
    .string()
    .url({ message: "Invalid website URL" })
    .max(500, "Website URL must be less than 500 characters")
    .optional()
    .nullable(),
  phone: z
    .string()
    .max(20, "Phone number must be less than 20 characters")
    .regex(/^[\d\s\-\+\(\)\.]*$/, "Invalid phone number format")
    .optional()
    .nullable(),
  email: z
    .string()
    .email({ message: "Invalid email address" })
    .max(255, "Email must be less than 255 characters")
    .optional()
    .nullable(),

  // Organization Fields
  address: z.string().optional().nullable(), // JSON object for structured address
  accountNumber: z
    .string()
    .max(100, "Account number must be less than 100 characters")
    .optional()
    .nullable(),

  // Advanced Features Fields
  alertThreshold: z.number().positive("Alert threshold must be positive").optional().nullable(),
  isSeasonal: z.boolean().default(false),
  subscriptionInfo: z.string().optional().nullable(), // JSON: {cost, renewalDate, etc}
  tags: z.string().optional().nullable(), // JSON array of custom tags

  // Payment Processing Fields
  preferredPaymentMethods: z.string().optional().nullable(), // JSON array of account IDs
  merchantCategoryCode: z
    .string()
    .max(10, "Merchant category code must be less than 10 characters")
    .regex(/^\d{4}$/, "Merchant category code must be 4 digits")
    .optional()
    .nullable(),

  // System fields
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

  // Budgeting Integration Fields
  defaultCategoryId: z.number().positive("Invalid category ID").optional().nullable(),
  defaultBudgetId: z.number().positive("Invalid budget ID").optional().nullable(),
  payeeType: z.enum(payeeTypes).optional().nullable(),

  // Transaction Automation Fields
  avgAmount: z.number().positive("Average amount must be positive").optional().nullable(),
  paymentFrequency: z.enum(paymentFrequencies).optional().nullable(),
  lastTransactionDate: z.string().optional().nullable(),

  // Analytics Support Fields
  taxRelevant: z.boolean().optional(),
  isActive: z.boolean().optional(),

  // Contact Information Fields
  website: z
    .string()
    .url({ message: "Invalid website URL" })
    .max(500, "Website URL must be less than 500 characters")
    .optional()
    .nullable(),
  phone: z
    .string()
    .max(20, "Phone number must be less than 20 characters")
    .regex(/^[\d\s\-\+\(\)\.]*$/, "Invalid phone number format")
    .optional()
    .nullable(),
  email: z
    .string()
    .email({ message: "Invalid email address" })
    .max(255, "Email must be less than 255 characters")
    .optional()
    .nullable(),

  // Organization Fields
  address: z.string().optional().nullable(),
  accountNumber: z
    .string()
    .max(100, "Account number must be less than 100 characters")
    .optional()
    .nullable(),

  // Advanced Features Fields
  alertThreshold: z.number().positive("Alert threshold must be positive").optional().nullable(),
  isSeasonal: z.boolean().optional(),
  subscriptionInfo: z.string().optional().nullable(),
  tags: z.string().optional().nullable(),

  // Payment Processing Fields
  preferredPaymentMethods: z.string().optional().nullable(),
  merchantCategoryCode: z
    .string()
    .max(10, "Merchant category code must be less than 10 characters")
    .regex(/^\d{4}$/, "Merchant category code must be 4 digits")
    .optional()
    .nullable(),
});

export type SuperformInsertPayeeSchema = typeof superformInsertPayeeSchema;
export type SuperformUpdatePayeeSchema = typeof superformUpdatePayeeSchema;
