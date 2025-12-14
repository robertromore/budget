/**
 * QIF (Quicken Interchange Format) File Processor
 *
 * Handles parsing of QIF files with support for transaction records.
 * QIF format uses single-letter codes followed by data on each line.
 */

import type { FileProcessor, ImportRow, NormalizedTransaction } from "$lib/types/import";
import { FileValidationError, ParseError } from "../errors";
import { parseDate, sanitizeText, validateFileType } from "../utils";

interface QIFTransaction {
  date?: string;
  amount?: number;
  payee?: string;
  memo?: string;
  category?: string;
  clearedStatus?: string;
  checkNumber?: string;
}

export class QIFProcessor implements FileProcessor {
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB
  private readonly supportedFormats = [".qif"];

  getSupportedFormats(): string[] {
    return this.supportedFormats;
  }

  validateFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    if (!validateFileType(file.name, this.supportedFormats)) {
      return {
        valid: false,
        error: `Invalid file type. Supported formats: ${this.supportedFormats.join(", ")}`,
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
        error: "File is empty",
      };
    }

    return { valid: true };
  }

  async parseFile(file: File): Promise<ImportRow[]> {
    // Validate file
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new FileValidationError(validation.error || "File validation failed", "qif");
    }

    try {
      // Read file content
      const text = await file.text();

      if (!text || text.trim().length === 0) {
        throw new ParseError("File is empty or contains no data");
      }

      // Parse QIF transactions
      const transactions = this.parseQIFContent(text);

      if (transactions.length === 0) {
        throw new ParseError("No transactions found in QIF file");
      }

      // Transform to ImportRows
      const importRows = transactions.map((transaction, index) => {
        try {
          const normalizedData = this.normalizeTransaction(transaction);

          return {
            rowIndex: index,
            rawData: transaction,
            normalizedData,
            validationStatus: "pending" as const,
          };
        } catch (error) {
          return {
            rowIndex: index,
            rawData: transaction,
            normalizedData: {},
            validationStatus: "invalid" as const,
            validationErrors: [
              {
                field: "general",
                message: error instanceof Error ? error.message : "Failed to parse transaction",
                value: transaction,
                severity: "error" as const,
              },
            ],
          };
        }
      });

      return importRows;
    } catch (error) {
      if (error instanceof ParseError || error instanceof FileValidationError) {
        throw error;
      }
      throw new ParseError(
        `Failed to parse QIF file: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private parseQIFContent(content: string): QIFTransaction[] {
    const transactions: QIFTransaction[] = [];
    const lines = content.split(/\r?\n/);

    let currentTransaction: QIFTransaction = {};
    let inTransaction = false;

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (!trimmedLine) continue;

      // Check for header/account type (skip these lines)
      if (trimmedLine.startsWith("!Type:")) {
        inTransaction = true;
        continue;
      }

      // Transaction delimiter
      if (trimmedLine === "^") {
        if (Object.keys(currentTransaction).length > 0) {
          transactions.push(currentTransaction);
          currentTransaction = {};
        }
        continue;
      }

      if (!inTransaction) continue;

      // Parse transaction fields
      const code = trimmedLine.charAt(0);
      const value = trimmedLine.substring(1).trim();

      switch (code) {
        case "D": // Date
          currentTransaction.date = value;
          break;
        case "T": // Transaction amount
          currentTransaction.amount = this.parseQIFAmount(value);
          break;
        case "P": // Payee
          currentTransaction.payee = value;
          break;
        case "M": // Memo
          currentTransaction.memo = value;
          break;
        case "L": // Category
          currentTransaction.category = value;
          break;
        case "C": // Cleared status
          currentTransaction.clearedStatus = value;
          break;
        case "N": // Check number
          currentTransaction.checkNumber = value;
          break;
        // Ignore other codes for now
      }
    }

    // Add last transaction if not ended with ^
    if (Object.keys(currentTransaction).length > 0) {
      transactions.push(currentTransaction);
    }

    return transactions;
  }

  private parseQIFAmount(value: string): number {
    // QIF amounts can have commas as thousands separators
    const cleaned = value.replace(/,/g, "");
    return parseFloat(cleaned) || 0;
  }

  private normalizeTransaction(transaction: QIFTransaction): Partial<NormalizedTransaction> {
    const normalized: Partial<NormalizedTransaction> = {};

    // Parse date
    if (transaction.date) {
      try {
        normalized.date = parseDate(transaction.date);
      } catch (error) {
        // Leave as is, will be caught in validation
        normalized.date = transaction.date;
      }
    }

    // Amount
    if (transaction.amount !== undefined) {
      normalized.amount = transaction.amount;
    }

    // Payee
    if (transaction.payee) {
      normalized.payee = sanitizeText(transaction.payee, 200);
    }

    // Notes (use memo if available)
    if (transaction.memo) {
      normalized.notes = sanitizeText(transaction.memo, 500);
    }

    // Category
    if (transaction.category) {
      // QIF categories can include subcategories with : separator
      const categoryParts = transaction.category.split(":");
      normalized.category = sanitizeText(categoryParts[0] || "", 100);
    }

    // Status
    if (transaction.clearedStatus) {
      const status = transaction.clearedStatus.toLowerCase();
      // QIF cleared status: * = cleared, c = cleared, x = reconciled
      if (status === "*" || status === "c" || status === "x") {
        normalized.status = "cleared";
      } else {
        normalized.status = "pending";
      }
    }

    return normalized;
  }
}
