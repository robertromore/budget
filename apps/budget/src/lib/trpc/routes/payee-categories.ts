import {
  formInsertPayeeCategorySchema,
  removePayeeCategorySchema,
  removePayeeCategoriesSchema,
} from "$lib/schema/payee-categories";
import {serviceFactory} from "$lib/server/shared/container/service-factory";
import {bulkOperationProcedure, publicProcedure, rateLimitedProcedure, t} from "$lib/trpc";
import {withErrorHandler} from "$lib/trpc/shared/errors";
import {z} from "zod";

const payeeCategoryService = serviceFactory.getPayeeCategoryService();

export const payeeCategoriesRoutes = t.router({
  // ================================================================================
  // Query Procedures
  // ================================================================================

  list: publicProcedure.query(
    withErrorHandler(async ({ctx}) => {
      return await payeeCategoryService.listCategories(ctx.workspaceId);
    })
  ),

  listWithCounts: publicProcedure.query(
    withErrorHandler(async ({ctx}) => {
      return await payeeCategoryService.listCategoriesWithCounts(ctx.workspaceId);
    })
  ),

  getById: publicProcedure
    .input(z.object({id: z.number().positive()}))
    .query(
      withErrorHandler(async ({input, ctx}) => {
        return await payeeCategoryService.getCategoryById(input.id, ctx.workspaceId);
      })
    ),

  getBySlug: publicProcedure
    .input(z.object({slug: z.string()}))
    .query(
      withErrorHandler(async ({input, ctx}) => {
        return await payeeCategoryService.getCategoryBySlug(input.slug, ctx.workspaceId);
      })
    ),

  // ================================================================================
  // Mutation Procedures
  // ================================================================================

  create: rateLimitedProcedure
    .input(formInsertPayeeCategorySchema)
    .mutation(
      withErrorHandler(async ({input, ctx}) => {
        const {name, description, icon, color, displayOrder, isActive} = input;

        const category = await payeeCategoryService.createCategory(
          {
            name: name!,
            description,
            icon,
            color,
            displayOrder,
            isActive,
          },
          ctx.workspaceId
        );

        return category;
      })
    ),

  update: rateLimitedProcedure
    .input(
      formInsertPayeeCategorySchema.extend({
        id: z.number().positive(),
      })
    )
    .mutation(
      withErrorHandler(async ({input, ctx}) => {
        const {id, name, description, icon, color, displayOrder, isActive} = input;

        return await payeeCategoryService.updateCategory(
          id,
          {
            name,
            description,
            icon,
            color,
            displayOrder,
            isActive,
          },
          ctx.workspaceId
        );
      })
    ),

  save: rateLimitedProcedure
    .input(
      formInsertPayeeCategorySchema.extend({
        id: z.number().positive().optional(),
      })
    )
    .mutation(
      withErrorHandler(async ({input, ctx}) => {
        const {id, name, description, icon, color, displayOrder, isActive} = input;

        if (id) {
          // Update existing
          const category = await payeeCategoryService.updateCategory(
            id,
            {
              name,
              description,
              icon,
              color,
              displayOrder,
              isActive,
            },
            ctx.workspaceId
          );
          (category as any).is_new = false;
          return category;
        } else {
          // Create new
          const category = await payeeCategoryService.createCategory(
            {
              name: name!,
              description,
              icon,
              color,
              displayOrder,
              isActive,
            },
            ctx.workspaceId
          );
          (category as any).is_new = true;
          return category;
        }
      })
    ),

  delete: rateLimitedProcedure
    .input(removePayeeCategorySchema)
    .mutation(
      withErrorHandler(async ({input, ctx}) => {
        await payeeCategoryService.deleteCategory(input.id, ctx.workspaceId);
        return {success: true};
      })
    ),

  bulkDelete: bulkOperationProcedure
    .input(removePayeeCategoriesSchema)
    .mutation(
      withErrorHandler(async ({input: {entities}, ctx}) => {
        let deletedCount = 0;
        const errors: string[] = [];

        for (const id of entities) {
          try {
            await payeeCategoryService.deleteCategory(id, ctx.workspaceId);
            deletedCount++;
          } catch (error) {
            errors.push(`Failed to delete category ${id}: ${error instanceof Error ? error.message : "Unknown error"}`);
          }
        }

        return {
          deletedCount,
          errors,
        };
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
      withErrorHandler(async ({input, ctx}) => {
        await payeeCategoryService.reorderCategories(input.updates, ctx.workspaceId);
        return {success: true};
      })
    ),

  // ================================================================================
  // Default Categories
  // ================================================================================

  seedDefaults: rateLimitedProcedure
    .input(
      z.object({
        slugs: z.array(z.string()).optional(),
      }).optional()
    )
    .mutation(
      withErrorHandler(async ({input, ctx}) => {
        return await payeeCategoryService.seedDefaultPayeeCategories(ctx.workspaceId, input?.slugs);
      })
    ),

  defaultPayeeCategoriesStatus: publicProcedure.query(
    withErrorHandler(async ({ctx}) => {
      return await payeeCategoryService.getDefaultPayeeCategoriesStatus(ctx.workspaceId);
    })
  ),

  availableDefaults: publicProcedure.query(
    withErrorHandler(async () => {
      return await payeeCategoryService.getAvailableDefaultPayeeCategories();
    })
  ),
});
