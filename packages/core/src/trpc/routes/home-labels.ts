import { serviceFactory } from "$core/server/shared/container/service-factory";
import { lazyService } from "$core/server/shared/container/lazy-service";
import { publicProcedure, t } from "$core/trpc";
import { translateDomainError } from "$core/trpc/shared/errors";
import { z } from "zod";

const labelService = lazyService(() => serviceFactory.getHomeLabelService());

const createLabelSchema = z.object({
  homeId: z.number().int().positive(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a valid hex color")
    .optional()
    .nullable(),
});

const updateLabelSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a valid hex color")
    .optional()
    .nullable(),
});

export const homeLabelsRoutes = t.router({
  list: publicProcedure
    .input(z.object({ homeId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      try {
        return await labelService.listLabels(input.homeId, ctx.workspaceId);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  listWithCounts: publicProcedure
    .input(z.object({ homeId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      try {
        return await labelService.listLabelsWithCounts(input.homeId, ctx.workspaceId);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      try {
        return await labelService.getLabel(input.id, ctx.workspaceId);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  create: publicProcedure.input(createLabelSchema).mutation(async ({ input, ctx }) => {
    try {
      return await labelService.createLabel(input, ctx.workspaceId);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  update: publicProcedure.input(updateLabelSchema).mutation(async ({ input, ctx }) => {
    try {
      const { id, ...data } = input;
      return await labelService.updateLabel(id, data, ctx.workspaceId);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  delete: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await labelService.deleteLabel(input.id, ctx.workspaceId);
        return { success: true };
      } catch (error) {
        throw translateDomainError(error);
      }
    }),
});
