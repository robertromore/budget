import { transactions as transactionTable } from "$core/schema/transactions";
import { db } from "$core/server/db";
import { CSVProcessor } from "$core/server/import/file-processors/csv-processor";
import { TransactionValidator } from "$core/server/import/validators/transaction-validator";
import type { ColumnMapping, ParseResult } from "$core/types/import";
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

export const POST: RequestHandler = async ({ request }) => {
  try {
    const userId = await requireImportUserId(request);
    const formData = await request.formData();
    const file = formData.get("importFile") as File;
    const columnMappingRaw = formData.get("columnMapping") as string;
    const rawAccountId = formData.get("accountId") as string | null;
    const reverseAmountSigns = formData.get("reverseAmountSigns") === "true";

    const accountId = parseOptionalPositiveInt(rawAccountId, "account ID");
    const authorizedAccount =
      accountId === null ? null : await requireImportAccountAccess(userId, accountId);

    if (!file || !columnMappingRaw) {
      return json({ error: "Missing file or column mapping" }, { status: 400 });
    }

    let columnMapping: ColumnMapping;
    try {
      columnMapping = JSON.parse(columnMappingRaw) as ColumnMapping;
    } catch {
      return json({ error: "Invalid column mapping format" }, { status: 400 });
    }

    // Create processor with custom column mapping
    const processor = new CSVProcessor(columnMapping);

    // Validate file
    const validation = processor.validateFile(file);
    if (!validation.valid) {
      return json({ error: validation.error || "File validation failed" }, { status: 400 });
    }

    // Parse file with custom column mapping
    const rawData = await processor.parseFile(file);

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
      if (reverseAmountSigns) {
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

    // Extract column names from normalized data
    const columns =
      validatedData.length > 0
        ? Object.keys(
            validatedData.find((row) => Object.keys(row.normalizedData).length > 0)
              ?.normalizedData || {}
          )
        : [];

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
    console.error("File remapping error:", error);
    if (isImportApiError(error)) {
      return json({ error: error.message }, { status: error.status });
    }

    return json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process file with custom mapping",
      },
      { status: 500 }
    );
  }
};
