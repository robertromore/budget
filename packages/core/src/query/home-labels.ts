import type { HomeLabel } from "$core/schema/home/home-labels";
import type { LabelWithCount } from "$core/server/domains/home/labels/repository";
import { trpc } from "$core/trpc/client-factory";
import { queryClient } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

export const homeLabelKeys = createQueryKeys("homeLabels", {
  list: (homeId: number) => ["homeLabels", "list", homeId] as const,
  listWithCounts: (homeId: number) => ["homeLabels", "listWithCounts", homeId] as const,
  detail: (id: number) => ["homeLabels", "detail", id] as const,
});

export const listHomeLabels = (homeId: number) =>
  defineQuery<HomeLabel[]>({
    queryKey: homeLabelKeys["list"](homeId),
    queryFn: () => trpc().homeLabelsRoutes.list.query({ homeId }),
    options: { staleTime: 60_000 },
  });

export const listHomeLabelsWithCounts = (homeId: number) =>
  defineQuery<LabelWithCount[]>({
    queryKey: homeLabelKeys["listWithCounts"](homeId),
    queryFn: () => trpc().homeLabelsRoutes.listWithCounts.query({ homeId }),
    options: { staleTime: 60_000 },
  });

export const getHomeLabel = (id: number) =>
  defineQuery<HomeLabel>({
    queryKey: homeLabelKeys["detail"](id),
    queryFn: () => trpc().homeLabelsRoutes.getById.query({ id }),
    options: { staleTime: 60_000 },
  });

interface CreateLabelInput {
  homeId: number;
  name: string;
  description?: string | null;
  color?: string | null;
}

interface UpdateLabelInput {
  id: number;
  name?: string;
  description?: string | null;
  color?: string | null;
}

export const createHomeLabel = defineMutation<CreateLabelInput, HomeLabel>({
  mutationFn: (input) => trpc().homeLabelsRoutes.create.mutate(input),
  successMessage: "Label created",
  errorMessage: "Failed to create label",
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: homeLabelKeys["list"](data.homeId) });
    queryClient.invalidateQueries({ queryKey: homeLabelKeys["listWithCounts"](data.homeId) });
  },
});

export const updateHomeLabel = defineMutation<UpdateLabelInput, HomeLabel>({
  mutationFn: (input) => trpc().homeLabelsRoutes.update.mutate(input),
  successMessage: "Label updated",
  errorMessage: "Failed to update label",
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: homeLabelKeys["list"](data.homeId) });
    queryClient.invalidateQueries({ queryKey: homeLabelKeys["listWithCounts"](data.homeId) });
    queryClient.invalidateQueries({ queryKey: homeLabelKeys["detail"](data.id) });
  },
});

export const deleteHomeLabel = defineMutation<{ id: number }, { success: boolean }>({
  mutationFn: (input) => trpc().homeLabelsRoutes.delete.mutate(input),
  successMessage: "Label deleted",
  errorMessage: "Failed to delete label",
  onSuccess: (_, variables) => {
    queryClient.invalidateQueries({ queryKey: ["homeLabels"] });
    queryClient.removeQueries({ queryKey: homeLabelKeys["detail"](variables.id) });
  },
});
