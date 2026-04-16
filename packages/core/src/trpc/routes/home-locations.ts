import { serviceFactory } from "$core/server/shared/container/service-factory";
import { lazyService } from "$core/server/shared/container/lazy-service";
import { publicProcedure, t } from "$core/trpc";
import { translateDomainError } from "$core/trpc/shared/errors";
import { z } from "zod";

const locationService = lazyService(() => serviceFactory.getHomeLocationService());

const createLocationSchema = z.object({
  homeId: z.number().int().positive(),
  parentId: z.number().int().positive().optional().nullable(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  locationType: z.string().optional(),
  icon: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  displayOrder: z.number().int().optional(),
});

const updateLocationSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  parentId: z.number().int().positive().optional().nullable(),
  locationType: z.string().optional(),
  icon: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  displayOrder: z.number().int().optional(),
});

export const homeLocationsRoutes = t.router({
  list: publicProcedure
    .input(z.object({ homeId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      try {
        return await locationService.listLocations(input.homeId, ctx.workspaceId);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  getTree: publicProcedure
    .input(z.object({ homeId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      try {
        return await locationService.getLocationTree(input.homeId, ctx.workspaceId);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      try {
        return await locationService.getLocation(input.id, ctx.workspaceId);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  create: publicProcedure.input(createLocationSchema).mutation(async ({ input, ctx }) => {
    try {
      return await locationService.createLocation(input, ctx.workspaceId);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  update: publicProcedure.input(updateLocationSchema).mutation(async ({ input, ctx }) => {
    try {
      const { id, ...data } = input;
      return await locationService.updateLocation(id, data, ctx.workspaceId);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  move: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        newParentId: z.number().int().positive().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await locationService.moveLocation(input.id, input.newParentId, ctx.workspaceId);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await locationService.deleteLocation(input.id, ctx.workspaceId);
        return { success: true };
      } catch (error) {
        throw translateDomainError(error);
      }
    }),
});
