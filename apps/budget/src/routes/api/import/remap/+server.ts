import { payees as payeeTable } from "$lib/schema/payees";
import { schedules as scheduleTable } from "$lib/schema/schedules";
import { transactions as transactionTable } from "$lib/schema/transactions";
import { db } from "$lib/server/db";
import { CSVProcessor } from "$lib/server/import/file-processors/csv-processor";
import { PayeeMatcher } from "$lib/server/import/matchers/payee-matcher";
import { ScheduleMatcher } from "$lib/server/import/matchers/schedule-matcher";
import { TransactionValidator } from "$lib/server/import/validators/transaction-validator";
import type { ParseResult, ScheduleMatch } from "$lib/types/import";
import { json } from "@sveltejs/kit";
import { and, eq, isNull } from "drizzle-orm";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { file: fileData, columnMapping, accountId } = await request.json();

    console.log("Remap request:", {
      hasFile: !!fileData,
      columnMapping,
      accountId,
    });

    if (!fileData || !columnMapping) {
      console.error("Missing data:", { hasFile: !!fileData, hasMapping: !!columnMapping });
      return json({ error: "Missing file data or column mapping" }, { status: 400 });
    }

    // Reconstruct File object from base64 data
    const fileBytes = Uint8Array.from(atob(fileData.data), (c) => c.charCodeAt(0));
    const file = new File([fileBytes], fileData.name, { type: fileData.type });

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
    if (accountId) {
      const accountIdNum = parseInt(accountId);
      if (!isNaN(accountIdNum)) {
        // Get existing transactions for duplicate detection
        const existingTransactions = await db
          .select()
          .from(transactionTable)
          .where(
            and(eq(transactionTable.accountId, accountIdNum), isNull(transactionTable.deletedAt))
          );

        // Validate rows with duplicate checking
        const validator = new TransactionValidator();
        validatedData = validator.validateRows(rawData, existingTransactions as any);
      }
    }

    // Extract column names from normalized data
    const columns =
      validatedData.length > 0
        ? Object.keys(
            validatedData.find((row) => Object.keys(row.normalizedData).length > 0)
              ?.normalizedData || {}
          )
        : [];

    // Detect schedule matches if accountId is provided
    let scheduleMatches: ScheduleMatch[] | undefined;
    if (accountId) {
      const accountIdNum = parseInt(accountId);
      console.log("[Schedule Matching] Account ID:", accountIdNum);
      if (!isNaN(accountIdNum)) {
        // Fetch existing schedules and payees for matching
        const existingSchedules = await db
          .select()
          .from(scheduleTable)
          .where(
            and(eq(scheduleTable.accountId, accountIdNum), eq(scheduleTable.status, "active"))
          );

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
            let normalizedPayeeName = normalized["payee"];
            if (normalizedPayeeName && typeof normalizedPayeeName === "string") {
              const { name } = payeeMatcher.normalizePayeeName(normalizedPayeeName);
              normalizedPayeeName = name;
            }

            // Prepare matching criteria
            const criteria = {
              date: normalized["date"],
              amount: Math.abs(normalized["amount"] as number),
              payeeName: normalizedPayeeName,
              categoryId: normalized["categoryId"],
              accountId: accountIdNum,
            };

            // Find the best match (only high or exact confidence)
            const match = scheduleMatcher.findBestMatch(
              criteria,
              existingSchedules as any,
              existingPayees as any
            );

            if (
              match.schedule &&
              (match.confidence === "exact" ||
                match.confidence === "high" ||
                match.confidence === "medium")
            ) {
              scheduleMatches!.push({
                rowIndex: index,
                scheduleId: match.schedule.id,
                scheduleName: match.schedule.name,
                confidence: match.confidence,
                score: match.score,
                matchedOn: match.matchedOn,
                reasons: match.reasons,
                selected: true, // Auto-select high-confidence matches
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
    console.error("File remapping error:", error);
    return json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process file with custom mapping",
      },
      { status: 500 }
    );
  }
};
