import { serviceFactory } from "$core/server/shared/container/service-factory";
import { lazyService } from "$core/server/shared/container/lazy-service";
import { publicProcedure, t } from "$core/trpc";
import { translateDomainError } from "$core/trpc/shared/errors";
import { z } from "zod";

const homeService = lazyService(() => serviceFactory.getHomeService());

const createHomeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

const updateHomeSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  coverImageUrl: z.string().optional().nullable(),
});

export const homeHomesRoutes = t.router({
  list: publicProcedure.query(async ({ ctx }) => {
    try {
      return await homeService.listHomes(ctx.workspaceId);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        return await homeService.getHomeBySlug(input.slug, ctx.workspaceId);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      try {
        return await homeService.getHome(input.id, ctx.workspaceId);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  create: publicProcedure.input(createHomeSchema).mutation(async ({ input, ctx }) => {
    try {
      return await homeService.createHome(input, ctx.workspaceId);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  update: publicProcedure.input(updateHomeSchema).mutation(async ({ input, ctx }) => {
    try {
      const { id, ...data } = input;
      return await homeService.updateHome(id, data, ctx.workspaceId);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  delete: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await homeService.deleteHome(input.id, ctx.workspaceId);
        return { success: true };
      } catch (error) {
        throw translateDomainError(error);
      }
    }),
});
