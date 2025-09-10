/**
 * Type validation utilities for enhanced type safety
 */

import {
  type NonEmptyString,
  type PositiveNumber,
  type ValidEmail,
  type ISODateString,
  type CurrencyAmount,
  type ValidationResult,
  type ValidatedFormData,
  brand,
  isNonEmptyString,
  isPositiveNumber,
  isValidEmail,
  isISODateString,
  isCurrencyAmount,
} from "../types/enhanced-types";

/**
 * Enhanced validation functions with branded types
 */
export class TypeValidator {
  /**
   * Validate and brand a non-empty string
   */
  static validateNonEmptyString(value: unknown): NonEmptyString | null {
    if (typeof value === "string" && isNonEmptyString(value)) {
      return value;
    }
    return null;
  }

  /**
   * Validate and brand a positive number
   */
  static validatePositiveNumber(value: unknown): PositiveNumber | null {
    if (typeof value === "number" && isPositiveNumber(value)) {
      return value;
    }
    return null;
  }

  /**
   * Validate and brand an email string
   */
  static validateEmail(value: unknown): ValidEmail | null {
    if (typeof value === "string" && isValidEmail(value)) {
      return value;
    }
    return null;
  }

  /**
   * Validate and brand an ISO date string
   */
  static validateISODateString(value: unknown): ISODateString | null {
    if (typeof value === "string" && isISODateString(value)) {
      return value;
    }
    return null;
  }

  /**
   * Validate and brand a currency amount
   */
  static validateCurrencyAmount(value: unknown): CurrencyAmount | null {
    if (typeof value === "number" && isCurrencyAmount(value)) {
      return value;
    }
    return null;
  }

  /**
   * Validate page size with specific constraints
   */
  static validatePageSize(value: unknown): (PositiveNumber & {__constraint: "max100"}) | null {
    const positiveNumber = this.validatePositiveNumber(value);
    if (positiveNumber && positiveNumber <= 100) {
      return positiveNumber as PositiveNumber & {__constraint: "max100"};
    }
    return null;
  }

  /**
   * Comprehensive object validation with detailed error reporting
   */
  static validateObject<T extends Record<string, unknown>>(
    value: unknown,
    schema: Record<string, (value: unknown) => ValidationResult>
  ): ValidatedFormData<T> {
    const errors: Record<string, NonEmptyString[]> = {};
    let isValid = true;

    if (typeof value !== "object" || value === null) {
      return {
        data: {} as T,
        validation: {
          isValid: false,
          errors: {root: [brand("Input must be an object")]},
        },
      };
    }

    const data = value as Record<string, unknown>;
    const validatedData = {} as any;

    // Validate each field according to schema
    for (const [field, validator] of Object.entries(schema)) {
      if (!validator) continue; // Skip undefined validators

      const fieldValue = data[field];
      const fieldErrors: NonEmptyString[] = [];

      try {
        const result = validator(fieldValue);
        if (result.isValid) {
          validatedData[field] = fieldValue;
        } else {
          const errorValues = Object.values(result.errors).flat();
          fieldErrors.push(...errorValues);
          isValid = false;
        }
      } catch (error) {
        fieldErrors.push(brand(`Validation error: ${error}`));
        isValid = false;
      }

      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors;
      }
    }

    return {
      data: validatedData as T,
      validation: {
        isValid,
        errors,
      },
    };
  }
}

/**
 * Validation schema builder for type-safe validation
 */
export class ValidationSchemaBuilder<T extends Record<string, unknown>> {
  private schema: Record<string, (value: unknown) => ValidationResult> = {};

  /**
   * Add string validation with specific constraints
   */
  string(
    field: keyof T,
    constraints: {
      required?: boolean;
      minLength?: number;
      maxLength?: number;
      pattern?: RegExp;
      email?: boolean;
    } = {}
  ): this {
    (this.schema as any)[field as string] = (value: unknown) => {
      const errors: NonEmptyString[] = [];

      if (constraints.required && (value === undefined || value === null)) {
        errors.push(brand(`${String(field)} is required`));
        return {isValid: false, errors};
      }

      if (value === undefined || value === null) {
        return {isValid: true, errors: []};
      }

      if (typeof value !== "string") {
        errors.push(brand(`${String(field)} must be a string`));
        return {isValid: false, errors};
      }

      if (constraints.minLength && value.length < constraints.minLength) {
        errors.push(brand(`${String(field)} must be at least ${constraints.minLength} characters`));
      }

      if (constraints.maxLength && value.length > constraints.maxLength) {
        errors.push(brand(`${String(field)} must be at most ${constraints.maxLength} characters`));
      }

      if (constraints.pattern && !constraints.pattern.test(value)) {
        errors.push(brand(`${String(field)} format is invalid`));
      }

      if (constraints.email && !isValidEmail(value)) {
        errors.push(brand(`${String(field)} must be a valid email`));
      }

      return {isValid: errors.length === 0, errors};
    };

    return this;
  }

  /**
   * Add number validation with specific constraints
   */
  number(
    field: keyof T,
    constraints: {
      required?: boolean;
      min?: number;
      max?: number;
      integer?: boolean;
      positive?: boolean;
    } = {}
  ): this {
    (this.schema as any)[field as string] = (value: unknown) => {
      const errors: NonEmptyString[] = [];

      if (constraints.required && (value === undefined || value === null)) {
        errors.push(brand(`${String(field)} is required`));
        return {isValid: false, errors};
      }

      if (value === undefined || value === null) {
        return {isValid: true, errors: []};
      }

      if (typeof value !== "number" || !Number.isFinite(value)) {
        errors.push(brand(`${String(field)} must be a valid number`));
        return {isValid: false, errors};
      }

      if (constraints.min !== undefined && value < constraints.min) {
        errors.push(brand(`${String(field)} must be at least ${constraints.min}`));
      }

      if (constraints.max !== undefined && value > constraints.max) {
        errors.push(brand(`${String(field)} must be at most ${constraints.max}`));
      }

      if (constraints.integer && !Number.isInteger(value)) {
        errors.push(brand(`${String(field)} must be an integer`));
      }

      if (constraints.positive && value <= 0) {
        errors.push(brand(`${String(field)} must be positive`));
      }

      return {isValid: errors.length === 0, errors};
    };

    return this;
  }

  /**
   * Add date validation
   */
  date(
    field: keyof T,
    constraints: {
      required?: boolean;
      minDate?: Date;
      maxDate?: Date;
      isoString?: boolean;
    } = {}
  ): this {
    (this.schema as any)[field as string] = (value: unknown) => {
      const errors: NonEmptyString[] = [];

      if (constraints.required && (value === undefined || value === null)) {
        errors.push(brand(`${String(field)} is required`));
        return {isValid: false, errors};
      }

      if (value === undefined || value === null) {
        return {isValid: true, errors: []};
      }

      let date: Date;

      if (typeof value === "string") {
        if (constraints.isoString && !isISODateString(value)) {
          errors.push(brand(`${String(field)} must be a valid ISO date string`));
          return {isValid: false, errors};
        }
        date = new Date(value);
      } else if (value instanceof Date) {
        date = value;
      } else {
        errors.push(brand(`${String(field)} must be a valid date`));
        return {isValid: false, errors};
      }

      if (isNaN(date.getTime())) {
        errors.push(brand(`${String(field)} must be a valid date`));
        return {isValid: false, errors};
      }

      if (constraints.minDate && date < constraints.minDate) {
        errors.push(brand(`${String(field)} must be after ${constraints.minDate.toISOString()}`));
      }

      if (constraints.maxDate && date > constraints.maxDate) {
        errors.push(brand(`${String(field)} must be before ${constraints.maxDate.toISOString()}`));
      }

      return {isValid: errors.length === 0, errors};
    };

    return this;
  }

  /**
   * Add array validation
   */
  array(
    field: keyof T,
    constraints: {
      required?: boolean;
      minLength?: number;
      maxLength?: number;
      itemValidator?: (item: unknown, index: number) => ValidationResult;
    } = {}
  ): this {
    (this.schema as any)[field as string] = (value: unknown) => {
      const errors: NonEmptyString[] = [];

      if (constraints.required && (value === undefined || value === null)) {
        errors.push(brand(`${String(field)} is required`));
        return {isValid: false, errors};
      }

      if (value === undefined || value === null) {
        return {isValid: true, errors: []};
      }

      if (!Array.isArray(value)) {
        errors.push(brand(`${String(field)} must be an array`));
        return {isValid: false, errors};
      }

      if (constraints.minLength && value.length < constraints.minLength) {
        errors.push(brand(`${String(field)} must have at least ${constraints.minLength} items`));
      }

      if (constraints.maxLength && value.length > constraints.maxLength) {
        errors.push(brand(`${String(field)} must have at most ${constraints.maxLength} items`));
      }

      if (constraints.itemValidator) {
        for (let i = 0; i < value.length; i++) {
          const itemResult = constraints.itemValidator(value[i], i);
          if (!itemResult.isValid) {
            Object.entries(itemResult.errors).forEach(([key, itemErrors]) => {
              errors.push(brand(`${String(field)}[${i}].${key}: ${itemErrors.join(", ")}`));
            });
          }
        }
      }

      return {isValid: errors.length === 0, errors};
    };

    return this;
  }

  /**
   * Add custom validation function
   */
  custom(field: keyof T, validator: (value: unknown) => ValidationResult, required = false): this {
    (this.schema as any)[field as string] = (value: unknown) => {
      if (required && (value === undefined || value === null)) {
        return {
          isValid: false,
          errors: [brand(`${String(field)} is required`)],
        };
      }

      if (value === undefined || value === null) {
        return {isValid: true, errors: []};
      }

      return validator(value);
    };

    return this;
  }

  /**
   * Build the final validation schema
   */
  build(): Record<string, (value: unknown) => ValidationResult> {
    return this.schema;
  }
}

/**
 * Pre-built validation schemas for common entities
 */
export class CommonValidationSchemas {
  /**
   * Account validation schema
   */
  static account() {
    return new ValidationSchemaBuilder<{
      name: NonEmptyString;
      type: string;
      balance: CurrencyAmount;
    }>()
      .string("name", {required: true, minLength: 1, maxLength: 100})
      .string("type", {required: true, pattern: /^(checking|savings|credit|investment)$/})
      .number("balance", {required: true})
      .build();
  }

  /**
   * Transaction validation schema
   */
  static transaction() {
    return new ValidationSchemaBuilder<{
      accountId: PositiveNumber;
      amount: CurrencyAmount;
      description: NonEmptyString;
      date: ISODateString;
      categoryId?: PositiveNumber;
      payeeId?: PositiveNumber;
    }>()
      .number("accountId", {required: true, positive: true, integer: true})
      .number("amount", {required: true})
      .string("description", {required: true, minLength: 1, maxLength: 500})
      .date("date", {required: true, isoString: true})
      .number("categoryId", {positive: true, integer: true})
      .number("payeeId", {positive: true, integer: true})
      .build();
  }

  /**
   * User validation schema
   */
  static user() {
    return new ValidationSchemaBuilder<{
      name: NonEmptyString;
      email: ValidEmail;
    }>()
      .string("name", {required: true, minLength: 1, maxLength: 100})
      .string("email", {required: true, email: true})
      .build();
  }

  /**
   * Pagination parameters validation schema
   */
  static paginationParams() {
    return new ValidationSchemaBuilder<{
      page: PositiveNumber;
      pageSize: PositiveNumber;
      sortBy?: NonEmptyString;
      sortOrder?: "asc" | "desc";
    }>()
      .number("page", {required: true, positive: true, integer: true, min: 1})
      .number("pageSize", {required: true, positive: true, integer: true, min: 1, max: 100})
      .string("sortBy", {minLength: 1})
      .custom("sortOrder", (value): ValidationResult => {
        if (value !== undefined && value !== "asc" && value !== "desc") {
          return {
            isValid: false,
            errors: {sortOrder: [brand('sortOrder must be either "asc" or "desc"')]},
          };
        }
        return {isValid: true, errors: {}};
      })
      .build();
  }
}

/**
 * Runtime type checking utilities
 */
export class RuntimeTypeChecker {
  /**
   * Assert that a value matches a type guard
   */
  static assert<T>(value: unknown, guard: (value: unknown) => value is T, message?: string): T {
    if (!guard(value)) {
      throw new TypeError(message || `Value does not match expected type`);
    }
    return value;
  }

  /**
   * Safe type casting with validation
   */
  static safeCast<T>(
    value: unknown,
    validator: (value: unknown) => value is T
  ): {success: true; data: T} | {success: false; error: NonEmptyString} {
    try {
      if (validator(value)) {
        return {success: true, data: value};
      }
      return {success: false, error: brand("Value does not match expected type")};
    } catch (error) {
      return {success: false, error: brand(`Validation error: ${error}`)};
    }
  }

  /**
   * Validate and transform API response
   */
  static validateAPIResponse<T>(
    response: unknown,
    dataValidator: (data: unknown) => data is T
  ): {success: true; data: T} | {success: false; error: NonEmptyString} {
    if (typeof response !== "object" || response === null) {
      return {success: false, error: brand("Response must be an object")};
    }

    const obj = response as Record<string, unknown>;

    if ((obj as any).success !== true) {
      return {success: false, error: brand("Response indicates failure")};
    }

    if (!obj["data"]) {
      return {success: false, error: brand("Response missing data")};
    }

    return this.safeCast(obj["data"], dataValidator);
  }
}

// Type validation schema interface for external use
type ValidationSchemaDefinition<T> = Record<keyof T, (value: unknown) => ValidationResult>;
