import {
  formInsertCategorySchema,
  removeCategoriesSchema,
  removeCategorySchema,
} from "$lib/schema";
import {publicProcedure, rateLimitedProcedure, bulkOperationProcedure, t} from "$lib/trpc";
import {z} from "zod";
import {TRPCError} from "@trpc/server";
import {CategoryService, categoryIdSchema, searchCategoriesSchema} from "$lib/server/domains/categories";
import {ValidationError, NotFoundError, ConflictError} from "$lib/server/shared/types/errors";

const categoryService = new CategoryService();

export const categoriesRoutes = t.router({
  all: publicProcedure.query(async () => {
    try {
      return await categoryService.getAllCategories();
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to fetch categories",
      });
    }
  }),

  load: publicProcedure.input(categoryIdSchema).query(async ({input}) => {
    try {
      return await categoryService.getCategoryById(input.id);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: error.message,
        });
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to load category",
      });
    }
  }),

  getBySlug: publicProcedure.input(z.object({slug: z.string()})).query(async ({input}) => {
    try {
      return await categoryService.getCategoryBySlug(input.slug);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: error.message,
        });
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to load category",
      });
    }
  }),

  search: publicProcedure.input(searchCategoriesSchema).query(async ({input}) => {
    try {
      return await categoryService.searchCategories(input.query);
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to search categories",
      });
    }
  }),

  remove: rateLimitedProcedure.input(removeCategorySchema).mutation(async ({input}) => {
    try {
      return await categoryService.deleteCategory(input.id, {force: false});
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: error.message,
        });
      }
      if (error instanceof ConflictError) {
        throw new TRPCError({
          code: "CONFLICT",
          message: error.message,
        });
      }
      if (error instanceof ValidationError) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message,
        });
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to delete category",
      });
    }
  }),

  delete: bulkOperationProcedure
    .input(removeCategoriesSchema)
    .mutation(async ({input: {entities}}) => {
      try {
        const result = await categoryService.bulkDeleteCategories(entities, {force: false});
        return {
          deletedCount: result.deletedCount,
          errors: result.errors,
        };
      } catch (error) {
        if (error instanceof ValidationError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to bulk delete categories",
        });
      }
    }),

  save: rateLimitedProcedure
    .input(formInsertCategorySchema)
    .mutation(async ({input}) => {
      try {
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
          if (!name) {
            throw new ValidationError("Category name is required");
          }
          const category = await categoryService.createCategory({
            name,
            notes: notes ?? null
          });
          (category as any).is_new = true; // Maintain compatibility with existing UI
          return category;
        }
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        if (error instanceof ConflictError) {
          throw new TRPCError({
            code: "CONFLICT",
            message: error.message,
          });
        }
        if (error instanceof ValidationError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to save category",
        });
      }
    }),

  reorder: bulkOperationProcedure
    .input(z.object({
      updates: z.array(z.object({
        id: z.number().positive(),
        displayOrder: z.number().min(0),
      })).min(1),
    }))
    .mutation(async ({input}) => {
      try {
        const result = await categoryService.bulkUpdateDisplayOrder(input.updates);
        return {
          updatedCount: result.updatedCount,
          errors: result.errors,
        };
      } catch (error) {
        if (error instanceof ValidationError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to reorder categories",
        });
      }
    }),
});
