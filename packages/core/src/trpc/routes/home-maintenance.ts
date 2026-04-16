import { serviceFactory } from "$core/server/shared/container/service-factory";
import { lazyService } from "$core/server/shared/container/lazy-service";
import { publicProcedure, t } from "$core/trpc";
import { translateDomainError } from "$core/trpc/shared/errors";
import { z } from "zod";

const maintenanceService = lazyService(() => serviceFactory.getHomeMaintenanceService());

const createSchema = z.object({
  itemId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  maintenanceType: z.enum(["scheduled", "completed"]).optional(),
  scheduledDate: z.string().optional().nullable(),
  completedDate: z.string().optional().nullable(),
  cost: z.number().min(0).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

const updateSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  maintenanceType: z.enum(["scheduled", "completed"]).optional(),
  scheduledDate: z.string().optional().nullable(),
  completedDate: z.string().optional().nullable(),
  cost: z.number().min(0).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const homeMaintenanceRoutes = t.router({
  listByItem: publicProcedure
    .input(z.object({ itemId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      try {
        return await maintenanceService.listByItem(input.itemId, ctx.workspaceId);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  create: publicProcedure.input(createSchema).mutation(async ({ input, ctx }) => {
    try {
      return await maintenanceService.createRecord(input, ctx.workspaceId);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  update: publicProcedure.input(updateSchema).mutation(async ({ input, ctx }) => {
    try {
      const { id, ...data } = input;
      return await maintenanceService.updateRecord(id, data, ctx.workspaceId);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  complete: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await maintenanceService.completeRecord(input.id, ctx.workspaceId);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await maintenanceService.deleteRecord(input.id, ctx.workspaceId);
        return { success: true };
      } catch (error) {
        throw translateDomainError(error);
      }
    }),
});
