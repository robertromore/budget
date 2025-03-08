import { eq, sql } from "drizzle-orm";
import { publicProcedure, t } from "../t";
import { z } from "zod";
import {
  insertViewSchema,
  removeViewSchema,
  removeViewsSchema,
  views,
  type View,
} from "$lib/schema";

export const viewsRoutes = t.router({
  all: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.select().from(views);
    // return (await ctx.db.select().from(views)).map((view) => {
    //   return Object.assign({}, view, {
    //     filters: new SvelteMap(view.filters?.map((filter) => [filter.column, filter]))
    //   });
    // });
  }),
  load: publicProcedure.input(z.object({ id: z.coerce.number() })).query(async ({ ctx, input }) => {
    return (
      await ctx.db.query.views.findMany({
        where: eq(views.id, input.id),
      })
    )[0];
  }),
  remove: publicProcedure.input(removeViewSchema).mutation(async ({ ctx, input }) => {
    if (!input) throw new Error("id can't be null when deleting a view");
    return (await ctx.db.delete(views).where(eq(views.id, input.id)).returning())[0];
  }),
  delete: publicProcedure
    .input(removeViewsSchema)
    .mutation(async ({ input: { entities }, ctx: { db } }) => {
      return await db
        .delete(views)
        .where(sql`${views.id} in ${entities}`)
        .returning();
    }),
  save: publicProcedure
    .input(insertViewSchema)
    .mutation(async ({ input: { id, name, description, icon, filters, display }, ctx: { db } }) => {
      let entities;
      if (id) {
        entities = await db
          .update(views)
          .set({
            name,
            description,
            icon,
            filters,
            display,
          })
          .where(eq(views.id, id))
          .returning();
      } else {
        entities = await db
          .insert(views)
          .values({
            name,
            description,
            icon,
            filters,
            display,
          })
          .returning();
      }
      // console.log(entities);
      const entity = entities[0] as View;
      // entity.is_new = !!id;
      return entity;
    }),
});
