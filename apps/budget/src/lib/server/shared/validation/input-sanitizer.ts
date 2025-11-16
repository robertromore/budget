import validator from "validator";
import { ValidationError } from "$lib/server/shared/types";
import { VALIDATION_CONFIG, SANITIZATION_PATTERNS } from "$lib/server/config/validation";

/**
 * Input sanitization and validation utilities
 */
export class InputSanitizer {
  /**
   * Sanitize and validate text input
   */
  static sanitizeText(
    input: string,
    options: {
      required?: boolean;
      minLength?: number;
      maxLength?: number;
      allowedPattern?: RegExp;
      fieldName?: string;
    } = {}
  ): string {
    const {
      required = false,
      minLength = 0,
      maxLength = 1000,
      allowedPattern,
      fieldName = "input",
    } = options;

    // Trim whitespace
    const trimmed = input?.trim() || "";

    // Check if required
    if (required && !trimmed) {
      throw new ValidationError(`${fieldName} is required`, fieldName);
    }

    // Check length constraints
    if (trimmed && trimmed.length < minLength) {
      throw new ValidationError(`${fieldName} must be at least ${minLength} characters`, fieldName);
    }

    if (trimmed.length > maxLength) {
      throw new ValidationError(
        `${fieldName} must be less than ${maxLength} characters`,
        fieldName
      );
    }

    // Check for dangerous patterns
    if (trimmed) {
      this.checkForDangerousPatterns(trimmed, fieldName);
    }

    // Check allowed pattern
    if (trimmed && allowedPattern && !allowedPattern.test(trimmed)) {
      throw new ValidationError(`${fieldName} contains invalid characters`, fieldName);
    }

    return trimmed;
  }

  /**
   * Sanitize and validate account name
   */
  static sanitizeAccountName(name: string): string {
    return this.sanitizeText(name, {
      required: true,
      minLength: VALIDATION_CONFIG.ACCOUNT.NAME.MIN,
      maxLength: VALIDATION_CONFIG.ACCOUNT.NAME.MAX,
      allowedPattern: SANITIZATION_PATTERNS.NAME_ALLOWED,
      fieldName: "Account name",
    });
  }

  /**
   * Sanitize and validate slug
   */
  static sanitizeSlug(slug: string): string {
    return this.sanitizeText(slug, {
      required: true,
      minLength: VALIDATION_CONFIG.ACCOUNT.SLUG.MIN,
      maxLength: VALIDATION_CONFIG.ACCOUNT.SLUG.MAX,
      allowedPattern: SANITIZATION_PATTERNS.SLUG_ALLOWED,
      fieldName: "Slug",
    });
  }

  /**
   * Sanitize and validate name
   */
  static sanitizeName(name: string): string {
    return this.sanitizeText(name, {
      required: true,
      minLength: 1,
      maxLength: 100,
      allowedPattern: SANITIZATION_PATTERNS.NAME_ALLOWED,
      fieldName: "Name",
    });
  }

  /**
   * Sanitize and validate description
   */
  static sanitizeDescription(description: string, maxLength?: number): string {
    return this.sanitizeText(description, {
      required: false,
      maxLength: maxLength || 500,
      allowedPattern: SANITIZATION_PATTERNS.DESCRIPTION_ALLOWED,
      fieldName: "Description",
    });
  }

  /**
   * Validate numeric amount
   */
  static validateAmount(amount: number, fieldName: string = "Amount"): number {
    if (typeof amount !== "number" || isNaN(amount)) {
      throw new ValidationError(`${fieldName} must be a valid number`, fieldName);
    }

    if (amount < VALIDATION_CONFIG.TRANSACTION.AMOUNT.MIN) {
      throw new ValidationError(
        `${fieldName} cannot be less than ${VALIDATION_CONFIG.TRANSACTION.AMOUNT.MIN}`,
        fieldName
      );
    }

    if (amount > VALIDATION_CONFIG.TRANSACTION.AMOUNT.MAX) {
      throw new ValidationError(
        `${fieldName} cannot be greater than ${VALIDATION_CONFIG.TRANSACTION.AMOUNT.MAX}`,
        fieldName
      );
    }

    return amount;
  }

  /**
   * Validate email address
   */
  static validateEmail(email: string): string {
    const trimmed = email?.trim() || "";

    if (!trimmed) {
      throw new ValidationError("Email is required", "email");
    }

    if (!validator.isEmail(trimmed)) {
      throw new ValidationError("Invalid email format", "email");
    }

    return trimmed.toLowerCase();
  }

  /**
   * Check for dangerous patterns in input
   */
  private static checkForDangerousPatterns(input: string, fieldName: string): void {
    // Check for XSS patterns
    for (const pattern of SANITIZATION_PATTERNS.XSS_PATTERNS) {
      if (input.includes(pattern)) {
        throw new ValidationError(`${fieldName} contains invalid characters`, fieldName);
      }
    }

    // Check for SQL injection patterns (case insensitive)
    const lowerInput = input.toLowerCase();
    for (const pattern of SANITIZATION_PATTERNS.SQL_INJECTION_PATTERNS) {
      if (lowerInput.includes(pattern)) {
        throw new ValidationError(`${fieldName} contains invalid characters`, fieldName);
      }
    }
  }
}
