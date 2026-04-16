import type { FloorPlanNode } from "$core/schema/home/home-floor-plan-nodes";
import type { FloorPlanNodeInput } from "$core/server/domains/home/floor-plans/services";
import { trpc } from "$core/trpc/client-factory";
import { queryClient } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

export const floorPlanKeys = createQueryKeys("floorPlans", {
  byHome: (homeId: number, floorLevel?: number) =>
    ["floorPlans", "byHome", homeId, floorLevel] as const,
  levels: (homeId: number) => ["floorPlans", "levels", homeId] as const,
});

export const getFloorPlan = (homeId: number, floorLevel?: number) =>
  defineQuery<FloorPlanNode[]>({
    queryKey: floorPlanKeys["byHome"](homeId, floorLevel),
    queryFn: () => trpc().homeFloorPlansRoutes.get.query({ homeId, floorLevel }),
    options: { staleTime: 60_000 },
  });

export const getFloorLevels = (homeId: number) =>
  defineQuery<number[]>({
    queryKey: floorPlanKeys["levels"](homeId),
    queryFn: () => trpc().homeFloorPlansRoutes.getFloorLevels.query({ homeId }),
    options: { staleTime: 60_000 },
  });

interface SaveFloorPlanInput {
  homeId: number;
  floorLevel: number;
  // Nodes omit `workspaceId` — the server injects it from the auth context.
  nodes: FloorPlanNodeInput[];
  deletedNodeIds: string[];
}

export const saveFloorPlan = defineMutation<SaveFloorPlanInput, FloorPlanNode[]>({
  mutationFn: (input) => trpc().homeFloorPlansRoutes.save.mutate(input),
  successMessage: "Floor plan saved",
  errorMessage: "Failed to save floor plan",
  onSuccess: (_, variables) => {
    queryClient.invalidateQueries({
      queryKey: floorPlanKeys["byHome"](variables.homeId, variables.floorLevel),
    });
    queryClient.invalidateQueries({
      queryKey: floorPlanKeys["levels"](variables.homeId),
    });
  },
});
