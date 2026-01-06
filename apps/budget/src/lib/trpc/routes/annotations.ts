import { serviceFactory } from "$lib/server/shared/container/service-factory";
import { publicProcedure, t } from "$lib/trpc";
import { translateDomainError } from "$lib/trpc/shared/errors";
import { z } from "zod";

const annotationService = serviceFactory.getAnnotationService();

// Input schemas
const annotationIdSchema = z.object({
  id: z.number().int().positive(),
});

const createAnnotationSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"),
  accountId: z.number().int().positive().optional(),
  categoryId: z.number().int().positive().optional(),
  note: z.string().max(500).optional().nullable(),
  flaggedForReview: z.boolean().optional().default(false),
  tags: z.array(z.string()).max(10).optional().default([]),
});

const bulkCreateAnnotationSchema = z.object({
  months: z
    .array(z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"))
    .min(1, "At least one month is required"),
  accountId: z.number().int().positive().optional(),
  categoryId: z.number().int().positive().optional(),
  note: z.string().max(500).optional().nullable(),
  flaggedForReview: z.boolean().optional().default(false),
  tags: z.array(z.string()).max(10).optional().default([]),
});

const updateAnnotationSchema = z.object({
  id: z.number().int().positive(),
  note: z.string().max(500).optional().nullable(),
  flaggedForReview: z.boolean().optional(),
  tags: z.array(z.string()).max(10).optional(),
});

const getByMonthsSchema = z.object({
  months: z.array(z.string().regex(/^\d{4}-\d{2}$/)),
  accountId: z.number().int().positive().optional(),
});

const getByAccountSchema = z.object({
  accountId: z.number().int().positive(),
});

const quickFlagSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"),
  accountId: z.number().int().positive().optional(),
});

export const annotationRoutes = t.router({
  // List all annotations for the workspace
  list: publicProcedure.query(async ({ ctx }) => {
    try {
      return await annotationService.getAnnotations(ctx.workspaceId);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  // Get a single annotation by ID
  get: publicProcedure.input(annotationIdSchema).query(async ({ input, ctx }) => {
    try {
      return await annotationService.getAnnotationById(input.id, ctx.workspaceId);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  // Get annotations for specific months
  getByMonths: publicProcedure.input(getByMonthsSchema).query(async ({ input, ctx }) => {
    try {
      return await annotationService.getAnnotationsForMonths(
        input.months,
        ctx.workspaceId,
        input.accountId
      );
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  // Get annotations for an account
  getByAccount: publicProcedure.input(getByAccountSchema).query(async ({ input, ctx }) => {
    try {
      return await annotationService.getAnnotationsForAccount(input.accountId, ctx.workspaceId);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  // Get all flagged annotations
  getFlagged: publicProcedure.query(async ({ ctx }) => {
    try {
      return await annotationService.getFlaggedAnnotations(ctx.workspaceId);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  // Create or update an annotation
  upsert: publicProcedure.input(createAnnotationSchema).mutation(async ({ input, ctx }) => {
    try {
      return await annotationService.createOrUpdateAnnotation(input, ctx.workspaceId);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  // Create annotations for multiple months
  bulkCreate: publicProcedure.input(bulkCreateAnnotationSchema).mutation(async ({ input, ctx }) => {
    try {
      return await annotationService.createBulkAnnotations(input, ctx.workspaceId);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  // Update an annotation
  update: publicProcedure.input(updateAnnotationSchema).mutation(async ({ input, ctx }) => {
    try {
      const { id, ...data } = input;
      return await annotationService.updateAnnotation(id, data, ctx.workspaceId);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  // Delete an annotation
  delete: publicProcedure.input(annotationIdSchema).mutation(async ({ input, ctx }) => {
    try {
      await annotationService.deleteAnnotation(input.id, ctx.workspaceId);
      return { success: true };
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  // Toggle flag status
  toggleFlag: publicProcedure.input(annotationIdSchema).mutation(async ({ input, ctx }) => {
    try {
      return await annotationService.toggleFlag(input.id, ctx.workspaceId);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  // Quick flag a month (creates minimal annotation with just flag set)
  quickFlag: publicProcedure.input(quickFlagSchema).mutation(async ({ input, ctx }) => {
    try {
      return await annotationService.quickFlag(input.month, ctx.workspaceId, input.accountId);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),
});
