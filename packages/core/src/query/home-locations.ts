import type { HomeLocation } from "$core/schema/home/home-locations";
import type { LocationTreeNode } from "$core/server/domains/home/locations/repository";
import { trpc } from "$core/trpc/client-factory";
import { queryClient } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

export const homeLocationKeys = createQueryKeys("homeLocations", {
  list: (homeId: number) => ["homeLocations", "list", homeId] as const,
  tree: (homeId: number) => ["homeLocations", "tree", homeId] as const,
  detail: (id: number) => ["homeLocations", "detail", id] as const,
});

export const listHomeLocations = (homeId: number) =>
  defineQuery<HomeLocation[]>({
    queryKey: homeLocationKeys["list"](homeId),
    queryFn: () => trpc().homeLocationsRoutes.list.query({ homeId }),
    options: { staleTime: 60_000 },
  });

export const getHomeLocationTree = (homeId: number) =>
  defineQuery<LocationTreeNode[]>({
    queryKey: homeLocationKeys["tree"](homeId),
    queryFn: () => trpc().homeLocationsRoutes.getTree.query({ homeId }),
    options: { staleTime: 60_000 },
  });

export const getHomeLocation = (id: number) =>
  defineQuery<HomeLocation>({
    queryKey: homeLocationKeys["detail"](id),
    queryFn: () => trpc().homeLocationsRoutes.getById.query({ id }),
    options: { staleTime: 60_000 },
  });

interface CreateLocationInput {
  homeId: number;
  parentId?: number | null;
  name: string;
  description?: string | null;
  locationType?: string;
  icon?: string | null;
  color?: string | null;
  displayOrder?: number;
}

interface UpdateLocationInput {
  id: number;
  name?: string;
  description?: string | null;
  parentId?: number | null;
  locationType?: string;
  icon?: string | null;
  color?: string | null;
  displayOrder?: number;
}

export const createHomeLocation = defineMutation<CreateLocationInput, HomeLocation>({
  mutationFn: (input) => trpc().homeLocationsRoutes.create.mutate(input),
  successMessage: "Location created",
  errorMessage: "Failed to create location",
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: homeLocationKeys["list"](data.homeId) });
    queryClient.invalidateQueries({ queryKey: homeLocationKeys["tree"](data.homeId) });
  },
});

export const updateHomeLocation = defineMutation<UpdateLocationInput, HomeLocation>({
  mutationFn: (input) => trpc().homeLocationsRoutes.update.mutate(input),
  successMessage: "Location updated",
  errorMessage: "Failed to update location",
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: homeLocationKeys["list"](data.homeId) });
    queryClient.invalidateQueries({ queryKey: homeLocationKeys["tree"](data.homeId) });
    queryClient.invalidateQueries({ queryKey: homeLocationKeys["detail"](data.id) });
  },
});

export const moveHomeLocation = defineMutation<
  { id: number; newParentId: number | null },
  HomeLocation
>({
  mutationFn: (input) => trpc().homeLocationsRoutes.move.mutate(input),
  successMessage: "Location moved",
  errorMessage: "Failed to move location",
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: homeLocationKeys["list"](data.homeId) });
    queryClient.invalidateQueries({ queryKey: homeLocationKeys["tree"](data.homeId) });
    queryClient.invalidateQueries({ queryKey: homeLocationKeys["detail"](data.id) });
  },
});

export const deleteHomeLocation = defineMutation<{ id: number }, { success: boolean }>({
  mutationFn: (input) => trpc().homeLocationsRoutes.delete.mutate(input),
  successMessage: "Location deleted",
  errorMessage: "Failed to delete location",
  onSuccess: (_, variables) => {
    // Invalidate all location queries since we don't know the homeId from the response
    queryClient.invalidateQueries({ queryKey: ["homeLocations"] });
    queryClient.removeQueries({ queryKey: homeLocationKeys["detail"](variables.id) });
  },
});
