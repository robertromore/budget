/**
 * Import Orchestrator
 *
 * Coordinates the entire import process from validation through entity matching
 * to transaction creation. Provides progress tracking and error handling.
 */

import { accounts as accountTable, type Account } from "$lib/schema/accounts";
import type { Category } from "$lib/schema/categories";
import { categories as categoryTable } from "$lib/schema/categories";
import type { Payee } from "$lib/schema/payees";
import { payees as payeeTable } from "$lib/schema/payees";
import { payeeCategoryCorrections } from "$lib/schema/payee-category-corrections";
import type { selectTransactionSchema } from "$lib/schema/transactions";
import { transactions as transactionTable } from "$lib/schema/transactions";
import {
  utilityUsage,
  calculateUsageFromReadings,
  calculateAverageDailyUsage,
  calculateCostPerUnit,
  DEFAULT_UNITS_BY_SUBTYPE,
  type UsageUnit,
} from "$lib/schema/utility-usage";
import { db } from "$lib/server/db";
import { logger } from "$lib/server/shared/logging";
import type { ImportOptions, ImportResult, ImportRow, TransferTargetMatch } from "$lib/types/import";
import { and, eq, isNull } from "drizzle-orm";
import type { z } from "zod/v4";
import { getCategoryAliasService } from "$lib/server/domains/categories/alias-service";
import { TransferMappingService } from "$lib/server/domains/transfers/transfer-mapping-service";
import { serviceFactory } from "$lib/server/shared/container/service-factory";
import { CategoryMatcher } from "./matchers/category-matcher";
import { PayeeMatcher } from "./matchers/payee-matcher";
import { TransactionValidator } from "./validators/transaction-validator";

export interface ImportProgress {
  stage: "validating" | "matching" | "creating" | "complete";
  currentRow: number;
  totalRows: number;
  transactionsCreated: number;
  entitiesCreated: {
    payees: number;
    categories: number;
  };
  errors: Array<{ row: number; message: string }>;
  warnings: Array<{ row: number; message: string }>;
}

/**
 * Category dismissal from import - when user clears an AI-suggested category
 * Used for negative feedback learning
 */
export interface CategoryDismissal {
  rowIndex: number;
  payeeId: number | null;
  payeeName: string;
  rawPayeeString: string; // Original payee string from import file (e.g., "APPLECARD GSBANK")
  dismissedCategoryId: number;
  dismissedCategoryName: string;
  amount?: number;
  date?: string;
}

export class ImportOrchestrator {
  private validator: TransactionValidator;
  private payeeMatcher: PayeeMatcher;
  private categoryMatcher: CategoryMatcher;
  private transferMappingService: TransferMappingService;

  constructor() {
    this.validator = new TransactionValidator();
    this.payeeMatcher = new PayeeMatcher();
    this.categoryMatcher = new CategoryMatcher();
    this.transferMappingService = new TransferMappingService();
  }

  /**
   * Get transaction service from service factory
   */
  private get transactionService() {
    return serviceFactory.getTransactionService();
  }

  /**
   * Progress callback type
   */
  public onProgress?: (progress: ImportProgress) => void;

  /**
   * Process an import batch
   */
  async processImport(
    accountId: number,
    rows: ImportRow[],
    options: ImportOptions,
    selectedEntities?: {
      payees: string[];
      categories: string[];
    },
    scheduleMatches?: Array<{ rowIndex: number; scheduleId: number }>,
    categoryDismissals?: CategoryDismissal[],
    onProgress?: (progress: ImportProgress) => void
  ): Promise<ImportResult> {
    // Store progress callback
    this.onProgress = onProgress;
    const result: ImportResult = {
      success: true,
      transactionsCreated: 0,
      entitiesCreated: {
        payees: 0,
        categories: 0,
      },
      errors: [],
      warnings: [],
      duplicatesDetected: [],
      summary: {
        totalRows: rows.length,
        validRows: 0,
        invalidRows: 0,
        skippedRows: 0,
      },
      createdPayeeMappings: [],
      transfersCreated: 0,
      transferMappingsSaved: 0,
      utilityRecordsCreated: 0,
      reconciled: 0,
      reconciledTransactions: [],
      byFile: {},
    };

    // Initialize per-file tracking for multi-file imports
    const fileStats = new Map<string, {
      fileName: string;
      imported: number;
      duplicates: number;
      errors: number;
      reconciled: number;
      transfers: number;
    }>();

    // Initialize stats for each unique source file
    for (const row of rows) {
      const fileId = row.sourceFileId || "__single_file__";
      if (!fileStats.has(fileId)) {
        fileStats.set(fileId, {
          fileName: row.sourceFileName || "Unknown",
          imported: 0,
          duplicates: 0,
          errors: 0,
          reconciled: 0,
          transfers: 0,
        });
      }
    }

    // Track created payee mappings for alias creation
    const createdPayeeMappings: Array<{
      originalName: string;
      normalizedName: string;
      payeeId: number;
    }> = [];

    // Track category assignments for category alias creation
    const createdCategoryMappings: Array<{
      rawString: string;
      categoryId: number;
      payeeId?: number;
      wasAiSuggested?: boolean;
    }> = [];

    logger.debug("Import orchestrator starting", {
      totalRows: rows.length,
      selectedCategories: selectedEntities?.categories || "ALL",
      options,
    });

    try {
      // Get the full account record (needed for utility account detection)
      const [account] = await db
        .select()
        .from(accountTable)
        .where(eq(accountTable.id, accountId))
        .limit(1);

      if (!account) {
        throw new Error(`Account with ID ${accountId} not found`);
      }

      const workspaceId = account.workspaceId;
      const isUtilityAccount = account.accountType === "utility";

      // Stage 1: Validation
      const existingTransactions = await this.getExistingTransactions(accountId);
      const validatedRows = this.validator.validateRows(rows, existingTransactions);

      // Collect validation errors and warnings, track duplicates per file
      validatedRows.forEach((row) => {
        const fileId = row.sourceFileId || "__single_file__";
        const fileStat = fileStats.get(fileId);

        // Track duplicates per file
        if (row.validationStatus === "duplicate" && fileStat) {
          fileStat.duplicates++;
        }

        if (row.validationErrors) {
          row.validationErrors.forEach((error) => {
            if (error.severity === "error") {
              result.errors.push({
                row: row.rowIndex,
                field: error.field,
                message: error.message,
              });
            } else {
              result.warnings.push({
                row: row.rowIndex,
                field: error.field,
                message: error.message,
              });
            }
          });
        }
      });

      // Filter out invalid rows if not allowing partial imports
      // Include transfer_match rows since they represent valid reconciliation candidates
      const rowsToImport = options.allowPartialImport
        ? validatedRows.filter((row) => row.validationStatus !== "invalid")
        : validatedRows.filter(
            (row) => row.validationStatus === "valid" || row.validationStatus === "transfer_match"
          );

      if (rowsToImport.length === 0) {
        return result;
      }

      // Stage 2: Entity Matching
      const existingPayees = await this.getExistingPayees(workspaceId);
      const existingCategories = await this.getExistingCategories(workspaceId);

      // Note: Transfer target matching (Stage 2.5) is now done during the preview step
      // in the upload/remap API endpoints. Rows with transferTargetMatch already set
      // will be handled in Stage 3 below.

      // Stage 3: Transaction Creation (Batched for performance)
      const BATCH_SIZE = 25; // Process 25 transactions in parallel at a time
      let processedCount = 0;

      // Report initial progress
      this.onProgress?.({
        stage: "creating",
        currentRow: 0,
        totalRows: rowsToImport.length,
        transactionsCreated: 0,
        entitiesCreated: { ...result.entitiesCreated },
        errors: [],
        warnings: [],
      });

      // Split rows into batches
      for (let i = 0; i < rowsToImport.length; i += BATCH_SIZE) {
        const batch = rowsToImport.slice(i, i + BATCH_SIZE);

        // Process batch in parallel
        const batchResults = await Promise.all(
          batch.map(async (row) => {
            const fileId = row.sourceFileId || "__single_file__";
            const fileStat = fileStats.get(fileId);

            try {
              // Check if this row matches an existing transfer target - reconcile instead of create
              if (row.transferTargetMatch) {
                const reconciled = await this.reconcileTransferTarget(row, row.transferTargetMatch);
                if (reconciled) {
                  return {
                    type: "reconciled" as const,
                    row,
                    data: {
                      rowIndex: row.rowIndex,
                      existingTransactionId: row.transferTargetMatch.existingTransactionId,
                      sourceAccountName: row.transferTargetMatch.sourceAccountName,
                    },
                    fileStat,
                  };
                }
                return { type: "skipped" as const, row, fileStat };
              }

              // Check if this row has a schedule match
              const scheduleMatch = scheduleMatches?.find((m) => m.rowIndex === row.rowIndex);
              const scheduleId = scheduleMatch?.scheduleId;

              // Check if this row is a transfer
              const isTransfer = !!row.normalizedData["transferAccountId"];

              const transactionResult = await this.createTransaction(
                accountId,
                workspaceId,
                row,
                existingPayees,
                existingCategories,
                options,
                selectedEntities,
                result.entitiesCreated,
                scheduleId,
                createdPayeeMappings,
                createdCategoryMappings,
                account
              );

              if (transactionResult.transaction) {
                return {
                  type: "created" as const,
                  row,
                  isTransfer,
                  rememberMapping: row.normalizedData["rememberTransferMapping"],
                  fileStat,
                  utilityRecordCreated: transactionResult.utilityRecordCreated,
                };
              }
              return { type: "skipped" as const, row, fileStat };
            } catch (error) {
              return {
                type: "error" as const,
                row,
                error: error instanceof Error ? error.message : "Failed to create transaction",
                fileStat,
              };
            }
          })
        );

        // Aggregate batch results
        for (const batchResult of batchResults) {
          if (batchResult.type === "created") {
            result.transactionsCreated++;
            if (batchResult.fileStat) batchResult.fileStat.imported++;
            if (batchResult.isTransfer) {
              result.transfersCreated = (result.transfersCreated || 0) + 1;
              if (batchResult.fileStat) batchResult.fileStat.transfers++;
              if (batchResult.rememberMapping) {
                result.transferMappingsSaved = (result.transferMappingsSaved || 0) + 1;
              }
            }
            if (batchResult.utilityRecordCreated) {
              result.utilityRecordsCreated = (result.utilityRecordsCreated || 0) + 1;
            }
          } else if (batchResult.type === "reconciled") {
            result.reconciled = (result.reconciled || 0) + 1;
            result.reconciledTransactions = result.reconciledTransactions || [];
            result.reconciledTransactions.push(batchResult.data);
            if (batchResult.fileStat) batchResult.fileStat.reconciled++;
          } else if (batchResult.type === "error") {
            result.errors.push({
              row: batchResult.row.rowIndex,
              field: "general",
              message: batchResult.error,
            });
            if (batchResult.fileStat) batchResult.fileStat.errors++;
          }
        }

        // Update progress after each batch
        processedCount += batch.length;
        this.onProgress?.({
          stage: "creating",
          currentRow: processedCount,
          totalRows: rowsToImport.length,
          transactionsCreated: result.transactionsCreated,
          entitiesCreated: { ...result.entitiesCreated },
          errors: result.errors.map((e) => ({ row: e.row, message: e.message })),
          warnings: result.warnings.map((w) => ({ row: w.row, message: w.message })),
        });
      }

      // Update summary
      const validationSummary = this.validator.getValidationSummary(validatedRows);
      result.summary = {
        totalRows: rows.length,
        validRows: validationSummary.valid,
        invalidRows: validationSummary.invalid,
        skippedRows: rows.length - rowsToImport.length,
      };

      // Add created payee mappings for alias tracking
      result.createdPayeeMappings = createdPayeeMappings;

      // Add created category mappings for category alias tracking
      result.createdCategoryMappings = createdCategoryMappings;

      // Convert per-file stats to result.byFile (only if multiple files or explicit file tracking)
      if (fileStats.size > 1 || (fileStats.size === 1 && !fileStats.has("__single_file__"))) {
        result.byFile = {};
        for (const [fileId, stats] of fileStats) {
          result.byFile[fileId] = stats;
        }
      }

      // Process category dismissals (negative feedback for learning)
      console.log(`[ImportOrchestrator] categoryDismissals received:`, categoryDismissals?.length || 0, categoryDismissals);
      if (categoryDismissals && categoryDismissals.length > 0) {
        try {
          await this.recordCategoryDismissals(categoryDismissals, workspaceId);
          logger.info("Recorded category dismissals for learning", {
            count: categoryDismissals.length,
            workspaceId,
          });
        } catch (dismissalError) {
          // Don't fail the import for dismissal recording errors
          logger.error("Failed to record category dismissals", { error: dismissalError });
        }
      }

      if (result.errors.length > 0) {
        result.success = false;
      }

      return result;
    } catch (error) {
      throw new Error(`Import failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Create a transaction from an import row
   * For utility accounts, also creates a utility_usage record if usage data is present
   */
  private async createTransaction(
    accountId: number,
    workspaceId: number,
    row: ImportRow,
    existingPayees: Payee[],
    existingCategories: Category[],
    _options: ImportOptions,
    selectedEntities?: {
      payees: string[];
      categories: string[];
    },
    entitiesCreated?: {
      payees: number;
      categories: number;
    },
    scheduleId?: number,
    createdPayeeMappings?: Array<{
      originalName: string;
      normalizedName: string;
      payeeId: number;
    }>,
    createdCategoryMappings?: Array<{
      rawString: string;
      categoryId: number;
      payeeId?: number;
      wasAiSuggested?: boolean;
    }>,
    account?: typeof accountTable.$inferSelect
  ): Promise<{ transaction: z.infer<typeof selectTransactionSchema> | null; utilityRecordCreated: boolean }> {
    const normalized = row.normalizedData;

    // Check if this row should be imported as a transfer
    const transferAccountId = normalized["transferAccountId"];
    if (transferAccountId && typeof transferAccountId === "number") {
      const transaction = await this.createTransferFromImport(
        accountId,
        transferAccountId,
        workspaceId,
        row,
        _options
      );
      return { transaction, utilityRecordCreated: false };
    }

    // Match or create payee
    let payeeId: number | null = null;
    let payeeDetails: string | null = null;

    // First check if an explicit payeeId was provided by the user (from import preview selection)
    if (normalized["payeeId"] && typeof normalized["payeeId"] === "number") {
      // Verify the payee exists in our list
      const explicitPayee = existingPayees.find((p) => p.id === normalized["payeeId"]);
      if (explicitPayee) {
        payeeId = explicitPayee.id;
        logger.debug("Using explicit payeeId from user selection", { payeeId, payeeName: explicitPayee.name });
      }
    }

    // If no explicit payeeId, try to match by name
    if (!payeeId && normalized["payee"]) {
      // Normalize the payee name and extract details
      const { name: cleanedPayeeName, details } = this.payeeMatcher.normalizePayeeName(
        normalized["payee"]
      );
      payeeDetails = details;

      const payeeMatch = this.payeeMatcher.findBestMatch(cleanedPayeeName, existingPayees);

      // Only use matches with high or exact confidence to avoid merging similar but distinct payees
      // (e.g., "The Home Depot" and "The Food Depot" are 71% similar but should be separate)
      if (
        payeeMatch.payee &&
        (payeeMatch.confidence === "exact" || payeeMatch.confidence === "high")
      ) {
        payeeId = payeeMatch.payee.id;
      } else if (_options.createMissingPayees ?? _options.createMissingEntities) {
        // Check if this payee is in the selected entities list
        // If selectedEntities is not provided OR payees array is empty, select all payees
        const isSelected =
          !selectedEntities ||
          !selectedEntities.payees ||
          selectedEntities.payees.length === 0 ||
          selectedEntities.payees.includes(cleanedPayeeName);

        if (isSelected) {
          // Generate slug for the payee
          const slug = cleanedPayeeName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

          // Check if payee with this slug already exists (could be from previous import or soft-deleted)
          const existingBySlug = existingPayees.find((p) => p.slug === slug);
          if (existingBySlug) {
            // Use existing payee
            payeeId = existingBySlug.id;
          } else {
            try {
              const [newPayee] = await db
                .insert(payeeTable)
                .values({
                  name: cleanedPayeeName,
                  slug,
                  workspaceId,
                })
                .returning();

              if (newPayee) {
                payeeId = newPayee.id;
                existingPayees.push(newPayee);
                if (entitiesCreated) entitiesCreated.payees++;

                // Track the mapping for alias creation
                if (createdPayeeMappings) {
                  createdPayeeMappings.push({
                    originalName: (normalized["originalPayee"] || normalized["payee"]) as string, // The raw import string
                    normalizedName: cleanedPayeeName,   // What we stored in payee.name
                    payeeId: newPayee.id,
                  });
                }
              }
            } catch (error) {
              // If it failed due to unique constraint, check for existing or soft-deleted payee
              // Filter by workspaceId to only use payees from the current workspace
              const existing = await db
                .select()
                .from(payeeTable)
                .where(and(eq(payeeTable.slug, slug), eq(payeeTable.workspaceId, workspaceId)))
                .limit(1);
              const payee = existing[0];
              if (payee) {
                if (payee.deletedAt) {
                  // Restore soft-deleted payee
                  const [restored] = await db
                    .update(payeeTable)
                    .set({ deletedAt: null, name: cleanedPayeeName })
                    .where(eq(payeeTable.id, payee.id))
                    .returning();
                  if (restored) {
                    payeeId = restored.id;
                    existingPayees.push(restored);
                    if (entitiesCreated) entitiesCreated.payees++;

                    // Track the mapping for alias creation
                    if (createdPayeeMappings) {
                      createdPayeeMappings.push({
                        originalName: (normalized["originalPayee"] || normalized["payee"]) as string,
                        normalizedName: cleanedPayeeName,
                        payeeId: restored.id,
                      });
                    }
                  }
                } else {
                  // Use existing active payee
                  payeeId = payee.id;
                  existingPayees.push(payee);
                }
              } else {
                // If payee doesn't exist in this workspace, log and continue without payee
                // This can happen if slug is taken by another workspace
                logger.warn("Payee slug exists but not in current workspace", {
                  slug,
                  workspaceId,
                });
              }
            }
          }
        }
      }
    }

    // Match or create category
    let categoryId: number | null = null;

    // First check if an explicit categoryId was provided by the user (from import preview selection)
    if (normalized["categoryId"] && typeof normalized["categoryId"] === "number") {
      // Verify the category exists in our list
      const explicitCategory = existingCategories.find((c) => c.id === normalized["categoryId"]);
      if (explicitCategory) {
        categoryId = explicitCategory.id;
        logger.debug("Using explicit categoryId from user selection", { categoryId, categoryName: explicitCategory.name });
      }
    }

    // If no explicit categoryId, try to match by name or other methods
    if (!categoryId && (normalized["category"] || normalized["payee"] || normalized["description"])) {
      // If explicit category name is provided, try exact match first
      let categoryMatch: any = null;
      if (normalized["category"]) {
        // Check for exact name match only (case-insensitive)
        const exactMatch = existingCategories.find(
          (c) => c.name?.toLowerCase() === normalized["category"].toLowerCase()
        );
        if (exactMatch) {
          categoryId = exactMatch.id;
        }
      }

      // If no explicit category or no exact match found, use fuzzy matching
      if (!categoryId && !normalized["category"]) {
        categoryMatch = this.categoryMatcher.findBestMatch(
          {
            categoryName: normalized["category"],
            payeeName: normalized["payee"],
            description: normalized["description"],
          },
          existingCategories
        );
        if (categoryMatch.category) {
          categoryId = categoryMatch.category.id;
        }
      }

      // If still no match and explicit category provided, try to create it
      if (
        !categoryId &&
        normalized["category"] &&
        normalized["category"].toLowerCase() !== "uncategorized" &&
        (_options.createMissingCategories ?? _options.createMissingEntities)
      ) {
        // Skip "Uncategorized" - it's just a placeholder for no category
        // Check if this category is in the selected entities list (case-insensitive)
        // If selectedEntities is not provided OR categories array is empty, select all categories
        const normalizedCategoryName = normalized["category"].trim();
        const isSelected =
          !selectedEntities ||
          !selectedEntities.categories ||
          selectedEntities.categories.length === 0 ||
          selectedEntities.categories.some(
            (selected) => selected.trim().toLowerCase() === normalizedCategoryName.toLowerCase()
          );

        console.log(`Category "${normalizedCategoryName}" - isSelected: ${isSelected}`, {
          selectedEntities: selectedEntities?.categories,
          matches: selectedEntities?.categories.map((s) => ({
            selected: s,
            match: s.trim().toLowerCase() === normalizedCategoryName.toLowerCase(),
          })),
        });

        if (isSelected) {
          console.log(`Creating category: "${normalized["category"]}"`);
          // Create new category with slug
          const slug = normalized["category"]
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

          // Check if category with this slug already exists (could be from soft-deleted or previous import)
          const existingBySlug = existingCategories.find((c) => c.slug === slug);
          if (existingBySlug) {
            console.log(
              `Category with slug "${slug}" already exists (ID: ${existingBySlug.id}), using existing`
            );
            categoryId = existingBySlug.id;
          } else {
            try {
              const [newCategory] = await db
                .insert(categoryTable)
                .values({
                  name: normalized["category"],
                  slug,
                  workspaceId,
                })
                .returning();

              if (newCategory) {
                categoryId = newCategory.id;
                existingCategories.push(newCategory);
                if (entitiesCreated) entitiesCreated.categories++;
                console.log(
                  `Successfully created category: "${newCategory.name}" with ID ${newCategory.id}`
                );
              }
            } catch (error) {
              logger.error("Failed to create category", { error, category: normalized["category"] });
              // If it failed due to unique constraint, check for soft-deleted category
              // Filter by workspaceId to only use categories from the current workspace
              const existing = await db
                .select()
                .from(categoryTable)
                .where(
                  and(eq(categoryTable.slug, slug), eq(categoryTable.workspaceId, workspaceId))
                )
                .limit(1);
              const category = existing[0];
              if (category) {
                if (category.deletedAt) {
                  // Restore soft-deleted category
                  console.log(`Restoring soft-deleted category "${category.name}" (slug: ${slug})`);
                  const [restored] = await db
                    .update(categoryTable)
                    .set({ deletedAt: null, name: normalized["category"] })
                    .where(eq(categoryTable.id, category.id))
                    .returning();
                  if (restored) {
                    categoryId = restored.id;
                    existingCategories.push(restored);
                    if (entitiesCreated) entitiesCreated.categories++;
                    console.log(
                      `Successfully restored category: "${restored.name}" with ID ${restored.id}`
                    );
                  }
                } else {
                  console.log(`Found existing active category with slug "${slug}", using it`);
                  categoryId = category.id;
                  existingCategories.push(category);
                }
              } else {
                // If category doesn't exist in this workspace, log and continue without category
                // This can happen if slug is taken by another workspace
                logger.warn("Category slug exists but not in current workspace", {
                  slug,
                  workspaceId,
                });
              }
            }
          }
        } else {
          console.log(`Skipping category "${normalizedCategoryName}" - not in selectedEntities`);
        }
      } else if (
        !normalized["category"] &&
        (_options.createMissingCategories ?? _options.createMissingEntities)
      ) {
        // No explicit category provided, use inferred category if available, otherwise infer
        const suggestedCategoryName =
          normalized["inferredCategory"] ||
          this.categoryMatcher.suggestCategoryName({
            payeeName: normalized["payee"],
            description: normalized["description"],
          });

        // Skip "Uncategorized" - it's just a placeholder
        if (suggestedCategoryName && suggestedCategoryName.toLowerCase() !== "uncategorized") {
          // Check if this suggested category already exists
          const existingCategory = existingCategories.find(
            (c) => c.name?.toLowerCase() === suggestedCategoryName.toLowerCase()
          );

          if (existingCategory) {
            categoryId = existingCategory.id;
          } else {
            // Check if this inferred category is in the selected entities list (case-insensitive)
            // If selectedEntities is not provided OR categories array is empty, select all categories
            const isSelected =
              !selectedEntities ||
              !selectedEntities.categories ||
              selectedEntities.categories.length === 0 ||
              selectedEntities.categories.some(
                (selected) =>
                  selected.trim().toLowerCase() === suggestedCategoryName.trim().toLowerCase()
              );

            if (isSelected) {
              // Create the suggested category
              const slug = suggestedCategoryName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "");

              // Check if category with this slug already exists
              const existingBySlug = existingCategories.find((c) => c.slug === slug);
              if (existingBySlug) {
                categoryId = existingBySlug.id;
              } else {
                try {
                  const [newCategory] = await db
                    .insert(categoryTable)
                    .values({
                      name: suggestedCategoryName,
                      slug,
                      workspaceId,
                    })
                    .returning();

                  if (newCategory) {
                    categoryId = newCategory.id;
                    existingCategories.push(newCategory);
                    if (entitiesCreated) entitiesCreated.categories++;
                  }
                } catch (error) {
                  logger.error("Failed to create inferred category", {
                    error,
                    category: suggestedCategoryName,
                  });
                  // Check for soft-deleted category
                  // Filter by workspaceId to only use categories from the current workspace
                  const existing = await db
                    .select()
                    .from(categoryTable)
                    .where(
                      and(eq(categoryTable.slug, slug), eq(categoryTable.workspaceId, workspaceId))
                    )
                    .limit(1);
                  const category = existing[0];
                  if (category) {
                    if (category.deletedAt) {
                      // Restore soft-deleted category
                      const [restored] = await db
                        .update(categoryTable)
                        .set({ deletedAt: null, name: suggestedCategoryName })
                        .where(eq(categoryTable.id, category.id))
                        .returning();
                      if (restored) {
                        categoryId = restored.id;
                        existingCategories.push(restored);
                        if (entitiesCreated) entitiesCreated.categories++;
                      }
                    } else {
                      categoryId = category.id;
                      existingCategories.push(category);
                    }
                  } else {
                    // If category doesn't exist in this workspace, log and continue without category
                    logger.warn("Inferred category slug exists but not in current workspace", {
                      slug,
                      workspaceId,
                    });
                  }
                }
              }
            } else {
            }
          }
        }
      }
    }

    // Create transaction
    let amount = normalized["amount"] || 0;

    // Reverse amount sign if option is enabled
    if (_options.reverseAmountSigns) {
      amount = -amount;
    }

    // Combine description with extracted payee details
    let notes = normalized["description"] || "";
    if (payeeDetails) {
      notes = notes ? `${notes} (${payeeDetails})` : payeeDetails;
    }

    // Prepare import metadata
    const importMetadata: any = {
      accountId,
      amount,
      date: normalized["date"] || new Date().toISOString().split("T")[0],
      payeeId,
      categoryId,
      notes,
      status: normalized["status"] || "cleared",
      scheduleId: scheduleId || null, // Link to schedule if matched
    };

    // Add import metadata if this was an imported transaction
    if (_options.fileName) {
      importMetadata.importedFrom = _options.fileName;
      importMetadata.importedAt = new Date().toISOString();
    }

    // Store original payee name if it was normalized
    if (normalized["originalPayee"] && normalized["originalPayee"] !== normalized["payee"]) {
      importMetadata.originalPayeeName = normalized["originalPayee"];
    }

    // Store original category name if provided in import
    if (normalized["category"]) {
      importMetadata.originalCategoryName = normalized["category"];
    }

    // Store inferred category if it was auto-categorized
    if (normalized["inferredCategory"]) {
      importMetadata.inferredCategory = normalized["inferredCategory"];
    }

    // Store Financial Institution Transaction ID for duplicate detection
    if (normalized["fitid"]) {
      importMetadata.fitid = normalized["fitid"];
    }

    // Store additional import details (transaction IDs, location, etc.)
    if (payeeDetails) {
      const detailsObj: any = { extractedDetails: payeeDetails };
      if (normalized["fitid"]) {
        detailsObj.fitid = normalized["fitid"];
      }
      importMetadata.importDetails = JSON.stringify(detailsObj);
    }

    // Store complete raw import data for audit/debugging purposes
    // This includes both the original file data and the normalized data before any import adjustments
    if (row.rawData && Object.keys(row.rawData).length > 0) {
      const rawImportSnapshot = {
        // Original data from the file (OFX/QFX/CSV fields exactly as they appeared)
        originalFileData: row.rawData,
        // Normalized data before import orchestrator adjustments (before payee normalization, amount reversal, etc.)
        normalizedBeforeImport: row.normalizedData,
        // What adjustments were applied during import
        importAdjustments: {
          amountSignReversed: _options.reverseAmountSigns || false,
          payeeNormalized: !!normalized["payee"],
          categoryMatched: !!categoryId,
          payeeDetailsExtracted: !!payeeDetails,
        },
      };
      importMetadata.rawImportData = JSON.stringify(rawImportSnapshot);
    }

    const [transaction] = await db.insert(transactionTable).values(importMetadata).returning();

    // Track category mapping for alias creation
    // Only track if we have a category assignment and a raw string to map
    if (categoryId && createdCategoryMappings) {
      // Get the raw string to use for the alias
      // Priority: originalPayee (from CSV before any transformations) > normalized payee > description
      const rawString = row.originalPayee || normalized["payee"] || normalized["description"];

      if (rawString && rawString.trim()) {
        // Check if this raw string → category mapping already exists in our batch
        const existingMapping = createdCategoryMappings.find(
          (m) => m.rawString === rawString.trim() && m.categoryId === categoryId
        );

        if (!existingMapping) {
          // Determine if this was an AI/ML suggestion
          // If inferredCategory is set, it means the category was auto-suggested
          const wasAiSuggested = !!normalized["inferredCategory"];

          createdCategoryMappings.push({
            rawString: rawString.trim(),
            categoryId,
            payeeId: payeeId || undefined,
            wasAiSuggested,
          });
        }
      }
    }

    // Create utility usage record if this is a utility account with usage data
    let utilityRecordCreated = false;
    if (account?.accountType === "utility" && transaction) {
      const hasUsageData = normalized["usageAmount"] !== undefined ||
                          normalized["periodStart"] !== undefined ||
                          normalized["meterReadingStart"] !== undefined ||
                          normalized["meterReadingEnd"] !== undefined;

      if (hasUsageData) {
        try {
          utilityRecordCreated = await this.createUtilityUsageRecord(
            transaction.id,
            accountId,
            workspaceId,
            normalized,
            account.utilitySubtype || "other",
            _options.fileName
          );
        } catch (error) {
          // Don't fail the import if utility record creation fails
          logger.warn("Failed to create utility usage record", {
            transactionId: transaction.id,
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }
    }

    return { transaction: transaction || null, utilityRecordCreated };
  }

  /**
   * Create a utility usage record from import data
   */
  private async createUtilityUsageRecord(
    transactionId: number,
    accountId: number,
    workspaceId: number,
    normalized: Record<string, any>,
    utilitySubtype: string,
    importedFrom?: string
  ): Promise<boolean> {
    // Get period dates (required for usage record)
    const periodStart = normalized["periodStart"] as string;
    const periodEnd = normalized["periodEnd"] as string;
    const transactionDate = normalized["date"] as string;

    // Use transaction date as fallback for period dates
    const effectivePeriodStart = periodStart || transactionDate;
    const effectivePeriodEnd = periodEnd || transactionDate;

    if (!effectivePeriodStart || !effectivePeriodEnd) {
      logger.debug("Skipping utility record - no period dates available");
      return false;
    }

    // Calculate usage from meter readings if provided
    let usageAmount = normalized["usageAmount"] as number | undefined;
    const meterReadingStart = normalized["meterReadingStart"] as number | undefined;
    const meterReadingEnd = normalized["meterReadingEnd"] as number | undefined;

    if (usageAmount === undefined && meterReadingStart !== undefined && meterReadingEnd !== undefined) {
      usageAmount = calculateUsageFromReadings(meterReadingStart, meterReadingEnd);
    }

    // Determine usage unit
    const usageUnit = (normalized["usageUnit"] as UsageUnit) ||
                      DEFAULT_UNITS_BY_SUBTYPE[utilitySubtype] ||
                      "units";

    // Get cost breakdown
    const baseCharge = normalized["baseCharge"] as number | undefined;
    const usageCost = normalized["usageCost"] as number | undefined;
    const taxes = normalized["taxes"] as number | undefined;
    const fees = normalized["fees"] as number | undefined;
    const totalAmount = Math.abs(normalized["amount"] as number);

    // Calculate rate per unit if not provided
    let ratePerUnit = normalized["ratePerUnit"] as number | undefined;
    if (ratePerUnit === undefined && usageAmount && usageAmount > 0) {
      ratePerUnit = calculateCostPerUnit(totalAmount, baseCharge || null, usageAmount) || undefined;
    }

    // Calculate days in period and average daily usage
    const daysInPeriod = Math.ceil(
      (new Date(effectivePeriodEnd).getTime() - new Date(effectivePeriodStart).getTime()) /
      (1000 * 60 * 60 * 24)
    ) + 1;

    const averageDailyUsage = usageAmount !== undefined
      ? calculateAverageDailyUsage(usageAmount, effectivePeriodStart, effectivePeriodEnd)
      : undefined;

    // Create the utility usage record
    const [usageRecord] = await db.insert(utilityUsage).values({
      workspaceId,
      accountId,
      transactionId,
      periodStart: effectivePeriodStart,
      periodEnd: effectivePeriodEnd,
      dueDate: normalized["dueDate"] as string | undefined,
      usageAmount: usageAmount ?? 0,
      usageUnit,
      meterReadingStart,
      meterReadingEnd,
      ratePerUnit,
      baseCharge,
      usageCost,
      taxes,
      fees,
      totalAmount,
      daysInPeriod,
      averageDailyUsage,
      notes: normalized["notes"] as string | undefined,
      importedFrom,
      rawImportData: JSON.stringify(normalized),
    }).returning();

    logger.debug("Created utility usage record", {
      id: usageRecord?.id,
      transactionId,
      usageAmount,
      usageUnit,
      periodStart: effectivePeriodStart,
      periodEnd: effectivePeriodEnd,
    });

    return !!usageRecord;
  }

  /**
   * Create a transfer from an import row
   * This is called when the user specifies a target account for transfer during import preview
   */
  private async createTransferFromImport(
    sourceAccountId: number,
    targetAccountId: number,
    workspaceId: number,
    row: ImportRow,
    _options: ImportOptions
  ): Promise<z.infer<typeof selectTransactionSchema> | null> {
    const normalized = row.normalizedData;

    console.log("[TransferMapping] createTransferFromImport called:", {
      rowIndex: row.rowIndex,
      sourceAccountId,
      targetAccountId,
      rememberTransferMapping: normalized["rememberTransferMapping"],
      originalPayee: row.originalPayee,
      normalizedPayee: normalized["payee"],
    });

    // Parse the amount - positive for transfers to target, negative for transfers from target
    const rawAmount = normalized["amount"];
    const amount = typeof rawAmount === "number" ? rawAmount : parseFloat(String(rawAmount)) || 0;

    // Determine direction: positive means money going to source (inflow),
    // negative means money leaving source (outflow to target)
    // For createTransfer, we always provide positive amount and use from/to to indicate direction
    const isOutgoing = amount < 0;
    const absAmount = Math.abs(amount);

    // Get date
    const date = normalized["date"] as string;
    if (!date) {
      throw new Error("Transaction date is required for transfer");
    }

    // Get notes/description
    const notes = (normalized["description"] || normalized["notes"]) as string | undefined;

    // Create the transfer using TransactionService
    const transferResult = await this.transactionService.createTransfer(
      {
        fromAccountId: isOutgoing ? sourceAccountId : targetAccountId,
        toAccountId: isOutgoing ? targetAccountId : sourceAccountId,
        amount: absAmount,
        date,
        notes,
      },
      workspaceId
    );

    // Optionally save the transfer mapping for future imports
    if (normalized["rememberTransferMapping"]) {
      // Use the original raw payee string from the import file for mapping lookup
      // Priority: row.originalPayee > normalizedData["originalPayee"] > normalizedData["payee"]
      const rawPayeeString = row.originalPayee || normalized["originalPayee"] || normalized["payee"] as string;
      if (rawPayeeString && rawPayeeString.trim()) {
        try {
          console.log("[TransferMapping] Saving transfer mapping:", {
            rawPayeeString: rawPayeeString.trim(),
            targetAccountId,
            sourceAccountId,
            sources: {
              rowOriginalPayee: row.originalPayee,
              normalizedOriginalPayee: normalized["originalPayee"],
              normalizedPayee: normalized["payee"],
            },
          });
          await this.transferMappingService.recordMappingFromConversion(
            rawPayeeString.trim(),
            targetAccountId,
            workspaceId,
            sourceAccountId
          );
          logger.debug("Saved transfer mapping from import", {
            rawPayeeString: rawPayeeString.trim(),
            targetAccountId,
            sourceAccountId,
          });
        } catch (error) {
          // Don't fail the import if mapping save fails
          logger.warn("Failed to save transfer mapping", { error });
        }
      }
    }

    // Return the source transaction (the one in the account being imported to)
    return isOutgoing ? transferResult.fromTransaction : transferResult.toTransaction;
  }

  /**
   * Get existing transactions for duplicate detection
   */
  private async getExistingTransactions(accountId: number) {
    return db
      .select()
      .from(transactionTable)
      .where(and(eq(transactionTable.accountId, accountId), isNull(transactionTable.deletedAt)));
  }

  /**
   * Get existing payees for matching
   */
  private async getExistingPayees(workspaceId: number): Promise<Payee[]> {
    return db
      .select()
      .from(payeeTable)
      .where(and(isNull(payeeTable.deletedAt), eq(payeeTable.workspaceId, workspaceId)));
  }

  /**
   * Get existing categories for matching
   */
  private async getExistingCategories(workspaceId: number): Promise<Category[]> {
    return db
      .select()
      .from(categoryTable)
      .where(and(isNull(categoryTable.deletedAt), eq(categoryTable.workspaceId, workspaceId)));
  }

  /**
   * Get existing transfer target transactions in an account
   * These are transactions that were created as the "target" side of transfers from other accounts
   */
  private async getTransferTargets(accountId: number): Promise<z.infer<typeof selectTransactionSchema>[]> {
    return db
      .select()
      .from(transactionTable)
      .where(
        and(
          eq(transactionTable.accountId, accountId),
          eq(transactionTable.isTransfer, true),
          isNull(transactionTable.deletedAt)
        )
      );
  }

  /**
   * Find import rows that match existing transfer targets
   * This detects when an imported transaction is the "other side" of an existing transfer
   * Uses date (±3 days) and amount matching
   */
  private async findTransferTargetMatches(
    rows: ImportRow[],
    accountId: number
  ): Promise<Map<number, TransferTargetMatch>> {
    const transferTargets = await this.getTransferTargets(accountId);

    if (transferTargets.length === 0) {
      return new Map();
    }

    // Get account names for display
    const accountIds = [...new Set(transferTargets.map((t) => t.transferAccountId).filter(Boolean))] as number[];
    const accountNames = new Map<number, string>();

    if (accountIds.length > 0) {
      const accountRecords = await db
        .select({ id: accountTable.id, name: accountTable.name })
        .from(accountTable)
        .where(and(
          isNull(accountTable.deletedAt)
        ));

      for (const acc of accountRecords) {
        accountNames.set(acc.id, acc.name);
      }
    }

    const matches = new Map<number, TransferTargetMatch>();

    for (const row of rows) {
      // Skip rows that are already set as transfers or have other issues
      if (row.validationStatus === "invalid") continue;
      if (row.normalizedData["transferAccountId"]) continue; // Already marked as transfer

      const rowDateStr = row.normalizedData["date"] as string;
      const rowAmount = row.normalizedData["amount"] as number;

      if (!rowDateStr || rowAmount === undefined || rowAmount === null) continue;

      const rowDate = new Date(rowDateStr);
      if (isNaN(rowDate.getTime())) continue;

      // Find matching transfer targets
      for (const target of transferTargets) {
        // Skip if already reconciled (has importedAt set)
        if (target.importedAt) continue;

        const targetDate = new Date(target.date);
        if (isNaN(targetDate.getTime())) continue;

        // Calculate date difference in days
        const daysDiff = Math.abs(
          Math.floor((rowDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24))
        );

        // Check if within ±3 days
        if (daysDiff > 3) continue;

        // Check amount match (within $0.01)
        const amountMatch = Math.abs(rowAmount - target.amount) < 0.01;

        if (amountMatch) {
          // Determine confidence based on date proximity
          let confidence: "high" | "medium" | "low";
          if (daysDiff === 0) {
            confidence = "high";
          } else if (daysDiff <= 1) {
            confidence = "medium";
          } else {
            confidence = "low";
          }

          const sourceAccountId = target.transferAccountId;
          const sourceAccountName = sourceAccountId
            ? accountNames.get(sourceAccountId) || `Account #${sourceAccountId}`
            : "Unknown Account";

          matches.set(row.rowIndex, {
            existingTransactionId: target.id,
            existingTransferId: target.transferId || "",
            sourceAccountId: sourceAccountId || 0,
            sourceAccountName,
            dateDifference: daysDiff,
            confidence,
          });

          break; // First match wins
        }
      }
    }

    return matches;
  }

  /**
   * Reconcile an import row with an existing transfer target
   * Instead of creating a new transaction, update the existing one with import data
   */
  private async reconcileTransferTarget(
    row: ImportRow,
    match: TransferTargetMatch
  ): Promise<z.infer<typeof selectTransactionSchema> | null> {
    const normalized = row.normalizedData;

    // Update the existing transfer target with import enrichment data
    const [updated] = await db
      .update(transactionTable)
      .set({
        originalPayeeName: (row.originalPayee || normalized["payee"]) as string || undefined,
        importedAt: new Date().toISOString(),
        status: "cleared", // Mark as cleared since we have bank confirmation
        updatedAt: new Date().toISOString(),
      })
      .where(eq(transactionTable.id, match.existingTransactionId))
      .returning();

    logger.debug("Reconciled transfer target with import", {
      transactionId: match.existingTransactionId,
      sourceAccountName: match.sourceAccountName,
      dateDifference: match.dateDifference,
    });

    return updated || null;
  }

  /**
   * Get import progress (for future real-time updates)
   */
  getProgress(): ImportProgress {
    return {
      stage: "validating",
      currentRow: 0,
      totalRows: 0,
      transactionsCreated: 0,
      entitiesCreated: {
        payees: 0,
        categories: 0,
      },
      errors: [],
      warnings: [],
    };
  }

  /**
   * Preview import without creating any records
   */
  async previewImport(
    accountId: number,
    rows: ImportRow[],
    _options: ImportOptions
  ): Promise<{
    validRows: number;
    invalidRows: number;
    warnings: number;
    potentialPayees: { name: string; match: string | null }[];
    potentialCategories: { name: string; match: string | null }[];
    estimatedTransactions: number;
  }> {
    // Get the account's workspaceId
    const [account] = await db
      .select({ workspaceId: accountTable.workspaceId })
      .from(accountTable)
      .where(eq(accountTable.id, accountId))
      .limit(1);

    if (!account) {
      throw new Error(`Account with ID ${accountId} not found`);
    }

    const workspaceId = account.workspaceId;

    // Validation
    const existingTransactions = await this.getExistingTransactions(accountId);
    const validatedRows = this.validator.validateRows(rows, existingTransactions);

    const summary = this.validator.getValidationSummary(validatedRows);

    // Entity matching preview
    const existingPayees = await this.getExistingPayees(workspaceId);
    const existingCategories = await this.getExistingCategories(workspaceId);

    const potentialPayees: { name: string; match: string | null }[] = [];
    const potentialCategories: { name: string; match: string | null }[] = [];

    validatedRows
      .filter((row) => row.validationStatus !== "invalid")
      .forEach((row) => {
        const normalized = row.normalizedData;

        // Check payee
        if (normalized["payee"]) {
          const cleanedPayeeName = this.payeeMatcher.cleanPayeeName(normalized["payee"]);
          const payeeMatch = this.payeeMatcher.findBestMatch(cleanedPayeeName, existingPayees);

          if (!potentialPayees.some((p) => p.name === cleanedPayeeName)) {
            potentialPayees.push({
              name: cleanedPayeeName,
              match: payeeMatch.payee?.name || null,
            });
          }
        }

        // Check category
        if (normalized["category"]) {
          const categoryMatch = this.categoryMatcher.findBestMatch(
            {
              categoryName: normalized["category"],
              payeeName: normalized["payee"],
              description: normalized["description"],
            },
            existingCategories
          );

          if (!potentialCategories.some((c) => c.name === normalized["category"])) {
            potentialCategories.push({
              name: normalized["category"],
              match: categoryMatch.category?.name || null,
            });
          }
        }
      });

    return {
      validRows: summary.valid + summary.warnings,
      invalidRows: summary.invalid,
      warnings: summary.warnings,
      potentialPayees,
      potentialCategories,
      estimatedTransactions: summary.valid + summary.warnings,
    };
  }

  /**
   * Record category dismissals for machine learning negative feedback
   * Called when user clears an AI-suggested category during import
   */
  private async recordCategoryDismissals(
    dismissals: CategoryDismissal[],
    workspaceId: number
  ): Promise<void> {
    if (!dismissals || dismissals.length === 0) return;

    // Batch insert all dismissals into payee_category_corrections table
    // Note: toCategoryId is omitted (not set to null) so SQLite uses default NULL
    // This avoids drizzle-orm serializing null as empty string in bulk inserts
    const records = dismissals.map((dismissal) => ({
      workspaceId,
      payeeId: dismissal.payeeId ?? 0, // Use 0 as placeholder if no payee matched
      fromCategoryId: dismissal.dismissedCategoryId,
      // toCategoryId omitted - will be NULL (indicates dismissal, no replacement category)
      correctionTrigger: "import_dismissal" as const,
      transactionAmount: dismissal.amount ?? null, // Explicit null for optional fields
      transactionDate: dismissal.date ?? null,
      correctionWeight: 0.8, // Significant negative weight for dismissals
      isProcessed: false,
      learningEpoch: 1,
      isOverride: false, // Explicitly set to avoid default value issues in bulk insert
    }));

    // Filter out records without valid payeeId (can't learn without payee context)
    const validRecords = records.filter((r) => r.payeeId !== 0);

    if (validRecords.length > 0) {
      // Insert records one at a time to handle any constraint errors gracefully
      // This is slower but ensures partial success if some records have invalid references
      let successCount = 0;
      const errors: Array<{ record: (typeof validRecords)[0]; error: string }> = [];

      for (const record of validRecords) {
        try {
          await db.insert(payeeCategoryCorrections).values(record);
          successCount++;
        } catch (insertError) {
          // Log the specific error for debugging
          const errorMsg =
            insertError instanceof Error ? insertError.message : String(insertError);
          errors.push({ record, error: errorMsg });
          // Continue with other records - don't let one failure stop all learning
        }
      }

      if (errors.length > 0) {
        logger.warn("Some category dismissals failed to record", {
          successCount,
          errorCount: errors.length,
          sampleErrors: errors.slice(0, 3).map((e) => ({
            payeeId: e.record.payeeId,
            categoryId: e.record.fromCategoryId,
            error: e.error.substring(0, 100),
          })),
        });
      }
    }

    // Also reduce confidence in category aliases for payee→category mappings
    // This affects the raw string → category alias system
    // IMPORTANT: Use rawPayeeString (original import string) to match what infer-categories uses
    const categoryAliasService = getCategoryAliasService();
    const aliasResult = await categoryAliasService.bulkRecordDismissals(
      dismissals.map((d) => ({
        rawString: d.rawPayeeString,
        categoryId: d.dismissedCategoryId,
      })),
      workspaceId
    );

    logger.debug("Recorded category dismissals", {
      correctionsRecorded: validRecords.length,
      correctionsSkipped: records.length - validRecords.length,
      aliasesUpdated: aliasResult.aliasesUpdated,
    });
  }
}
