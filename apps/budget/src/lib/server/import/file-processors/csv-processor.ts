/**
 * CSV File Processor
 *
 * Handles parsing of CSV files with robust error handling,
 * header normalization, and data transformation.
 */

import Papa from 'papaparse';
import type { FileProcessor, ImportRow, NormalizedTransaction, ColumnMapping } from '$lib/types/import';
import { FileValidationError, ParseError } from '../errors';
import {
  normalizeHeader,
  parseDate,
  parseAmount,
  sanitizeText,
  validateFileType,
  detectCSVDelimiter,
} from '../utils';

export class CSVProcessor implements FileProcessor {
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly supportedFormats = ['.csv', '.txt'];
  private columnMapping?: ColumnMapping;

  constructor(columnMapping?: ColumnMapping) {
    if (columnMapping !== undefined) {
      this.columnMapping = columnMapping;
    }
  }

  getSupportedFormats(): string[] {
    return this.supportedFormats;
  }

  validateFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    if (!validateFileType(file.name, this.supportedFormats)) {
      return {
        valid: false,
        error: `Invalid file type. Supported formats: ${this.supportedFormats.join(', ')}`,
      };
    }

    // Check file size
    if (file.size > this.maxFileSize) {
      return {
        valid: false,
        error: `File size exceeds limit of ${this.maxFileSize / (1024 * 1024)}MB`,
      };
    }

    // Check if file is empty
    if (file.size === 0) {
      return {
        valid: false,
        error: 'File is empty',
      };
    }

    return { valid: true };
  }

  async parseFile(file: File): Promise<ImportRow[]> {
    // Validate file
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new FileValidationError(validation.error || 'File validation failed', 'csv');
    }

    // Read file content
    const text = await file.text();

    if (!text || text.trim().length === 0) {
      throw new ParseError('File is empty or contains no data');
    }

    // Detect delimiter
    const delimiter = detectCSVDelimiter(text);

    // Parse CSV with Papa Parse
    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        delimiter,
        transformHeader: (header: string) => this.normalizeHeaderName(header),
        complete: (results) => {
          try {
            if (results.errors.length > 0) {
              // Filter out non-critical errors
              const criticalErrors = results.errors.filter(
                error => error.type === 'FieldMismatch' || error.type === 'Quotes'
              );

              if (criticalErrors.length > 0) {
                const firstError = criticalErrors[0];
                if (firstError) {
                  throw new ParseError(
                    `CSV parsing failed: ${firstError.message}`,
                    firstError.row,
                    firstError.code
                  );
                }
              }
            }

            if (!results.data || results.data.length === 0) {
              throw new ParseError('No data found in CSV file');
            }

            const importRows = this.transformParsedData(results.data as Record<string, any>[]);
            resolve(importRows);
          } catch (error) {
            if (error instanceof ParseError) {
              reject(error);
            } else {
              reject(new ParseError('Failed to parse CSV file'));
            }
          }
        },
        error: (error: Error) => {
          reject(new ParseError(`CSV parsing error: ${error.message}`));
        },
      });
    });
  }

  private normalizeHeaderName(header: string): string {
    return normalizeHeader(header);
  }

  private transformParsedData(data: Record<string, any>[]): ImportRow[] {
    return data.map((row, index) => {
      try {
        const normalizedData = this.normalizeRow(row);

        return {
          rowIndex: index,
          rawData: row,
          normalizedData,
          validationStatus: 'pending',
        };
      } catch (error) {
        return {
          rowIndex: index,
          rawData: row,
          normalizedData: {},
          validationStatus: 'invalid',
          validationErrors: [{
            field: 'general',
            message: error instanceof Error ? error.message : 'Failed to parse row',
            value: row,
            severity: 'error',
          }],
        };
      }
    });
  }

  private applyColumnMapping(row: Record<string, any>): Record<string, any> {
    if (!this.columnMapping) return row;

    const mapped: Record<string, any> = {};

    // Apply custom column mapping
    if (this.columnMapping.date && row[this.columnMapping.date] !== undefined) {
      mapped['date'] = row[this.columnMapping.date];
    }

    if (this.columnMapping.amount && row[this.columnMapping.amount] !== undefined) {
      mapped['amount'] = row[this.columnMapping.amount];
    }

    if (this.columnMapping.debit && row[this.columnMapping.debit] !== undefined) {
      mapped['debit'] = row[this.columnMapping.debit];
    }

    if (this.columnMapping.credit && row[this.columnMapping.credit] !== undefined) {
      mapped['credit'] = row[this.columnMapping.credit];
    }

    if (this.columnMapping.payee && row[this.columnMapping.payee] !== undefined) {
      mapped['payee'] = row[this.columnMapping.payee];
    }

    if (this.columnMapping.notes && row[this.columnMapping.notes] !== undefined) {
      mapped['notes'] = row[this.columnMapping.notes];
    }

    if (this.columnMapping.category && row[this.columnMapping.category] !== undefined) {
      mapped['category'] = row[this.columnMapping.category];
    }

    if (this.columnMapping.status && row[this.columnMapping.status] !== undefined) {
      mapped['status'] = row[this.columnMapping.status];
    }

    return mapped;
  }

  private normalizeRow(row: Record<string, any>): Partial<NormalizedTransaction> {
    // Apply custom column mapping if provided
    const mappedRow = this.columnMapping ? this.applyColumnMapping(row) : row;

    const normalized: Partial<NormalizedTransaction> = {};

    // Skip special transaction types (only check if using auto-detection, not custom mapping)
    if (!this.columnMapping) {
      const transactionType = mappedRow['transaction']?.toString().toLowerCase().trim() || '';
      if (transactionType === 'beginning balance' || transactionType === 'ending balance') {
        // Mark as skipped by not including required fields
        return normalized;
      }
    }

    // Parse date
    if (mappedRow['date']) {
      try {
        normalized.date = parseDate(mappedRow['date']);
      } catch (error) {
        // Leave as is, will be caught in validation
        normalized.date = mappedRow['date'];
      }
    }

    // Parse amount - handle both single amount column and debit/credit columns
    if (mappedRow['debit'] !== undefined || mappedRow['credit'] !== undefined) {
      // CSV has separate debit/credit columns
      try {
        const debit = mappedRow['debit'] ? parseAmount(mappedRow['debit']) : 0;
        const credit = mappedRow['credit'] ? parseAmount(mappedRow['credit']) : 0;

        // Credit is positive (money in), debit is negative (money out)
        // Net amount = credit - debit
        if (credit > 0 && debit === 0) {
          normalized.amount = credit;
        } else if (debit > 0 && credit === 0) {
          normalized.amount = -debit;
        } else if (credit > 0 && debit > 0) {
          // Both have values - use net (unusual but handle it)
          normalized.amount = credit - debit;
        } else {
          // Both are zero - skip this row
          return normalized;
        }
      } catch (error) {
        // Leave as is, will be caught in validation
        normalized.amount = 0;
      }
    } else if (mappedRow['amount'] !== undefined && mappedRow['amount'] !== null && mappedRow['amount'] !== '') {
      // Standard single amount column
      try {
        normalized.amount = parseAmount(mappedRow['amount']);
      } catch (error) {
        // Leave as is, will be caught in validation
        normalized.amount = mappedRow['amount'];
      }
    }

    // Normalize payee
    if (mappedRow['payee']) {
      normalized.payee = sanitizeText(mappedRow['payee'], 200);
    }

    // Normalize notes - check both notes and transaction columns
    if (mappedRow['notes']) {
      normalized.notes = sanitizeText(mappedRow['notes'], 500);
    } else if (!this.columnMapping && mappedRow['transaction']) {
      const transactionType = mappedRow['transaction']?.toString().toLowerCase().trim() || '';
      if (transactionType !== 'beginning balance' && transactionType !== 'ending balance') {
        // Use transaction column as notes if no notes column exists
        normalized.notes = sanitizeText(mappedRow['transaction'], 500);
      }
    }

    // Also check memo column for additional notes
    if (mappedRow['memo'] && !mappedRow['notes']) {
      normalized.notes = sanitizeText(mappedRow['memo'], 500);
    }

    // Normalize category
    if (mappedRow['category']) {
      normalized.category = sanitizeText(mappedRow['category'], 100);
    }

    // Normalize status
    if (mappedRow['status']) {
      const statusLower = mappedRow['status'].toString().toLowerCase();
      if (statusLower === 'cleared' || statusLower === 'posted' || statusLower === 'c') {
        normalized.status = 'cleared';
      } else {
        normalized.status = 'pending';
      }
    }

    return normalized;
  }
}
