/**
 * Import Cleanup tRPC Routes
 *
 * Routes for payee cleanup and category suggestions during import.
 */

import { createPayeeGrouper, createCategorySuggester } from "$lib/server/import/cleanup";
import { serviceFactory } from "$lib/server/shared/container/service-factory";
import { publicProcedure, t } from "$lib/trpc";
import { translateDomainError } from "$lib/trpc/shared/errors";
import { z } from "zod/v4";

// Input schemas
const payeeGroupInputSchema = z.object({
  rowIndex: z.number().int(),
  payeeName: z.string(),
  originalPayee: z.string().optional(), // Raw CSV payee string for alias tracking
});

const analyzePayeesSchema = z.object({
  rows: z.array(payeeGroupInputSchema),
});

const categorySuggestInputSchema = z.object({
  rowIndex: z.number().int(),
  payeeName: z.string(),
  rawPayeeString: z.string().optional(),
  amount: z.number(),
  date: z.string(),
  memo: z.string().optional(),
});

const suggestCategoriesSchema = z.object({
  rows: z.array(categorySuggestInputSchema),
});

const payeeGrouperConfigSchema = z.object({
  groupingThreshold: z.number().min(0).max(1).optional(),
  existingMatchThreshold: z.number().min(0).max(1).optional(),
  autoAcceptThreshold: z.number().min(0).max(1).optional(),
}).optional();

const categorySuggesterConfigSchema = z.object({
  minConfidence: z.number().min(0).max(1).optional(),
  autoFillThreshold: z.number().min(0).max(1).optional(),
  maxSuggestions: z.number().int().min(1).max(10).optional(),
}).optional();

export const importCleanupRoutes = t.router({
  /**
   * Analyze payees for cleanup suggestions
   * Groups similar payees and matches to existing ones
   */
  analyzePayees: publicProcedure
    .input(analyzePayeesSchema.extend({ config: payeeGrouperConfigSchema }))
    .mutation(async ({ input, ctx }) => {
      try {
        const payeeService = serviceFactory.getPayeeService();
        const existingPayees = await payeeService.getAllPayees(ctx.workspaceId);

        const grouper = createPayeeGrouper(input.config);
        const result = await grouper.analyzePayees(input.rows, existingPayees, ctx.workspaceId);

        return result;
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  /**
   * Get category suggestions for import rows
   */
  suggestCategories: publicProcedure
    .input(suggestCategoriesSchema.extend({ config: categorySuggesterConfigSchema }))
    .mutation(async ({ input, ctx }) => {
      try {
        const suggester = createCategorySuggester(input.config);
        const result = await suggester.suggestCategories(ctx.workspaceId, input.rows);

        return result;
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  /**
   * Analyze payees and suggest categories in one call (convenience method)
   */
  analyzeImport: publicProcedure
    .input(
      z.object({
        rows: z.array(
          z.object({
            rowIndex: z.number().int(),
            payeeName: z.string(),
            originalPayee: z.string().optional(), // Raw CSV payee string for alias tracking
            amount: z.number().optional(), // Some rows may not have amounts
            date: z.string().optional(), // Some rows may not have dates
            memo: z.string().optional(),
          })
        ),
        payeeGrouperConfig: payeeGrouperConfigSchema,
        categorySuggesterConfig: categorySuggesterConfigSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const payeeService = serviceFactory.getPayeeService();
        const existingPayees = await payeeService.getAllPayees(ctx.workspaceId);

        // Run both analyses in parallel
        const grouper = createPayeeGrouper(input.payeeGrouperConfig);
        const suggester = createCategorySuggester(input.categorySuggesterConfig);

        // Filter rows for category suggestions - only include rows with amount and date
        const rowsForCategorySuggestion = input.rows
          .filter((r): r is typeof r & { amount: number; date: string } =>
            r.amount !== undefined && r.date !== undefined
          )
          .map((row) => ({
            rowIndex: row.rowIndex,
            payeeName: row.payeeName,
            rawPayeeString: row.originalPayee,
            amount: row.amount,
            date: row.date,
            memo: row.memo,
          }));

        const [payeeResult, categoryResult] = await Promise.all([
          grouper.analyzePayees(
            input.rows.map((r) => ({
              rowIndex: r.rowIndex,
              payeeName: r.payeeName,
              originalPayee: r.originalPayee, // Pass through for alias tracking
            })),
            existingPayees,
            ctx.workspaceId // Pass workspace ID for saved alias/mapping lookup
          ),
          suggester.suggestCategories(ctx.workspaceId, rowsForCategorySuggestion),
        ]);

        return {
          payeeGroups: payeeResult.groups,
          payeeStats: payeeResult.stats,
          categorySuggestions: categoryResult.suggestions,
          categoryStats: categoryResult.stats,
        };
      } catch (error) {
        throw translateDomainError(error);
      }
    }),
});
