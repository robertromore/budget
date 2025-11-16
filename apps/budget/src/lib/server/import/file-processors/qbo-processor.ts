/**
 * QBO (QuickBooks Online Backup) File Processor
 *
 * Handles parsing of QBO XML files with support for various transaction types.
 */

import {XMLParser} from "fast-xml-parser";
import type {
  FileProcessor,
  ImportRow,
  NormalizedTransaction,
  QBOTransaction,
} from "$lib/types/import";
import {FileValidationError, ParseError} from "../errors";
import {
  parseQBODate,
  parseAmount,
  sanitizeText,
  validateFileType,
  extractQBOTransactions,
} from "../utils";

export class QBOProcessor implements FileProcessor {
  private readonly maxFileSize = 20 * 1024 * 1024; // 20MB (QBO files can be large)
  private readonly supportedFormats = [".qbo"];

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
      throw new FileValidationError(validation.error || "File validation failed", "qbo");
    }

    try {
      let text = await file.text();

      if (!text || text.trim().length === 0) {
        throw new ParseError("File is empty or contains no data");
      }

      text = text.trim();

      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
        textNodeName: "#text",
        parseAttributeValue: true,
        parseTagValue: true,
      });

      const xmlData = parser.parse(text);

      if (!xmlData || typeof xmlData !== "object") {
        throw new ParseError("Invalid QBO XML structure");
      }

      const transactions = this.extractTransactions(xmlData);

      if (transactions.length === 0) {
        throw new ParseError("No transactions found in QBO file");
      }

      return this.convertToImportRows(transactions);
    } catch (error) {
      if (error instanceof FileValidationError || error instanceof ParseError) {
        throw error;
      }
      throw new ParseError(
        `Failed to parse QBO file: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private extractTransactions(xmlData: any): QBOTransaction[] {
    const transactions: QBOTransaction[] = [];

    const rawTxns = extractQBOTransactions(xmlData);

    for (const txn of rawTxns) {
      try {
        const transaction: QBOTransaction = {
          type: this.extractTxnType(txn),
          date: this.extractDate(txn),
          amount: this.extractAmount(txn),
          account: this.extractAccount(txn),
          vendor: this.extractVendor(txn),
          customer: this.extractCustomer(txn),
          memo: this.extractMemo(txn),
          category: this.extractCategory(txn),
          checkNumber: this.extractCheckNumber(txn),
          txnId: this.extractTxnId(txn),
        };

        transactions.push(transaction);
      } catch (error) {
        continue;
      }
    }

    return transactions;
  }

  private extractTxnType(txn: any): string {
    if (txn.TxnType) return txn.TxnType;
    if (txn.CheckTxn) return "Check";
    if (txn.DepositTxn) return "Deposit";
    if (txn.PaymentTxn) return "Payment";
    return "Transaction";
  }

  private extractDate(txn: any): string {
    return txn.TxnDate || txn.Date || txn.TimeCreated || "";
  }

  private extractAmount(txn: any): number {
    const amountStr = txn.Amount || txn.TxnAmount || "0";
    return parseFloat(String(amountStr));
  }

  private extractAccount(txn: any): string {
    if (txn.AccountRef?.FullName) return txn.AccountRef.FullName;
    if (txn.Account) return txn.Account;
    return "";
  }

  private extractVendor(txn: any): string | undefined {
    if (txn.VendorRef?.FullName) return txn.VendorRef.FullName;
    if (txn.Vendor) return txn.Vendor;
    return undefined;
  }

  private extractCustomer(txn: any): string | undefined {
    if (txn.CustomerRef?.FullName) return txn.CustomerRef.FullName;
    if (txn.Customer) return txn.Customer;
    return undefined;
  }

  private extractMemo(txn: any): string | undefined {
    return txn.Memo || txn.Description || undefined;
  }

  private extractCategory(txn: any): string | undefined {
    if (txn.ClassRef?.FullName) return txn.ClassRef.FullName;
    if (txn.AccountRef?.FullName) return txn.AccountRef.FullName;
    return undefined;
  }

  private extractCheckNumber(txn: any): string | undefined {
    return txn.RefNumber || txn.CheckNumber || undefined;
  }

  private extractTxnId(txn: any): string | undefined {
    return txn.TxnID || txn.TransactionID || undefined;
  }

  private convertToImportRows(transactions: QBOTransaction[]): ImportRow[] {
    return transactions.map((txn, index) => {
      const normalized: Partial<NormalizedTransaction> = {};
      const errors: any[] = [];

      try {
        const date = parseQBODate(txn.date);
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

      const payeeName = txn.vendor || txn.customer;
      if (payeeName) {
        normalized.payee = sanitizeText(payeeName, 100);
      }

      if (txn.memo) {
        normalized.notes = sanitizeText(txn.memo, 500);
      }

      if (txn.category) {
        normalized.category = sanitizeText(txn.category, 50);
      }

      if (txn.txnId) {
        normalized.fitid = sanitizeText(txn.txnId, 50);
      }

      normalized.status = "cleared";

      return {
        rowIndex: index,
        rawData: {...txn},
        normalizedData: normalized as Record<string, any>,
        validationStatus: errors.length > 0 ? "invalid" : "valid",
        validationErrors: errors.length > 0 ? errors : undefined,
      };
    });
  }
}
