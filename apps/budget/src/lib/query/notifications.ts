import type { Notification as DbNotification } from "$lib/schema/notifications";
import { trpc } from "$lib/trpc/client";
import { queryClient } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

// Serialized notification type (as received over HTTP)
// tRPC serializes Date as string
type SerializedNotification = Omit<DbNotification, "createdAt"> & {
  createdAt: string;
};

/**
 * Query Keys for notification operations
 */
export const notificationKeys = createQueryKeys("notifications", {
  all: () => ["notifications", "all"] as const,
  unreadCount: () => ["notifications", "unreadCount"] as const,
});

/**
 * Get all notifications
 */
export const getAll = (limit?: number) =>
  defineQuery<SerializedNotification[]>({
    queryKey: notificationKeys.all(),
    queryFn: () => trpc().notificationRoutes.all.query({ limit }),
    options: {
      staleTime: 30 * 1000, // 30 seconds
    },
  });

/**
 * Get unread notification count
 */
export const getUnreadCount = () =>
  defineQuery<number>({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => trpc().notificationRoutes.unreadCount.query(),
    options: {
      staleTime: 30 * 1000, // 30 seconds
    },
  });

/**
 * Add a notification
 */
export const addNotification = defineMutation<
  {
    id: string;
    type: "success" | "error" | "info" | "warning" | "loading";
    title: string;
    description?: string;
    createdAt: Date;
    read?: boolean;
    persistent?: boolean;
  },
  SerializedNotification
>({
  mutationFn: (data) => trpc().notificationRoutes.add.mutate(data),
  onSuccess: async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: notificationKeys.all() }),
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() }),
    ]);
  },
  // Don't show toast for adding notifications (would be recursive)
});

/**
 * Sync notifications from localStorage to backend
 */
export const syncNotifications = defineMutation<
  Array<{
    id: string;
    type: "success" | "error" | "info" | "warning" | "loading";
    title: string;
    description?: string;
    createdAt: Date;
    read?: boolean;
    persistent?: boolean;
  }>,
  { synced: number }
>({
  mutationFn: (data) => trpc().notificationRoutes.sync.mutate(data),
  onSuccess: async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: notificationKeys.all() }),
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() }),
    ]);
  },
  // Don't show toast for sync operations
});

/**
 * Mark a notification as read
 */
export const markAsRead = defineMutation<{ id: string }, SerializedNotification>({
  mutationFn: (data) => trpc().notificationRoutes.markAsRead.mutate(data),
  onSuccess: async () => {
    await queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    // Optimistically update the notification in cache
    await queryClient.invalidateQueries({ queryKey: notificationKeys.all() });
  },
  // Don't show toast for marking as read
});

/**
 * Mark all notifications as read
 */
export const markAllAsRead = defineMutation<void, { success: boolean }>({
  mutationFn: () => trpc().notificationRoutes.markAllAsRead.mutate(),
  onSuccess: async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: notificationKeys.all() }),
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() }),
    ]);
  },
  // Don't show toast for marking all as read
});

/**
 * Dismiss (delete) a notification
 */
export const dismissNotification = defineMutation<{ id: string }, { success: boolean }>({
  mutationFn: (data) => trpc().notificationRoutes.dismiss.mutate(data),
  onSuccess: async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: notificationKeys.all() }),
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() }),
    ]);
  },
  // Don't show toast for dismissing notifications
});

/**
 * Clear all notifications
 */
export const clearNotifications = defineMutation<void, { success: boolean }>({
  mutationFn: () => trpc().notificationRoutes.clear.mutate(),
  onSuccess: async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: notificationKeys.all() }),
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() }),
    ]);
  },
  // Don't show toast for clearing notifications
});
