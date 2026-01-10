import { accounts as accountsTable } from "$lib/schema/accounts";
import { payees as payeeTable } from "$lib/schema/payees";
import { schedules as scheduleTable } from "$lib/schema/schedules";
import { transactions as transactionTable } from "$lib/schema/transactions";
import { db } from "$lib/server/db";
import { CSVProcessor } from "$lib/server/import/file-processors/csv-processor";
import { PayeeMatcher } from "$lib/server/import/matchers/payee-matcher";
import { ScheduleMatcher } from "$lib/server/import/matchers/schedule-matcher";
import { detectTransferTargetMatches } from "$lib/server/import/utils/transfer-target-detector";
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

    // Detect transfer target matches (similar to schedule matching)
    // This identifies rows that match existing transfer targets from other accounts
    if (accountId) {
      const accountIdNum = parseInt(accountId);
      if (!isNaN(accountIdNum)) {
        validatedData = await detectTransferTargetMatches(validatedData, accountIdNum);
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
    if (accountId) {
      const accountIdNum = parseInt(accountId);
      if (!isNaN(accountIdNum)) {
        // Get workspaceId from account
        const account = await db
          .select({ workspaceId: accountsTable.workspaceId })
          .from(accountsTable)
          .where(eq(accountsTable.id, accountIdNum))
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

            console.log("[TransferMapping] Looking up mapping for payee:", payee);
            const match = await transferMappingService.matchTransferForImport(
              payee,
              account.workspaceId
            );
            console.log("[TransferMapping] Match result:", match.found ? `Found: ${match.matchedOn}` : "Not found");

            if (match.found && match.targetAccountId) {
              // Skip if target is current account
              if (match.targetAccountId === accountIdNum) continue;

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
