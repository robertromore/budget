/**
 * Transaction Validator
 *
 * Validates normalized transaction data to ensure it meets requirements
 * before being imported into the database. Performs field-level validation,
 * duplicate detection, and data quality checks.
 */

import type { ImportRow, ValidationError, NormalizedTransaction } from '$lib/types/import';
import { parseDate, isValidDate } from '../utils';
import type { selectTransactionSchema } from '$lib/schema/transactions';
import type { z } from 'zod/v4';

export interface ValidationOptions {
  requireDate?: boolean;
  requireAmount?: boolean;
  requirePayee?: boolean;
  checkDuplicates?: boolean;
  maxAmountThreshold?: number;
  minAmountThreshold?: number;
  allowFutureDates?: boolean;
  futureMonths?: number;
}

const DEFAULT_OPTIONS: Required<ValidationOptions> = {
  requireDate: true,
  requireAmount: true,
  requirePayee: false,
  checkDuplicates: true,
  maxAmountThreshold: 1000000, // $1M
  minAmountThreshold: 0.01, // 1 cent
  allowFutureDates: true,
  futureMonths: 3,
};

export class TransactionValidator {
  private options: Required<ValidationOptions>;

  constructor(options: ValidationOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Validate a single import row
   */
  validateRow(row: ImportRow): ImportRow {
    const errors: ValidationError[] = [];
    const normalized = row.normalizedData;

    // Validate required fields
    errors.push(...this.validateRequiredFields(normalized, row.rowIndex));

    // Validate date format and range
    if (normalized['date']) {
      errors.push(...this.validateDate(normalized['date'], row.rowIndex));
    }

    // Validate amount
    if (normalized['amount'] !== undefined && normalized['amount'] !== null) {
      errors.push(...this.validateAmount(normalized['amount'], row.rowIndex));
    }

    // Validate text field lengths
    errors.push(...this.validateTextFields(normalized, row.rowIndex));

    // Update row with validation results
    const result: ImportRow = {
      ...row,
      validationStatus: errors.length === 0 ? 'valid' : 'invalid',
    };

    if (errors.length > 0) {
      result.validationErrors = errors;
    }

    return result;
  }

  /**
   * Validate multiple rows and detect duplicates
   */
  validateRows(rows: ImportRow[], existingTransactions: z.infer<typeof selectTransactionSchema>[] = []): ImportRow[] {
    // First pass: validate each row individually
    const validatedRows = rows.map((row) => this.validateRow(row));

    // Second pass: check for duplicates if enabled
    if (this.options.checkDuplicates) {
      return this.checkDuplicates(validatedRows, existingTransactions);
    }

    return validatedRows;
  }

  /**
   * Validate required fields
   */
  private validateRequiredFields(
    normalized: Partial<NormalizedTransaction>,
    _rowIndex: number
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (this.options.requireDate && !normalized.date) {
      errors.push({
        field: 'date',
        message: 'Date is required',
        value: normalized.date,
        severity: 'error',
      });
    }

    if (this.options.requireAmount && (normalized.amount === undefined || normalized.amount === null)) {
      errors.push({
        field: 'amount',
        message: 'Amount is required',
        value: normalized.amount,
        severity: 'error',
      });
    }

    if (this.options.requirePayee && !normalized.payee) {
      errors.push({
        field: 'payee',
        message: 'Payee is required',
        value: normalized.payee,
        severity: 'error',
      });
    }

    return errors;
  }

  /**
   * Validate date format and range
   */
  private validateDate(dateValue: any, _rowIndex: number): ValidationError[] {
    const errors: ValidationError[] = [];

    // Try to parse the date
    let parsedDate: string | null = null;
    try {
      if (typeof dateValue === 'string') {
        parsedDate = parseDate(dateValue);
      }
    } catch (error) {
      // Date parsing will fail, will be caught below
    }

    // Check if date is valid
    if (!parsedDate || !isValidDate(parsedDate)) {
      errors.push({
        field: 'date',
        message: 'Invalid date format. Expected YYYY-MM-DD',
        value: dateValue,
        severity: 'error',
      });
      return errors;
    }

    // Validate date range
    const date = new Date(parsedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if date is too far in the past (before 1900)
    if (date.getFullYear() < 1900) {
      errors.push({
        field: 'date',
        message: 'Date cannot be before year 1900',
        value: parsedDate,
        severity: 'error',
      });
    }

    // Check if date is in the future (if not allowed)
    if (!this.options.allowFutureDates && date > today) {
      errors.push({
        field: 'date',
        message: 'Future dates are not allowed',
        value: parsedDate,
        severity: 'error',
      });
    }

    // Check if date is too far in the future
    if (this.options.allowFutureDates && date > today) {
      const maxFutureDate = new Date(today);
      maxFutureDate.setMonth(maxFutureDate.getMonth() + this.options.futureMonths);

      if (date > maxFutureDate) {
        errors.push({
          field: 'date',
          message: `Date cannot be more than ${this.options.futureMonths} months in the future`,
          value: parsedDate,
          severity: 'warning',
        });
      }
    }

    return errors;
  }

  /**
   * Validate amount
   */
  private validateAmount(amount: any, _rowIndex: number): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check if amount is a valid number
    const numericAmount = typeof amount === 'number' ? amount : parseFloat(String(amount));

    if (isNaN(numericAmount)) {
      errors.push({
        field: 'amount',
        message: 'Amount must be a valid number',
        value: amount,
        severity: 'error',
      });
      return errors;
    }

    // Check if amount is zero
    if (numericAmount === 0) {
      errors.push({
        field: 'amount',
        message: 'Amount cannot be zero',
        value: amount,
        severity: 'warning',
      });
    }

    // Check if amount is below minimum threshold
    if (Math.abs(numericAmount) < this.options.minAmountThreshold) {
      errors.push({
        field: 'amount',
        message: `Amount is below minimum threshold of $${this.options.minAmountThreshold}`,
        value: amount,
        severity: 'warning',
      });
    }

    // Check if amount is above maximum threshold
    if (Math.abs(numericAmount) > this.options.maxAmountThreshold) {
      errors.push({
        field: 'amount',
        message: `Amount exceeds maximum threshold of $${this.options.maxAmountThreshold}`,
        value: amount,
        severity: 'warning',
      });
    }

    return errors;
  }

  /**
   * Validate text field lengths
   */
  private validateTextFields(
    normalized: Partial<NormalizedTransaction>,
    _rowIndex: number
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Payee validation
    if (normalized.payee && normalized.payee.length > 200) {
      errors.push({
        field: 'payee',
        message: 'Payee name is too long (max 200 characters)',
        value: normalized.payee,
        severity: 'error',
      });
    }

    // Category validation
    if (normalized.category && normalized.category.length > 100) {
      errors.push({
        field: 'category',
        message: 'Category name is too long (max 100 characters)',
        value: normalized.category,
        severity: 'error',
      });
    }

    // Notes validation
    if (normalized.notes && normalized.notes.length > 500) {
      errors.push({
        field: 'notes',
        message: 'Notes is too long (max 500 characters)',
        value: normalized.notes,
        severity: 'warning',
      });
    }

    return errors;
  }

  /**
   * Check for duplicate transactions
   */
  private checkDuplicates(
    rows: ImportRow[],
    existingTransactions: z.infer<typeof selectTransactionSchema>[]
  ): ImportRow[] {
    return rows.map((row) => {
      // Skip if row is already invalid
      if (row.validationStatus === 'invalid') {
        return row;
      }

      const normalized = row.normalizedData;
      const errors = row.validationErrors || [];

      // Check for duplicates in existing transactions
      const hasDuplicate = existingTransactions.some((existing) => {
        return this.isDuplicate(normalized, existing);
      });

      if (hasDuplicate) {
        errors.push({
          field: 'general',
          message: 'Potential duplicate transaction detected',
          value: normalized,
          severity: 'warning',
        });

        return {
          ...row,
          validationStatus: 'warning',
          validationErrors: errors,
        };
      }

      // Check for duplicates within the import batch
      const duplicateInBatch = rows.some((otherRow) => {
        return (
          otherRow.rowIndex !== row.rowIndex &&
          this.isDuplicate(normalized, otherRow.normalizedData)
        );
      });

      if (duplicateInBatch) {
        errors.push({
          field: 'general',
          message: 'Duplicate transaction detected in this import',
          value: normalized,
          severity: 'warning',
        });

        return {
          ...row,
          validationStatus: 'warning',
          validationErrors: errors,
        };
      }

      return row;
    });
  }

  /**
   * Determine if two transactions are duplicates
   */
  private isDuplicate(
    normalized: Partial<NormalizedTransaction>,
    existing: z.infer<typeof selectTransactionSchema> | Partial<NormalizedTransaction>
  ): boolean {
    const normalizedDate = normalized.date;
    const existingDate = this.getTransactionDate(existing);
    const normalizedAmount = normalized.amount;
    const existingAmount = this.getTransactionAmount(existing);

    // Primary duplicate detection: date and amount match
    // If date + amount match (within $0.01), consider it a duplicate
    // This is intentionally loose to catch duplicates even if payee/description differ
    // (users may change these during import)
    if (
      !normalizedDate ||
      !normalizedAmount ||
      normalizedDate !== existingDate ||
      Math.abs(normalizedAmount - existingAmount) > 0.01
    ) {
      return false;
    }

    return true;
  }

  /**
   * Helper methods to extract transaction fields from different types
   */
  private getTransactionDate(
    transaction: z.infer<typeof selectTransactionSchema> | Partial<NormalizedTransaction>
  ): string | undefined {
    if ('date' in transaction) {
      return transaction.date as string;
    }
    return undefined;
  }

  private getTransactionAmount(transaction: z.infer<typeof selectTransactionSchema> | Partial<NormalizedTransaction>): number {
    if ('amount' in transaction) {
      return typeof transaction.amount === 'number' ? transaction.amount : 0;
    }
    return 0;
  }

  private getTransactionPayee(transaction: z.infer<typeof selectTransactionSchema> | Partial<NormalizedTransaction>): string {
    if ('payee' in transaction) {
      return transaction.payee as string || '';
    }
    return '';
  }

  private getTransactionDescription(
    transaction: z.infer<typeof selectTransactionSchema> | Partial<NormalizedTransaction>
  ): string {
    if ('description' in transaction) {
      return (transaction.description as string) || '';
    }
    if ('notes' in transaction) {
      return (transaction.notes as string) || '';
    }
    return '';
  }

  /**
   * Get summary of validation results
   */
  getValidationSummary(rows: ImportRow[]): {
    total: number;
    valid: number;
    invalid: number;
    warnings: number;
    errors: ValidationError[];
  } {
    const errors: ValidationError[] = [];
    let valid = 0;
    let invalid = 0;
    let warnings = 0;

    rows.forEach((row) => {
      if (row.validationStatus === 'valid') {
        valid++;
      } else if (row.validationStatus === 'invalid') {
        invalid++;
      } else if (row.validationStatus === 'warning') {
        warnings++;
      }

      if (row.validationErrors) {
        errors.push(...row.validationErrors);
      }
    });

    return {
      total: rows.length,
      valid,
      invalid,
      warnings,
      errors,
    };
  }
}
