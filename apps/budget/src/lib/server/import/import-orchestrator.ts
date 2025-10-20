/**
 * Import Orchestrator
 *
 * Coordinates the entire import process from validation through entity matching
 * to transaction creation. Provides progress tracking and error handling.
 */

import type { ImportRow, ImportResult, ImportOptions } from '$lib/types/import';
import type { selectTransactionSchema } from '$lib/schema/transactions';
import type { Payee } from '$lib/schema/payees';
import type { Category } from '$lib/schema/categories';
import type { z } from 'zod/v4';
import { TransactionValidator } from './validators/transaction-validator';
import { PayeeMatcher } from './matchers/payee-matcher';
import { CategoryMatcher } from './matchers/category-matcher';
import { db } from '$lib/server/db';
import { transactions as transactionTable } from '$lib/schema/transactions';
import { payees as payeeTable } from '$lib/schema/payees';
import { categories as categoryTable } from '$lib/schema/categories';
import { eq, and, isNull } from 'drizzle-orm';

export interface ImportProgress {
  stage: 'validating' | 'matching' | 'creating' | 'complete';
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

export class ImportOrchestrator {
  private validator: TransactionValidator;
  private payeeMatcher: PayeeMatcher;
  private categoryMatcher: CategoryMatcher;

  constructor() {
    this.validator = new TransactionValidator();
    this.payeeMatcher = new PayeeMatcher();
    this.categoryMatcher = new CategoryMatcher();
  }

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
    }
  ): Promise<ImportResult> {

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
    };

    console.log('=== IMPORT ORCHESTRATOR DEBUG ===');
    console.log('Selected entities - categories:', selectedEntities?.categories || 'ALL (no filter)');
    console.log('Options:', options);

    try {
      // Stage 1: Validation
      const existingTransactions = await this.getExistingTransactions(accountId);
      const validatedRows = this.validator.validateRows(rows, existingTransactions);

      // Collect validation errors and warnings
      validatedRows.forEach((row) => {
        if (row.validationErrors) {
          row.validationErrors.forEach((error) => {
            if (error.severity === 'error') {
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
      const rowsToImport = options.allowPartialImport
        ? validatedRows.filter((row) => row.validationStatus !== 'invalid')
        : validatedRows.filter((row) => row.validationStatus === 'valid');

      if (rowsToImport.length === 0) {
        return result;
      }

      // Stage 2: Entity Matching
      const existingPayees = await this.getExistingPayees();
      const existingCategories = await this.getExistingCategories();

      // Stage 3: Transaction Creation
      for (const row of rowsToImport) {
        try {
          const transaction = await this.createTransaction(
            accountId,
            row,
            existingPayees,
            existingCategories,
            options,
            selectedEntities,
            result.entitiesCreated
          );

          if (transaction) {
            result.transactionsCreated++;
          }
        } catch (error) {
          result.errors.push({
            row: row.rowIndex,
            field: 'general',
            message: error instanceof Error ? error.message : 'Failed to create transaction',
          });
        }
      }

      // Update summary
      const validationSummary = this.validator.getValidationSummary(validatedRows);
      result.summary = {
        totalRows: rows.length,
        validRows: validationSummary.valid,
        invalidRows: validationSummary.invalid,
        skippedRows: rows.length - rowsToImport.length,
      };

      if (result.errors.length > 0) {
        result.success = false;
      }

      return result;
    } catch (error) {
      throw new Error(
        `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create a transaction from an import row
   */
  private async createTransaction(
    accountId: number,
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
    }
  ): Promise<z.infer<typeof selectTransactionSchema> | null> {
    const normalized = row.normalizedData;

    // Match or create payee
    let payeeId: number | null = null;
    let payeeDetails: string | null = null;
    if (normalized['payee']) {
      // Normalize the payee name and extract details
      const { name: cleanedPayeeName, details } = this.payeeMatcher.normalizePayeeName(normalized['payee']);
      payeeDetails = details;

      const payeeMatch = this.payeeMatcher.findBestMatch(cleanedPayeeName, existingPayees);

      // Only use matches with high or exact confidence to avoid merging similar but distinct payees
      // (e.g., "The Home Depot" and "The Food Depot" are 71% similar but should be separate)
      if (payeeMatch.payee && (payeeMatch.confidence === 'exact' || payeeMatch.confidence === 'high')) {
        payeeId = payeeMatch.payee.id;
      } else if (_options.createMissingPayees ?? _options.createMissingEntities) {
        // Check if this payee is in the selected entities list
        const isSelected = !selectedEntities || selectedEntities.payees.includes(cleanedPayeeName);

        if (isSelected) {
          // Create new payee with slug
          const slug = cleanedPayeeName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

          const [newPayee] = await db
            .insert(payeeTable)
            .values({
              name: cleanedPayeeName,
              slug,
            })
            .returning();

          if (newPayee) {
            payeeId = newPayee.id;
            existingPayees.push(newPayee);
            if (entitiesCreated) entitiesCreated.payees++;
          }
        } else {
        }
      }
    }

    // Match or create category
    let categoryId: number | null = null;
    if (normalized['category'] || normalized['payee'] || normalized['description']) {
      // If explicit category is provided, try exact match first
      let categoryMatch: any = null;
      if (normalized['category']) {
        // Check for exact name match only (case-insensitive)
        const exactMatch = existingCategories.find(
          c => c.name?.toLowerCase() === normalized['category'].toLowerCase()
        );
        if (exactMatch) {
          categoryId = exactMatch.id;
        }
      }

      // If no explicit category or no exact match found, use fuzzy matching
      if (!categoryId && !normalized['category']) {
        categoryMatch = this.categoryMatcher.findBestMatch(
          {
            categoryName: normalized['category'],
            payeeName: normalized['payee'],
            description: normalized['description'],
          },
          existingCategories
        );
        if (categoryMatch.category) {
          categoryId = categoryMatch.category.id;
        }
      }

      // If still no match and explicit category provided, try to create it
      if (!categoryId && normalized['category'] && normalized['category'].toLowerCase() !== 'uncategorized' && (_options.createMissingCategories ?? _options.createMissingEntities)) {
        // Skip "Uncategorized" - it's just a placeholder for no category
        // Check if this category is in the selected entities list (case-insensitive)
        const normalizedCategoryName = normalized['category'].trim();
        const isSelected = !selectedEntities || selectedEntities.categories.some(
          selected => selected.trim().toLowerCase() === normalizedCategoryName.toLowerCase()
        );

        console.log(`Category "${normalizedCategoryName}" - isSelected: ${isSelected}`, {
          selectedEntities: selectedEntities?.categories,
          matches: selectedEntities?.categories.map(s => ({
            selected: s,
            match: s.trim().toLowerCase() === normalizedCategoryName.toLowerCase()
          }))
        });

        if (isSelected) {
          console.log(`Creating category: "${normalized['category']}"`);
          // Create new category with slug
          const slug = normalized['category']
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

          // Check if category with this slug already exists (could be from soft-deleted or previous import)
          const existingBySlug = existingCategories.find(c => c.slug === slug);
          if (existingBySlug) {
            console.log(`Category with slug "${slug}" already exists (ID: ${existingBySlug.id}), using existing`);
            categoryId = existingBySlug.id;
          } else {
            try {
              const [newCategory] = await db
                .insert(categoryTable)
                .values({
                  name: normalized['category'],
                  slug,
                })
                .returning();

              if (newCategory) {
                categoryId = newCategory.id;
                existingCategories.push(newCategory);
                if (entitiesCreated) entitiesCreated.categories++;
                console.log(`Successfully created category: "${newCategory.name}" with ID ${newCategory.id}`);
              }
            } catch (error) {
              console.error(`Failed to create category "${normalized['category']}":`, error);
              // If it failed due to unique constraint, check for soft-deleted category
              const existing = await db.select().from(categoryTable).where(eq(categoryTable.slug, slug)).limit(1);
              if (existing && existing.length > 0) {
                const category = existing[0];
                if (category.deletedAt) {
                  // Restore soft-deleted category
                  console.log(`Restoring soft-deleted category "${category.name}" (slug: ${slug})`);
                  const [restored] = await db
                    .update(categoryTable)
                    .set({ deletedAt: null, name: normalized['category'] })
                    .where(eq(categoryTable.id, category.id))
                    .returning();
                  if (restored) {
                    categoryId = restored.id;
                    existingCategories.push(restored);
                    if (entitiesCreated) entitiesCreated.categories++;
                    console.log(`Successfully restored category: "${restored.name}" with ID ${restored.id}`);
                  }
                } else {
                  console.log(`Found existing active category with slug "${slug}", using it`);
                  categoryId = category.id;
                  existingCategories.push(category);
                }
              }
            }
          }
        } else {
          console.log(`Skipping category "${normalizedCategoryName}" - not in selectedEntities`);
        }
      } else if (!normalized['category'] && (_options.createMissingCategories ?? _options.createMissingEntities)) {
        // No explicit category provided, use inferred category if available, otherwise infer
        const suggestedCategoryName = normalized['inferredCategory'] || this.categoryMatcher.suggestCategoryName({
          payeeName: normalized['payee'],
          description: normalized['description'],
        });

        // Skip "Uncategorized" - it's just a placeholder
        if (suggestedCategoryName && suggestedCategoryName.toLowerCase() !== 'uncategorized') {
          // Check if this suggested category already exists
          const existingCategory = existingCategories.find(
            (c) => c.name?.toLowerCase() === suggestedCategoryName.toLowerCase()
          );

          if (existingCategory) {
            categoryId = existingCategory.id;
          } else {
            // Check if this inferred category is in the selected entities list (case-insensitive)
            const isSelected = !selectedEntities || selectedEntities.categories.some(
              selected => selected.trim().toLowerCase() === suggestedCategoryName.trim().toLowerCase()
            );

            if (isSelected) {
              // Create the suggested category
              const slug = suggestedCategoryName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');

              // Check if category with this slug already exists
              const existingBySlug = existingCategories.find(c => c.slug === slug);
              if (existingBySlug) {
                categoryId = existingBySlug.id;
              } else {
                try {
                  const [newCategory] = await db
                    .insert(categoryTable)
                    .values({
                      name: suggestedCategoryName,
                      slug,
                    })
                    .returning();

                  if (newCategory) {
                    categoryId = newCategory.id;
                    existingCategories.push(newCategory);
                    if (entitiesCreated) entitiesCreated.categories++;
                  }
                } catch (error) {
                  console.error(`Failed to create inferred category "${suggestedCategoryName}":`, error);
                  // Check for soft-deleted category
                  const existing = await db.select().from(categoryTable).where(eq(categoryTable.slug, slug)).limit(1);
                  if (existing && existing.length > 0) {
                    const category = existing[0];
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
    let amount = normalized['amount'] || 0;

    // Reverse amount sign if option is enabled
    if (_options.reverseAmountSigns) {
      amount = -amount;
    }

    // Combine description with extracted payee details
    let notes = normalized['description'] || '';
    if (payeeDetails) {
      notes = notes ? `${notes} (${payeeDetails})` : payeeDetails;
    }

    // Prepare import metadata
    const importMetadata: any = {
      accountId,
      amount,
      date: normalized['date'] || new Date().toISOString().split('T')[0],
      payeeId,
      categoryId,
      notes,
      status: normalized['status'] || 'cleared',
    };

    // Add import metadata if this was an imported transaction
    if (_options.fileName) {
      importMetadata.importedFrom = _options.fileName;
      importMetadata.importedAt = new Date().toISOString();
    }

    // Store original payee name if it was normalized
    if (normalized['originalPayee'] && normalized['originalPayee'] !== normalized['payee']) {
      importMetadata.originalPayeeName = normalized['originalPayee'];
    }

    // Store original category name if provided in import
    if (normalized['category']) {
      importMetadata.originalCategoryName = normalized['category'];
    }

    // Store inferred category if it was auto-categorized
    if (normalized['inferredCategory']) {
      importMetadata.inferredCategory = normalized['inferredCategory'];
    }

    // Store additional import details (transaction IDs, location, etc.)
    if (payeeDetails) {
      const detailsObj: any = { extractedDetails: payeeDetails };
      if (normalized['fitid']) {
        detailsObj.fitid = normalized['fitid'];
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
          payeeNormalized: !!normalized['payee'],
          categoryMatched: !!categoryId,
          payeeDetailsExtracted: !!payeeDetails,
        }
      };
      importMetadata.rawImportData = JSON.stringify(rawImportSnapshot);
    }

    const [transaction] = await db
      .insert(transactionTable)
      .values(importMetadata)
      .returning();

    return transaction || null;
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
  private async getExistingPayees(): Promise<Payee[]> {
    return db.select().from(payeeTable).where(isNull(payeeTable.deletedAt));
  }

  /**
   * Get existing categories for matching
   */
  private async getExistingCategories(): Promise<Category[]> {
    return db.select().from(categoryTable).where(isNull(categoryTable.deletedAt));
  }

  /**
   * Get import progress (for future real-time updates)
   */
  getProgress(): ImportProgress {
    return {
      stage: 'validating',
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
    // Validation
    const existingTransactions = await this.getExistingTransactions(accountId);
    const validatedRows = this.validator.validateRows(rows, existingTransactions);

    const summary = this.validator.getValidationSummary(validatedRows);

    // Entity matching preview
    const existingPayees = await this.getExistingPayees();
    const existingCategories = await this.getExistingCategories();

    const potentialPayees: { name: string; match: string | null }[] = [];
    const potentialCategories: { name: string; match: string | null }[] = [];

    validatedRows
      .filter((row) => row.validationStatus !== 'invalid')
      .forEach((row) => {
        const normalized = row.normalizedData;

        // Check payee
        if (normalized['payee']) {
          const cleanedPayeeName = this.payeeMatcher.cleanPayeeName(normalized['payee']);
          const payeeMatch = this.payeeMatcher.findBestMatch(cleanedPayeeName, existingPayees);

          if (!potentialPayees.some((p) => p.name === cleanedPayeeName)) {
            potentialPayees.push({
              name: cleanedPayeeName,
              match: payeeMatch.payee?.name || null,
            });
          }
        }

        // Check category
        if (normalized['category']) {
          const categoryMatch = this.categoryMatcher.findBestMatch(
            {
              categoryName: normalized['category'],
              payeeName: normalized['payee'],
              description: normalized['description'],
            },
            existingCategories
          );

          if (!potentialCategories.some((c) => c.name === normalized['category'])) {
            potentialCategories.push({
              name: normalized['category'],
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
}
