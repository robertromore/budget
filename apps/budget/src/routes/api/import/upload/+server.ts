import { transactions as transactionTable } from "$core/schema/transactions";
import { db } from "$core/server/db";
import { CSVProcessor } from "$core/server/import/file-processors/csv-processor";
import { ExcelProcessor } from "$core/server/import/file-processors/excel-processor";
import { IIFProcessor } from "$core/server/import/file-processors/iif-processor";
import { OFXProcessor } from "$core/server/import/file-processors/ofx-processor";
import { QBCSVProcessor } from "$core/server/import/file-processors/qb-csv-processor";
import { QBOProcessor } from "$core/server/import/file-processors/qbo-processor";
import { QIFProcessor } from "$core/server/import/file-processors/qif-processor";
import { isQuickBooksCSV } from "$core/server/import/utils";
import { TransactionValidator } from "$core/server/import/validators/transaction-validator";
import type { ParseResult } from "$core/types/import";
import { json } from "@sveltejs/kit";
import { and, eq, isNull } from "drizzle-orm";
import { enrichImportRows } from "../match-enrichment";
import {
  isImportApiError,
  parseOptionalPositiveInt,
  requireImportAccountAccess,
  requireImportUserId,
} from "../auth";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, url }) => {
  try {
    const userId = await requireImportUserId(request);
    const formData = await request.formData();
    const file = formData.get("importFile") as File;
    const accountId = parseOptionalPositiveInt(url.searchParams.get("accountId"), "account ID");
    const authorizedAccount =
      accountId === null ? null : await requireImportAccountAccess(userId, accountId);
    const reverseAmountSignsParam = url.searchParams.get("reverseAmountSigns");

    if (!file) {
      return json({ error: "No file provided" }, { status: 400 });
    }

    // For CSV and QBO files, read content first to detect the actual format
    let fileContent: string | undefined;
    const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;
    if (extension === ".csv" || extension === ".txt" || extension === ".qbo") {
      fileContent = await file.text();
    }

    // Determine file type and get appropriate processor
    const processor = await getFileProcessor(file.name, fileContent);

    if (!processor) {
      return json(
        {
          error:
            "Unsupported file type. Supported formats: .csv, .txt, .xlsx, .xls, .qif, .ofx, .qfx, .iif, .qbo",
        },
        { status: 400 }
      );
    }

    // Validate file
    const validation = processor.validateFile(file);
    if (!validation.valid) {
      return json({ error: validation.error || "File validation failed" }, { status: 400 });
    }

    // Parse file
    let rawData = await processor.parseFile(file);

    // Sort by date (oldest first) - most bank exports are newest first
    // This ensures transactions are imported in chronological order
    rawData = rawData.sort((a, b) => {
      const dateA = a.normalizedData["date"];
      const dateB = b.normalizedData["date"];

      if (!dateA || !dateB) return 0;

      const timeA =
        typeof dateA === "string"
          ? new Date(dateA).getTime()
          : dateA instanceof Date
            ? dateA.getTime()
            : 0;
      const timeB =
        typeof dateB === "string"
          ? new Date(dateB).getTime()
          : dateB instanceof Date
            ? dateB.getTime()
            : 0;

      return timeA - timeB; // Ascending order (oldest first)
    });

    // If accountId is provided, validate with duplicate checking
    let validatedData = rawData;
    if (accountId !== null) {
      // Get existing transactions for duplicate detection
      const existingTransactions = await db
        .select()
        .from(transactionTable)
        .where(and(eq(transactionTable.accountId, accountId), isNull(transactionTable.deletedAt)));

      // Apply amount reversal before duplicate checking if enabled
      // This ensures we compare "final" amounts (as they will be stored in DB) against existing transactions
      let dataForValidation = rawData;
      if (reverseAmountSignsParam === "true") {
        dataForValidation = rawData.map((row) => ({
          ...row,
          normalizedData: {
            ...row.normalizedData,
            amount:
              row.normalizedData["amount"] !== undefined && row.normalizedData["amount"] !== null
                ? -(row.normalizedData["amount"] as number)
                : row.normalizedData["amount"],
          },
        }));
      }

      // Validate rows with duplicate checking
      const validator = new TransactionValidator();
      validatedData = validator.validateRows(dataForValidation, existingTransactions as any);
    }

    // Extract raw column names from first row (before normalization)
    const columns = validatedData.length > 0 ? Object.keys(validatedData[0]?.rawData || {}) : [];

    // Enrich rows with schedule matches, transfer targets, and transfer mapping suggestions
    let enrichment: { rows: typeof validatedData; scheduleMatches?: import("$core/types/import").ScheduleMatch[] } = { rows: validatedData };
    if (accountId !== null && authorizedAccount) {
      enrichment = await enrichImportRows(validatedData, {
        accountId,
        workspaceId: authorizedAccount.workspaceId,
      });
      validatedData = enrichment.rows;
    }

    // Create parse result
    const result: ParseResult = {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || "text/csv",
      rowCount: validatedData.length,
      columns,
      rows: validatedData,
      parseErrors: [],
      ...(enrichment.scheduleMatches ? { scheduleMatches: enrichment.scheduleMatches } : {}),
    };

    return json(result);
  } catch (error) {
    console.error("File upload error:", error);
    if (isImportApiError(error)) {
      return json({ error: error.message }, { status: error.status });
    }

    return json(
      {
        error: error instanceof Error ? error.message : "Failed to process file",
      },
      { status: 500 }
    );
  }
};

async function getFileProcessor(fileName: string, fileContent?: string) {
  const extension = `.${fileName.split(".").pop()?.toLowerCase()}`;

  switch (extension) {
    case ".csv":
    case ".txt":
      if (fileContent) {
        const lines = fileContent.split("\n");
        const headers = lines[0]?.split(",") || [];
        if (isQuickBooksCSV(headers)) {
          return new QBCSVProcessor();
        }
      }
      return new CSVProcessor();
    case ".xlsx":
    case ".xls":
      return new ExcelProcessor();
    case ".qif":
      return new QIFProcessor();
    case ".ofx":
    case ".qfx":
      return new OFXProcessor();
    case ".iif":
      return new IIFProcessor();
    case ".qbo":
      // QBO files can actually be OFX files with a .qbo extension
      // Check the content to determine the actual format
      if (fileContent) {
        const trimmed = fileContent.trim();
        // Check if it starts with OFX header or contains <OFX> tag
        if (trimmed.startsWith("OFXHEADER:") || trimmed.includes("<OFX>")) {
          return new OFXProcessor();
        }
      }
      return new QBOProcessor();
    default:
      return null;
  }
}
