/**
 * OFX (Open Financial Exchange) File Processor
 *
 * Handles parsing of OFX files (both XML and SGML formats) with support
 * for bank statement downloads.
 */

import { XMLParser } from "fast-xml-parser";
import type { FileProcessor, ImportRow, NormalizedTransaction } from "$lib/types/import";
import { FileValidationError, ParseError } from "../errors";
import { parseDate, parseAmount, sanitizeText, validateFileType } from "../utils";

interface OFXTransaction {
  TRNTYPE?: string;
  DTPOSTED?: string;
  TRNAMT?: string | number;
  FITID?: string;
  CHECKNUM?: string;
  NAME?: string;
  MEMO?: string;
}

export class OFXProcessor implements FileProcessor {
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB
  private readonly supportedFormats = [".ofx", ".qfx", ".qbo"]; // .qbo files can contain OFX data

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
      throw new FileValidationError(validation.error || "File validation failed", "ofx");
    }

    try {
      // Read file content
      let text = await file.text();

      if (!text || text.trim().length === 0) {
        throw new ParseError("File is empty or contains no data");
      }

      // Convert SGML to XML if needed
      text = this.convertSGMLToXML(text);

      // Parse OFX/XML content
      const transactions = this.parseOFXContent(text);

      if (transactions.length === 0) {
        throw new ParseError("No transactions found in OFX file");
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
        `Failed to parse OFX file: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private convertSGMLToXML(content: string): string {
    // OFX 1.x uses SGML format, OFX 2.x uses XML
    // If it's already XML, return as is
    if (content.trim().startsWith("<?xml")) {
      return content;
    }

    // Remove OFX headers and convert SGML to XML
    let xml = content;

    // Remove headers before the first <OFX> tag
    const ofxStart = xml.indexOf("<OFX>");
    if (ofxStart !== -1) {
      xml = xml.substring(ofxStart);
    }

    // SGML doesn't have closing tags - we need to add them
    // Split into lines and process each tag
    const lines = xml.split("\n");
    const result: string[] = [];
    const tagStack: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip empty lines
      if (!trimmedLine) continue;

      // Check if this is an opening tag
      const openMatch = trimmedLine.match(/^<([A-Z][A-Z0-9.]*)\s*>(.*)$/);
      if (openMatch) {
        const tagName = openMatch[1];
        const rest = openMatch[2];

        // Close any tags that should be closed before this one
        // SGML rules: a new tag at the same level closes the previous sibling
        if (tagStack.length > 0) {
          // If there's content after the tag on the same line, it's a value tag
          if (rest) {
            result.push(`<${tagName}>${rest}</${tagName}>`);
            continue;
          }
        }

        // This is a container tag
        tagStack.push(tagName);
        result.push(`<${tagName}>`);
        continue;
      }

      // Check if this is a closing tag
      const closeMatch = trimmedLine.match(/^<\/([A-Z][A-Z0-9.]*)\s*>$/);
      if (closeMatch) {
        const tagName = closeMatch[1];
        // Close all tags until we find this one
        while (tagStack.length > 0) {
          const lastTag = tagStack.pop();
          result.push(`</${lastTag}>`);
          if (lastTag === tagName) break;
        }
        continue;
      }

      // Value without tag (shouldn't happen in well-formed OFX)
      if (trimmedLine && !trimmedLine.startsWith("<")) {
        result.push(trimmedLine);
      }
    }

    // Close any remaining open tags
    while (tagStack.length > 0) {
      result.push(`</${tagStack.pop()}>`);
    }

    return result.join("\n");
  }

  private parseOFXContent(content: string): OFXTransaction[] {
    try {
      const parser = new XMLParser({
        ignoreAttributes: false,
        parseTagValue: true,
        parseAttributeValue: true,
        trimValues: true,
        ignoreDeclaration: true,
        ignorePiTags: true,
      });

      const parsed = parser.parse(content);

      // Navigate OFX structure to find transactions
      const ofx = parsed.OFX || parsed.ofx;
      if (!ofx) {
        console.error("[OFXProcessor] No OFX root found. Top-level keys:", Object.keys(parsed));
        throw new ParseError("Invalid OFX file structure - no OFX root element");
      }

      // Try different message container variations
      // Note: CREDITCARDMSGSRSV1 and BANKMSGSRSV1 are separate siblings in the OFX element
      const bankMessages =
        ofx.BANKMSGSRSV1 || ofx.CREDITCARDMSGSRSV1 || ofx.bankmsgsrsv1 || ofx.creditcardmsgsrsv1;
      if (!bankMessages) {
        console.error("[OFXProcessor] No bank messages found. Available keys:", Object.keys(ofx));
        throw new ParseError("No bank messages found in OFX file");
      }

      // Try different statement response variations
      const stmtResponse =
        bankMessages.STMTTRNRS ||
        bankMessages.CCSTMTTRNRS ||
        bankMessages.stmttrnrs ||
        bankMessages.ccstmttrnrs;
      if (!stmtResponse) {
        console.error(
          "[OFXProcessor] No statement response found. Available keys:",
          Object.keys(bankMessages)
        );
        throw new ParseError("No statement response found");
      }

      // Try different statement variations
      const statement =
        stmtResponse.STMTRS ||
        stmtResponse.CCSTMTRS ||
        stmtResponse.stmtrs ||
        stmtResponse.ccstmtrs;
      if (!statement) {
        console.error(
          "[OFXProcessor] No statement found. Available keys:",
          Object.keys(stmtResponse)
        );
        throw new ParseError("No statement found");
      }

      // Try different transaction list variations
      const tranList = statement.BANKTRANLIST || statement.banktranlist;
      if (!tranList) {
        console.error(
          "[OFXProcessor] No transaction list found. Available keys:",
          Object.keys(statement)
        );
        throw new ParseError("No transaction list found");
      }

      // Try different transaction variations
      let transactions = tranList.STMTTRN || tranList.stmttrn;
      if (!transactions) {
        console.warn("[OFXProcessor] No STMTTRN found. Available keys:", Object.keys(tranList));
        return [];
      }

      // Ensure transactions is an array
      if (!Array.isArray(transactions)) {
        transactions = [transactions];
      }

      return transactions;
    } catch (error) {
      console.error("[OFXProcessor] Parse error:", error);
      throw new ParseError(
        `Failed to parse OFX XML: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private normalizeTransaction(transaction: OFXTransaction): Partial<NormalizedTransaction> {
    const normalized: Partial<NormalizedTransaction> = {};

    // Parse date - OFX format is YYYYMMDD[HHMMSS[.XXX[+/-TZ]]]
    if (transaction.DTPOSTED) {
      try {
        const dateStr = String(transaction.DTPOSTED);
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        normalized.date = `${year}-${month}-${day}`;
      } catch (error) {
        // Leave as is, will be caught in validation
        normalized.date = String(transaction.DTPOSTED);
      }
    }

    // Amount
    if (transaction.TRNAMT !== undefined && transaction.TRNAMT !== null) {
      try {
        normalized.amount =
          typeof transaction.TRNAMT === "number"
            ? transaction.TRNAMT
            : parseFloat(String(transaction.TRNAMT));
      } catch (error) {
        normalized.amount = transaction.TRNAMT;
      }
    }

    // Payee (NAME field in OFX)
    if (transaction.NAME) {
      normalized.payee = sanitizeText(String(transaction.NAME), 200);
    }

    // Description (MEMO field in OFX)
    if (transaction.MEMO) {
      normalized.description = sanitizeText(String(transaction.MEMO), 500);
    }

    // Check number
    if (transaction.CHECKNUM) {
      normalized.checkNumber = sanitizeText(String(transaction.CHECKNUM), 50);
    }

    // OFX transactions are typically cleared by default
    normalized.status = "cleared";

    return normalized;
  }
}
