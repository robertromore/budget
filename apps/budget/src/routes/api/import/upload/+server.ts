import { accounts as accountsTable } from "$lib/schema/accounts";
import { payees as payeeTable } from "$lib/schema/payees";
import { schedules as scheduleTable } from "$lib/schema/schedules";
import { transactions as transactionTable } from "$lib/schema/transactions";
import { db } from "$lib/server/db";
import { CSVProcessor } from "$lib/server/import/file-processors/csv-processor";
import { ExcelProcessor } from "$lib/server/import/file-processors/excel-processor";
import { IIFProcessor } from "$lib/server/import/file-processors/iif-processor";
import { OFXProcessor } from "$lib/server/import/file-processors/ofx-processor";
import { QBCSVProcessor } from "$lib/server/import/file-processors/qb-csv-processor";
import { QBOProcessor } from "$lib/server/import/file-processors/qbo-processor";
import { QIFProcessor } from "$lib/server/import/file-processors/qif-processor";
import { PayeeMatcher } from "$lib/server/import/matchers/payee-matcher";
import { ScheduleMatcher } from "$lib/server/import/matchers/schedule-matcher";
import { isQuickBooksCSV } from "$lib/server/import/utils";
import { detectTransferTargetMatches } from "$lib/server/import/utils/transfer-target-detector";
import { TransactionValidator } from "$lib/server/import/validators/transaction-validator";
import type { ParseResult, ScheduleMatch } from "$lib/types/import";
import { json } from "@sveltejs/kit";
import { and, eq, isNull } from "drizzle-orm";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, url }) => {
  try {
    const formData = await request.formData();
    const file = formData.get("importFile") as File;
    const accountIdParam = url.searchParams.get("accountId");
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
    if (accountIdParam) {
      const accountId = parseInt(accountIdParam);
      if (!isNaN(accountId)) {
        // Get existing transactions for duplicate detection
        const existingTransactions = await db
          .select()
          .from(transactionTable)
          .where(
            and(eq(transactionTable.accountId, accountId), isNull(transactionTable.deletedAt))
          );

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
    }

    // Extract raw column names from first row (before normalization)
    const columns = validatedData.length > 0 ? Object.keys(validatedData[0]?.rawData || {}) : [];

    // Detect schedule matches if accountId is provided
    let scheduleMatches: ScheduleMatch[] | undefined;
    if (accountIdParam) {
      const accountId = parseInt(accountIdParam);
      console.log("[Schedule Matching] Account ID:", accountId);
      if (!isNaN(accountId)) {
        // Fetch existing schedules and payees for matching
        const existingSchedules = await db
          .select()
          .from(scheduleTable)
          .where(and(eq(scheduleTable.accountId, accountId), eq(scheduleTable.status, "active")));

        console.log("[Schedule Matching] Found schedules:", existingSchedules.length);

        const existingPayees = await db
          .select()
          .from(payeeTable)
          .where(isNull(payeeTable.deletedAt));

        if (existingSchedules.length > 0) {
          const scheduleMatcher = new ScheduleMatcher();
          const payeeMatcher = new PayeeMatcher();
          scheduleMatches = [];

          // Check each transaction for schedule matches
          validatedData.forEach((row, index) => {
            const normalized = row.normalizedData;

            if (!normalized["date"] || !normalized["amount"]) {
              return; // Skip rows without date or amount
            }

            // Normalize the payee name for better matching
            // Transaction payee names are often raw (e.g., "TST*GATEWAY MARKET")
            // Schedule payee names are clean (e.g., "Gateway Market")
            const rawPayeeName = normalized["payee"];
            let normalizedPayeeName = rawPayeeName;
            if (normalizedPayeeName && typeof normalizedPayeeName === "string") {
              const { name } = payeeMatcher.normalizePayeeName(normalizedPayeeName);
              if (name !== normalizedPayeeName) {
                console.log(
                  `[Schedule Matching] Normalized payee: "${normalizedPayeeName}" → "${name}"`
                );
              }
              normalizedPayeeName = name;
            }

            // Prepare matching criteria
            const criteria = {
              date: normalized["date"],
              amount: Math.abs(normalized["amount"] as number),
              payeeName: normalizedPayeeName,
              categoryId: normalized["categoryId"],
              accountId,
            };

            console.log(`[Schedule Matching] Checking row ${index}:`, {
              payee: criteria.payeeName,
              amount: criteria.amount,
              date: criteria.date,
            });

            // Find the best match (only high or exact confidence)
            const match = scheduleMatcher.findBestMatch(
              criteria,
              existingSchedules as any,
              existingPayees as any
            );

            console.log(`[Schedule Matching] Row ${index} match result:`, {
              hasSchedule: !!match.schedule,
              scheduleName: match.schedule?.name,
              confidence: match.confidence,
              score: match.score,
              matchedOn: match.matchedOn,
              reasons: match.reasons,
            });

            if (match.schedule && match.confidence !== "none") {
              scheduleMatches!.push({
                rowIndex: row.rowIndex, // Use row.rowIndex instead of loop index to preserve original position
                scheduleId: match.schedule.id,
                scheduleName: match.schedule.name,
                confidence: match.confidence,
                score: match.score,
                matchedOn: match.matchedOn,
                reasons: match.reasons,
                selected: match.confidence !== "low", // Auto-select non-low confidence matches
                transactionData: {
                  date: normalized["date"],
                  amount: normalized["amount"] as number,
                  payee: normalized["payee"],
                },
                scheduleData: {
                  name: match.schedule.name,
                  amount: match.schedule.amount,
                  amount_type: match.schedule.amount_type,
                  recurring: match.schedule.recurring ?? false,
                },
              });
            }
          });

          console.log(`[Schedule Matching] Found ${scheduleMatches.length} schedule matches`);
        }
      }
    }

    // Detect transfer target matches (similar to schedule matching)
    // This identifies rows that match existing transfer targets from other accounts
    if (accountIdParam) {
      const accountId = parseInt(accountIdParam);
      if (!isNaN(accountId)) {
        validatedData = await detectTransferTargetMatches(validatedData, accountId);
        const transferMatchCount = validatedData.filter(
          (r) => r.validationStatus === "transfer_match"
        ).length;
        if (transferMatchCount > 0) {
          console.log(`[Transfer Target Matching] Found ${transferMatchCount} transfer target matches`);
        }
      }
    }

    // Detect transfer mappings based on payee names
    // This suggests transfers based on previously saved payee→account mappings
    if (accountIdParam) {
      const accountId = parseInt(accountIdParam);
      if (!isNaN(accountId)) {
        // Get workspaceId from account
        const account = await db
          .select({ workspaceId: accountsTable.workspaceId })
          .from(accountsTable)
          .where(eq(accountsTable.id, accountId))
          .get();

        if (account) {
          const { getTransferMappingService } = await import("$lib/server/domains/transfers");
          const transferMappingService = getTransferMappingService();

          // Get all accounts for name lookup (exclude current and closed)
          const allAccounts = await db
            .select({ id: accountsTable.id, name: accountsTable.name })
            .from(accountsTable)
            .where(
              and(
                eq(accountsTable.workspaceId, account.workspaceId),
                isNull(accountsTable.deletedAt),
                eq(accountsTable.closed, false)
              )
            );
          const accountMap = new Map(allAccounts.map((a) => [a.id, a.name]));

          let autoAcceptCount = 0;
          let suggestionCount = 0;

          // Check each row for transfer mappings
          for (const row of validatedData) {
            // Skip rows that already have a transfer target match (date/amount)
            if (row.transferTargetMatch) continue;

            // Use the raw payee string for lookup (before normalization)
            const payee = row.normalizedData["payee"] as string | undefined;
            if (!payee) continue;

            const match = await transferMappingService.matchTransferForImport(
              payee,
              account.workspaceId
            );

            if (match.found && match.targetAccountId) {
              // Skip if target is current account
              if (match.targetAccountId === accountId) continue;

              const targetName = accountMap.get(match.targetAccountId);
              if (!targetName) continue; // Account might be closed/deleted

              // Auto-accept exact matches (confidence 1.0 = exact string match)
              if (match.matchedOn === "exact") {
                row.normalizedData["transferAccountId"] = match.targetAccountId;
                row.normalizedData["transferAccountName"] = targetName;
                autoAcceptCount++;
              } else {
                // Show as suggestion for normalized/cleaned matches
                row.normalizedData["suggestedTransferAccountId"] = match.targetAccountId;
                row.normalizedData["suggestedTransferAccountName"] = targetName;
                row.normalizedData["transferMappingConfidence"] =
                  match.confidence >= 0.9 ? "high" : match.confidence >= 0.8 ? "medium" : "low";
                suggestionCount++;
              }
            }
          }

          if (autoAcceptCount > 0 || suggestionCount > 0) {
            console.log(
              `[Transfer Mapping] Auto-accepted: ${autoAcceptCount}, Suggestions: ${suggestionCount}`
            );
          }
        }
      }
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
      ...(scheduleMatches ? { scheduleMatches } : {}),
    };

    return json(result);
  } catch (error) {
    console.error("File upload error:", error);
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
          console.log("[File Detection] .qbo file is actually OFX format, using OFXProcessor");
          return new OFXProcessor();
        }
      }
      return new QBOProcessor();
    default:
      return null;
  }
}
