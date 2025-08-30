import {
  categories,
  removeCategorySchema,
  removeCategoriesSchema,
  type Category,
  categoryFormSchema,
} from "$lib/schema";
import { z } from "zod/v4";
import { publicProcedure } from "../orpc";
import { eq, sql, inArray, isNull } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

export const categoriesRoutes = {
  all: publicProcedure.handler(async ({ context }) => {
    return (await context.db.query.categories.findMany({
      where: isNull(categories.deletedAt),
      orderBy: [categories.name],
    })) as Category[];
  }),

  load: publicProcedure
    .input(z.object({ id: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      const category = await context.db.query.categories.findFirst({
        where: sql`${categories.id} = ${input.id} AND ${categories.deletedAt} IS NULL`,
      });

      if (!category) {
        throw new ORPCError("CATEGORY_NOT_FOUND", {
          message: "Category not found",
        });
      }

      return category as Category;
    }),

  save: publicProcedure.input(categoryFormSchema).handler(async ({ input, context }) => {
    if (input.id) {
      const result = await context.db
        .update(categories)
        .set(input)
        .where(eq(categories.id, input.id))
        .returning();
      if (!result[0]) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Failed to update category",
        });
      }
      return result[0];
    }

    const insertResult = await context.db.insert(categories).values(input).returning();
    if (!insertResult[0]) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Failed to create category",
      });
    }
    return insertResult[0];
  }),

  remove: publicProcedure.input(removeCategorySchema).handler(async ({ input, context }) => {
    if (!input) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Category ID is required for deletion",
      });
    }
    const result = await context.db
      .update(categories)
      .set({ deletedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(categories.id, input.id))
      .returning();
    if (!result[0]) {
      throw new ORPCError("NOT_FOUND", {
        message: "Category not found or could not be deleted",
      });
    }
    return result[0];
  }),

  removeMany: publicProcedure.input(removeCategoriesSchema).handler(async ({ input, context }) => {
    if (!input?.entities?.length) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Category IDs are required for deletion",
      });
    }
    const result = await context.db
      .update(categories)
      .set({ deletedAt: sql`CURRENT_TIMESTAMP` })
      .where(inArray(categories.id, input.entities))
      .returning();
    if (!result.length) {
      throw new ORPCError("NOT_FOUND", {
        message: "Categories not found or could not be deleted",
      });
    }
    return result;
  }),
};