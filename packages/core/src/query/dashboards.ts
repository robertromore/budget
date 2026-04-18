import type { Dashboard, DashboardWidget, DashboardWithWidgets } from "$core/schema/dashboards";
import { trpc } from "$core/trpc/client-factory";
import { queryClient, queryPresets } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

export const dashboardKeys = createQueryKeys("dashboards", {
  lists: () => ["dashboards", "list"] as const,
  list: () => ["dashboards", "list"] as const,
  listAll: () => ["dashboards", "list", "all"] as const,
  details: () => ["dashboards", "detail"] as const,
  detail: (id: number) => ["dashboards", "detail", id] as const,
  detailBySlug: (slug: string) => ["dashboards", "detail", "slug", slug] as const,
  default: () => ["dashboards", "default"] as const,
  templates: () => ["dashboards", "templates"] as const,
});

export const listDashboards = () =>
  defineQuery<DashboardWithWidgets[]>({
    queryKey: dashboardKeys.list(),
    queryFn: () => trpc().dashboardRoutes.all.query() as Promise<DashboardWithWidgets[]>,
    options: {
      ...queryPresets.static,
    },
  });

export const listAllDashboards = () =>
  defineQuery<DashboardWithWidgets[]>({
    queryKey: dashboardKeys.listAll(),
    queryFn: () =>
      trpc().dashboardRoutes.allIncludingDisabled.query() as Promise<DashboardWithWidgets[]>,
    options: {
      ...queryPresets.static,
    },
  });

export const getDashboard = (idOrSlug: number | string) =>
  defineQuery<DashboardWithWidgets>({
    queryKey:
      typeof idOrSlug === "number"
        ? dashboardKeys.detail(idOrSlug)
        : dashboardKeys.detailBySlug(idOrSlug),
    queryFn: () =>
      (typeof idOrSlug === "number"
        ? trpc().dashboardRoutes.load.query({ id: idOrSlug })
        : trpc().dashboardRoutes.load.query({
            slug: idOrSlug,
          })) as Promise<DashboardWithWidgets>,
    options: {
      staleTime: 60_000,
    },
  });

export const getDefaultDashboard = () =>
  defineQuery<DashboardWithWidgets | null>({
    queryKey: dashboardKeys.default(),
    queryFn: () =>
      trpc().dashboardRoutes.default.query() as Promise<DashboardWithWidgets | null>,
    options: {
      ...queryPresets.static,
    },
  });

export const getTemplates = () =>
  defineQuery({
    queryKey: dashboardKeys.templates(),
    queryFn: () => trpc().dashboardRoutes.templates.query(),
    options: {
      staleTime: Infinity,
    },
  });

async function invalidateAll(): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: dashboardKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: dashboardKeys.details() }),
    queryClient.invalidateQueries({ queryKey: dashboardKeys.default() }),
  ]);
}

export const saveDashboard = defineMutation<any, Dashboard>({
  mutationFn: (variables) => trpc().dashboardRoutes.save.mutate(variables),
  onSuccess: () => invalidateAll(),
  successMessage: "Dashboard saved",
  errorMessage: "Failed to save dashboard",
});

export const removeDashboard = defineMutation<any, Dashboard>({
  mutationFn: (variables) => trpc().dashboardRoutes.remove.mutate(variables),
  onSuccess: () => invalidateAll(),
  successMessage: "Dashboard deleted",
  errorMessage: "Failed to delete dashboard",
});

export const setDefaultDashboard = defineMutation<any, Dashboard>({
  mutationFn: (variables) => trpc().dashboardRoutes.setDefault.mutate(variables),
  onSuccess: () => invalidateAll(),
  successMessage: "Default dashboard updated",
  errorMessage: "Failed to set default dashboard",
});

export const toggleDashboardEnabled = defineMutation<any, Dashboard>({
  mutationFn: (variables) => trpc().dashboardRoutes.toggleEnabled.mutate(variables),
  onSuccess: () => invalidateAll(),
});

export const cloneDashboard = defineMutation<any, DashboardWithWidgets | null>({
  mutationFn: (variables) => trpc().dashboardRoutes.clone.mutate(variables),
  onSuccess: () => invalidateAll(),
  successMessage: "Dashboard cloned",
  errorMessage: "Failed to clone dashboard",
});

export const createFromTemplate = defineMutation<any, DashboardWithWidgets | null>({
  mutationFn: (variables) => trpc().dashboardRoutes.createFromTemplate.mutate(variables),
  onSuccess: () => invalidateAll(),
  successMessage: "Dashboard created",
  errorMessage: "Failed to create dashboard",
});

export const ensureDefaultDashboard = defineMutation<void, DashboardWithWidgets | null>({
  mutationFn: () => trpc().dashboardRoutes.ensureDefault.mutate(),
  onSuccess: () => invalidateAll(),
});

// Widget mutations

export const addWidget = defineMutation<any, DashboardWidget>({
  mutationFn: (variables) => trpc().dashboardRoutes.addWidget.mutate(variables),
  onSuccess: () => invalidateAll(),
  successMessage: "Widget added",
  errorMessage: "Failed to add widget",
});

export const updateWidget = defineMutation<any, DashboardWidget>({
  mutationFn: (variables) => trpc().dashboardRoutes.updateWidget.mutate(variables),
  onSuccess: () => invalidateAll(),
});

export const removeWidget = defineMutation<any, DashboardWidget>({
  mutationFn: (variables) => trpc().dashboardRoutes.removeWidget.mutate(variables),
  onSuccess: () => invalidateAll(),
  successMessage: "Widget removed",
  errorMessage: "Failed to remove widget",
});

export const reorderWidgets = defineMutation<any, { success: boolean }>({
  mutationFn: (variables) => trpc().dashboardRoutes.reorderWidgets.mutate(variables),
  onSuccess: () => invalidateAll(),
});

export const reorderDashboardSlots = defineMutation<
  {
    dashboardId: number;
    slots: Array<{ kind: "widget" | "group"; id: number }>;
  },
  { success: boolean }
>({
  mutationFn: (variables) => trpc().dashboardRoutes.reorderSlots.mutate(variables),
  onSuccess: () => invalidateAll(),
});

export const reorderDashboards = defineMutation<any, { success: boolean }>({
  mutationFn: (variables) => trpc().dashboardRoutes.reorderDashboards.mutate(variables),
  onSuccess: () => invalidateAll(),
});
