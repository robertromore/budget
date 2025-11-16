/**
 * Excel File Processor
 *
 * Handles parsing of Excel files (.xlsx, .xls) with robust error handling,
 * header normalization, and data transformation.
 */

import * as XLSX from "xlsx";
import type {FileProcessor, ImportRow, NormalizedTransaction} from "$lib/types/import";
import {FileValidationError, ParseError} from "../errors";
import {normalizeHeader, parseDate, parseAmount, sanitizeText, validateFileType} from "../utils";

export class ExcelProcessor implements FileProcessor {
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly supportedFormats = [".xlsx", ".xls"];

  getSupportedFormats(): string[] {
    return this.supportedFormats;
  }

  validateFile(file: File): {valid: boolean; error?: string} {
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

    return {valid: true};
  }

  async parseFile(file: File): Promise<ImportRow[]> {
    // Validate file
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new FileValidationError(validation.error || "File validation failed", "excel");
    }

    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // Parse workbook
      const workbook = XLSX.read(arrayBuffer, {type: "array"});

      // Get first sheet
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new ParseError("No sheets found in Excel file");
      }

      const worksheet = workbook.Sheets[firstSheetName];
      if (!worksheet) {
        throw new ParseError("Failed to read worksheet");
      }

      // Convert sheet to JSON with header row
      const rawData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: "",
        blankrows: false,
      }) as any[][];

      if (rawData.length === 0) {
        throw new ParseError("No data found in Excel file");
      }

      // First row is headers
      const headers = rawData[0] as string[];
      const normalizedHeaders = headers.map((h) => this.normalizeHeaderName(String(h)));

      // Transform remaining rows
      const dataRows = rawData.slice(1);
      const importRows = dataRows.map((row, index) => {
        try {
          // Create object from row data
          const rowData: Record<string, any> = {};
          normalizedHeaders.forEach((header, i) => {
            rowData[header] = row[i] !== undefined ? row[i] : "";
          });

          const normalizedData = this.normalizeRow(rowData);

          return {
            rowIndex: index,
            rawData: rowData,
            normalizedData,
            validationStatus: "pending" as const,
          };
        } catch (error) {
          return {
            rowIndex: index,
            rawData: {},
            normalizedData: {},
            validationStatus: "invalid" as const,
            validationErrors: [
              {
                field: "general",
                message: error instanceof Error ? error.message : "Failed to parse row",
                value: row,
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
        `Failed to parse Excel file: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private normalizeHeaderName(header: string): string {
    return normalizeHeader(header);
  }

  private normalizeRow(row: Record<string, any>): Partial<NormalizedTransaction> {
    const normalized: Partial<NormalizedTransaction> = {};

    // Parse date
    if (row["date"]) {
      try {
        // Excel dates might be serial numbers
        if (typeof row["date"] === "number") {
          // Convert Excel serial date to JS Date
          const excelDate = XLSX.SSF.parse_date_code(row["date"]);
          if (excelDate) {
            normalized.date = `${excelDate.y}-${String(excelDate.m).padStart(2, "0")}-${String(excelDate.d).padStart(2, "0")}`;
          }
        } else {
          normalized.date = parseDate(String(row["date"]));
        }
      } catch (error) {
        // Leave as is, will be caught in validation
        normalized.date = String(row["date"]);
      }
    }

    // Parse amount
    if (row["amount"] !== undefined && row["amount"] !== null && row["amount"] !== "") {
      try {
        normalized.amount = parseAmount(row["amount"]);
      } catch (error) {
        // Leave as is, will be caught in validation
        normalized.amount = row["amount"];
      }
    }

    // Normalize payee
    if (row["payee"]) {
      normalized.payee = sanitizeText(String(row["payee"]), 200);
    }

    // Normalize notes (description/memo field)
    if (row["description"] || row["notes"] || row["memo"]) {
      const notesValue = row["description"] || row["notes"] || row["memo"];
      normalized.notes = sanitizeText(String(notesValue), 500);
    }

    // Normalize category
    if (row["category"]) {
      const categoryValue = sanitizeText(String(row["category"]), 100);
      // Filter out "Uncategorized" - treat it as no category
      if (categoryValue && categoryValue.toLowerCase() !== "uncategorized") {
        normalized.category = categoryValue;
      }
    }

    // Normalize status
    if (row["status"]) {
      const statusLower = String(row["status"]).toLowerCase();
      if (statusLower === "cleared" || statusLower === "posted" || statusLower === "c") {
        normalized.status = "cleared";
      } else {
        normalized.status = "pending";
      }
    }

    return normalized;
  }
}
