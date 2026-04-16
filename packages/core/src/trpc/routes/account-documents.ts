import { documentTypeKeys } from "$core/schema/account-documents";
import { serviceFactory } from "$core/server/shared/container/service-factory";
import { publicProcedure, t } from "$core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

// ============================================================================
// Input Schemas
// ============================================================================

const updateDocumentSchema = z.object({
  id: z.number().positive(),
  documentType: z.enum(documentTypeKeys).optional(),
  title: z.string().max(100).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  taxYear: z.number().min(2000).max(2100).optional(),
});

// ============================================================================
// Account Documents Router
// ============================================================================

export const accountDocumentsRouter = t.router({
  // Get all documents within the caller's workspace (optionally filtered by tax year)
  getAll: publicProcedure
    .input(
      z
        .object({
          taxYear: z.number().min(2000).max(2100).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      try {
        const service = serviceFactory.getAccountDocumentService();
        if (input?.taxYear) {
          return await service.getDocumentsByTaxYear(input.taxYear, ctx.workspaceId);
        }
        // Aggregate across all workspace tax years
        const years = await service.getAvailableTaxYears(ctx.workspaceId);
        const allDocs = [];
        for (const year of years) {
          const docs = await service.getDocumentsByTaxYear(year, ctx.workspaceId);
          allDocs.push(...docs);
        }
        return allDocs;
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message || "Failed to fetch documents",
        });
      }
    }),

  // Get documents by account (workspace-verified)
  getByAccount: publicProcedure
    .input(
      z.object({
        accountId: z.number().positive(),
        taxYear: z.number().min(2000).max(2100).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const service = serviceFactory.getAccountDocumentService();
        if (input.taxYear) {
          return await service.getDocumentsByAccountAndTaxYear(
            input.accountId,
            input.taxYear,
            ctx.workspaceId
          );
        }
        return await service.getDocumentsByAccount(input.accountId, ctx.workspaceId);
      } catch (error: any) {
        throw new TRPCError({
          code: error.statusCode === 404 ? "NOT_FOUND" : "BAD_REQUEST",
          message: error.message || "Failed to fetch documents",
        });
      }
    }),

  // Get documents by tax year (workspace-scoped)
  getByTaxYear: publicProcedure
    .input(
      z.object({
        taxYear: z.number().min(2000).max(2100),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const service = serviceFactory.getAccountDocumentService();
        return await service.getDocumentsByTaxYear(input.taxYear, ctx.workspaceId);
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message || "Failed to fetch documents",
        });
      }
    }),

  // Get single document by ID (workspace-verified)
  getById: publicProcedure
    .input(z.object({ id: z.number().positive() }))
    .query(async ({ ctx, input }) => {
      try {
        const service = serviceFactory.getAccountDocumentService();
        const document = await service.getDocument(input.id, ctx.workspaceId);
        if (!document) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Document not found",
          });
        }
        return document;
      } catch (error: any) {
        throw new TRPCError({
          code: error.code || "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to fetch document",
        });
      }
    }),

  // Get available tax years within the caller's workspace
  getAvailableTaxYears: publicProcedure.query(async ({ ctx }) => {
    try {
      const service = serviceFactory.getAccountDocumentService();
      return await service.getAvailableTaxYears(ctx.workspaceId);
    } catch (error: any) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: error.message || "Failed to fetch available tax years",
      });
    }
  }),

  // Get available tax years for a specific account (workspace-verified)
  getAvailableTaxYearsForAccount: publicProcedure
    .input(z.object({ accountId: z.number().positive() }))
    .query(async ({ ctx, input }) => {
      try {
        const service = serviceFactory.getAccountDocumentService();
        return await service.getAvailableTaxYearsForAccount(input.accountId, ctx.workspaceId);
      } catch (error: any) {
        throw new TRPCError({
          code: error.statusCode === 404 ? "NOT_FOUND" : "BAD_REQUEST",
          message: error.message || "Failed to fetch available tax years for account",
        });
      }
    }),

  // Get document counts (workspace-scoped)
  getCounts: publicProcedure
    .input(
      z
        .object({
          taxYear: z.number().min(2000).max(2100).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      try {
        const service = serviceFactory.getAccountDocumentService();
        const taxYear = input?.taxYear;
        const total = await service.countDocuments(ctx.workspaceId, taxYear);
        const byType = await service.getCountByType(ctx.workspaceId, taxYear);
        return { total, byType };
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message || "Failed to fetch document counts",
        });
      }
    }),

  // Update document metadata (workspace-verified)
  update: publicProcedure.input(updateDocumentSchema).mutation(async ({ ctx, input }) => {
    try {
      const service = serviceFactory.getAccountDocumentService();
      const { id, ...data } = input;

      // Build update data conditionally for exactOptionalPropertyTypes
      const updateData: any = {};
      if (data.documentType !== undefined) updateData.documentType = data.documentType;
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.taxYear !== undefined) updateData.taxYear = data.taxYear;

      const document = await service.updateDocument(id, updateData, ctx.workspaceId);
      return document;
    } catch (error: any) {
      throw new TRPCError({
        code: error.statusCode === 404 ? "NOT_FOUND" : "BAD_REQUEST",
        message: error.message || "Failed to update document",
      });
    }
  }),

  // Delete document (soft delete, workspace-verified)
  delete: publicProcedure
    .input(z.object({ id: z.number().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const service = serviceFactory.getAccountDocumentService();
        await service.deleteDocument(input.id, ctx.workspaceId);
        return { success: true };
      } catch (error: any) {
        throw new TRPCError({
          code: error.statusCode === 404 ? "NOT_FOUND" : "BAD_REQUEST",
          message: error.message || "Failed to delete document",
        });
      }
    }),

  // Bulk delete documents (each id verified against the caller's workspace)
  bulkDelete: publicProcedure
    .input(z.object({ ids: z.array(z.number().positive()) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const service = serviceFactory.getAccountDocumentService();
        let deletedCount = 0;
        const errors: string[] = [];

        for (const id of input.ids) {
          try {
            await service.deleteDocument(id, ctx.workspaceId);
            deletedCount++;
          } catch (error: any) {
            errors.push(`Failed to delete document ${id}: ${error.message}`);
          }
        }

        return { deletedCount, errors };
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message || "Failed to delete documents",
        });
      }
    }),
});
