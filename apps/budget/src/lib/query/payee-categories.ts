import type {PayeeCategory, NewPayeeCategory} from "$lib/schema/payee-categories";
import type {PayeeCategoryWithCounts} from "$lib/server/domains/payee-categories/repository";
import {trpc} from "$lib/trpc/client";
import {cachePatterns} from "./_client";
import {createQueryKeys, defineMutation, defineQuery} from "./_factory";

// ================================================================================
// Query Keys
// ================================================================================

export const payeeCategoryKeys = createQueryKeys("payee-categories", {
  all: () => ["payee-categories", "all"] as const,
  allWithCounts: () => ["payee-categories", "all-with-counts"] as const,
  detail: (id: number) => ["payee-categories", "detail", id] as const,
  slug: (slug: string) => ["payee-categories", "slug", slug] as const,
  defaultCategoriesStatus: () => ["payee-categories", "defaults", "status"] as const,
  availableDefaults: () => ["payee-categories", "defaults", "available"] as const,
  uncategorizedCount: () => ["payee-categories", "uncategorized-count"] as const,
  recommendation: (payeeId: number) => ["payee-categories", "recommendation", payeeId] as const,
  bulkRecommendations: (limit?: number) =>
    ["payee-categories", "bulk-recommendations", limit] as const,
});

// ================================================================================
// Queries
// ================================================================================

export const listPayeeCategories = () =>
  defineQuery<PayeeCategory[]>({
    queryKey: payeeCategoryKeys.all(),
    queryFn: () => trpc().payeeCategoriesRoutes.list.query(),
  });

export const listPayeeCategoriesWithCounts = () =>
  defineQuery<PayeeCategoryWithCounts[]>({
    queryKey: payeeCategoryKeys.allWithCounts(),
    queryFn: () => trpc().payeeCategoriesRoutes.listWithCounts.query(),
  });

export const getPayeeCategoryById = (id: number) =>
  defineQuery<PayeeCategory>({
    queryKey: payeeCategoryKeys.detail(id),
    queryFn: () => trpc().payeeCategoriesRoutes.getById.query({id}),
  });

export const getPayeeCategoryBySlug = (slug: string) =>
  defineQuery<PayeeCategory>({
    queryKey: payeeCategoryKeys.slug(slug),
    queryFn: () => trpc().payeeCategoriesRoutes.getBySlug.query({slug}),
  });

// ================================================================================
// Mutations
// ================================================================================

export const createPayeeCategory = defineMutation<NewPayeeCategory, PayeeCategory>({
  mutationFn: (input) => trpc().payeeCategoriesRoutes.create.mutate({...input}),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(payeeCategoryKeys.all());
    cachePatterns.invalidatePrefix(payeeCategoryKeys.allWithCounts());
    // Also invalidate payees queries since they include category info
    cachePatterns.invalidatePrefix(["payees"]);
  },
  successMessage: "Payee category created",
  errorMessage: "Failed to create payee category",
});

export const updatePayeeCategory = defineMutation<
  {id: number; name: string} & Partial<Omit<NewPayeeCategory, "name">>,
  PayeeCategory
>({
  mutationFn: (input) => trpc().payeeCategoriesRoutes.update.mutate(input),
  onSuccess: (_, variables) => {
    cachePatterns.invalidatePrefix(payeeCategoryKeys.all());
    cachePatterns.invalidatePrefix(payeeCategoryKeys.allWithCounts());
    cachePatterns.invalidatePrefix(payeeCategoryKeys.detail(variables.id));
    // Also invalidate payees queries since they include category info
    cachePatterns.invalidatePrefix(["payees"]);
  },
  successMessage: "Payee category updated",
  errorMessage: "Failed to update payee category",
});

export const savePayeeCategory = defineMutation<
  {name: string} & Partial<Omit<NewPayeeCategory, "name">> & {id?: number},
  PayeeCategory & {is_new?: boolean}
>({
  mutationFn: (input) => trpc().payeeCategoriesRoutes.save.mutate(input),
  onSuccess: (_, variables) => {
    cachePatterns.invalidatePrefix(payeeCategoryKeys.all());
    cachePatterns.invalidatePrefix(payeeCategoryKeys.allWithCounts());
    if (variables.id) {
      cachePatterns.invalidatePrefix(payeeCategoryKeys.detail(variables.id));
    }
    // Also invalidate payees queries since they include category info
    cachePatterns.invalidatePrefix(["payees"]);
  },
  successMessage: (data) => (data.is_new ? "Payee category created" : "Payee category updated"),
  errorMessage: "Failed to save payee category",
});

export const deletePayeeCategory = defineMutation<number, {success: boolean}>({
  mutationFn: (id) => trpc().payeeCategoriesRoutes.delete.mutate({id}),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(payeeCategoryKeys.all());
    cachePatterns.invalidatePrefix(payeeCategoryKeys.allWithCounts());
    // Also invalidate payees queries since they include category info
    cachePatterns.invalidatePrefix(["payees"]);
  },
  successMessage: "Payee category deleted",
  errorMessage: "Failed to delete payee category",
});

export const bulkDeletePayeeCategories = defineMutation<
  number[],
  {deletedCount: number; errors: string[]}
>({
  mutationFn: (ids) => trpc().payeeCategoriesRoutes.bulkDelete.mutate({entities: ids}),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(payeeCategoryKeys.all());
    cachePatterns.invalidatePrefix(payeeCategoryKeys.allWithCounts());
    // Also invalidate payees queries since they include category info
    cachePatterns.invalidatePrefix(["payees"]);
  },
  successMessage: (data) =>
    `${data.deletedCount} payee ${data.deletedCount === 1 ? "category" : "categories"} deleted`,
  errorMessage: "Failed to delete payee categories",
});

export const reorderPayeeCategories = defineMutation<
  {updates: Array<{id: number; displayOrder: number}>},
  {success: boolean}
>({
  mutationFn: (input) => trpc().payeeCategoriesRoutes.reorder.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(payeeCategoryKeys.all());
    cachePatterns.invalidatePrefix(payeeCategoryKeys.allWithCounts());
  },
  successMessage: "Payee categories reordered",
  errorMessage: "Failed to reorder payee categories",
});

// ================================================================================
// Default Categories
// ================================================================================

export const getDefaultPayeeCategoriesStatus = () =>
  defineQuery<{
    total: number;
    installed: number;
    available: number;
    categories: Array<{
      name: string;
      slug: string;
      description: string;
      icon: string | null;
      installed: boolean;
    }>;
  }>({
    queryKey: payeeCategoryKeys.defaultCategoriesStatus(),
    queryFn: () => trpc().payeeCategoriesRoutes.defaultPayeeCategoriesStatus.query(),
  });

export const seedDefaultPayeeCategories = defineMutation<
  {slugs?: string[]},
  {created: number; skipped: number; errors: string[]}
>({
  mutationFn: (input) => trpc().payeeCategoriesRoutes.seedDefaults.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(payeeCategoryKeys.all());
    cachePatterns.invalidatePrefix(payeeCategoryKeys.allWithCounts());
    cachePatterns.invalidatePrefix(payeeCategoryKeys.defaultCategoriesStatus());
  },
  successMessage: (data) => {
    if (data.created > 0) {
      return `Added ${data.created} default ${data.created === 1 ? "category" : "categories"}`;
    }
    return "No new categories to add";
  },
  errorMessage: "Failed to add default payee categories",
});

// ================================================================================
// Recommendations
// ================================================================================

export interface PayeeCategoryRecommendation {
  payeeId: number;
  payeeName: string;
  recommendedCategoryId: number | null;
  categoryName: string | null;
  confidence: number;
  reasoning: string;
  supportingFactors: string[];
  alternativeCategories: Array<{
    id: number;
    name: string;
    confidence: number;
  }>;
}

export const getUncategorizedPayeesCount = () =>
  defineQuery<number>({
    queryKey: payeeCategoryKeys.uncategorizedCount(),
    queryFn: () => trpc().payeeCategoriesRoutes.getUncategorizedCount.query(),
  });

export const getPayeeCategoryRecommendation = (payeeId: number) =>
  defineQuery<PayeeCategoryRecommendation>({
    queryKey: payeeCategoryKeys.recommendation(payeeId),
    queryFn: () => trpc().payeeCategoriesRoutes.getRecommendation.query({payeeId}),
  });

export const getBulkPayeeCategoryRecommendations = (limit?: number) =>
  defineQuery<PayeeCategoryRecommendation[]>({
    queryKey: payeeCategoryKeys.bulkRecommendations(limit),
    queryFn: () => trpc().payeeCategoriesRoutes.getBulkRecommendations.query({limit}),
  });

export const bulkAssignPayeeCategories = defineMutation<
  {payeeIds: number[]; categoryId: number},
  {success: boolean; updatedCount: number}
>({
  mutationFn: (input) => trpc().payeeCategoriesRoutes.bulkAssignPayees.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(payeeCategoryKeys.allWithCounts());
    cachePatterns.invalidatePrefix(payeeCategoryKeys.uncategorizedCount());
    cachePatterns.invalidatePrefix(payeeCategoryKeys.bulkRecommendations());
    // Also invalidate payees queries since they now have categories
    cachePatterns.invalidatePrefix(["payees"]);
  },
  successMessage: (data) =>
    `${data.updatedCount} ${data.updatedCount === 1 ? "payee" : "payees"} assigned to category`,
  errorMessage: "Failed to assign payees to category",
});
