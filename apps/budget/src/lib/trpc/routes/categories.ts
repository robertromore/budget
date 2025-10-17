import {
  formInsertCategorySchema,
  removeCategoriesSchema,
  removeCategorySchema,
} from "$lib/schema";
import {publicProcedure, rateLimitedProcedure, bulkOperationProcedure, t} from "$lib/trpc";
import {z} from "zod";
import {categoryIdSchema, searchCategoriesSchema} from "$lib/server/domains/categories";
import {serviceFactory} from "$lib/server/shared/container/service-factory";
import {withErrorHandler} from "$lib/trpc/shared/errors";

const categoryService = serviceFactory.getCategoryService();

export const categoriesRoutes = t.router({
  all: publicProcedure.query(withErrorHandler(async () => categoryService.getAllCategories())),

  allWithStats: publicProcedure.query(withErrorHandler(async () => categoryService.getAllCategoriesWithStats())),

  load: publicProcedure.input(categoryIdSchema).query(withErrorHandler(async ({input}) => categoryService.getCategoryById(input.id))),

  getBySlug: publicProcedure.input(z.object({slug: z.string()})).query(withErrorHandler(async ({input}) => categoryService.getCategoryBySlug(input.slug))),

  search: publicProcedure.input(searchCategoriesSchema).query(withErrorHandler(async ({input}) => categoryService.searchCategories(input.query))),

  remove: rateLimitedProcedure.input(removeCategorySchema).mutation(withErrorHandler(async ({input}) => categoryService.deleteCategory(input.id, {force: false}))),

  delete: bulkOperationProcedure
    .input(removeCategoriesSchema)
    .mutation(withErrorHandler(async ({input: {entities}}) => {
      const result = await categoryService.bulkDeleteCategories(entities, {force: false});
      return {
        deletedCount: result.deletedCount,
        errors: result.errors,
      };
    })),

  save: rateLimitedProcedure
    .input(formInsertCategorySchema)
    .mutation(withErrorHandler(async ({input}) => {
      const {id, name, notes, categoryType, categoryIcon, categoryColor, isActive, displayOrder, isTaxDeductible, taxCategory, deductiblePercentage, isSeasonal, seasonalMonths, expectedMonthlyMin, expectedMonthlyMax, spendingPriority, incomeReliability} = input;

      if (id) {
        // Update existing category
        const category = await categoryService.updateCategory(id, {
          name: name ?? undefined,
          notes,
          categoryType,
          categoryIcon,
          categoryColor,
          isActive,
          displayOrder,
          isTaxDeductible,
          taxCategory,
          deductiblePercentage,
          isSeasonal,
          seasonalMonths,
          expectedMonthlyMin,
          expectedMonthlyMax,
          spendingPriority,
          incomeReliability,
        });
        (category as any).is_new = false; // Maintain compatibility with existing UI
        return category;
      } else {
        // Create new category - name is guaranteed to be non-null by Zod validation
        const category = await categoryService.createCategory({
          name: name!,
          notes: notes ?? null,
          categoryType,
          categoryIcon,
          categoryColor,
          isActive,
          displayOrder,
          isTaxDeductible,
          taxCategory,
          deductiblePercentage,
          isSeasonal,
          seasonalMonths,
          expectedMonthlyMin,
          expectedMonthlyMax,
          spendingPriority,
          incomeReliability,
        });
        (category as any).is_new = true; // Maintain compatibility with existing UI
        return category;
      }
    })),

  reorder: bulkOperationProcedure
    .input(z.object({
      updates: z.array(z.object({
        id: z.number().positive(),
        displayOrder: z.number().min(0),
      })).min(1),
    }))
    .mutation(withErrorHandler(async ({input}) => {
      const result = await categoryService.bulkUpdateDisplayOrder(input.updates);
      return {
        updatedCount: result.updatedCount,
        errors: result.errors,
      };
    })),

  allWithBudgets: publicProcedure.query(withErrorHandler(async () => categoryService.getAllCategoriesWithBudgets())),

  loadWithBudgets: publicProcedure.input(categoryIdSchema).query(withErrorHandler(async ({input}) => categoryService.getCategoryByIdWithBudgets(input.id))),

  getBySlugWithBudgets: publicProcedure.input(z.object({slug: z.string()})).query(withErrorHandler(async ({input}) => categoryService.getCategoryBySlugWithBudgets(input.slug))),

  rootCategories: publicProcedure.query(withErrorHandler(async () => categoryService.getRootCategories())),

  categoryChildren: publicProcedure.input(categoryIdSchema).query(withErrorHandler(async ({input}) => categoryService.getCategoryChildren(input.id))),

  categoryWithChildren: publicProcedure.input(categoryIdSchema).query(withErrorHandler(async ({input}) => categoryService.getCategoryWithChildren(input.id))),

  hierarchyTree: publicProcedure.query(withErrorHandler(async () => categoryService.getCategoryHierarchyTree())),

  setParent: rateLimitedProcedure
    .input(z.object({
      categoryId: z.number().positive(),
      parentId: z.number().positive().nullable(),
    }))
    .mutation(withErrorHandler(async ({input}) => categoryService.setCategoryParent(input.categoryId, input.parentId))),
});
