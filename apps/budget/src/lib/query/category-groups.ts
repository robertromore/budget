import type { Category } from "$lib/schema/categories";
import type {
  CategoryGroup,
  CategoryGroupRecommendation,
  CategoryGroupSettings,
  NewCategoryGroup,
} from "$lib/schema/category-groups";
import type { CategoryGroupWithCounts } from "$lib/server/domains/category-groups/repository";
import { trpc } from "$lib/trpc/client";
import { cachePatterns } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

// ================================================================================
// Query Keys
// ================================================================================

export const categoryGroupKeys = createQueryKeys("category-groups", {
  all: () => ["category-groups", "all"] as const,
  detail: (id: number) => ["category-groups", "detail", id] as const,
  slug: (slug: string) => ["category-groups", "slug", slug] as const,
  categories: (groupId: number) => ["category-groups", groupId, "categories"] as const,
  recommendations: () => ["category-groups", "recommendations"] as const,
  settings: () => ["category-groups", "settings"] as const,
});

// ================================================================================
// Queries
// ================================================================================

export const listCategoryGroups = () =>
  defineQuery<CategoryGroupWithCounts[]>({
    queryKey: categoryGroupKeys.all(),
    queryFn: () => trpc().categoryGroupsRoutes.list.query(),
  });

export const getCategoryGroupBySlug = (slug: string) =>
  defineQuery<CategoryGroup>({
    queryKey: categoryGroupKeys.slug(slug),
    queryFn: () => trpc().categoryGroupsRoutes.getBySlug.query({ slug }),
  });

export const getGroupCategories = (groupId: number) =>
  defineQuery<Category[]>({
    queryKey: categoryGroupKeys.categories(groupId),
    queryFn: () => trpc().categoryGroupsRoutes.getGroupCategories.query({ groupId }),
  });

export type CategoryGroupRecommendationWithName = CategoryGroupRecommendation & {
  categoryName: string | null;
};

export const listRecommendations = () =>
  defineQuery<CategoryGroupRecommendationWithName[]>({
    queryKey: categoryGroupKeys.recommendations(),
    queryFn: () => trpc().categoryGroupsRoutes.recommendationsList.query(),
  });

export const getCategoryGroupSettings = () =>
  defineQuery<CategoryGroupSettings>({
    queryKey: categoryGroupKeys.settings(),
    queryFn: () => trpc().categoryGroupsRoutes.settingsGet.query(),
  });

// ================================================================================
// Mutations - Category Groups
// ================================================================================

export const createCategoryGroup = defineMutation<NewCategoryGroup, CategoryGroup>({
  mutationFn: (input) => trpc().categoryGroupsRoutes.create.mutate({ ...input }),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(categoryGroupKeys.all());
  },
  successMessage: "Category group created",
  errorMessage: "Failed to create category group",
});

export const updateCategoryGroup = defineMutation<
  { id: number } & Partial<NewCategoryGroup>,
  CategoryGroup
>({
  mutationFn: (input) => trpc().categoryGroupsRoutes.update.mutate(input),
  onSuccess: (_, variables) => {
    cachePatterns.invalidatePrefix(categoryGroupKeys.all());
    cachePatterns.invalidatePrefix(categoryGroupKeys.detail(variables.id));
    // Also invalidate categories queries since they include group info
    cachePatterns.invalidatePrefix(["categories"]);
  },
  successMessage: "Category group updated",
  errorMessage: "Failed to update category group",
});

export const deleteCategoryGroup = defineMutation<number, { success: boolean }>({
  mutationFn: (id) => trpc().categoryGroupsRoutes.delete.mutate({ id }),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(categoryGroupKeys.all());
  },
  successMessage: "Category group deleted",
  errorMessage: "Failed to delete category group",
});

export const addCategoriesToGroup = defineMutation<
  { groupId: number; categoryIds: number[] },
  { success: boolean }
>({
  mutationFn: (input) => trpc().categoryGroupsRoutes.addCategories.mutate(input),
  onSuccess: (_, variables) => {
    cachePatterns.invalidatePrefix(categoryGroupKeys.categories(variables.groupId));
    cachePatterns.invalidatePrefix(categoryGroupKeys.all());
    cachePatterns.invalidatePrefix(["categories"]);
  },
  successMessage: "Categories added to group",
  errorMessage: "Failed to add categories",
});

export const removeCategoryFromGroup = defineMutation<{ categoryId: number }, { success: boolean }>(
  {
    mutationFn: (input) => trpc().categoryGroupsRoutes.removeCategory.mutate(input),
    onSuccess: () => {
      cachePatterns.invalidatePrefix(categoryGroupKeys.all());
      cachePatterns.invalidatePrefix(["categories"]);
    },
    successMessage: "Category removed from group",
    errorMessage: "Failed to remove category",
  }
);

export const moveCategoryToGroup = defineMutation<
  { categoryId: number; newGroupId: number },
  { success: boolean }
>({
  mutationFn: (input) => trpc().categoryGroupsRoutes.moveCategory.mutate(input),
  onSuccess: (_, variables) => {
    cachePatterns.invalidatePrefix(categoryGroupKeys.categories(variables.newGroupId));
    cachePatterns.invalidatePrefix(categoryGroupKeys.all());
    cachePatterns.invalidatePrefix(["categories"]);
  },
  successMessage: "Category moved to new group",
  errorMessage: "Failed to move category",
});

export const reorderGroups = defineMutation<
  { updates: Array<{ id: number; sortOrder: number }> },
  { success: boolean }
>({
  mutationFn: (input) => trpc().categoryGroupsRoutes.reorderGroups.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(categoryGroupKeys.all());
  },
  successMessage: "Groups reordered",
  errorMessage: "Failed to reorder groups",
});

// ================================================================================
// Mutations - Recommendations
// ================================================================================

export const generateRecommendations = defineMutation<void, CategoryGroupRecommendation[]>({
  mutationFn: () => trpc().categoryGroupsRoutes.recommendationsGenerate.mutate(),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(categoryGroupKeys.recommendations());
  },
  successMessage: "Recommendations generated",
  errorMessage: "Failed to generate recommendations",
});

export const approveRecommendation = defineMutation<number, { success: boolean }>({
  mutationFn: (id) => trpc().categoryGroupsRoutes.recommendationsApprove.mutate({ id }),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(categoryGroupKeys.recommendations());
    cachePatterns.invalidatePrefix(categoryGroupKeys.all());
    cachePatterns.invalidatePrefix(["categories"]);
  },
  successMessage: "Recommendation approved",
  errorMessage: "Failed to approve recommendation",
});

export const dismissRecommendation = defineMutation<number, { success: boolean }>({
  mutationFn: (id) => trpc().categoryGroupsRoutes.recommendationsDismiss.mutate({ id }),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(categoryGroupKeys.recommendations());
  },
  successMessage: "Recommendation dismissed",
  errorMessage: "Failed to dismiss recommendation",
});

export const rejectRecommendation = defineMutation<number, { success: boolean }>({
  mutationFn: (id) => trpc().categoryGroupsRoutes.recommendationsReject.mutate({ id }),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(categoryGroupKeys.recommendations());
  },
  successMessage: "Recommendation rejected",
  errorMessage: "Failed to reject recommendation",
});

// ================================================================================
// Mutations - Settings
// ================================================================================

export const updateCategoryGroupSettings = defineMutation<
  { recommendationsEnabled?: boolean; minConfidenceScore?: number },
  CategoryGroupSettings
>({
  mutationFn: (input) => trpc().categoryGroupsRoutes.settingsUpdate.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(categoryGroupKeys.settings());
  },
  successMessage: "Settings updated",
  errorMessage: "Failed to update settings",
});
