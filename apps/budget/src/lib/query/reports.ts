import type {
  ReportConfig,
  ReportTemplate,
  ReportTemplateType,
} from "$lib/schema/report-templates";
import { trpc } from "$lib/trpc/client";
import { queryClient, queryPresets } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

// Query keys for report templates
export const reportKeys = createQueryKeys("reports", {
  list: () => ["reports", "list"] as const,
  listByType: (type: ReportTemplateType) => ["reports", "list", type] as const,
  detail: (id: number) => ["reports", "detail", id] as const,
});

/**
 * List all report templates for the workspace
 */
export const listReportTemplates = (type?: ReportTemplateType) =>
  defineQuery<ReportTemplate[]>({
    queryKey: type ? reportKeys["listByType"](type) : reportKeys["list"](),
    queryFn: () => trpc().reportRoutes.list.query(type ? { type } : undefined),
    options: {
      ...queryPresets.static,
    },
  });

/**
 * Get a single report template by ID
 */
export const getReportTemplate = (id: number) =>
  defineQuery<ReportTemplate | null>({
    queryKey: reportKeys["detail"](id),
    queryFn: () => trpc().reportRoutes.get.query({ id }),
    options: {
      staleTime: 60 * 1000,
    },
  });

// Input types for mutations
interface CreateReportTemplateInput {
  name: string;
  description?: string;
  icon?: string;
  templateType: ReportTemplateType;
  config: ReportConfig;
}

interface UpdateReportTemplateInput {
  id: number;
  name?: string;
  description?: string | null;
  icon?: string | null;
  templateType?: ReportTemplateType;
  config?: ReportConfig;
}

/**
 * Create a new report template
 */
export const createReportTemplate = defineMutation<CreateReportTemplateInput, ReportTemplate>({
  mutationFn: (input) => trpc().reportRoutes.create.mutate(input),
  successMessage: "Report template saved",
  errorMessage: "Failed to save report template",
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: reportKeys["list"]() });
  },
});

/**
 * Update an existing report template
 */
export const updateReportTemplate = defineMutation<UpdateReportTemplateInput, ReportTemplate>({
  mutationFn: (input) => trpc().reportRoutes.update.mutate(input),
  successMessage: "Report template updated",
  errorMessage: "Failed to update report template",
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: reportKeys["list"]() });
    queryClient.invalidateQueries({ queryKey: reportKeys["detail"](data.id) });
  },
});

/**
 * Delete a report template
 */
export const deleteReportTemplate = defineMutation<{ id: number }, { success: boolean }>({
  mutationFn: (input) => trpc().reportRoutes.delete.mutate(input),
  successMessage: "Report template deleted",
  errorMessage: "Failed to delete report template",
  onSuccess: (_, variables) => {
    queryClient.invalidateQueries({ queryKey: reportKeys["list"]() });
    queryClient.removeQueries({ queryKey: reportKeys["detail"](variables.id) });
  },
});

/**
 * Set a template as the default
 */
export const setDefaultTemplate = defineMutation<{ id: number }, ReportTemplate>({
  mutationFn: (input) => trpc().reportRoutes.setDefault.mutate(input),
  successMessage: "Default template updated",
  errorMessage: "Failed to set default template",
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: reportKeys["list"]() });
  },
});

/**
 * Record template usage (for tracking most used templates)
 */
export const recordTemplateUsage = defineMutation<{ id: number }, { success: boolean }>({
  mutationFn: (input) => trpc().reportRoutes.recordUsage.mutate(input),
  // Silent - no toast for usage tracking
  onSuccess: (_, variables) => {
    queryClient.invalidateQueries({ queryKey: reportKeys["detail"](variables.id) });
  },
});

// Convenience namespace export for organized access
export const Reports = {
  keys: reportKeys,
  list: listReportTemplates,
  get: getReportTemplate,
  create: createReportTemplate,
  update: updateReportTemplate,
  delete: deleteReportTemplate,
  setDefault: setDefaultTemplate,
  recordUsage: recordTemplateUsage,
};
