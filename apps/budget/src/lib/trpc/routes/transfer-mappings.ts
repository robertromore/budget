import { getTransferMappingService } from "$lib/server/domains/transfers";
import { publicProcedure, rateLimitedProcedure, t } from "$lib/trpc";
import { withErrorHandler } from "$lib/trpc/shared/errors";
import { z } from "zod";

const mappingService = getTransferMappingService();

// Input schemas
const createMappingSchema = z.object({
  rawPayeeString: z.string().min(1, "Payee string is required"),
  targetAccountId: z.number().int().positive("Target account ID is required"),
  sourceAccountId: z.number().int().positive().optional(),
});

const updateMappingSchema = z.object({
  id: z.number().int().positive(),
  rawPayeeString: z.string().min(1).optional(),
  targetAccountId: z.number().int().positive().optional(),
});

const mappingIdSchema = z.object({
  id: z.number().int().positive(),
});

const accountIdSchema = z.object({
  targetAccountId: z.number().int().positive(),
});

const sourceAccountIdSchema = z.object({
  sourceAccountId: z.number().int().positive(),
});

const bulkCreateSchema = z.object({
  mappings: z.array(
    z.object({
      rawPayeeString: z.string().min(1),
      targetAccountId: z.number().int().positive(),
      sourceAccountId: z.number().int().positive().optional(),
    })
  ),
});

const recordFromImportSchema = z.object({
  rawPayeeString: z.string().min(1),
  targetAccountId: z.number().int().positive(),
  sourceAccountId: z.number().int().positive().optional(),
});

const findTransferSchema = z.object({
  rawPayeeString: z.string().min(1),
});

export const transferMappingRoutes = t.router({
  /**
   * Get all mappings in the workspace with account details
   */
  all: publicProcedure.query(
    withErrorHandler(async ({ ctx }) => {
      return await mappingService.getAllMappingsWithAccounts(ctx.workspaceId);
    })
  ),

  /**
   * Get a single mapping by ID
   */
  get: publicProcedure.input(mappingIdSchema).query(
    withErrorHandler(async ({ input, ctx }) => {
      return await mappingService.getMapping(input.id, ctx.workspaceId);
    })
  ),

  /**
   * Get all mappings for a specific target account
   */
  forAccount: publicProcedure.input(accountIdSchema).query(
    withErrorHandler(async ({ input, ctx }) => {
      return await mappingService.getMappingsForAccount(
        input.targetAccountId,
        ctx.workspaceId
      );
    })
  ),

  /**
   * Get all mappings from a specific source account (where imports happened)
   * Returns mappings with target account details
   */
  fromAccount: publicProcedure.input(sourceAccountIdSchema).query(
    withErrorHandler(async ({ input, ctx }) => {
      return await mappingService.getMappingsFromAccount(
        input.sourceAccountId,
        ctx.workspaceId
      );
    })
  ),

  /**
   * Find which account a payee string should transfer to
   */
  findTransfer: publicProcedure.input(findTransferSchema).query(
    withErrorHandler(async ({ input, ctx }) => {
      return await mappingService.findTransferMapping(
        input.rawPayeeString,
        ctx.workspaceId
      );
    })
  ),

  /**
   * Create a manual mapping
   */
  create: rateLimitedProcedure.input(createMappingSchema).mutation(
    withErrorHandler(async ({ input, ctx }) => {
      return await mappingService.createManualMapping(
        input.rawPayeeString,
        input.targetAccountId,
        ctx.workspaceId,
        input.sourceAccountId
      );
    })
  ),

  /**
   * Record a mapping from import confirmation
   */
  recordFromImport: rateLimitedProcedure.input(recordFromImportSchema).mutation(
    withErrorHandler(async ({ input, ctx }) => {
      return await mappingService.recordMappingFromImport(
        input.rawPayeeString,
        input.targetAccountId,
        ctx.workspaceId,
        input.sourceAccountId
      );
    })
  ),

  /**
   * Bulk create mappings (typically at end of import)
   */
  bulkCreate: rateLimitedProcedure.input(bulkCreateSchema).mutation(
    withErrorHandler(async ({ input, ctx }) => {
      return await mappingService.bulkRecordMappings(input.mappings, ctx.workspaceId);
    })
  ),

  /**
   * Update a mapping
   */
  update: rateLimitedProcedure.input(updateMappingSchema).mutation(
    withErrorHandler(async ({ input, ctx }) => {
      const { id, ...data } = input;
      return await mappingService.updateMapping(id, data, ctx.workspaceId);
    })
  ),

  /**
   * Delete a mapping
   */
  delete: rateLimitedProcedure.input(mappingIdSchema).mutation(
    withErrorHandler(async ({ input, ctx }) => {
      await mappingService.deleteMapping(input.id, ctx.workspaceId);
      return { success: true };
    })
  ),

  /**
   * Delete all mappings for a target account
   */
  deleteForAccount: rateLimitedProcedure.input(accountIdSchema).mutation(
    withErrorHandler(async ({ input, ctx }) => {
      const count = await mappingService.deleteMappingsForAccount(
        input.targetAccountId,
        ctx.workspaceId
      );
      return { success: true, deletedCount: count };
    })
  ),

  /**
   * Get mapping statistics for the workspace
   */
  stats: publicProcedure.query(
    withErrorHandler(async ({ ctx }) => {
      return await mappingService.getStats(ctx.workspaceId);
    })
  ),
});
