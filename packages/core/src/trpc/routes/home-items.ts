import { serviceFactory } from "$core/server/shared/container/service-factory";
import { lazyService } from "$core/server/shared/container/lazy-service";
import { publicProcedure, t } from "$core/trpc";
import { translateDomainError } from "$core/trpc/shared/errors";
import { z } from "zod";

const itemService = lazyService(() => serviceFactory.getHomeItemService());

const createItemSchema = z.object({
  homeId: z.number().int().positive(),
  locationId: z.number().int().positive().optional().nullable(),
  parentItemId: z.number().int().positive().optional().nullable(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  serialNumber: z.string().max(200).optional().nullable(),
  modelNumber: z.string().max(200).optional().nullable(),
  manufacturer: z.string().max(200).optional().nullable(),
  quantity: z.number().int().min(0).optional(),
  isInsured: z.boolean().optional(),
  purchaseDate: z.string().optional().nullable(),
  purchaseVendor: z.string().max(200).optional().nullable(),
  purchasePrice: z.number().min(0).optional().nullable(),
  warrantyExpires: z.string().optional().nullable(),
  warrantyNotes: z.string().max(1000).optional().nullable(),
  lifetimeWarranty: z.boolean().optional(),
  currentValue: z.number().min(0).optional().nullable(),
  customFields: z.string().optional().nullable(),
  labelIds: z.array(z.number().int().positive()).optional(),
});

const updateItemSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  locationId: z.number().int().positive().optional().nullable(),
  parentItemId: z.number().int().positive().optional().nullable(),
  serialNumber: z.string().max(200).optional().nullable(),
  modelNumber: z.string().max(200).optional().nullable(),
  manufacturer: z.string().max(200).optional().nullable(),
  quantity: z.number().int().min(0).optional(),
  isArchived: z.boolean().optional(),
  isInsured: z.boolean().optional(),
  purchaseDate: z.string().optional().nullable(),
  purchaseVendor: z.string().max(200).optional().nullable(),
  purchasePrice: z.number().min(0).optional().nullable(),
  warrantyExpires: z.string().optional().nullable(),
  warrantyNotes: z.string().max(1000).optional().nullable(),
  lifetimeWarranty: z.boolean().optional(),
  currentValue: z.number().min(0).optional().nullable(),
  customFields: z.string().optional().nullable(),
});

const listItemsSchema = z.object({
  homeId: z.number().int().positive(),
  includeArchived: z.boolean().optional(),
  locationId: z.number().int().positive().optional(),
  search: z.string().max(200).optional(),
});

export const homeItemsRoutes = t.router({
  list: publicProcedure.input(listItemsSchema).query(async ({ input, ctx }) => {
    try {
      return await itemService.listItems(input.homeId, ctx.workspaceId, {
        includeArchived: input.includeArchived,
        locationId: input.locationId,
        search: input.search,
      });
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      try {
        return await itemService.getItemWithDetails(input.id, ctx.workspaceId);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  getByCuid: publicProcedure
    .input(z.object({ cuid: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        return await itemService.getItemByCuid(input.cuid, ctx.workspaceId);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  create: publicProcedure.input(createItemSchema).mutation(async ({ input, ctx }) => {
    try {
      return await itemService.createItem(input, ctx.workspaceId);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  update: publicProcedure.input(updateItemSchema).mutation(async ({ input, ctx }) => {
    try {
      const { id, ...data } = input;
      return await itemService.updateItem(id, data, ctx.workspaceId);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  move: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        locationId: z.number().int().positive().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await itemService.moveItem(input.id, input.locationId, ctx.workspaceId);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  assignLabel: publicProcedure
    .input(
      z.object({
        itemId: z.number().int().positive(),
        labelId: z.number().int().positive(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        await itemService.assignLabel(input.itemId, input.labelId, ctx.workspaceId);
        return { success: true };
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  removeLabel: publicProcedure
    .input(
      z.object({
        itemId: z.number().int().positive(),
        labelId: z.number().int().positive(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        await itemService.removeLabel(input.itemId, input.labelId, ctx.workspaceId);
        return { success: true };
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  getLabels: publicProcedure
    .input(z.object({ itemId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      try {
        return await itemService.getItemLabels(input.itemId, ctx.workspaceId);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  archive: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await itemService.archiveItem(input.id, ctx.workspaceId);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  unarchive: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await itemService.unarchiveItem(input.id, ctx.workspaceId);
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await itemService.deleteItem(input.id, ctx.workspaceId);
        return { success: true };
      } catch (error) {
        throw translateDomainError(error);
      }
    }),
});
