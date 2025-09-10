import {z} from "zod";

/**
 * Sanitizes HTML content by removing all HTML tags and trimming whitespace
 */
export const sanitizeHtml = (input: string): string => {
  return input.replace(/<[^>]*>/g, "").trim();
};

/**
 * Creates a restricted text schema with length limits and HTML sanitization
 */
export const restrictedTextSchema = (min: number = 1, max: number = 100) =>
  z
    .string()
    .min(min, `Text must be at least ${min} characters`)
    .max(max, `Text must be less than ${max} characters`)
    .transform(sanitizeHtml)
    .refine((val) => val.length >= min, "Text too short after sanitization");

/**
 * Schema for safe HTML content with basic sanitization
 */
export const safeHtmlSchema = (maxLength: number = 500) =>
  z
    .string()
    .max(maxLength, `Content must be less than ${maxLength} characters`)
    .transform(sanitizeHtml)
    .optional()
    .nullable();

/**
 * Schema for currency amounts with proper validation
 */
export const currencyAmountSchema = z
  .number()
  .min(-999999.99, "Amount cannot be less than -$999,999.99")
  .max(999999.99, "Amount cannot exceed $999,999.99")
  .multipleOf(0.01, "Amount must be a valid currency value");

/**
 * Schema for safe slugs (URL-friendly identifiers)
 */
export const slugSchema = (min: number = 2, max: number = 50) =>
  z
    .string()
    .min(min, `Slug must be at least ${min} characters`)
    .max(max, `Slug must be less than ${max} characters`)
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens");

/**
 * Schema for names with basic character restrictions
 */
export const nameSchema = (min: number = 1, max: number = 50) =>
  z
    .string()
    .transform(sanitizeHtml) // Sanitize first
    .refine((val) => val.length >= min, `Name must be at least ${min} characters`)
    .refine((val) => val.length <= max, `Name must be less than ${max} characters`)
    .refine((val) => /^[a-zA-Z0-9\s\-_&']+$/.test(val), "Name contains invalid characters");

/**
 * Schema for bulk operations with item limits
 */
export const bulkOperationSchema = z.object({
  entities: z.array(z.number().nonnegative()).max(100, "Too many items in bulk operation"),
});

/**
 * Schema for email validation
 */
export const emailSchema = z
  .string()
  .email("Invalid email format")
  .max(100, "Email must be less than 100 characters")
  .toLowerCase();

/**
 * Schema for secure password validation
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be less than 128 characters")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    "Password must contain at least one lowercase letter, one uppercase letter, and one number"
  );
