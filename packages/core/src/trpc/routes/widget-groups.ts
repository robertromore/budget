import {
  dashboardGroupInstances,
  dashboards,
  dashboardWidgets,
  widgetSizeEnum,
  type WidgetSettings,
} from "$core/schema/dashboards";
import {
  dashboardWidgetGroupItems,
  dashboardWidgetGroups,
  type DashboardWidgetGroup,
  type DashboardWidgetGroupItem,
  type DashboardWidgetGroupWithItems,
} from "$core/schema/dashboard-widget-groups";
import { WIDGET_GROUP_PRESETS } from "$core/server/domains/dashboards";
import { publicProcedure, rateLimitedProcedure, t } from "$core/trpc";
import { slugify } from "$core/utils/string-utilities";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

async function loadGroupWithItems(
  db: any,
  groupId: number
): Promise<DashboardWidgetGroupWithItems | null> {
  const [group] = await db
    .select()
    .from(dashboardWidgetGroups)
    .where(eq(dashboardWidgetGroups.id, groupId))
    .limit(1);

  if (!group) return null;

  const items = await db
    .select()
    .from(dashboardWidgetGroupItems)
    .where(eq(dashboardWidgetGroupItems.groupId, groupId))
    .orderBy(asc(dashboardWidgetGroupItems.sortOrder));

  return { ...group, items };
}

async function generateUniqueGroupSlug(
  db: any,
  baseSlug: string,
  workspaceId: number
): Promise<string> {
  let slug = baseSlug;
  let suffix = 1;
  while (true) {
    const [existing] = await db
      .select({ id: dashboardWidgetGroups.id })
      .from(dashboardWidgetGroups)
      .where(
        and(
          eq(dashboardWidgetGroups.workspaceId, workspaceId),
          eq(dashboardWidgetGroups.slug, slug)
        )
      )
      .limit(1);
    if (!existing) return slug;
    slug = `${baseSlug}-${suffix}`;
    suffix++;
  }
}

async function assertGroupInWorkspace(
  db: any,
  groupId: number,
  workspaceId: number
): Promise<DashboardWidgetGroup> {
  const [group] = await db
    .select()
    .from(dashboardWidgetGroups)
    .where(
      and(
        eq(dashboardWidgetGroups.id, groupId),
        eq(dashboardWidgetGroups.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!group) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Widget group not found" });
  }
  return group;
}

async function seedSystemPresets(db: any, workspaceId: number): Promise<void> {
  const existing = await db
    .select({ slug: dashboardWidgetGroups.slug })
    .from(dashboardWidgetGroups)
    .where(
      and(
        eq(dashboardWidgetGroups.workspaceId, workspaceId),
        eq(dashboardWidgetGroups.isSystem, true)
      )
    );
  const existingSlugs = new Set(existing.map((r: { slug: string }) => r.slug));

  for (const preset of WIDGET_GROUP_PRESETS) {
    if (existingSlugs.has(preset.slug)) continue;
    const [created] = await db
      .insert(dashboardWidgetGroups)
      .values({
        workspaceId,
        name: preset.name,
        slug: preset.slug,
        description: preset.description,
        icon: preset.icon,
        isSystem: true,
      })
      .returning();
    if (!created) continue;
    if (preset.items.length > 0) {
      await db.insert(dashboardWidgetGroupItems).values(
        preset.items.map((item) => ({
          groupId: created.id,
          widgetType: item.widgetType,
          title: item.title ?? null,
          size: item.size,
          columnSpan: item.columnSpan,
          sortOrder: item.sortOrder,
          settings: item.settings ?? null,
        }))
      );
    }
  }
}

const itemInputSchema = z.object({
  widgetType: z.string().min(1),
  title: z.union([z.string().max(100), z.null()]).optional(),
  size: z.enum(widgetSizeEnum).optional(),
  columnSpan: z.number().int().min(1).max(4).optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  settings: z.record(z.string(), z.unknown()).or(z.null()).optional(),
});

export const widgetGroupRoutes = t.router({
  list: publicProcedure.query(async ({ ctx }) => {
    await seedSystemPresets(ctx.db, ctx.workspaceId);

    const groups = await ctx.db
      .select()
      .from(dashboardWidgetGroups)
      .where(eq(dashboardWidgetGroups.workspaceId, ctx.workspaceId))
      .orderBy(asc(dashboardWidgetGroups.isSystem), asc(dashboardWidgetGroups.name));

    const withCounts: Array<DashboardWidgetGroup & { itemCount: number; previewTypes: string[] }> =
      [];
    for (const g of groups) {
      const items = await ctx.db
        .select({ widgetType: dashboardWidgetGroupItems.widgetType })
        .from(dashboardWidgetGroupItems)
        .where(eq(dashboardWidgetGroupItems.groupId, g.id))
        .orderBy(asc(dashboardWidgetGroupItems.sortOrder))
        .limit(6);
      withCounts.push({
        ...g,
        itemCount: items.length,
        previewTypes: items.map((i: { widgetType: string }) => i.widgetType),
      });
    }
    return withCounts;
  }),

  get: publicProcedure
    .input(z.object({ id: z.coerce.number().optional(), slug: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      await seedSystemPresets(ctx.db, ctx.workspaceId);

      let group: DashboardWidgetGroup | undefined;
      if (input.id) {
        const [g] = await ctx.db
          .select()
          .from(dashboardWidgetGroups)
          .where(
            and(
              eq(dashboardWidgetGroups.id, input.id),
              eq(dashboardWidgetGroups.workspaceId, ctx.workspaceId)
            )
          )
          .limit(1);
        group = g;
      } else if (input.slug) {
        const [g] = await ctx.db
          .select()
          .from(dashboardWidgetGroups)
          .where(
            and(
              eq(dashboardWidgetGroups.slug, input.slug),
              eq(dashboardWidgetGroups.workspaceId, ctx.workspaceId)
            )
          )
          .limit(1);
        group = g;
      } else {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Either id or slug is required" });
      }

      if (!group) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Widget group not found" });
      }

      const items = await ctx.db
        .select()
        .from(dashboardWidgetGroupItems)
        .where(eq(dashboardWidgetGroupItems.groupId, group.id))
        .orderBy(asc(dashboardWidgetGroupItems.sortOrder));

      return { ...group, items } as DashboardWidgetGroupWithItems;
    }),

  create: rateLimitedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.union([z.string().max(500), z.null()]).optional(),
        icon: z.union([z.string().max(50), z.null()]).optional(),
        items: z.array(itemInputSchema).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const slug = await generateUniqueGroupSlug(ctx.db, slugify(input.name), ctx.workspaceId);

      const [created] = await ctx.db
        .insert(dashboardWidgetGroups)
        .values({
          workspaceId: ctx.workspaceId,
          name: input.name,
          slug,
          description: input.description ?? null,
          icon: input.icon ?? null,
          isSystem: false,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create widget group",
        });
      }

      if (input.items && input.items.length > 0) {
        await ctx.db.insert(dashboardWidgetGroupItems).values(
          input.items.map((item, index) => ({
            groupId: created.id,
            widgetType: item.widgetType,
            title: item.title ?? null,
            size: item.size ?? "medium",
            columnSpan: item.columnSpan ?? 1,
            sortOrder: item.sortOrder ?? index,
            settings: (item.settings as WidgetSettings | null | undefined) ?? null,
          }))
        );
      }

      return (await loadGroupWithItems(ctx.db, created.id))!;
    }),

  update: rateLimitedProcedure
    .input(
      z.object({
        id: z.number().nonnegative(),
        name: z.string().min(1).max(100).optional(),
        description: z.union([z.string().max(500), z.null()]).optional(),
        icon: z.union([z.string().max(50), z.null()]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const group = await assertGroupInWorkspace(ctx.db, input.id, ctx.workspaceId);
      if (group.isSystem) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "System presets can't be edited — duplicate it first.",
        });
      }

      const now = new Date().toISOString();
      const [updated] = await ctx.db
        .update(dashboardWidgetGroups)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.icon !== undefined ? { icon: input.icon } : {}),
          updatedAt: now,
        })
        .where(
          and(
            eq(dashboardWidgetGroups.id, input.id),
            eq(dashboardWidgetGroups.workspaceId, ctx.workspaceId)
          )
        )
        .returning();

      return updated!;
    }),

  delete: rateLimitedProcedure
    .input(z.object({ id: z.number().nonnegative() }))
    .mutation(async ({ ctx, input }) => {
      const group = await assertGroupInWorkspace(ctx.db, input.id, ctx.workspaceId);
      if (group.isSystem) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "System presets can't be deleted — duplicate it first.",
        });
      }

      const [deleted] = await ctx.db
        .delete(dashboardWidgetGroups)
        .where(
          and(
            eq(dashboardWidgetGroups.id, input.id),
            eq(dashboardWidgetGroups.workspaceId, ctx.workspaceId)
          )
        )
        .returning();

      return deleted!;
    }),

  duplicate: rateLimitedProcedure
    .input(z.object({ id: z.number().nonnegative(), name: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const source = await loadGroupWithItems(ctx.db, input.id);
      if (!source || source.workspaceId !== ctx.workspaceId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Widget group not found" });
      }

      const baseName = input.name ?? `${source.name} (Copy)`;
      const slug = await generateUniqueGroupSlug(
        ctx.db,
        slugify(baseName),
        ctx.workspaceId
      );

      const [created] = await ctx.db
        .insert(dashboardWidgetGroups)
        .values({
          workspaceId: ctx.workspaceId,
          name: baseName,
          slug,
          description: source.description,
          icon: source.icon,
          isSystem: false,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to duplicate widget group",
        });
      }

      if (source.items.length > 0) {
        await ctx.db.insert(dashboardWidgetGroupItems).values(
          source.items.map((item: DashboardWidgetGroupItem) => ({
            groupId: created.id,
            widgetType: item.widgetType,
            title: item.title,
            size: item.size,
            columnSpan: item.columnSpan,
            sortOrder: item.sortOrder,
            settings: item.settings,
          }))
        );
      }

      return (await loadGroupWithItems(ctx.db, created.id))!;
    }),

  addItem: rateLimitedProcedure
    .input(
      z.object({
        groupId: z.number().nonnegative(),
        widgetType: z.string().min(1),
        title: z.union([z.string().max(100), z.null()]).optional(),
        size: z.enum(widgetSizeEnum).optional(),
        columnSpan: z.number().int().min(1).max(4).optional(),
        settings: z.record(z.string(), z.unknown()).or(z.null()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const group = await assertGroupInWorkspace(ctx.db, input.groupId, ctx.workspaceId);
      if (group.isSystem) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "System presets can't be modified — duplicate it first.",
        });
      }

      const existing = await ctx.db
        .select({ sortOrder: dashboardWidgetGroupItems.sortOrder })
        .from(dashboardWidgetGroupItems)
        .where(eq(dashboardWidgetGroupItems.groupId, input.groupId))
        .orderBy(asc(dashboardWidgetGroupItems.sortOrder));

      const maxSort =
        existing.length > 0 ? existing[existing.length - 1]!.sortOrder : -1;

      const [item] = await ctx.db
        .insert(dashboardWidgetGroupItems)
        .values({
          groupId: input.groupId,
          widgetType: input.widgetType,
          title: input.title ?? null,
          size: input.size ?? "medium",
          columnSpan: input.columnSpan ?? 1,
          sortOrder: maxSort + 1,
          settings: (input.settings as WidgetSettings | null | undefined) ?? null,
        })
        .returning();

      return item!;
    }),

  updateItem: rateLimitedProcedure
    .input(
      z.object({
        id: z.number().nonnegative(),
        title: z.union([z.string().max(100), z.null()]).optional(),
        size: z.enum(widgetSizeEnum).optional(),
        columnSpan: z.number().int().min(1).max(4).optional(),
        settings: z.record(z.string(), z.unknown()).or(z.null()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [item] = await ctx.db
        .select()
        .from(dashboardWidgetGroupItems)
        .where(eq(dashboardWidgetGroupItems.id, input.id))
        .limit(1);
      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Group item not found" });
      }
      const group = await assertGroupInWorkspace(ctx.db, item.groupId, ctx.workspaceId);
      if (group.isSystem) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "System presets can't be modified — duplicate it first.",
        });
      }

      const { id, ...data } = input;
      const [updated] = await ctx.db
        .update(dashboardWidgetGroupItems)
        .set(data)
        .where(eq(dashboardWidgetGroupItems.id, id))
        .returning();
      return updated!;
    }),

  removeItem: rateLimitedProcedure
    .input(z.object({ id: z.number().nonnegative() }))
    .mutation(async ({ ctx, input }) => {
      const [item] = await ctx.db
        .select()
        .from(dashboardWidgetGroupItems)
        .where(eq(dashboardWidgetGroupItems.id, input.id))
        .limit(1);
      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Group item not found" });
      }
      const group = await assertGroupInWorkspace(ctx.db, item.groupId, ctx.workspaceId);
      if (group.isSystem) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "System presets can't be modified — duplicate it first.",
        });
      }

      const [deleted] = await ctx.db
        .delete(dashboardWidgetGroupItems)
        .where(eq(dashboardWidgetGroupItems.id, input.id))
        .returning();
      return deleted!;
    }),

  reorderItems: rateLimitedProcedure
    .input(
      z.object({
        groupId: z.number().nonnegative(),
        itemIds: z.array(z.number().nonnegative()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const group = await assertGroupInWorkspace(ctx.db, input.groupId, ctx.workspaceId);
      if (group.isSystem) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "System presets can't be modified — duplicate it first.",
        });
      }

      for (let i = 0; i < input.itemIds.length; i++) {
        await ctx.db
          .update(dashboardWidgetGroupItems)
          .set({ sortOrder: i })
          .where(
            and(
              eq(dashboardWidgetGroupItems.id, input.itemIds[i]!),
              eq(dashboardWidgetGroupItems.groupId, input.groupId)
            )
          );
      }

      return { success: true };
    }),

  applyToDashboard: rateLimitedProcedure
    .input(
      z.object({
        groupId: z.number().nonnegative(),
        dashboardId: z.number().nonnegative(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const group = await assertGroupInWorkspace(ctx.db, input.groupId, ctx.workspaceId);

      const [dashboard] = await ctx.db
        .select()
        .from(dashboards)
        .where(
          and(
            eq(dashboards.id, input.dashboardId),
            eq(dashboards.workspaceId, ctx.workspaceId),
            isNull(dashboards.deletedAt)
          )
        )
        .limit(1);
      if (!dashboard) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Dashboard not found" });
      }

      const items = await ctx.db
        .select()
        .from(dashboardWidgetGroupItems)
        .where(eq(dashboardWidgetGroupItems.groupId, group.id))
        .orderBy(asc(dashboardWidgetGroupItems.sortOrder));

      if (items.length === 0) {
        return {
          addedCount: 0,
          widgetIds: [] as number[],
          groupInstanceId: null as number | null,
        };
      }

      // Max slot order across standalone widgets + group instances, so the
      // new group instance lands at the end of the dashboard's slot sequence.
      const standaloneOrders = await ctx.db
        .select({ sortOrder: dashboardWidgets.sortOrder })
        .from(dashboardWidgets)
        .where(
          and(
            eq(dashboardWidgets.dashboardId, dashboard.id),
            isNull(dashboardWidgets.groupInstanceId)
          )
        );
      const instanceOrders = await ctx.db
        .select({ sortOrder: dashboardGroupInstances.sortOrder })
        .from(dashboardGroupInstances)
        .where(eq(dashboardGroupInstances.dashboardId, dashboard.id));
      const allOrders = [...standaloneOrders, ...instanceOrders].map(
        (r: { sortOrder: number }) => r.sortOrder
      );
      const maxInstanceSort = allOrders.length > 0 ? Math.max(...allOrders) : -1;

      const [instance] = await ctx.db
        .insert(dashboardGroupInstances)
        .values({
          dashboardId: dashboard.id,
          sourceGroupId: group.id,
          name: group.name,
          icon: group.icon,
          description: group.description,
          sortOrder: maxInstanceSort + 1,
        })
        .returning();

      if (!instance) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create group instance",
        });
      }

      const inserted = await ctx.db
        .insert(dashboardWidgets)
        .values(
          items.map((item: DashboardWidgetGroupItem, index: number) => ({
            dashboardId: dashboard.id,
            groupInstanceId: instance.id,
            widgetType: item.widgetType,
            title: item.title,
            size: item.size,
            columnSpan: item.columnSpan,
            sortOrder: index,
            settings: item.settings,
          }))
        )
        .returning({ id: dashboardWidgets.id });

      return {
        addedCount: inserted.length,
        widgetIds: inserted.map((r: { id: number }) => r.id),
        groupInstanceId: instance.id,
        groupName: group.name,
      };
    }),

  removeInstance: rateLimitedProcedure
    .input(z.object({ id: z.number().nonnegative() }))
    .mutation(async ({ ctx, input }) => {
      const [instance] = await ctx.db
        .select()
        .from(dashboardGroupInstances)
        .where(eq(dashboardGroupInstances.id, input.id))
        .limit(1);
      if (!instance) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });
      }

      const [dashboard] = await ctx.db
        .select({ id: dashboards.id })
        .from(dashboards)
        .where(
          and(
            eq(dashboards.id, instance.dashboardId),
            eq(dashboards.workspaceId, ctx.workspaceId)
          )
        )
        .limit(1);
      if (!dashboard) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });
      }

      const [deleted] = await ctx.db
        .delete(dashboardGroupInstances)
        .where(eq(dashboardGroupInstances.id, input.id))
        .returning();
      return deleted!;
    }),

  renameInstance: rateLimitedProcedure
    .input(
      z.object({
        id: z.number().nonnegative(),
        name: z.string().min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [instance] = await ctx.db
        .select()
        .from(dashboardGroupInstances)
        .where(eq(dashboardGroupInstances.id, input.id))
        .limit(1);
      if (!instance) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });
      }

      const [dashboard] = await ctx.db
        .select({ id: dashboards.id })
        .from(dashboards)
        .where(
          and(
            eq(dashboards.id, instance.dashboardId),
            eq(dashboards.workspaceId, ctx.workspaceId)
          )
        )
        .limit(1);
      if (!dashboard) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });
      }

      const now = new Date().toISOString();
      const [updated] = await ctx.db
        .update(dashboardGroupInstances)
        .set({ name: input.name, updatedAt: now })
        .where(eq(dashboardGroupInstances.id, input.id))
        .returning();
      return updated!;
    }),

  reorderInstanceWidgets: rateLimitedProcedure
    .input(
      z.object({
        instanceId: z.number().nonnegative(),
        widgetIds: z.array(z.number().nonnegative()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [instance] = await ctx.db
        .select()
        .from(dashboardGroupInstances)
        .where(eq(dashboardGroupInstances.id, input.instanceId))
        .limit(1);
      if (!instance) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });
      }

      const [dashboard] = await ctx.db
        .select({ id: dashboards.id })
        .from(dashboards)
        .where(
          and(
            eq(dashboards.id, instance.dashboardId),
            eq(dashboards.workspaceId, ctx.workspaceId)
          )
        )
        .limit(1);
      if (!dashboard) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });
      }

      const now = new Date().toISOString();
      for (let i = 0; i < input.widgetIds.length; i++) {
        await ctx.db
          .update(dashboardWidgets)
          .set({ sortOrder: i, updatedAt: now })
          .where(
            and(
              eq(dashboardWidgets.id, input.widgetIds[i]!),
              eq(dashboardWidgets.groupInstanceId, input.instanceId)
            )
          );
      }

      return { success: true };
    }),

  saveDashboardAsGroup: rateLimitedProcedure
    .input(
      z.object({
        dashboardId: z.number().nonnegative(),
        name: z.string().min(1).max(100),
        description: z.union([z.string().max(500), z.null()]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [dashboard] = await ctx.db
        .select()
        .from(dashboards)
        .where(
          and(
            eq(dashboards.id, input.dashboardId),
            eq(dashboards.workspaceId, ctx.workspaceId),
            isNull(dashboards.deletedAt)
          )
        )
        .limit(1);
      if (!dashboard) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Dashboard not found" });
      }

      const widgets = await ctx.db
        .select()
        .from(dashboardWidgets)
        .where(eq(dashboardWidgets.dashboardId, dashboard.id))
        .orderBy(asc(dashboardWidgets.sortOrder));

      const slug = await generateUniqueGroupSlug(
        ctx.db,
        slugify(input.name),
        ctx.workspaceId
      );

      const [created] = await ctx.db
        .insert(dashboardWidgetGroups)
        .values({
          workspaceId: ctx.workspaceId,
          name: input.name,
          slug,
          description: input.description ?? null,
          icon: dashboard.icon,
          isSystem: false,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save group",
        });
      }

      if (widgets.length > 0) {
        await ctx.db.insert(dashboardWidgetGroupItems).values(
          widgets.map((w: typeof dashboardWidgets.$inferSelect, index: number) => ({
            groupId: created.id,
            widgetType: w.widgetType,
            title: w.title,
            size: w.size,
            columnSpan: w.columnSpan,
            sortOrder: index,
            settings: w.settings,
          }))
        );
      }

      return (await loadGroupWithItems(ctx.db, created.id))!;
    }),

  presets: publicProcedure.query(() =>
    WIDGET_GROUP_PRESETS.map((p) => ({
      slug: p.slug,
      name: p.name,
      description: p.description,
      icon: p.icon,
      itemCount: p.items.length,
    }))
  ),
});
