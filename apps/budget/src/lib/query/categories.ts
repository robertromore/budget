import type { Category } from "$lib/schema/categories";
import { formInsertCategorySchema } from "$lib/schema/categories";
import type {
  CategoryWithBudgets,
  CategoryWithChildren,
  CategoryWithGroup,
  CategoryWithStats,
} from "$lib/server/domains/categories/repository";
import { trpc } from "$lib/trpc/client";
import type { CategoryTreeNode } from "$lib/types/categories";
import { z } from "zod";
import { cachePatterns } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

export const categoryKeys = createQueryKeys("categories", {
  all: () => ["categories", "all"] as const,
  allWithStats: () => ["categories", "all", "stats"] as const,
  allWithGroups: () => ["categories", "all", "groups"] as const,
  detail: (id: number) => ["categories", "detail", id] as const,
  search: (query: string) => ["categories", "search", query] as const,
  allWithBudgets: () => ["categories", "all", "budgets"] as const,
  detailWithBudgets: (id: number) => ["categories", "detail", id, "budgets"] as const,
  slugWithBudgets: (slug: string) => ["categories", "slug", slug, "budgets"] as const,
  rootCategories: () => ["categories", "roots"] as const,
  children: (parentId: number) => ["categories", "children", parentId] as const,
  withChildren: (id: number) => ["categories", "withChildren", id] as const,
  hierarchyTree: () => ["categories", "hierarchy"] as const,
  defaultCategoriesStatus: () => ["categories", "defaults", "status"] as const,
  availableDefaults: () => ["categories", "defaults", "available"] as const,
});

export const listCategories = () =>
  defineQuery<Category[]>({
    queryKey: categoryKeys.all(),
    queryFn: () => trpc().categoriesRoutes.all.query(),
  });

export const listCategoriesWithStats = () =>
  defineQuery<CategoryWithStats[]>({
    queryKey: categoryKeys.allWithStats(),
    queryFn: () => trpc().categoriesRoutes.allWithStats.query(),
  });

export const listCategoriesWithGroups = () =>
  defineQuery<CategoryWithGroup[]>({
    queryKey: categoryKeys.allWithGroups(),
    queryFn: () => trpc().categoriesRoutes.allWithGroups.query(),
  });

export const getCategoryById = (id: number) =>
  defineQuery<Category>({
    queryKey: categoryKeys.detail(id),
    queryFn: () => trpc().categoriesRoutes.load.query({ id }),
  });

export const searchCategories = (query: string) =>
  defineQuery<Category[]>({
    queryKey: categoryKeys.search(query),
    queryFn: () => trpc().categoriesRoutes.search.query({ query }),
  });

type FormCategoryInput = z.infer<typeof formInsertCategorySchema>;

export const createCategory = defineMutation<FormCategoryInput, Category>({
  mutationFn: (input) => trpc().categoriesRoutes.save.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(categoryKeys.all());
  },
  successMessage: "Category created",
  errorMessage: "Failed to create category",
});

export const updateCategory = defineMutation<FormCategoryInput, Category>({
  mutationFn: (input) => trpc().categoriesRoutes.save.mutate(input),
  onSuccess: (_, variables) => {
    cachePatterns.invalidatePrefix(categoryKeys.all());
    if (variables.id) {
      cachePatterns.invalidatePrefix(categoryKeys.detail(variables.id));
    }
  },
  successMessage: "Category updated",
  errorMessage: "Failed to update category",
});

export const deleteCategory = defineMutation<number, Category>({
  mutationFn: (id) => trpc().categoriesRoutes.remove.mutate({ id }),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(categoryKeys.all());
  },
  successMessage: "Category deleted",
  errorMessage: (error) => {
    // Preserve the actual error message from the server (e.g., "Cannot delete category with associated transactions")
    if (error instanceof Error) {
      return error.message;
    }
    return "Failed to delete category";
  },
});

export const bulkDeleteCategories = defineMutation<
  number[],
  { deletedCount: number; errors: any[] }
>({
  mutationFn: (entities) => trpc().categoriesRoutes.delete.mutate({ entities }),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(categoryKeys.all());
  },
  successMessage: "Categories deleted",
  errorMessage: "Failed to delete categories",
});

export const reorderCategories = defineMutation<
  Array<{ id: number; displayOrder: number }>,
  { updatedCount: number; errors: string[] }
>({
  mutationFn: (updates) => trpc().categoriesRoutes.reorder.mutate({ updates }),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(categoryKeys.all());
  },
  successMessage: "Categories reordered",
  errorMessage: "Failed to reorder categories",
});

export const listCategoriesWithBudgets = () =>
  defineQuery<CategoryWithBudgets[]>({
    queryKey: categoryKeys.allWithBudgets(),
    queryFn: () => trpc().categoriesRoutes.allWithBudgets.query(),
  });

export const getCategoryByIdWithBudgets = (id: number) =>
  defineQuery<CategoryWithBudgets>({
    queryKey: categoryKeys.detailWithBudgets(id),
    queryFn: () => trpc().categoriesRoutes.loadWithBudgets.query({ id }),
  });

export const getCategoryBySlugWithBudgets = (slug: string) =>
  defineQuery<CategoryWithBudgets>({
    queryKey: categoryKeys.slugWithBudgets(slug),
    queryFn: () => trpc().categoriesRoutes.getBySlugWithBudgets.query({ slug }),
  });

export const listRootCategories = () =>
  defineQuery<Category[]>({
    queryKey: categoryKeys.rootCategories(),
    queryFn: () => trpc().categoriesRoutes.rootCategories.query(),
  });

export const getCategoryChildren = (parentId: number) =>
  defineQuery<Category[]>({
    queryKey: categoryKeys.children(parentId),
    queryFn: () => trpc().categoriesRoutes.categoryChildren.query({ id: parentId }),
  });

export const getCategoryWithChildren = (id: number) =>
  defineQuery<CategoryWithChildren>({
    queryKey: categoryKeys.withChildren(id),
    queryFn: () => trpc().categoriesRoutes.categoryWithChildren.query({ id }),
  });

export const getCategoryHierarchyTree = () =>
  defineQuery<CategoryTreeNode[]>({
    queryKey: categoryKeys.hierarchyTree(),
    queryFn: () => trpc().categoriesRoutes.hierarchyTree.query(),
  });

export const setCategoryParent = defineMutation<
  { categoryId: number; parentId: number | null },
  Category
>({
  mutationFn: (input) => trpc().categoriesRoutes.setParent.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(categoryKeys.all());
    cachePatterns.invalidatePrefix(categoryKeys.hierarchyTree());
  },
  successMessage: "Category parent updated",
  errorMessage: "Failed to update category parent",
});

export const getDefaultCategoriesStatus = () =>
  defineQuery<{
    total: number;
    installed: number;
    available: number;
    categories: Array<{
      name: string;
      slug: string;
      categoryType: string;
      installed: boolean;
    }>;
  }>({
    queryKey: categoryKeys.defaultCategoriesStatus(),
    queryFn: () => trpc().categoriesRoutes.defaultCategoriesStatus.query(),
  });

export const seedDefaultCategories = defineMutation<
  { slugs?: string[] },
  { created: number; skipped: number; errors: string[] }
>({
  mutationFn: (input) => trpc().categoriesRoutes.seedDefaults.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(categoryKeys.all());
    cachePatterns.invalidatePrefix(categoryKeys.defaultCategoriesStatus());
  },
  successMessage: (data) => {
    if (data.created > 0) {
      return `Added ${data.created} default ${data.created === 1 ? "category" : "categories"}`;
    }
    return "No new categories to add";
  },
  errorMessage: "Failed to add default categories",
});
