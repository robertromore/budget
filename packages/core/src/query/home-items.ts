import type { HomeItem } from "$core/schema/home/home-items";
import type { HomeLabel } from "$core/schema/home/home-labels";
import type { ItemWithDetails } from "$core/server/domains/home/items/repository";
import { trpc } from "$core/trpc/client-factory";
import { queryClient } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

export const homeItemKeys = createQueryKeys("homeItems", {
  list: (homeId: number) => ["homeItems", "list", homeId] as const,
  detail: (id: number) => ["homeItems", "detail", id] as const,
  byCuid: (cuid: string) => ["homeItems", "byCuid", cuid] as const,
  labels: (itemId: number) => ["homeItems", "labels", itemId] as const,
});

export const listHomeItems = (
  homeId: number,
  options?: { includeArchived?: boolean; locationId?: number; search?: string }
) =>
  defineQuery<HomeItem[]>({
    queryKey: [...homeItemKeys["list"](homeId), options] as const,
    queryFn: () =>
      trpc().homeItemsRoutes.list.query({
        homeId,
        includeArchived: options?.includeArchived,
        locationId: options?.locationId,
        search: options?.search,
      }),
    options: { staleTime: 30_000 },
  });

export const getHomeItem = (id: number) =>
  defineQuery<ItemWithDetails>({
    queryKey: homeItemKeys["detail"](id),
    queryFn: () => trpc().homeItemsRoutes.getById.query({ id }),
    options: { staleTime: 60_000 },
  });

export const getHomeItemByCuid = (cuid: string) =>
  defineQuery<HomeItem>({
    queryKey: homeItemKeys["byCuid"](cuid),
    queryFn: () => trpc().homeItemsRoutes.getByCuid.query({ cuid }),
    options: { staleTime: 60_000 },
  });

export const getHomeItemLabels = (itemId: number) =>
  defineQuery<HomeLabel[]>({
    queryKey: homeItemKeys["labels"](itemId),
    queryFn: () => trpc().homeItemsRoutes.getLabels.query({ itemId }),
    options: { staleTime: 60_000 },
  });

interface CreateItemInput {
  homeId: number;
  locationId?: number | null;
  parentItemId?: number | null;
  name: string;
  description?: string | null;
  notes?: string | null;
  serialNumber?: string | null;
  modelNumber?: string | null;
  manufacturer?: string | null;
  quantity?: number;
  isInsured?: boolean;
  purchaseDate?: string | null;
  purchaseVendor?: string | null;
  purchasePrice?: number | null;
  warrantyExpires?: string | null;
  warrantyNotes?: string | null;
  lifetimeWarranty?: boolean;
  currentValue?: number | null;
  customFields?: string | null;
  labelIds?: number[];
}

interface UpdateItemInput {
  id: number;
  name?: string;
  description?: string | null;
  notes?: string | null;
  locationId?: number | null;
  parentItemId?: number | null;
  serialNumber?: string | null;
  modelNumber?: string | null;
  manufacturer?: string | null;
  quantity?: number;
  isArchived?: boolean;
  isInsured?: boolean;
  purchaseDate?: string | null;
  purchaseVendor?: string | null;
  purchasePrice?: number | null;
  warrantyExpires?: string | null;
  warrantyNotes?: string | null;
  lifetimeWarranty?: boolean;
  currentValue?: number | null;
  customFields?: string | null;
}

export const createHomeItem = defineMutation<CreateItemInput, HomeItem>({
  mutationFn: (input) => trpc().homeItemsRoutes.create.mutate(input),
  successMessage: "Item created",
  errorMessage: "Failed to create item",
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: homeItemKeys["list"](data.homeId) });
  },
});

export const updateHomeItem = defineMutation<UpdateItemInput, HomeItem>({
  mutationFn: (input) => trpc().homeItemsRoutes.update.mutate(input),
  successMessage: "Item updated",
  errorMessage: "Failed to update item",
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: homeItemKeys["list"](data.homeId) });
    queryClient.invalidateQueries({ queryKey: homeItemKeys["detail"](data.id) });
  },
});

export const moveHomeItem = defineMutation<
  { id: number; locationId: number | null },
  HomeItem
>({
  mutationFn: (input) => trpc().homeItemsRoutes.move.mutate(input),
  successMessage: "Item moved",
  errorMessage: "Failed to move item",
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: homeItemKeys["list"](data.homeId) });
    queryClient.invalidateQueries({ queryKey: homeItemKeys["detail"](data.id) });
  },
});

export const assignHomeItemLabel = defineMutation<
  { itemId: number; labelId: number },
  { success: boolean }
>({
  mutationFn: (input) => trpc().homeItemsRoutes.assignLabel.mutate(input),
  successMessage: "Label assigned",
  errorMessage: "Failed to assign label",
  onSuccess: (_, variables) => {
    queryClient.invalidateQueries({ queryKey: homeItemKeys["labels"](variables.itemId) });
    queryClient.invalidateQueries({ queryKey: homeItemKeys["detail"](variables.itemId) });
  },
});

export const removeHomeItemLabel = defineMutation<
  { itemId: number; labelId: number },
  { success: boolean }
>({
  mutationFn: (input) => trpc().homeItemsRoutes.removeLabel.mutate(input),
  successMessage: "Label removed",
  errorMessage: "Failed to remove label",
  onSuccess: (_, variables) => {
    queryClient.invalidateQueries({ queryKey: homeItemKeys["labels"](variables.itemId) });
    queryClient.invalidateQueries({ queryKey: homeItemKeys["detail"](variables.itemId) });
  },
});

export const archiveHomeItem = defineMutation<{ id: number }, HomeItem>({
  mutationFn: (input) => trpc().homeItemsRoutes.archive.mutate(input),
  successMessage: "Item archived",
  errorMessage: "Failed to archive item",
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: homeItemKeys["list"](data.homeId) });
    queryClient.invalidateQueries({ queryKey: homeItemKeys["detail"](data.id) });
  },
});

export const unarchiveHomeItem = defineMutation<{ id: number }, HomeItem>({
  mutationFn: (input) => trpc().homeItemsRoutes.unarchive.mutate(input),
  successMessage: "Item restored",
  errorMessage: "Failed to restore item",
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: homeItemKeys["list"](data.homeId) });
    queryClient.invalidateQueries({ queryKey: homeItemKeys["detail"](data.id) });
  },
});

export const deleteHomeItem = defineMutation<{ id: number }, { success: boolean }>({
  mutationFn: (input) => trpc().homeItemsRoutes.delete.mutate(input),
  successMessage: "Item deleted",
  errorMessage: "Failed to delete item",
  onSuccess: (_, variables) => {
    queryClient.invalidateQueries({ queryKey: ["homeItems"] });
    queryClient.removeQueries({ queryKey: homeItemKeys["detail"](variables.id) });
  },
});
