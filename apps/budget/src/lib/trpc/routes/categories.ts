import {
  formInsertCategorySchema,
  removeCategoriesSchema,
  removeCategorySchema,
} from "$lib/schema";
import {publicProcedure, rateLimitedProcedure, bulkOperationProcedure, t} from "$lib/trpc";
import {z} from "zod";
import {TRPCError} from "@trpc/server";
import {categoryIdSchema, searchCategoriesSchema} from "$lib/server/domains/categories";
import {ValidationError, NotFoundError, ConflictError} from "$lib/server/shared/types/errors";
import {serviceFactory} from "$lib/server/shared/container/service-factory";

// PERFORMANCE: Services retrieved per-request to avoid module-level instantiation

export const categoriesRoutes = t.router({
  all: publicProcedure.query(async () => {
    try {
      const categoryService = serviceFactory.getCategoryService();
      return await categoryService.getAllCategories();
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to fetch categories",
      });
    }
  }),

  allWithStats: publicProcedure.query(async () => {
    try {
      const categoryService = serviceFactory.getCategoryService();
      return await categoryService.getAllCategoriesWithStats();
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to fetch categories with stats",
      });
    }
  }),

  load: publicProcedure.input(categoryIdSchema).query(async ({input}) => {
    try {
      const categoryService = serviceFactory.getCategoryService();
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
      const categoryService = serviceFactory.getCategoryService();
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
      const categoryService = serviceFactory.getCategoryService();
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
      const categoryService = serviceFactory.getCategoryService();
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
        const categoryService = serviceFactory.getCategoryService();
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
        const categoryService = serviceFactory.getCategoryService();
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
        const categoryService = serviceFactory.getCategoryService();
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

  allWithBudgets: publicProcedure.query(async () => {
    try {
      const categoryService = serviceFactory.getCategoryService();
      return await categoryService.getAllCategoriesWithBudgets();
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to fetch categories with budgets",
      });
    }
  }),

  loadWithBudgets: publicProcedure.input(categoryIdSchema).query(async ({input}) => {
    try {
      const categoryService = serviceFactory.getCategoryService();
      return await categoryService.getCategoryByIdWithBudgets(input.id);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: error.message,
        });
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to load category with budgets",
      });
    }
  }),

  getBySlugWithBudgets: publicProcedure.input(z.object({slug: z.string()})).query(async ({input}) => {
    try {
      const categoryService = serviceFactory.getCategoryService();
      return await categoryService.getCategoryBySlugWithBudgets(input.slug);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: error.message,
        });
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to load category with budgets",
      });
    }
  }),

  rootCategories: publicProcedure.query(async () => {
    try {
      const categoryService = serviceFactory.getCategoryService();
      return await categoryService.getRootCategories();
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to fetch root categories",
      });
    }
  }),

  categoryChildren: publicProcedure.input(categoryIdSchema).query(async ({input}) => {
    try {
      const categoryService = serviceFactory.getCategoryService();
      return await categoryService.getCategoryChildren(input.id);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: error.message,
        });
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to fetch category children",
      });
    }
  }),

  categoryWithChildren: publicProcedure.input(categoryIdSchema).query(async ({input}) => {
    try {
      const categoryService = serviceFactory.getCategoryService();
      return await categoryService.getCategoryWithChildren(input.id);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: error.message,
        });
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to fetch category with children",
      });
    }
  }),

  hierarchyTree: publicProcedure.query(async () => {
    try {
      const categoryService = serviceFactory.getCategoryService();
      return await categoryService.getCategoryHierarchyTree();
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to fetch category hierarchy",
      });
    }
  }),

  setParent: rateLimitedProcedure
    .input(z.object({
      categoryId: z.number().positive(),
      parentId: z.number().positive().nullable(),
    }))
    .mutation(async ({input}) => {
      try {
        const categoryService = serviceFactory.getCategoryService();
        return await categoryService.setCategoryParent(input.categoryId, input.parentId);
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
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
          message: error instanceof Error ? error.message : "Failed to set category parent",
        });
      }
    }),
});
