/**
 * IIF (Intuit Interchange Format) File Processor
 *
 * Handles parsing of IIF files (tab-delimited text format used by QuickBooks).
 * Supports transaction imports with split transactions.
 */

import type {
  FileProcessor,
  ImportRow,
  NormalizedTransaction,
  IIFTransaction,
} from "$lib/types/import";
import { FileValidationError, ParseError } from "../errors";
import {
  parseIIFDate,
  parseAmount,
  sanitizeText,
  validateFileType,
  normalizeIIFTransactionType,
} from "../utils";

export class IIFProcessor implements FileProcessor {
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB
  private readonly supportedFormats = [".iif"];

  getSupportedFormats(): string[] {
    return this.supportedFormats;
  }

  validateFile(file: File): { valid: boolean; error?: string } {
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

    return { valid: true };
  }

  async parseFile(file: File): Promise<ImportRow[]> {
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new FileValidationError(validation.error || "File validation failed", "iif");
    }

    try {
      const text = await file.text();

      if (!text || text.trim().length === 0) {
        throw new ParseError("File is empty or contains no data");
      }

      const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

      if (lines.length < 2) {
        throw new ParseError("IIF file must contain headers and data");
      }

      const transactions = this.parseIIFContent(lines);

      return this.convertToImportRows(transactions);
    } catch (error) {
      if (error instanceof FileValidationError || error instanceof ParseError) {
        throw error;
      }
      throw new ParseError(
        `Failed to parse IIF file: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private parseIIFContent(lines: string[]): IIFTransaction[] {
    const transactions: IIFTransaction[] = [];
    let currentTransaction: Partial<IIFTransaction> | null = null;
    let headerMap: Map<string, number> | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith("!")) {
        headerMap = this.parseHeader(line);
        continue;
      }

      const fields = line.split("\t");
      const recordType = fields[0]?.toUpperCase();

      if (recordType === "TRNS") {
        if (currentTransaction && currentTransaction.type) {
          transactions.push(currentTransaction as IIFTransaction);
        }

        currentTransaction = this.parseTRNS(fields, headerMap);
      } else if (recordType === "SPL" && currentTransaction) {
        const split = this.parseSPL(fields, headerMap);
        if (split) {
          if (!currentTransaction.splits) {
            currentTransaction.splits = [];
          }
          currentTransaction.splits.push(split);
        }
      } else if (recordType === "ENDTRNS") {
        if (currentTransaction && currentTransaction.type) {
          transactions.push(currentTransaction as IIFTransaction);
          currentTransaction = null;
        }
      }
    }

    if (currentTransaction && currentTransaction.type) {
      transactions.push(currentTransaction as IIFTransaction);
    }

    return transactions;
  }

  private parseHeader(line: string): Map<string, number> {
    const fields = line.substring(1).split("\t");
    const map = new Map<string, number>();

    fields.forEach((field, index) => {
      map.set(field.trim().toUpperCase(), index);
    });

    return map;
  }

  private parseTRNS(
    fields: string[],
    headerMap: Map<string, number> | null
  ): Partial<IIFTransaction> {
    const getField = (name: string): string => {
      if (!headerMap) return fields[0] || "";
      const index = headerMap.get(name.toUpperCase());
      return index !== undefined ? fields[index] || "" : "";
    };

    const dateStr = getField("DATE");
    const amountStr = getField("AMOUNT");
    const accnt = getField("ACCNT");
    const name = getField("NAME");
    const memo = getField("MEMO");
    const docnum = getField("DOCNUM");
    const clear = getField("CLEAR");

    return {
      type: "TRNS",
      date: dateStr,
      account: accnt,
      name: name,
      amount: amountStr ? parseFloat(amountStr) : 0,
      memo: memo || undefined,
      number: docnum || undefined,
      cleared: clear ? clear.toUpperCase() === "X" : false,
      splits: [],
    };
  }

  private parseSPL(fields: string[], headerMap: Map<string, number> | null): any {
    const getField = (name: string): string => {
      if (!headerMap) return "";
      const index = headerMap.get(name.toUpperCase());
      return index !== undefined ? fields[index] || "" : "";
    };

    const accnt = getField("ACCNT");
    const amountStr = getField("AMOUNT");
    const memo = getField("MEMO");

    if (!accnt && !amountStr) {
      return null;
    }

    return {
      account: accnt,
      amount: amountStr ? parseFloat(amountStr) : 0,
      memo: memo || undefined,
      category: accnt || undefined,
    };
  }

  private convertToImportRows(transactions: IIFTransaction[]): ImportRow[] {
    return transactions.map((txn, index) => {
      const normalized: Partial<NormalizedTransaction> = {};
      const errors: any[] = [];

      try {
        const date = parseIIFDate(txn.date);
        normalized.date = date.toISOString().split("T")[0];
      } catch (error) {
        errors.push({
          field: "date",
          message: error instanceof Error ? error.message : "Invalid date",
          value: txn.date,
          severity: "error",
        });
      }

      try {
        normalized.amount = txn.amount;
      } catch (error) {
        errors.push({
          field: "amount",
          message: error instanceof Error ? error.message : "Invalid amount",
          value: txn.amount,
          severity: "error",
        });
      }

      if (txn.name) {
        normalized.payee = sanitizeText(txn.name, 100);
      }

      if (txn.memo) {
        normalized.notes = sanitizeText(txn.memo, 500);
      }

      if (txn.account) {
        normalized.category = sanitizeText(txn.account, 50);
      }

      if (txn.splits && txn.splits.length > 0) {
        const primarySplit = txn.splits[0];
        if (primarySplit.category) {
          normalized.category = sanitizeText(primarySplit.category, 50);
        }
      }

      normalized.status = normalizeIIFTransactionType(txn.type, txn.cleared ? "X" : "");

      return {
        rowIndex: index,
        rawData: { ...txn },
        normalizedData: normalized as Record<string, any>,
        validationStatus: errors.length > 0 ? "invalid" : "valid",
        validationErrors: errors.length > 0 ? errors : undefined,
      };
    });
  }
}
