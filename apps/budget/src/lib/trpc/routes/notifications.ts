import {
  dismissNotificationSchema,
  insertNotificationSchema,
  markNotificationReadSchema,
  notifications,
} from "$lib/schema";
import { publicProcedure, rateLimitedProcedure, t } from "$lib/trpc";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

const MAX_NOTIFICATIONS = 50;

export const notificationRoutes = t.router({
  /**
   * Get all notifications for the current workspace
   */
  all: publicProcedure
    .input(
      z
        .object({
          limit: z.number().int().positive().max(100).optional().default(50),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? MAX_NOTIFICATIONS;
      return await ctx.db
        .select()
        .from(notifications)
        .where(eq(notifications.workspaceId, ctx.workspaceId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit);
    }),

  /**
   * Get unread count
   */
  unreadCount: publicProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select()
      .from(notifications)
      .where(and(eq(notifications.workspaceId, ctx.workspaceId), eq(notifications.read, false)));
    return result.length;
  }),

  /**
   * Add a new notification
   */
  add: rateLimitedProcedure.input(insertNotificationSchema).mutation(async ({ ctx, input }) => {
    // Enforce max notifications limit
    const existing = await ctx.db
      .select({ id: notifications.id })
      .from(notifications)
      .where(eq(notifications.workspaceId, ctx.workspaceId))
      .orderBy(desc(notifications.createdAt));

    // Remove oldest notifications if we're over the limit
    if (existing.length >= MAX_NOTIFICATIONS) {
      const idsToDelete = existing.slice(MAX_NOTIFICATIONS - 1).map((n) => n.id);
      if (idsToDelete.length > 0) {
        for (const id of idsToDelete) {
          await ctx.db
            .delete(notifications)
            .where(and(eq(notifications.id, id), eq(notifications.workspaceId, ctx.workspaceId)));
        }
      }
    }

    const result = await ctx.db
      .insert(notifications)
      .values({
        ...input,
        workspaceId: ctx.workspaceId,
      })
      .returning();

    if (!result[0]) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create notification",
      });
    }

    return result[0];
  }),

  /**
   * Sync multiple notifications at once (for initial sync from localStorage)
   */
  sync: rateLimitedProcedure
    .input(z.array(insertNotificationSchema))
    .mutation(async ({ ctx, input }) => {
      if (input.length === 0) return { synced: 0 };

      // Get existing notification IDs
      const existing = await ctx.db
        .select({ id: notifications.id })
        .from(notifications)
        .where(eq(notifications.workspaceId, ctx.workspaceId));

      const existingIds = new Set(existing.map((n) => n.id));

      // Filter out notifications that already exist
      const newNotifications = input.filter((n) => !existingIds.has(n.id));

      if (newNotifications.length === 0) return { synced: 0 };

      // Insert new notifications
      await ctx.db.insert(notifications).values(
        newNotifications.map((n) => ({
          ...n,
          workspaceId: ctx.workspaceId,
        }))
      );

      // Enforce max limit after sync
      const afterSync = await ctx.db
        .select({ id: notifications.id })
        .from(notifications)
        .where(eq(notifications.workspaceId, ctx.workspaceId))
        .orderBy(desc(notifications.createdAt));

      if (afterSync.length > MAX_NOTIFICATIONS) {
        const idsToDelete = afterSync.slice(MAX_NOTIFICATIONS).map((n) => n.id);
        for (const id of idsToDelete) {
          await ctx.db
            .delete(notifications)
            .where(and(eq(notifications.id, id), eq(notifications.workspaceId, ctx.workspaceId)));
        }
      }

      return { synced: newNotifications.length };
    }),

  /**
   * Mark a notification as read
   */
  markAsRead: rateLimitedProcedure
    .input(markNotificationReadSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .update(notifications)
        .set({ read: true })
        .where(and(eq(notifications.id, input.id), eq(notifications.workspaceId, ctx.workspaceId)))
        .returning();

      if (!result[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Notification not found",
        });
      }

      return result[0];
    }),

  /**
   * Mark all notifications as read
   */
  markAllAsRead: rateLimitedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.workspaceId, ctx.workspaceId));

    return { success: true };
  }),

  /**
   * Dismiss (delete) a notification
   */
  dismiss: rateLimitedProcedure
    .input(dismissNotificationSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .delete(notifications)
        .where(and(eq(notifications.id, input.id), eq(notifications.workspaceId, ctx.workspaceId)))
        .returning();

      if (!result[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Notification not found",
        });
      }

      return { success: true };
    }),

  /**
   * Clear all notifications
   */
  clear: rateLimitedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.delete(notifications).where(eq(notifications.workspaceId, ctx.workspaceId));

    return { success: true };
  }),
});
