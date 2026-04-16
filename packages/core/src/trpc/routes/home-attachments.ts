import { serviceFactory } from "$core/server/shared/container/service-factory";
import { lazyService } from "$core/server/shared/container/lazy-service";
import { publicProcedure, t } from "$core/trpc";
import { translateDomainError } from "$core/trpc/shared/errors";
import { z } from "zod";

const attachmentService = lazyService(() => serviceFactory.getHomeAttachmentService());

const createSchema = z.object({
  itemId: z.number().int().positive(),
  fileName: z.string().min(1).max(255),
  fileType: z.enum(["photo", "receipt", "manual", "warranty", "other"]).optional(),
  mimeType: z.string().optional().nullable(),
  fileSize: z.number().int().optional().nullable(),
  url: z.string().min(1),
  isPrimary: z.boolean().optional(),
  notes: z.string().max(500).optional().nullable(),
});

export const homeAttachmentsRoutes = t.router({
  listByItem: publicProcedure
    .input(z.object({ itemId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      try {
        return await attachmentService.listByItem(input.itemId, ctx.workspaceId);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  create: publicProcedure.input(createSchema).mutation(async ({ input, ctx }) => {
    try {
      return await attachmentService.createAttachment(input, ctx.workspaceId);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  setPrimary: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await attachmentService.setPrimaryPhoto(input.id, ctx.workspaceId);
        return { success: true };
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await attachmentService.deleteAttachment(input.id, ctx.workspaceId);
        return { success: true };
      } catch (error) {
        throw translateDomainError(error);
      }
    }),
});
