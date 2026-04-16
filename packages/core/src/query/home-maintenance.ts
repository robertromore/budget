import type { HomeMaintenance } from "$core/schema/home/home-maintenance";
import { trpc } from "$core/trpc/client-factory";
import { queryClient } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

export const homeMaintenanceKeys = createQueryKeys("homeMaintenance", {
  byItem: (itemId: number) => ["homeMaintenance", "byItem", itemId] as const,
});

export const listMaintenanceByItem = (itemId: number) =>
  defineQuery<HomeMaintenance[]>({
    queryKey: homeMaintenanceKeys["byItem"](itemId),
    queryFn: () => trpc().homeMaintenanceRoutes.listByItem.query({ itemId }),
    options: { staleTime: 60_000 },
  });

interface CreateMaintenanceInput {
  itemId: number;
  name: string;
  description?: string | null;
  maintenanceType?: "scheduled" | "completed";
  scheduledDate?: string | null;
  completedDate?: string | null;
  cost?: number | null;
  notes?: string | null;
}

interface UpdateMaintenanceInput {
  id: number;
  name?: string;
  description?: string | null;
  maintenanceType?: "scheduled" | "completed";
  scheduledDate?: string | null;
  completedDate?: string | null;
  cost?: number | null;
  notes?: string | null;
}

export const createMaintenance = defineMutation<CreateMaintenanceInput, HomeMaintenance>({
  mutationFn: (input) => trpc().homeMaintenanceRoutes.create.mutate(input),
  successMessage: "Maintenance record created",
  errorMessage: "Failed to create maintenance record",
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: homeMaintenanceKeys["byItem"](data.itemId) });
  },
});

export const updateMaintenance = defineMutation<UpdateMaintenanceInput, HomeMaintenance>({
  mutationFn: (input) => trpc().homeMaintenanceRoutes.update.mutate(input),
  successMessage: "Maintenance record updated",
  errorMessage: "Failed to update maintenance record",
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: homeMaintenanceKeys["byItem"](data.itemId) });
  },
});

export const completeMaintenance = defineMutation<{ id: number }, HomeMaintenance>({
  mutationFn: (input) => trpc().homeMaintenanceRoutes.complete.mutate(input),
  successMessage: "Maintenance marked complete",
  errorMessage: "Failed to complete maintenance",
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: homeMaintenanceKeys["byItem"](data.itemId) });
  },
});

export const deleteMaintenance = defineMutation<{ id: number }, { success: boolean }>({
  mutationFn: (input) => trpc().homeMaintenanceRoutes.delete.mutate(input),
  successMessage: "Maintenance record deleted",
  errorMessage: "Failed to delete maintenance record",
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["homeMaintenance"] });
  },
});
