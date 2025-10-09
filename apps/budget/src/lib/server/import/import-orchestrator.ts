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
            selectedEntities
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
    }
  ): Promise<z.infer<typeof selectTransactionSchema> | null> {
    const normalized = row.normalizedData;

    // Match or create payee
    let payeeId: number | null = null;
    if (normalized['payee']) {
      const cleanedPayeeName = this.payeeMatcher.cleanPayeeName(normalized['payee']);
      const payeeMatch = this.payeeMatcher.findBestMatch(cleanedPayeeName, existingPayees);

      // Only use matches with medium or higher confidence
      if (payeeMatch.payee && (payeeMatch.confidence === 'exact' || payeeMatch.confidence === 'high' || payeeMatch.confidence === 'medium')) {
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
          }
        } else {
        }
      }
    }

    // Match or create category
    let categoryId: number | null = null;
    if (normalized['category'] || normalized['payee'] || normalized['description']) {
      const categoryMatch = this.categoryMatcher.findBestMatch(
        {
          categoryName: normalized['category'],
          payeeName: normalized['payee'],
          description: normalized['description'],
        },
        existingCategories
      );

      if (categoryMatch.category) {
        categoryId = categoryMatch.category.id;
      } else if (normalized['category'] && (_options.createMissingCategories ?? _options.createMissingEntities)) {
        // Check if this category is in the selected entities list
        const isSelected = !selectedEntities || selectedEntities.categories.includes(normalized['category']);

        if (isSelected) {
          // Create new category with slug
          const slug = normalized['category']
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

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
          }
        } else {
        }
      } else if (!normalized['category'] && (_options.createMissingCategories ?? _options.createMissingEntities)) {
        // No explicit category provided, use inferred category if available, otherwise infer
        const suggestedCategoryName = normalized['inferredCategory'] || this.categoryMatcher.suggestCategoryName({
          payeeName: normalized['payee'],
          description: normalized['description'],
        });

        if (suggestedCategoryName) {
          // Check if this suggested category already exists
          const existingCategory = existingCategories.find(
            (c) => c.name?.toLowerCase() === suggestedCategoryName.toLowerCase()
          );

          if (existingCategory) {
            categoryId = existingCategory.id;
          } else {
            // Check if this inferred category is in the selected entities list
            const isSelected = !selectedEntities || selectedEntities.categories.includes(suggestedCategoryName);

            if (isSelected) {
              // Create the suggested category
              const slug = suggestedCategoryName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');

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

    const [transaction] = await db
      .insert(transactionTable)
      .values({
        accountId,
        amount,
        date: normalized['date'] || new Date().toISOString().split('T')[0],
        payeeId,
        categoryId,
        notes: normalized['description'] || '',
        status: normalized['status'] || 'cleared',
      })
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
