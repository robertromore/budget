import { amountTypes } from "$lib/schema/category-aliases";
import { getCategoryAliasService } from "$lib/server/domains/categories/alias-service";
import { publicProcedure, rateLimitedProcedure, t } from "$lib/trpc";
import { withErrorHandler } from "$lib/trpc/shared/errors";
import { z } from "zod";

const aliasService = getCategoryAliasService();

// Input schemas
const createAliasSchema = z.object({
  rawString: z.string().min(1, "Raw string is required"),
  categoryId: z.number().int().positive("Category ID is required"),
  payeeId: z.number().int().positive().optional(),
  amountType: z.enum(amountTypes).optional(),
});

const updateAliasSchema = z.object({
  id: z.number().int().positive(),
  rawString: z.string().min(1).optional(),
  categoryId: z.number().int().positive().optional(),
  amountType: z.enum(amountTypes).optional(),
});

const aliasIdSchema = z.object({
  id: z.number().int().positive(),
});

const categoryIdSchema = z.object({
  categoryId: z.number().int().positive(),
});

const bulkCreateSchema = z.object({
  aliases: z.array(
    z.object({
      rawString: z.string().min(1),
      categoryId: z.number().int().positive(),
      payeeId: z.number().int().positive().optional(),
      sourceAccountId: z.number().int().positive().optional(),
      amountType: z.enum(amountTypes).optional(),
      wasAiSuggested: z.boolean().optional(),
    })
  ),
});

const recordFromImportSchema = z.object({
  rawString: z.string().min(1),
  categoryId: z.number().int().positive(),
  payeeId: z.number().int().positive().optional(),
  accountId: z.number().int().positive().optional(),
  amountType: z.enum(amountTypes).optional(),
  wasAiSuggested: z.boolean().optional(),
});

const recordFromTransactionEditSchema = z.object({
  rawString: z.string().min(1),
  categoryId: z.number().int().positive(),
  payeeId: z.number().int().positive().optional(),
  amountType: z.enum(amountTypes).optional(),
});

const findCategorySchema = z.object({
  rawString: z.string().min(1),
  payeeId: z.number().int().positive().optional(),
  amountType: z.enum(amountTypes).optional(),
});

const mergeCategoryAliasesSchema = z.object({
  sourceCategoryId: z.number().int().positive(),
  targetCategoryId: z.number().int().positive(),
});

const batchFindSchema = z.object({
  rawStrings: z.array(z.string().min(1)).max(500),
  amountType: z.enum(amountTypes).optional(),
});

const recordAiAcceptanceSchema = z.object({
  rawString: z.string().min(1),
  categoryId: z.number().int().positive(),
  payeeId: z.number().int().positive().optional(),
  amountType: z.enum(amountTypes).optional(),
  aiConfidence: z.number().min(0).max(1).optional(),
});

export const categoryAliasRoutes = t.router({
  /**
   * Get all aliases in the workspace with category details
   */
  all: publicProcedure.query(
    withErrorHandler(async ({ ctx }) => {
      return await aliasService.getAllAliasesWithCategories(ctx.workspaceId);
    })
  ),

  /**
   * Get a single alias by ID
   */
  get: publicProcedure.input(aliasIdSchema).query(
    withErrorHandler(async ({ input, ctx }) => {
      return await aliasService.getAlias(input.id, ctx.workspaceId);
    })
  ),

  /**
   * Get all aliases for a specific category
   */
  forCategory: publicProcedure.input(categoryIdSchema).query(
    withErrorHandler(async ({ input, ctx }) => {
      return await aliasService.getAliasesForCategory(input.categoryId, ctx.workspaceId);
    })
  ),

  /**
   * Find which category a raw string maps to
   */
  findCategory: publicProcedure.input(findCategorySchema).query(
    withErrorHandler(async ({ input, ctx }) => {
      return await aliasService.findCategoryByAlias(input.rawString, ctx.workspaceId, {
        payeeId: input.payeeId,
        amountType: input.amountType,
      });
    })
  ),

  /**
   * Batch find categories for multiple raw strings
   */
  batchFind: publicProcedure.input(batchFindSchema).query(
    withErrorHandler(async ({ input, ctx }) => {
      const results = await aliasService.batchFindAliases(input.rawStrings, ctx.workspaceId, {
        amountType: input.amountType,
      });
      // Convert Map to object for JSON serialization
      return Object.fromEntries(results);
    })
  ),

  /**
   * Create a manual alias
   */
  create: rateLimitedProcedure.input(createAliasSchema).mutation(
    withErrorHandler(async ({ input, ctx }) => {
      return await aliasService.createManualAlias(input.rawString, input.categoryId, ctx.workspaceId, {
        payeeId: input.payeeId,
        amountType: input.amountType,
      });
    })
  ),

  /**
   * Record an alias from import confirmation
   */
  recordFromImport: rateLimitedProcedure.input(recordFromImportSchema).mutation(
    withErrorHandler(async ({ input, ctx }) => {
      return await aliasService.recordAliasFromImport(
        input.rawString,
        input.categoryId,
        ctx.workspaceId,
        {
          payeeId: input.payeeId,
          accountId: input.accountId,
          amountType: input.amountType,
          wasAiSuggested: input.wasAiSuggested,
        }
      );
    })
  ),

  /**
   * Record an alias from transaction edit
   */
  recordFromTransactionEdit: rateLimitedProcedure.input(recordFromTransactionEditSchema).mutation(
    withErrorHandler(async ({ input, ctx }) => {
      return await aliasService.recordAliasFromTransactionEdit(
        input.rawString,
        input.categoryId,
        ctx.workspaceId,
        {
          payeeId: input.payeeId,
          amountType: input.amountType,
        }
      );
    })
  ),

  /**
   * Record when user accepts an AI category suggestion
   */
  recordAiAcceptance: rateLimitedProcedure.input(recordAiAcceptanceSchema).mutation(
    withErrorHandler(async ({ input, ctx }) => {
      return await aliasService.recordAiAcceptance(
        input.rawString,
        input.categoryId,
        ctx.workspaceId,
        {
          payeeId: input.payeeId,
          amountType: input.amountType,
          aiConfidence: input.aiConfidence,
        }
      );
    })
  ),

  /**
   * Bulk create aliases (typically at end of import)
   */
  bulkCreate: rateLimitedProcedure.input(bulkCreateSchema).mutation(
    withErrorHandler(async ({ input, ctx }) => {
      return await aliasService.bulkRecordAliases(input.aliases, ctx.workspaceId);
    })
  ),

  /**
   * Update an alias
   */
  update: rateLimitedProcedure.input(updateAliasSchema).mutation(
    withErrorHandler(async ({ input, ctx }) => {
      const { id, ...data } = input;
      return await aliasService.updateAlias(id, data, ctx.workspaceId);
    })
  ),

  /**
   * Delete an alias
   */
  delete: rateLimitedProcedure.input(aliasIdSchema).mutation(
    withErrorHandler(async ({ input, ctx }) => {
      await aliasService.deleteAlias(input.id, ctx.workspaceId);
      return { success: true };
    })
  ),

  /**
   * Delete all aliases for a category
   */
  deleteForCategory: rateLimitedProcedure.input(categoryIdSchema).mutation(
    withErrorHandler(async ({ input, ctx }) => {
      const count = await aliasService.deleteAliasesForCategory(input.categoryId, ctx.workspaceId);
      return { success: true, deletedCount: count };
    })
  ),

  /**
   * Merge aliases from one category to another
   */
  merge: rateLimitedProcedure.input(mergeCategoryAliasesSchema).mutation(
    withErrorHandler(async ({ input, ctx }) => {
      const count = await aliasService.mergeAliases(
        input.sourceCategoryId,
        input.targetCategoryId,
        ctx.workspaceId
      );
      return { success: true, mergedCount: count };
    })
  ),

  /**
   * Get alias statistics for the workspace
   */
  stats: publicProcedure.query(
    withErrorHandler(async ({ ctx }) => {
      return await aliasService.getStats(ctx.workspaceId);
    })
  ),
});
