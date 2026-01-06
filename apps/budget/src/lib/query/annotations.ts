import type { MonthAnnotation } from "$lib/schema/month-annotations";
import { trpc } from "$lib/trpc/client";
import { queryClient, queryPresets } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

// Query keys for annotations
export const annotationKeys = createQueryKeys("annotations", {
  list: () => ["annotations", "list"] as const,
  detail: (id: number) => ["annotations", "detail", id] as const,
  byMonths: (months: string[], accountId?: number) =>
    ["annotations", "byMonths", { months, accountId }] as const,
  byAccount: (accountId: number) => ["annotations", "byAccount", accountId] as const,
  flagged: () => ["annotations", "flagged"] as const,
});

/**
 * List all annotations for the workspace
 */
export const listAnnotations = () =>
  defineQuery<MonthAnnotation[]>({
    queryKey: annotationKeys["list"](),
    queryFn: () => trpc().annotationRoutes.list.query(),
    options: {
      ...queryPresets.static,
    },
  });

/**
 * Get a single annotation by ID
 */
export const getAnnotation = (id: number) =>
  defineQuery<MonthAnnotation>({
    queryKey: annotationKeys["detail"](id),
    queryFn: () => trpc().annotationRoutes.get.query({ id }),
    options: {
      staleTime: 60 * 1000,
    },
  });

/**
 * Get annotations for specific months
 */
export const getAnnotationsByMonths = (months: string[], accountId?: number) =>
  defineQuery<MonthAnnotation[]>({
    queryKey: annotationKeys["byMonths"](months, accountId),
    queryFn: () => trpc().annotationRoutes.getByMonths.query({ months, accountId }),
    options: {
      staleTime: 30 * 1000,
    },
  });

/**
 * Get annotations for an account
 */
export const getAnnotationsByAccount = (accountId: number) =>
  defineQuery<MonthAnnotation[]>({
    queryKey: annotationKeys["byAccount"](accountId),
    queryFn: () => trpc().annotationRoutes.getByAccount.query({ accountId }),
    options: {
      staleTime: 30 * 1000,
    },
  });

/**
 * Get all flagged annotations
 */
export const getFlaggedAnnotations = () =>
  defineQuery<MonthAnnotation[]>({
    queryKey: annotationKeys["flagged"](),
    queryFn: () => trpc().annotationRoutes.getFlagged.query(),
    options: {
      staleTime: 30 * 1000,
    },
  });

// Input types for mutations
interface UpsertAnnotationInput {
  month: string;
  accountId?: number;
  categoryId?: number;
  note?: string | null;
  flaggedForReview?: boolean;
  tags?: string[];
}

interface BulkCreateAnnotationInput {
  months: string[];
  accountId?: number;
  categoryId?: number;
  note?: string | null;
  flaggedForReview?: boolean;
  tags?: string[];
}

interface UpdateAnnotationInput {
  id: number;
  note?: string | null;
  flaggedForReview?: boolean;
  tags?: string[];
}

interface QuickFlagInput {
  month: string;
  accountId?: number;
}

/**
 * Create or update an annotation
 */
export const upsertAnnotation = defineMutation<UpsertAnnotationInput, MonthAnnotation>({
  mutationFn: (input) => trpc().annotationRoutes.upsert.mutate(input),
  successMessage: "Annotation saved",
  errorMessage: "Failed to save annotation",
  onSuccess: (data, variables) => {
    // Invalidate relevant queries
    queryClient.invalidateQueries({ queryKey: annotationKeys["list"]() });
    queryClient.invalidateQueries({
      queryKey: annotationKeys["byMonths"]([variables.month], variables.accountId),
    });
    if (variables.accountId) {
      queryClient.invalidateQueries({
        queryKey: annotationKeys["byAccount"](variables.accountId),
      });
    }
    if (data.flaggedForReview) {
      queryClient.invalidateQueries({ queryKey: annotationKeys["flagged"]() });
    }
  },
});

/**
 * Create annotations for multiple months
 */
export const bulkCreateAnnotations = defineMutation<BulkCreateAnnotationInput, MonthAnnotation[]>({
  mutationFn: (input) => trpc().annotationRoutes.bulkCreate.mutate(input),
  successMessage: (data) => `Saved ${data.length} annotations`,
  errorMessage: "Failed to save annotations",
  onSuccess: (_, variables) => {
    // Invalidate relevant queries
    queryClient.invalidateQueries({ queryKey: annotationKeys["list"]() });
    queryClient.invalidateQueries({
      queryKey: annotationKeys["byMonths"](variables.months, variables.accountId),
    });
    if (variables.accountId) {
      queryClient.invalidateQueries({
        queryKey: annotationKeys["byAccount"](variables.accountId),
      });
    }
    if (variables.flaggedForReview) {
      queryClient.invalidateQueries({ queryKey: annotationKeys["flagged"]() });
    }
  },
});

/**
 * Update an existing annotation
 */
export const updateAnnotation = defineMutation<UpdateAnnotationInput, MonthAnnotation>({
  mutationFn: (input) => trpc().annotationRoutes.update.mutate(input),
  successMessage: "Annotation updated",
  errorMessage: "Failed to update annotation",
  onSuccess: (data) => {
    // Invalidate relevant queries
    queryClient.invalidateQueries({ queryKey: annotationKeys["list"]() });
    queryClient.invalidateQueries({ queryKey: annotationKeys["detail"](data.id) });
    queryClient.invalidateQueries({ queryKey: annotationKeys["flagged"]() });
  },
});

/**
 * Delete an annotation
 */
export const deleteAnnotation = defineMutation<{ id: number }, { success: boolean }>({
  mutationFn: (input) => trpc().annotationRoutes.delete.mutate(input),
  successMessage: "Annotation deleted",
  errorMessage: "Failed to delete annotation",
  onSuccess: (_, variables) => {
    // Invalidate list and remove detail from cache
    queryClient.invalidateQueries({ queryKey: annotationKeys["list"]() });
    queryClient.removeQueries({ queryKey: annotationKeys["detail"](variables.id) });
    queryClient.invalidateQueries({ queryKey: annotationKeys["flagged"]() });
  },
});

/**
 * Toggle flag status on an annotation
 */
export const toggleAnnotationFlag = defineMutation<{ id: number }, MonthAnnotation>({
  mutationFn: (input) => trpc().annotationRoutes.toggleFlag.mutate(input),
  successMessage: (data) => (data.flaggedForReview ? "Flagged for review" : "Flag removed"),
  errorMessage: "Failed to toggle flag",
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: annotationKeys["list"]() });
    queryClient.invalidateQueries({ queryKey: annotationKeys["detail"](data.id) });
    queryClient.invalidateQueries({ queryKey: annotationKeys["flagged"]() });
  },
});

/**
 * Quick flag a month
 */
export const quickFlagMonth = defineMutation<QuickFlagInput, MonthAnnotation>({
  mutationFn: (input) => trpc().annotationRoutes.quickFlag.mutate(input),
  successMessage: "Month flagged for review",
  errorMessage: "Failed to flag month",
  onSuccess: (data, variables) => {
    queryClient.invalidateQueries({ queryKey: annotationKeys["list"]() });
    queryClient.invalidateQueries({
      queryKey: annotationKeys["byMonths"]([variables.month], variables.accountId),
    });
    if (variables.accountId) {
      queryClient.invalidateQueries({
        queryKey: annotationKeys["byAccount"](variables.accountId),
      });
    }
    queryClient.invalidateQueries({ queryKey: annotationKeys["flagged"]() });
  },
});

// Convenience namespace export for organized access
export const Annotations = {
  keys: annotationKeys,
  list: listAnnotations,
  get: getAnnotation,
  getByMonths: getAnnotationsByMonths,
  getByAccount: getAnnotationsByAccount,
  getFlagged: getFlaggedAnnotations,
  upsert: upsertAnnotation,
  bulkCreate: bulkCreateAnnotations,
  update: updateAnnotation,
  delete: deleteAnnotation,
  toggleFlag: toggleAnnotationFlag,
  quickFlag: quickFlagMonth,
};
