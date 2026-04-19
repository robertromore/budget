import {
  dashboardGroupInstances,
  dashboards,
  dashboardWidgets,
  insertDashboardSchema,
  insertDashboardWidgetSchema,
  removeDashboardSchema,
  removeDashboardWidgetSchema,
  reorderWidgetsSchema,
  type DashboardGroupInstance,
  type DashboardGroupInstanceWithWidgets,
  type DashboardWidget,
  type DashboardWithWidgets,
} from "$core/schema/dashboards";
import { workspaces } from "$core/schema/workspaces";
import { getTemplate, DASHBOARD_TEMPLATES } from "$core/server/domains/dashboards";
import { publicProcedure, rateLimitedProcedure, t } from "$core/trpc";
import { slugify } from "$core/utils/string-utilities";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

async function loadWidgetsAndInstances(
  db: any,
  dashboardId: number
): Promise<{
  widgets: DashboardWidget[];
  groupInstances: DashboardGroupInstanceWithWidgets[];
}> {
  const allWidgets: DashboardWidget[] = await db
    .select()
    .from(dashboardWidgets)
    .where(eq(dashboardWidgets.dashboardId, dashboardId))
    .orderBy(asc(dashboardWidgets.sortOrder));

  const instances: DashboardGroupInstance[] = await db
    .select()
    .from(dashboardGroupInstances)
    .where(eq(dashboardGroupInstances.dashboardId, dashboardId))
    .orderBy(asc(dashboardGroupInstances.sortOrder));

  const instanceWidgets = new Map<number, DashboardWidget[]>();
  const standalone: DashboardWidget[] = [];
  for (const w of allWidgets) {
    if (w.groupInstanceId !== null && w.groupInstanceId !== undefined) {
      const bucket = instanceWidgets.get(w.groupInstanceId) ?? [];
      bucket.push(w);
      instanceWidgets.set(w.groupInstanceId, bucket);
    } else {
      standalone.push(w);
    }
  }

  const groupInstances: DashboardGroupInstanceWithWidgets[] = instances.map(
    (inst) => ({
      ...inst,
      widgets: instanceWidgets.get(inst.id) ?? [],
    })
  );

  return { widgets: standalone, groupInstances };
}

async function loadDashboardWithWidgets(
  db: any,
  dashboardId: number
): Promise<DashboardWithWidgets | null> {
  const [dashboard] = await db
    .select()
    .from(dashboards)
    .where(and(eq(dashboards.id, dashboardId), isNull(dashboards.deletedAt)))
    .limit(1);

  if (!dashboard) return null;

  const { widgets, groupInstances } = await loadWidgetsAndInstances(db, dashboardId);
  return { ...dashboard, widgets, groupInstances };
}

async function getWorkspaceDefaultPriority(
  db: any,
  workspaceId: number
): Promise<DashboardWithWidgets["stylePriority"] | null> {
  const [row] = await db
    .select({ defaultStylePriority: workspaces.defaultStylePriority })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  return (row?.defaultStylePriority as DashboardWithWidgets["stylePriority"]) ?? null;
}

async function generateUniqueSlug(db: any, baseSlug: string, workspaceId: number): Promise<string> {
  let slug = baseSlug;
  let suffix = 1;

  while (true) {
    const [existing] = await db
      .select({ id: dashboards.id })
      .from(dashboards)
      .where(and(eq(dashboards.workspaceId, workspaceId), eq(dashboards.slug, slug)))
      .limit(1);

    if (!existing) return slug;
    slug = `${baseSlug}-${suffix}`;
    suffix++;
  }
}

export const dashboardRoutes = t.router({
  all: publicProcedure.query(async ({ ctx }) => {
    const results = await ctx.db
      .select()
      .from(dashboards)
      .where(
        and(
          eq(dashboards.workspaceId, ctx.workspaceId),
          eq(dashboards.isEnabled, true),
          isNull(dashboards.deletedAt)
        )
      )
      .orderBy(asc(dashboards.sortOrder));

    const withWidgets: DashboardWithWidgets[] = [];
    for (const d of results) {
      const { widgets, groupInstances } = await loadWidgetsAndInstances(ctx.db, d.id);
      withWidgets.push({ ...d, widgets, groupInstances });
    }
    return withWidgets;
  }),

  allIncludingDisabled: publicProcedure.query(async ({ ctx }) => {
    const results = await ctx.db
      .select()
      .from(dashboards)
      .where(
        and(eq(dashboards.workspaceId, ctx.workspaceId), isNull(dashboards.deletedAt))
      )
      .orderBy(asc(dashboards.sortOrder));

    const withWidgets: DashboardWithWidgets[] = [];
    for (const d of results) {
      const { widgets, groupInstances } = await loadWidgetsAndInstances(ctx.db, d.id);
      withWidgets.push({ ...d, widgets, groupInstances });
    }
    return withWidgets;
  }),

  load: publicProcedure
    .input(z.object({ id: z.coerce.number().optional(), slug: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      let condition;
      if (input.id) {
        condition = and(
          eq(dashboards.id, input.id),
          eq(dashboards.workspaceId, ctx.workspaceId),
          isNull(dashboards.deletedAt)
        );
      } else if (input.slug) {
        condition = and(
          eq(dashboards.slug, input.slug),
          eq(dashboards.workspaceId, ctx.workspaceId),
          isNull(dashboards.deletedAt)
        );
      } else {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Either id or slug is required" });
      }

      const [dashboard] = await ctx.db.select().from(dashboards).where(condition).limit(1);
      if (!dashboard) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Dashboard not found" });
      }

      const { widgets, groupInstances } = await loadWidgetsAndInstances(
        ctx.db,
        dashboard.id
      );
      return { ...dashboard, widgets, groupInstances } as DashboardWithWidgets;
    }),

  default: publicProcedure.query(async ({ ctx }) => {
    const [dashboard] = await ctx.db
      .select()
      .from(dashboards)
      .where(
        and(
          eq(dashboards.workspaceId, ctx.workspaceId),
          eq(dashboards.isDefault, true),
          isNull(dashboards.deletedAt)
        )
      )
      .limit(1);

    if (!dashboard) return null;

    const { widgets, groupInstances } = await loadWidgetsAndInstances(
      ctx.db,
      dashboard.id
    );
    return { ...dashboard, widgets, groupInstances } as DashboardWithWidgets;
  }),

  save: rateLimitedProcedure.input(insertDashboardSchema).mutation(async ({ ctx, input }) => {
    const now = new Date().toISOString();

    if (input.id) {
      // Update
      const [updated] = await ctx.db
        .update(dashboards)
        .set({
          name: input.name,
          slug: input.slug,
          description: input.description,
          icon: input.icon,
          sortOrder: input.sortOrder,
          isDefault: input.isDefault,
          isEnabled: input.isEnabled,
          layout: input.layout,
          stylePriority: input.stylePriority,
          updatedAt: now,
        })
        .where(
          and(eq(dashboards.id, input.id), eq(dashboards.workspaceId, ctx.workspaceId))
        )
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Dashboard not found" });
      }
      return updated;
    }

    // Create
    const slug = await generateUniqueSlug(ctx.db, slugify(input.name), ctx.workspaceId);
    const seedPriority =
      input.stylePriority !== undefined
        ? input.stylePriority
        : await getWorkspaceDefaultPriority(ctx.db, ctx.workspaceId);

    const [created] = await ctx.db
      .insert(dashboards)
      .values({
        name: input.name,
        slug,
        description: input.description,
        icon: input.icon,
        sortOrder: input.sortOrder ?? 0,
        isDefault: input.isDefault ?? false,
        isEnabled: input.isEnabled ?? true,
        layout: input.layout ?? { columns: 4, gap: "normal" },
        stylePriority: seedPriority,
        workspaceId: ctx.workspaceId,
      })
      .returning();

    if (!created) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create dashboard" });
    }

    return created;
  }),

  remove: rateLimitedProcedure.input(removeDashboardSchema).mutation(async ({ ctx, input }) => {
    // Prevent deleting the last dashboard
    const count = await ctx.db
      .select({ id: dashboards.id })
      .from(dashboards)
      .where(
        and(eq(dashboards.workspaceId, ctx.workspaceId), isNull(dashboards.deletedAt))
      );

    if (count.length <= 1) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot delete the last dashboard" });
    }

    const now = new Date().toISOString();
    const [deleted] = await ctx.db
      .update(dashboards)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(eq(dashboards.id, input.id), eq(dashboards.workspaceId, ctx.workspaceId))
      )
      .returning();

    if (!deleted) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Dashboard not found" });
    }

    // If the deleted dashboard was default, make the first remaining one default
    if (deleted.isDefault) {
      const [first] = await ctx.db
        .select()
        .from(dashboards)
        .where(
          and(eq(dashboards.workspaceId, ctx.workspaceId), isNull(dashboards.deletedAt))
        )
        .orderBy(asc(dashboards.sortOrder))
        .limit(1);

      if (first) {
        await ctx.db
          .update(dashboards)
          .set({ isDefault: true, updatedAt: now })
          .where(eq(dashboards.id, first.id));
      }
    }

    return deleted;
  }),

  setDefault: rateLimitedProcedure
    .input(z.object({ id: z.number().nonnegative() }))
    .mutation(async ({ ctx, input }) => {
      const now = new Date().toISOString();

      // Unset current default
      await ctx.db
        .update(dashboards)
        .set({ isDefault: false, updatedAt: now })
        .where(
          and(eq(dashboards.workspaceId, ctx.workspaceId), eq(dashboards.isDefault, true))
        );

      // Set new default
      const [updated] = await ctx.db
        .update(dashboards)
        .set({ isDefault: true, updatedAt: now })
        .where(
          and(eq(dashboards.id, input.id), eq(dashboards.workspaceId, ctx.workspaceId))
        )
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Dashboard not found" });
      }

      return updated;
    }),

  toggleEnabled: rateLimitedProcedure
    .input(z.object({ id: z.number().nonnegative() }))
    .mutation(async ({ ctx, input }) => {
      const [current] = await ctx.db
        .select()
        .from(dashboards)
        .where(
          and(
            eq(dashboards.id, input.id),
            eq(dashboards.workspaceId, ctx.workspaceId),
            isNull(dashboards.deletedAt)
          )
        )
        .limit(1);

      if (!current) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Dashboard not found" });
      }

      const now = new Date().toISOString();
      const [updated] = await ctx.db
        .update(dashboards)
        .set({ isEnabled: !current.isEnabled, updatedAt: now })
        .where(
          and(
            eq(dashboards.id, input.id),
            eq(dashboards.workspaceId, ctx.workspaceId)
          )
        )
        .returning();

      return updated!;
    }),

  clone: rateLimitedProcedure
    .input(z.object({ id: z.number().nonnegative() }))
    .mutation(async ({ ctx, input }) => {
      const source = await loadDashboardWithWidgets(ctx.db, input.id);
      if (!source) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Dashboard not found" });
      }

      const slug = await generateUniqueSlug(
        ctx.db,
        slugify(`${source.name} copy`),
        ctx.workspaceId
      );

      const [cloned] = await ctx.db
        .insert(dashboards)
        .values({
          name: `${source.name} (Copy)`,
          slug,
          description: source.description,
          icon: source.icon,
          sortOrder: source.sortOrder + 1,
          isDefault: false,
          isEnabled: true,
          layout: source.layout,
          workspaceId: ctx.workspaceId,
        })
        .returning();

      if (!cloned) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to clone dashboard",
        });
      }

      // Clone widgets
      if (source.widgets.length > 0) {
        await ctx.db.insert(dashboardWidgets).values(
          source.widgets.map((w) => ({
            dashboardId: cloned.id,
            widgetType: w.widgetType,
            title: w.title,
            size: w.size,
            sortOrder: w.sortOrder,
            columnSpan: w.columnSpan,
            settings: w.settings,
          }))
        );
      }

      return await loadDashboardWithWidgets(ctx.db, cloned.id);
    }),

  createFromTemplate: rateLimitedProcedure
    .input(z.object({ templateId: z.string(), name: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const template = getTemplate(input.templateId);
      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      }

      const name = input.name || template.name;
      const slug = await generateUniqueSlug(ctx.db, slugify(name), ctx.workspaceId);

      // Check if this is the first dashboard (make it default)
      const existing = await ctx.db
        .select({ id: dashboards.id })
        .from(dashboards)
        .where(
          and(eq(dashboards.workspaceId, ctx.workspaceId), isNull(dashboards.deletedAt))
        )
        .limit(1);

      const isFirst = existing.length === 0;
      const seedPriority = await getWorkspaceDefaultPriority(ctx.db, ctx.workspaceId);

      const [created] = await ctx.db
        .insert(dashboards)
        .values({
          name,
          slug,
          description: template.description,
          icon: template.icon,
          sortOrder: 0,
          isDefault: isFirst,
          isEnabled: true,
          layout: template.layout,
          stylePriority: seedPriority,
          workspaceId: ctx.workspaceId,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create dashboard from template",
        });
      }

      // Create widgets from template
      if (template.widgets.length > 0) {
        await ctx.db.insert(dashboardWidgets).values(
          template.widgets.map((w) => ({
            dashboardId: created.id,
            widgetType: w.widgetType,
            title: w.title ?? null,
            size: w.size,
            sortOrder: w.sortOrder,
            columnSpan: w.columnSpan,
            settings: w.settings ?? null,
          }))
        );
      }

      return await loadDashboardWithWidgets(ctx.db, created.id);
    }),

  restyleWidgets: rateLimitedProcedure
    .input(
      z.object({
        dashboardId: z.number().nonnegative(),
        updates: z.array(
          z.object({
            id: z.number().nonnegative(),
            widgetType: z.string().min(1).max(100),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify dashboard belongs to workspace.
      const [dashboard] = await ctx.db
        .select({ id: dashboards.id })
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

      if (input.updates.length === 0) {
        return { success: true, swappedCount: 0 };
      }

      // Tenancy defense-in-depth: every UPDATE is scoped via a subquery on
      // dashboardId so an attacker can't flip widget_type on a foreign
      // dashboard even by guessing widget ids.
      const now = new Date().toISOString();
      let swapped = 0;
      for (const update of input.updates) {
        const result = await ctx.db
          .update(dashboardWidgets)
          .set({ widgetType: update.widgetType, updatedAt: now })
          .where(
            and(
              eq(dashboardWidgets.id, update.id),
              eq(dashboardWidgets.dashboardId, input.dashboardId)
            )
          )
          .returning({ id: dashboardWidgets.id });
        if (result.length > 0) swapped += 1;
      }

      return { success: true, swappedCount: swapped };
    }),

  reorderSlots: rateLimitedProcedure
    .input(
      z.object({
        dashboardId: z.number().nonnegative(),
        slots: z.array(
          z.object({
            kind: z.enum(["widget", "group"]),
            id: z.number().nonnegative(),
          })
        ),
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

      const now = new Date().toISOString();
      for (let i = 0; i < input.slots.length; i++) {
        const slot = input.slots[i]!;
        if (slot.kind === "widget") {
          // Widget reorder only targets standalone widgets — grouped widgets
          // reorder via widgetGroupRoutes.reorderInstanceWidgets.
          await ctx.db
            .update(dashboardWidgets)
            .set({ sortOrder: i, updatedAt: now })
            .where(
              and(
                eq(dashboardWidgets.id, slot.id),
                eq(dashboardWidgets.dashboardId, input.dashboardId),
                isNull(dashboardWidgets.groupInstanceId)
              )
            );
        } else {
          await ctx.db
            .update(dashboardGroupInstances)
            .set({ sortOrder: i, updatedAt: now })
            .where(
              and(
                eq(dashboardGroupInstances.id, slot.id),
                eq(dashboardGroupInstances.dashboardId, input.dashboardId)
              )
            );
        }
      }

      return { success: true };
    }),

  reorderDashboards: rateLimitedProcedure
    .input(z.object({ dashboardIds: z.array(z.number().nonnegative()) }))
    .mutation(async ({ ctx, input }) => {
      const now = new Date().toISOString();
      for (let i = 0; i < input.dashboardIds.length; i++) {
        await ctx.db
          .update(dashboards)
          .set({ sortOrder: i, updatedAt: now })
          .where(
            and(
              eq(dashboards.id, input.dashboardIds[i]!),
              eq(dashboards.workspaceId, ctx.workspaceId)
            )
          );
      }
      return { success: true };
    }),

  templates: publicProcedure.query(() => {
    return DASHBOARD_TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      icon: t.icon,
      widgetCount: t.widgets.length,
    }));
  }),

  // --- Widget operations ---

  addWidget: rateLimitedProcedure
    .input(insertDashboardWidgetSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify dashboard belongs to workspace
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

      // Max slot order across standalone widgets + group instances, so the
      // new widget lands at the end of the visible top-level sequence.
      const standaloneOrders = await ctx.db
        .select({ sortOrder: dashboardWidgets.sortOrder })
        .from(dashboardWidgets)
        .where(
          and(
            eq(dashboardWidgets.dashboardId, input.dashboardId),
            isNull(dashboardWidgets.groupInstanceId)
          )
        );
      const instanceOrders = await ctx.db
        .select({ sortOrder: dashboardGroupInstances.sortOrder })
        .from(dashboardGroupInstances)
        .where(eq(dashboardGroupInstances.dashboardId, input.dashboardId));
      const allOrders = [...standaloneOrders, ...instanceOrders].map(
        (r: { sortOrder: number }) => r.sortOrder
      );
      const maxSort = allOrders.length > 0 ? Math.max(...allOrders) : -1;

      const [widget] = await ctx.db
        .insert(dashboardWidgets)
        .values({
          dashboardId: input.dashboardId,
          widgetType: input.widgetType,
          title: input.title ?? null,
          size: input.size ?? "medium",
          sortOrder: input.sortOrder ?? maxSort + 1,
          columnSpan: input.columnSpan ?? 1,
          settings: input.settings ?? null,
        })
        .returning();

      if (!widget) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add widget",
        });
      }

      return widget;
    }),

  updateWidget: rateLimitedProcedure
    .input(
      z.object({
        id: z.number().nonnegative(),
        title: z.union([z.string().max(100), z.null()]).optional(),
        size: z.enum(["small", "medium", "large", "full"]).optional(),
        columnSpan: z.number().int().min(1).max(4).optional(),
        settings: z.record(z.string(), z.unknown()).or(z.null()).optional(),
        stylePinned: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Verify widget's dashboard belongs to workspace
      const [widget] = await ctx.db
        .select()
        .from(dashboardWidgets)
        .where(eq(dashboardWidgets.id, id))
        .limit(1);

      if (!widget) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Widget not found" });
      }

      const [dashboard] = await ctx.db
        .select()
        .from(dashboards)
        .where(
          and(
            eq(dashboards.id, widget.dashboardId),
            eq(dashboards.workspaceId, ctx.workspaceId)
          )
        )
        .limit(1);

      if (!dashboard) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Dashboard not found" });
      }

      // Defense in depth: even though the SELECT above proved the widget
      // belongs to a dashboard in this workspace, scope the UPDATE itself
      // via a subquery on dashboards. That way a future refactor that skips
      // or reorders the SELECT cannot produce a cross-tenant write.
      const now = new Date().toISOString();
      const [updated] = await ctx.db
        .update(dashboardWidgets)
        .set({ ...data, updatedAt: now })
        .where(
          and(
            eq(dashboardWidgets.id, id),
            inArray(
              dashboardWidgets.dashboardId,
              ctx.db
                .select({ id: dashboards.id })
                .from(dashboards)
                .where(eq(dashboards.workspaceId, ctx.workspaceId))
            )
          )
        )
        .returning();

      return updated!;
    }),

  removeWidget: rateLimitedProcedure
    .input(removeDashboardWidgetSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify widget's dashboard belongs to workspace
      const [widget] = await ctx.db
        .select()
        .from(dashboardWidgets)
        .where(eq(dashboardWidgets.id, input.id))
        .limit(1);

      if (!widget) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Widget not found" });
      }

      const [dashboard] = await ctx.db
        .select()
        .from(dashboards)
        .where(
          and(
            eq(dashboards.id, widget.dashboardId),
            eq(dashboards.workspaceId, ctx.workspaceId)
          )
        )
        .limit(1);

      if (!dashboard) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Dashboard not found" });
      }

      // Defense-in-depth: DELETE is re-scoped via a subquery so the tenancy
      // check is enforced at the SQL level, not just by the preceding SELECTs.
      const [deleted] = await ctx.db
        .delete(dashboardWidgets)
        .where(
          and(
            eq(dashboardWidgets.id, input.id),
            inArray(
              dashboardWidgets.dashboardId,
              ctx.db
                .select({ id: dashboards.id })
                .from(dashboards)
                .where(eq(dashboards.workspaceId, ctx.workspaceId))
            )
          )
        )
        .returning();

      return deleted!;
    }),

  reorderWidgets: rateLimitedProcedure
    .input(reorderWidgetsSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify dashboard belongs to workspace
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

      const now = new Date().toISOString();

      // Scoped to standalone widgets only — widgets inside a group instance
      // reorder via widgetGroupRoutes.reorderInstanceWidgets.
      for (let i = 0; i < input.widgetIds.length; i++) {
        await ctx.db
          .update(dashboardWidgets)
          .set({ sortOrder: i, updatedAt: now })
          .where(
            and(
              eq(dashboardWidgets.id, input.widgetIds[i]!),
              eq(dashboardWidgets.dashboardId, input.dashboardId),
              isNull(dashboardWidgets.groupInstanceId)
            )
          );
      }

      return { success: true };
    }),

  ensureDefault: rateLimitedProcedure.mutation(async ({ ctx }) => {
    // Check if any dashboards exist
    const [existing] = await ctx.db
      .select({ id: dashboards.id })
      .from(dashboards)
      .where(
        and(eq(dashboards.workspaceId, ctx.workspaceId), isNull(dashboards.deletedAt))
      )
      .limit(1);

    if (existing) {
      // Already has dashboards, return default
      const [defaultDashboard] = await ctx.db
        .select()
        .from(dashboards)
        .where(
          and(
            eq(dashboards.workspaceId, ctx.workspaceId),
            eq(dashboards.isDefault, true),
            isNull(dashboards.deletedAt)
          )
        )
        .limit(1);

      if (defaultDashboard) {
        return await loadDashboardWithWidgets(ctx.db, defaultDashboard.id);
      }
    }

    // Create default "Home" dashboard from template
    const template = getTemplate("home")!;
    const slug = await generateUniqueSlug(ctx.db, "home", ctx.workspaceId);
    const seedPriority = await getWorkspaceDefaultPriority(ctx.db, ctx.workspaceId);

    const [created] = await ctx.db
      .insert(dashboards)
      .values({
        name: template.name,
        slug,
        description: template.description,
        icon: template.icon,
        sortOrder: 0,
        isDefault: true,
        isEnabled: true,
        layout: template.layout,
        stylePriority: seedPriority,
        workspaceId: ctx.workspaceId,
      })
      .returning();

    if (!created) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create default dashboard",
      });
    }

    if (template.widgets.length > 0) {
      await ctx.db.insert(dashboardWidgets).values(
        template.widgets.map((w) => ({
          dashboardId: created.id,
          widgetType: w.widgetType,
          title: w.title ?? null,
          size: w.size,
          sortOrder: w.sortOrder,
          columnSpan: w.columnSpan,
          settings: w.settings ?? null,
        }))
      );
    }

    return await loadDashboardWithWidgets(ctx.db, created.id);
  }),
});
