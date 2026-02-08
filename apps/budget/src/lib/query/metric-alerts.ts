import type { MetricAlert } from "$lib/schema/metric-alerts";
import type { EvaluationResult } from "$lib/server/domains/metric-alerts/services";
import { trpc } from "$lib/trpc/client";
import { cachePatterns } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

export const metricAlertKeys = createQueryKeys("metricAlerts", {
  all: () => ["metricAlerts", "all"] as const,
  detail: (id: number) => ["metricAlerts", "detail", id] as const,
});

export const listAlerts = () =>
  defineQuery<MetricAlert[]>({
    queryKey: metricAlertKeys.all(),
    queryFn: () => trpc().metricAlertRoutes.all.query(),
  });

export const getAlertById = (id: number) =>
  defineQuery<MetricAlert>({
    queryKey: metricAlertKeys.detail(id),
    queryFn: () => trpc().metricAlertRoutes.load.query({ id }),
  });

export const createAlert = defineMutation<
  {
    name: string;
    metricType: "monthly_spending" | "category_spending" | "account_spending";
    conditionType: "above" | "below";
    threshold: number;
    accountId?: number;
    categoryId?: number;
    isActive?: boolean;
    metadata?: {
      calculationMethod?: string;
      dataPointCount?: number;
      selectedMonths?: string[];
    };
  },
  MetricAlert
>({
  mutationFn: (input) => trpc().metricAlertRoutes.save.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(metricAlertKeys.all());
  },
  successMessage: "Alert created",
  errorMessage: "Failed to create alert",
  importance: "important",
});

export const updateAlert = defineMutation<
  {
    id: number;
    name?: string;
    conditionType?: "above" | "below";
    threshold?: number;
    isActive?: boolean;
    metadata?: Record<string, unknown>;
  },
  MetricAlert
>({
  mutationFn: (input) => trpc().metricAlertRoutes.update.mutate(input),
  onSuccess: (_, variables) => {
    cachePatterns.invalidatePrefix(metricAlertKeys.all());
    if (variables.id) {
      cachePatterns.invalidatePrefix(metricAlertKeys.detail(variables.id));
    }
  },
  successMessage: "Alert updated",
  errorMessage: "Failed to update alert",
});

export const deleteAlert = defineMutation<number, void>({
  mutationFn: (id) => trpc().metricAlertRoutes.remove.mutate({ id }),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(metricAlertKeys.all());
  },
  successMessage: "Alert deleted",
  errorMessage: "Failed to delete alert",
  importance: "important",
});

export const toggleAlert = defineMutation<number, MetricAlert>({
  mutationFn: (id) => trpc().metricAlertRoutes.toggle.mutate({ id }),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(metricAlertKeys.all());
  },
  successMessage: "Alert toggled",
  errorMessage: "Failed to toggle alert",
});

export const evaluateAlerts = defineMutation<void, EvaluationResult>({
  mutationFn: () => trpc().metricAlertRoutes.evaluate.mutate(),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(metricAlertKeys.all());
  },
  successMessage: (data) => {
    if (data.triggered > 0) {
      return `${data.triggered} alert${data.triggered !== 1 ? "s" : ""} triggered`;
    }
    return `${data.checked} alert${data.checked !== 1 ? "s" : ""} checked - all clear`;
  },
  errorMessage: "Failed to evaluate alerts",
});
