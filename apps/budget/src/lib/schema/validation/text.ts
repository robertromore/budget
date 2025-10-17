import { z } from "zod";

/**
 * Common validation helpers for text fields
 * Provides reusable validation patterns for schema definitions
 */

/**
 * Check if text contains invalid characters commonly used in attacks or malformed data
 */
function isCleanText(val: string): boolean {
  const invalidChars = ['<', '>', '{', '}', '[', ']', '\\', '|', '@', '#', '$', '%', '^', '*'];
  return !invalidChars.some(char => val.includes(char));
}

/**
 * Sanitized text field with trim, length validation, and invalid character checking
 * @param fieldName - Name of the field for error messages
 * @param min - Minimum length
 * @param max - Maximum length
 * @returns Zod schema with validation
 *
 * @example
 * const nameSchema = sanitizedText("Name", 2, 50);
 */
export function sanitizedText(fieldName: string, min: number, max: number) {
  return z.string()
    .transform((val) => val?.trim())
    .pipe(
      z.string()
        .min(min, `${fieldName} must be at least ${min} characters`)
        .max(max, `${fieldName} must be less than ${max} characters`)
        .refine(isCleanText, `${fieldName} contains invalid characters`)
    );
}

/**
 * Optional sanitized text field
 */
export function optionalSanitizedText(fieldName: string, min: number, max: number) {
  return sanitizedText(fieldName, min, max).optional();
}

/**
 * Nullable sanitized text field
 */
export function nullableSanitizedText(fieldName: string, min: number, max: number) {
  return sanitizedText(fieldName, min, max).nullable();
}

/**
 * Hex color validation
 */
export function hexColor(fieldName: string = "Color") {
  return z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, `${fieldName} must be a valid hex color (e.g., #FFFFFF)`);
}

/**
 * Optional hex color
 */
export function optionalHexColor(fieldName: string = "Color") {
  return hexColor(fieldName).optional().nullable();
}

/**
 * Slug validation (lowercase, numbers, hyphens only)
 */
export function slug(fieldName: string = "Slug") {
  return z.string()
    .min(2, `${fieldName} must be at least 2 characters`)
    .max(100, `${fieldName} must be less than 100 characters`)
    .regex(/^[a-z0-9-]+$/, `${fieldName} must contain only lowercase letters, numbers, and hyphens`);
}
