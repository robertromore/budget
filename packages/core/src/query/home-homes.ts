import type { Home } from "$core/schema/home/homes";
import { trpc } from "$core/trpc/client-factory";
import { queryClient, queryPresets } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

export const homeKeys = createQueryKeys("homes", {
  list: () => ["homes", "list"] as const,
  detail: (id: number) => ["homes", "detail", id] as const,
  bySlug: (slug: string) => ["homes", "bySlug", slug] as const,
});

export const listHomes = () =>
  defineQuery<Home[]>({
    queryKey: homeKeys["list"](),
    queryFn: () => trpc().homeHomesRoutes.list.query(),
    options: { ...queryPresets.static },
  });

export const getHomeBySlug = (slug: string) =>
  defineQuery<Home>({
    queryKey: homeKeys["bySlug"](slug),
    queryFn: () => trpc().homeHomesRoutes.getBySlug.query({ slug }),
    options: { staleTime: 60_000 },
  });

export const getHome = (id: number) =>
  defineQuery<Home>({
    queryKey: homeKeys["detail"](id),
    queryFn: () => trpc().homeHomesRoutes.getById.query({ id }),
    options: { staleTime: 60_000 },
  });

interface CreateHomeInput {
  name: string;
  description?: string | null;
  address?: string | null;
  notes?: string | null;
}

interface UpdateHomeInput {
  id: number;
  name?: string;
  description?: string | null;
  address?: string | null;
  notes?: string | null;
  coverImageUrl?: string | null;
}

export const createHome = defineMutation<CreateHomeInput, Home>({
  mutationFn: (input) => trpc().homeHomesRoutes.create.mutate(input),
  successMessage: "Home created",
  errorMessage: "Failed to create home",
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: homeKeys["list"]() });
  },
});

export const updateHome = defineMutation<UpdateHomeInput, Home>({
  mutationFn: (input) => trpc().homeHomesRoutes.update.mutate(input),
  successMessage: "Home updated",
  errorMessage: "Failed to update home",
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: homeKeys["list"]() });
    queryClient.invalidateQueries({ queryKey: homeKeys["detail"](data.id) });
    queryClient.invalidateQueries({ queryKey: homeKeys["bySlug"](data.slug) });
  },
});

export const deleteHome = defineMutation<{ id: number }, { success: boolean }>({
  mutationFn: (input) => trpc().homeHomesRoutes.delete.mutate(input),
  successMessage: "Home deleted",
  errorMessage: "Failed to delete home",
  onSuccess: (_, variables) => {
    queryClient.invalidateQueries({ queryKey: homeKeys["list"]() });
    queryClient.removeQueries({ queryKey: homeKeys["detail"](variables.id) });
  },
});
