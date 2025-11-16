import {
  formInsertCategorySchema,
  removeCategoriesSchema,
  removeCategorySchema,
} from "$lib/schema";
import { categoryIdSchema, searchCategoriesSchema } from "$lib/server/domains/categories";
import { serviceFactory } from "$lib/server/shared/container/service-factory";
import { bulkOperationProcedure, publicProcedure, rateLimitedProcedure, t } from "$lib/trpc";
import { withErrorHandler } from "$lib/trpc/shared/errors";
import { z } from "zod";

const categoryService = serviceFactory.getCategoryService();

export const categoriesRoutes = t.router({
  all: publicProcedure.query(
    withErrorHandler(async ({ ctx }) => categoryService.getAllCategories(ctx.workspaceId))
  ),

  allWithStats: publicProcedure.query(
    withErrorHandler(async ({ ctx }) => categoryService.getAllCategoriesWithStats(ctx.workspaceId))
  ),

  allWithGroups: publicProcedure.query(
    withErrorHandler(async ({ ctx }) => categoryService.getAllCategoriesWithGroups(ctx.workspaceId))
  ),

  load: publicProcedure
    .input(categoryIdSchema)
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        categoryService.getCategoryById(input.id, ctx.workspaceId)
      )
    ),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        categoryService.getCategoryBySlug(input.slug, ctx.workspaceId)
      )
    ),

  search: publicProcedure
    .input(searchCategoriesSchema)
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        categoryService.searchCategories(input.query, ctx.workspaceId)
      )
    ),

  remove: rateLimitedProcedure
    .input(removeCategorySchema)
    .mutation(
      withErrorHandler(async ({ input, ctx }) =>
        categoryService.deleteCategory(input.id, ctx.workspaceId, { force: false })
      )
    ),

  delete: bulkOperationProcedure.input(removeCategoriesSchema).mutation(
    withErrorHandler(async ({ input: { entities }, ctx }) => {
      const result = await categoryService.bulkDeleteCategories(entities, ctx.workspaceId, {
        force: false,
      });
      return {
        deletedCount: result.deletedCount,
        errors: result.errors,
      };
    })
  ),

  save: rateLimitedProcedure.input(formInsertCategorySchema).mutation(
    withErrorHandler(async ({ input, ctx }) => {
      const {
        id,
        name,
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
      } = input;

      if (id) {
        // Update existing category
        const category = await categoryService.updateCategory(
          id,
          {
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
          },
          ctx.workspaceId
        );
        (category as any).is_new = false; // Maintain compatibility with existing UI
        return category;
      } else {
        // Create new category - name is guaranteed to be non-null by Zod validation
        const category = await categoryService.createCategory(
          {
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
          },
          ctx.workspaceId
        );
        (category as any).is_new = true; // Maintain compatibility with existing UI
        return category;
      }
    })
  ),

  reorder: bulkOperationProcedure
    .input(
      z.object({
        updates: z
          .array(
            z.object({
              id: z.number().positive(),
              displayOrder: z.number().min(0),
            })
          )
          .min(1),
      })
    )
    .mutation(
      withErrorHandler(async ({ input, ctx }) => {
        const result = await categoryService.bulkUpdateDisplayOrder(input.updates, ctx.workspaceId);
        return {
          updatedCount: result.updatedCount,
          errors: result.errors,
        };
      })
    ),

  allWithBudgets: publicProcedure.query(
    withErrorHandler(async ({ ctx }) =>
      categoryService.getAllCategoriesWithBudgets(ctx.workspaceId)
    )
  ),

  loadWithBudgets: publicProcedure
    .input(categoryIdSchema)
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        categoryService.getCategoryByIdWithBudgets(input.id, ctx.workspaceId)
      )
    ),

  getBySlugWithBudgets: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        categoryService.getCategoryBySlugWithBudgets(input.slug, ctx.workspaceId)
      )
    ),

  rootCategories: publicProcedure.query(
    withErrorHandler(async ({ ctx }) => categoryService.getRootCategories(ctx.workspaceId))
  ),

  categoryChildren: publicProcedure
    .input(categoryIdSchema)
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        categoryService.getCategoryChildren(input.id, ctx.workspaceId)
      )
    ),

  categoryWithChildren: publicProcedure
    .input(categoryIdSchema)
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        categoryService.getCategoryWithChildren(input.id, ctx.workspaceId)
      )
    ),

  hierarchyTree: publicProcedure.query(
    withErrorHandler(async ({ ctx }) => categoryService.getCategoryHierarchyTree(ctx.workspaceId))
  ),

  setParent: rateLimitedProcedure
    .input(
      z.object({
        categoryId: z.number().positive(),
        parentId: z.number().positive().nullable(),
      })
    )
    .mutation(
      withErrorHandler(async ({ input, ctx }) =>
        categoryService.setCategoryParent(input.categoryId, input.parentId, ctx.workspaceId)
      )
    ),

  seedDefaults: rateLimitedProcedure
    .input(
      z
        .object({
          slugs: z.array(z.string()).optional(),
        })
        .optional()
    )
    .mutation(
      withErrorHandler(async ({ input, ctx }) =>
        categoryService.seedDefaultCategories(ctx.workspaceId, input?.slugs)
      )
    ),

  defaultCategoriesStatus: publicProcedure.query(
    withErrorHandler(async ({ ctx }) => categoryService.getDefaultCategoriesStatus(ctx.workspaceId))
  ),

  availableDefaults: publicProcedure.query(
    withErrorHandler(async () => categoryService.getAvailableDefaultCategories())
  ),
});
