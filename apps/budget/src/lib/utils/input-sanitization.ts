/**
 * Input sanitization utilities for preventing XSS and maintaining data integrity
 */

/**
 * Sanitizes text input by removing HTML tags and trimming whitespace
 */
export function sanitizeTextInput(input: string | null | undefined): string | null {
  if (!input || typeof input !== "string") {
    return null;
  }

  const trimmed = input.trim();

  if (!trimmed) {
    return null;
  }

  // Remove HTML tags
  const sanitized = trimmed.replace(/<[^>]*>/g, "");

  return sanitized || null;
}

/**
 * Validates that text input doesn't contain HTML tags
 */
export function containsHtmlTags(input: string): boolean {
  if (!input || typeof input !== "string") {
    return false;
  }

  return input.includes("<") || input.includes(">");
}

/**
 * Validates and sanitizes notes field specifically
 */
export function validateAndSanitizeNotes(notes: string | null | undefined): {
  isValid: boolean;
  sanitized: string | null;
  error?: string;
} {
  if (!notes) {
    return {isValid: true, sanitized: null};
  }

  if (typeof notes !== "string") {
    return {isValid: false, sanitized: null, error: "Notes must be a string"};
  }

  const trimmed = notes.trim();

  if (trimmed.length > 500) {
    return {isValid: false, sanitized: null, error: "Notes must be less than 500 characters"};
  }

  if (containsHtmlTags(trimmed)) {
    return {isValid: false, sanitized: null, error: "Notes cannot contain HTML tags"};
  }

  return {isValid: true, sanitized: trimmed || null};
}
