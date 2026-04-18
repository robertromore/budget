import type { DashboardGroupInstance } from "$core/schema/dashboards";
import type {
  DashboardWidgetGroup,
  DashboardWidgetGroupItem,
  DashboardWidgetGroupWithItems,
} from "$core/schema/dashboard-widget-groups";
import { trpc } from "$core/trpc/client-factory";
import { queryClient } from "./_client";
import { dashboardKeys } from "./dashboards";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

export type WidgetGroupListItem = DashboardWidgetGroup & {
  itemCount: number;
  previewTypes: string[];
};

export const widgetGroupKeys = createQueryKeys("widget-groups", {
  lists: () => ["widget-groups", "list"] as const,
  list: () => ["widget-groups", "list"] as const,
  details: () => ["widget-groups", "detail"] as const,
  detail: (id: number) => ["widget-groups", "detail", id] as const,
  detailBySlug: (slug: string) => ["widget-groups", "detail", "slug", slug] as const,
  presets: () => ["widget-groups", "presets"] as const,
});

async function invalidateAll(): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: widgetGroupKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: widgetGroupKeys.details() }),
  ]);
}

async function invalidateDashboards(): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: dashboardKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: dashboardKeys.details() }),
    queryClient.invalidateQueries({ queryKey: dashboardKeys.default() }),
  ]);
}

export const listWidgetGroups = () =>
  defineQuery<WidgetGroupListItem[]>({
    queryKey: widgetGroupKeys.list(),
    queryFn: () =>
      trpc().widgetGroupRoutes.list.query() as Promise<WidgetGroupListItem[]>,
    options: { staleTime: 30_000 },
  });

export const getWidgetGroup = (idOrSlug: number | string) =>
  defineQuery<DashboardWidgetGroupWithItems>({
    queryKey:
      typeof idOrSlug === "number"
        ? widgetGroupKeys.detail(idOrSlug)
        : widgetGroupKeys.detailBySlug(idOrSlug),
    queryFn: () =>
      (typeof idOrSlug === "number"
        ? trpc().widgetGroupRoutes.get.query({ id: idOrSlug })
        : trpc().widgetGroupRoutes.get.query({
            slug: idOrSlug,
          })) as Promise<DashboardWidgetGroupWithItems>,
    options: { staleTime: 30_000 },
  });

export const listWidgetGroupPresets = () =>
  defineQuery({
    queryKey: widgetGroupKeys.presets(),
    queryFn: () => trpc().widgetGroupRoutes.presets.query(),
    options: { staleTime: Infinity },
  });

export const createWidgetGroup = defineMutation<any, DashboardWidgetGroupWithItems>({
  mutationFn: (variables) => trpc().widgetGroupRoutes.create.mutate(variables),
  onSuccess: () => invalidateAll(),
  successMessage: "Widget group created",
  errorMessage: "Failed to create widget group",
});

export const updateWidgetGroup = defineMutation<any, DashboardWidgetGroup>({
  mutationFn: (variables) => trpc().widgetGroupRoutes.update.mutate(variables),
  onSuccess: () => invalidateAll(),
  successMessage: "Group updated",
  errorMessage: "Failed to update group",
});

export const deleteWidgetGroup = defineMutation<any, DashboardWidgetGroup>({
  mutationFn: (variables) => trpc().widgetGroupRoutes.delete.mutate(variables),
  onSuccess: () => invalidateAll(),
  successMessage: "Group deleted",
  errorMessage: "Failed to delete group",
});

export const duplicateWidgetGroup = defineMutation<any, DashboardWidgetGroupWithItems>({
  mutationFn: (variables) => trpc().widgetGroupRoutes.duplicate.mutate(variables),
  onSuccess: () => invalidateAll(),
  successMessage: "Group duplicated",
  errorMessage: "Failed to duplicate group",
});

export const addGroupItem = defineMutation<any, DashboardWidgetGroupItem>({
  mutationFn: (variables) => trpc().widgetGroupRoutes.addItem.mutate(variables),
  onSuccess: () => invalidateAll(),
  successMessage: "Widget added",
  errorMessage: "Failed to add widget",
});

export const updateGroupItem = defineMutation<any, DashboardWidgetGroupItem>({
  mutationFn: (variables) => trpc().widgetGroupRoutes.updateItem.mutate(variables),
  onSuccess: () => invalidateAll(),
});

export const removeGroupItem = defineMutation<any, DashboardWidgetGroupItem>({
  mutationFn: (variables) => trpc().widgetGroupRoutes.removeItem.mutate(variables),
  onSuccess: () => invalidateAll(),
  successMessage: "Widget removed",
  errorMessage: "Failed to remove widget",
});

export const reorderGroupItems = defineMutation<any, { success: boolean }>({
  mutationFn: (variables) => trpc().widgetGroupRoutes.reorderItems.mutate(variables),
  onSuccess: () => invalidateAll(),
});

export const applyGroupToDashboard = defineMutation<
  { groupId: number; dashboardId: number },
  {
    addedCount: number;
    widgetIds: number[];
    groupInstanceId: number | null;
    groupName?: string;
  }
>({
  mutationFn: (variables) =>
    trpc().widgetGroupRoutes.applyToDashboard.mutate(variables),
  onSuccess: async () => {
    await invalidateDashboards();
  },
  successMessage: (result) =>
    result.addedCount === 0
      ? "Group is empty — nothing to add"
      : `Added ${result.addedCount} widget${result.addedCount === 1 ? "" : "s"}${
          result.groupName ? ` from ${result.groupName}` : ""
        }`,
  errorMessage: "Failed to apply group",
});

export const saveDashboardAsGroup = defineMutation<any, DashboardWidgetGroupWithItems>({
  mutationFn: (variables) =>
    trpc().widgetGroupRoutes.saveDashboardAsGroup.mutate(variables),
  onSuccess: () => invalidateAll(),
  successMessage: "Saved as widget group",
  errorMessage: "Failed to save as group",
});

export const removeGroupInstance = defineMutation<any, DashboardGroupInstance>({
  mutationFn: (variables) => trpc().widgetGroupRoutes.removeInstance.mutate(variables),
  onSuccess: () => invalidateDashboards(),
  successMessage: "Group removed",
  errorMessage: "Failed to remove group",
});

export const renameGroupInstance = defineMutation<any, DashboardGroupInstance>({
  mutationFn: (variables) => trpc().widgetGroupRoutes.renameInstance.mutate(variables),
  onSuccess: () => invalidateDashboards(),
  successMessage: "Group renamed",
  errorMessage: "Failed to rename group",
});

export const reorderGroupInstanceWidgets = defineMutation<
  { instanceId: number; widgetIds: number[] },
  { success: boolean }
>({
  mutationFn: (variables) =>
    trpc().widgetGroupRoutes.reorderInstanceWidgets.mutate(variables),
  onSuccess: () => invalidateDashboards(),
});
