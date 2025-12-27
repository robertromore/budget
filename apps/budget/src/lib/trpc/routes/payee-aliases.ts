import { getPayeeAliasService } from "$lib/server/domains/payees/alias-service";
import { publicProcedure, rateLimitedProcedure, t } from "$lib/trpc";
import { withErrorHandler } from "$lib/trpc/shared/errors";
import { z } from "zod";

const aliasService = getPayeeAliasService();

// Input schemas
const createAliasSchema = z.object({
  rawString: z.string().min(1, "Raw string is required"),
  payeeId: z.number().int().positive("Payee ID is required"),
});

const updateAliasSchema = z.object({
  id: z.number().int().positive(),
  rawString: z.string().min(1).optional(),
  payeeId: z.number().int().positive().optional(),
});

const aliasIdSchema = z.object({
  id: z.number().int().positive(),
});

const payeeIdSchema = z.object({
  payeeId: z.number().int().positive(),
});

const bulkCreateSchema = z.object({
  aliases: z.array(
    z.object({
      rawString: z.string().min(1),
      payeeId: z.number().int().positive(),
      sourceAccountId: z.number().int().positive().optional(),
    })
  ),
});

const recordFromImportSchema = z.object({
  rawString: z.string().min(1),
  payeeId: z.number().int().positive(),
  accountId: z.number().int().positive().optional(),
});

const recordFromTransactionEditSchema = z.object({
  rawString: z.string().min(1),
  payeeId: z.number().int().positive(),
});

const findPayeeSchema = z.object({
  rawString: z.string().min(1),
});

const mergeAliasesSchema = z.object({
  sourcePayeeId: z.number().int().positive(),
  targetPayeeId: z.number().int().positive(),
});

export const payeeAliasRoutes = t.router({
  /**
   * Get all aliases in the workspace with payee details
   */
  all: publicProcedure.query(
    withErrorHandler(async ({ ctx }) => {
      return await aliasService.getAllAliasesWithPayees(ctx.workspaceId);
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
   * Get all aliases for a specific payee
   */
  forPayee: publicProcedure.input(payeeIdSchema).query(
    withErrorHandler(async ({ input, ctx }) => {
      return await aliasService.getAliasesForPayee(input.payeeId, ctx.workspaceId);
    })
  ),

  /**
   * Find which payee a raw string maps to
   */
  findPayee: publicProcedure.input(findPayeeSchema).query(
    withErrorHandler(async ({ input, ctx }) => {
      return await aliasService.findPayeeByAlias(input.rawString, ctx.workspaceId);
    })
  ),

  /**
   * Create a manual alias
   */
  create: rateLimitedProcedure.input(createAliasSchema).mutation(
    withErrorHandler(async ({ input, ctx }) => {
      return await aliasService.createManualAlias(
        input.rawString,
        input.payeeId,
        ctx.workspaceId
      );
    })
  ),

  /**
   * Record an alias from import confirmation
   */
  recordFromImport: rateLimitedProcedure.input(recordFromImportSchema).mutation(
    withErrorHandler(async ({ input, ctx }) => {
      return await aliasService.recordAliasFromImport(
        input.rawString,
        input.payeeId,
        ctx.workspaceId,
        input.accountId
      );
    })
  ),

  /**
   * Record an alias from transaction edit
   */
  recordFromTransactionEdit: rateLimitedProcedure
    .input(recordFromTransactionEditSchema)
    .mutation(
      withErrorHandler(async ({ input, ctx }) => {
        return await aliasService.recordAliasFromTransactionEdit(
          input.rawString,
          input.payeeId,
          ctx.workspaceId
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
   * Delete all aliases for a payee
   */
  deleteForPayee: rateLimitedProcedure.input(payeeIdSchema).mutation(
    withErrorHandler(async ({ input, ctx }) => {
      const count = await aliasService.deleteAliasesForPayee(
        input.payeeId,
        ctx.workspaceId
      );
      return { success: true, deletedCount: count };
    })
  ),

  /**
   * Merge aliases from one payee to another
   */
  merge: rateLimitedProcedure.input(mergeAliasesSchema).mutation(
    withErrorHandler(async ({ input, ctx }) => {
      const count = await aliasService.mergeAliases(
        input.sourcePayeeId,
        input.targetPayeeId,
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
