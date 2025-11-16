/**
 * QuickBooks CSV File Processor
 *
 * Extends CSV processor with QuickBooks-specific column mapping and auto-detection.
 * Handles various QB CSV export formats (Transaction List, Register Report, etc.)
 */

import Papa from "papaparse";
import type {
  FileProcessor,
  ImportRow,
  NormalizedTransaction,
  ColumnMapping,
} from "$lib/types/import";
import {FileValidationError, ParseError} from "../errors";
import {
  normalizeHeader,
  parseDate,
  parseAmount,
  sanitizeText,
  validateFileType,
  detectCSVDelimiter,
  isQuickBooksCSV,
} from "../utils";

export class QBCSVProcessor implements FileProcessor {
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly supportedFormats = [".csv", ".txt"];
  private columnMapping: ColumnMapping | undefined;

  constructor(columnMapping?: ColumnMapping) {
    this.columnMapping = columnMapping;
  }

  getSupportedFormats(): string[] {
    return this.supportedFormats;
  }

  validateFile(file: File): {valid: boolean; error?: string} {
    if (!validateFileType(file.name, this.supportedFormats)) {
      return {
        valid: false,
        error: `Invalid file type. Supported formats: ${this.supportedFormats.join(", ")}`,
      };
    }

    if (file.size > this.maxFileSize) {
      return {
        valid: false,
        error: `File size exceeds limit of ${this.maxFileSize / (1024 * 1024)}MB`,
      };
    }

    if (file.size === 0) {
      return {
        valid: false,
        error: "File is empty",
      };
    }

    return {valid: true};
  }

  async parseFile(file: File): Promise<ImportRow[]> {
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new FileValidationError(validation.error || "File validation failed", "csv");
    }

    const text = await file.text();

    if (!text || text.trim().length === 0) {
      throw new ParseError("File is empty or contains no data");
    }

    const delimiter = detectCSVDelimiter(text);

    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        delimiter,
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => normalizeHeader(header),
        complete: (results) => {
          try {
            if (!results.data || results.data.length === 0) {
              throw new ParseError("No data rows found in CSV");
            }

            const headers = Object.keys(results.data[0] as object);

            if (!isQuickBooksCSV(headers)) {
              throw new ParseError("This does not appear to be a QuickBooks CSV export");
            }

            const qbMapping = this.detectQBMapping(headers);
            const rows = this.processRows(results.data as any[], qbMapping);

            resolve(rows);
          } catch (error) {
            reject(error);
          }
        },
        error: (error) => {
          reject(new ParseError(`CSV parsing error: ${error.message}`));
        },
      });
    });
  }

  private detectQBMapping(headers: string[]): ColumnMapping {
    const mapping: Partial<ColumnMapping> = {};

    const headerMap: Record<string, string[]> = {
      date: ["date", "transaction date", "txn date"],
      amount: ["amount", "total", "amt"],
      debit: ["debit", "payment", "decrease"],
      credit: ["credit", "deposit", "increase"],
      payee: ["name", "payee", "vendor", "customer", "entity"],
      notes: ["memo", "description", "memo/description", "notes"],
      category: ["account", "category", "class", "split"],
      status: ["clr", "cleared", "status", "c"],
    };

    for (const [field, keywords] of Object.entries(headerMap)) {
      for (const header of headers) {
        const normalized = header.toLowerCase().trim();
        for (const keyword of keywords) {
          if (normalized.includes(keyword)) {
            (mapping as any)[field] = header;
            break;
          }
        }
        if ((mapping as any)[field]) break;
      }
    }

    if (!mapping.date) {
      throw new ParseError("Could not find date column in QuickBooks CSV");
    }

    if (!mapping.amount && !mapping.debit && !mapping.credit) {
      throw new ParseError("Could not find amount/debit/credit columns in QuickBooks CSV");
    }

    return mapping as ColumnMapping;
  }

  private processRows(data: any[], mapping: ColumnMapping): ImportRow[] {
    const rows: ImportRow[] = [];

    for (let i = 0; i < data.length; i++) {
      const rawRow = data[i];
      const normalized: Partial<NormalizedTransaction> = {};
      const errors: any[] = [];

      try {
        const dateStr = rawRow[mapping.date];
        if (!dateStr) {
          throw new Error("Date is required");
        }
        const date = parseDate(dateStr);
        normalized.date = date.toISOString().split("T")[0];
      } catch (error) {
        errors.push({
          field: "date",
          message: error instanceof Error ? error.message : "Invalid date",
          value: rawRow[mapping.date],
          severity: "error",
        });
      }

      try {
        if (mapping.amount) {
          const amountStr = rawRow[mapping.amount];
          normalized.amount = parseAmount(amountStr);
        } else if (mapping.debit && mapping.credit) {
          const debitStr = rawRow[mapping.debit] || "0";
          const creditStr = rawRow[mapping.credit] || "0";
          const debit = parseAmount(debitStr);
          const credit = parseAmount(creditStr);
          normalized.amount = credit - debit;
        }
      } catch (error) {
        errors.push({
          field: "amount",
          message: error instanceof Error ? error.message : "Invalid amount",
          value: rawRow[mapping.amount] || `${rawRow[mapping.debit]}/${rawRow[mapping.credit]}`,
          severity: "error",
        });
      }

      if (mapping.payee && rawRow[mapping.payee]) {
        normalized.payee = sanitizeText(rawRow[mapping.payee], 100);
      }

      if (mapping.notes && rawRow[mapping.notes]) {
        normalized.notes = sanitizeText(rawRow[mapping.notes], 500);
      }

      if (mapping.category && rawRow[mapping.category]) {
        const category = rawRow[mapping.category];
        if (category && category !== "-SPLIT-" && category !== "SPLIT") {
          normalized.category = sanitizeText(category, 50);
        }
      }

      if (mapping.status && rawRow[mapping.status]) {
        const status = rawRow[mapping.status].toString().toUpperCase();
        normalized.status =
          status === "X" || status === "R" || status === "C" ? "cleared" : "pending";
      } else {
        normalized.status = "pending";
      }

      rows.push({
        rowIndex: i,
        rawData: rawRow,
        normalizedData: normalized as Record<string, any>,
        validationStatus: errors.length > 0 ? "invalid" : "valid",
        validationErrors: errors.length > 0 ? errors : undefined,
      });
    }

    return rows;
  }
}
