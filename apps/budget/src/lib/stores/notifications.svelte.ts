import { browser } from "$app/environment";
import { trpc } from "$lib/trpc/client";
import { getContext, setContext } from "svelte";

export type NotificationType = "success" | "error" | "info" | "warning" | "loading";

export interface Notification {
	id: string;
	type: NotificationType;
	title: string;
	description?: string;
	timestamp: Date;
	read: boolean;
	persistent?: boolean;
}

// Serializable version for localStorage
interface SerializedNotification {
	id: string;
	type: NotificationType;
	title: string;
	description?: string;
	timestamp: string; // ISO string
	read: boolean;
	persistent?: boolean;
}

const NOTIFICATIONS_KEY = Symbol("notifications");
const STORAGE_KEY = "notifications";
const MAX_NOTIFICATIONS = 50;

/**
 * Notification store using Svelte 5 runes.
 * Persists notifications to:
 * - localStorage for immediate cross-page/reload persistence
 * - Backend database for cross-device sync
 * Used by the notification popover to display notification history.
 */
class NotificationStore {
	notifications = $state<Notification[]>([]);
	unreadCount = $derived(this.notifications.filter((n) => !n.read).length);
	private initialized = false;
	private syncInProgress = false;

	constructor() {
		if (browser) {
			this.loadFromStorage();
			this.loadFromBackend();
		}
	}

	/**
	 * Load notifications from localStorage
	 */
	private loadFromStorage(): void {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				const parsed: SerializedNotification[] = JSON.parse(stored);
				this.notifications = parsed.map((n) => ({
					...n,
					timestamp: new Date(n.timestamp),
				}));
			}
		} catch (error) {
			console.error("Failed to load notifications from storage:", error);
		}
	}

	/**
	 * Load notifications from backend and merge with local
	 */
	private async loadFromBackend(): Promise<void> {
		if (!browser || this.initialized) return;
		this.initialized = true;

		try {
			const backendNotifications = await trpc().notificationRoutes.all.query();
			if (backendNotifications && backendNotifications.length > 0) {
				// Merge: backend takes precedence, add any local-only notifications
				const backendIds = new Set(backendNotifications.map((n) => n.id));
				const localOnlyNotifications = this.notifications.filter((n) => !backendIds.has(n.id));

				// Convert backend notifications to local format
				const convertedBackend: Notification[] = backendNotifications.map((n) => ({
					id: n.id,
					type: n.type,
					title: n.title,
					description: n.description ?? undefined,
					timestamp: new Date(n.createdAt),
					read: n.read,
					persistent: n.persistent ?? undefined,
				}));

				const mergedNotifications = [...convertedBackend, ...localOnlyNotifications]
					.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
					.slice(0, MAX_NOTIFICATIONS);

				this.notifications = mergedNotifications;
				this.saveToStorage();

				// Sync any local-only notifications to backend
				if (localOnlyNotifications.length > 0) {
					this.syncLocalToBackend(localOnlyNotifications);
				}
			}
		} catch (error) {
			// Silently fail - localStorage is the fallback
			console.debug("Failed to load notifications from backend:", error);
		}
	}

	/**
	 * Sync local-only notifications to backend
	 */
	private async syncLocalToBackend(localNotifications: Notification[]): Promise<void> {
		if (this.syncInProgress) return;
		this.syncInProgress = true;

		try {
			await trpc().notificationRoutes.sync.mutate(
				localNotifications.map((n) => ({
					id: n.id,
					type: n.type,
					title: n.title,
					description: n.description,
					createdAt: n.timestamp,
					read: n.read,
					persistent: n.persistent,
				}))
			);
		} catch (error) {
			console.debug("Failed to sync notifications to backend:", error);
		} finally {
			this.syncInProgress = false;
		}
	}

	/**
	 * Save notifications to localStorage
	 */
	private saveToStorage(): void {
		if (!browser) return;

		try {
			const serialized: SerializedNotification[] = this.notifications.map((n) => ({
				...n,
				timestamp: n.timestamp.toISOString(),
			}));
			localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
		} catch (error) {
			console.error("Failed to save notifications to storage:", error);
		}
	}

	/**
	 * Add a notification to the store.
	 * Returns the notification ID for tracking (e.g., to update loading states).
	 */
	add(notification: Omit<Notification, "id" | "timestamp" | "read">): string {
		const id = crypto.randomUUID();
		const timestamp = new Date();
		const newNotification: Notification = {
			...notification,
			id,
			timestamp,
			read: false,
		};

		this.notifications.unshift(newNotification);

		// Cap notifications at max limit
		if (this.notifications.length > MAX_NOTIFICATIONS) {
			this.notifications = this.notifications.slice(0, MAX_NOTIFICATIONS);
		}

		this.saveToStorage();

		// Sync to backend (fire and forget)
		this.syncAddToBackend(newNotification);

		return id;
	}

	/**
	 * Sync a new notification to the backend
	 */
	private async syncAddToBackend(notification: Notification): Promise<void> {
		try {
			await trpc().notificationRoutes.add.mutate({
				id: notification.id,
				type: notification.type,
				title: notification.title,
				description: notification.description,
				createdAt: notification.timestamp,
				read: notification.read,
				persistent: notification.persistent,
			});
		} catch (error) {
			console.debug("Failed to sync notification add to backend:", error);
		}
	}

	/**
	 * Mark a specific notification as read.
	 */
	markAsRead(id: string): void {
		const notification = this.notifications.find((n) => n.id === id);
		if (notification) {
			notification.read = true;
			this.saveToStorage();

			// Sync to backend
			this.syncMarkAsReadToBackend(id);
		}
	}

	/**
	 * Sync mark as read to backend
	 */
	private async syncMarkAsReadToBackend(id: string): Promise<void> {
		try {
			await trpc().notificationRoutes.markAsRead.mutate({ id });
		} catch (error) {
			console.debug("Failed to sync mark as read to backend:", error);
		}
	}

	/**
	 * Mark all notifications as read.
	 */
	markAllAsRead(): void {
		for (const notification of this.notifications) {
			notification.read = true;
		}
		this.saveToStorage();

		// Sync to backend
		this.syncMarkAllAsReadToBackend();
	}

	/**
	 * Sync mark all as read to backend
	 */
	private async syncMarkAllAsReadToBackend(): Promise<void> {
		try {
			await trpc().notificationRoutes.markAllAsRead.mutate();
		} catch (error) {
			console.debug("Failed to sync mark all as read to backend:", error);
		}
	}

	/**
	 * Dismiss (remove) a specific notification.
	 */
	dismiss(id: string): void {
		this.notifications = this.notifications.filter((n) => n.id !== id);
		this.saveToStorage();

		// Sync to backend
		this.syncDismissToBackend(id);
	}

	/**
	 * Sync dismiss to backend
	 */
	private async syncDismissToBackend(id: string): Promise<void> {
		try {
			await trpc().notificationRoutes.dismiss.mutate({ id });
		} catch (error) {
			console.debug("Failed to sync dismiss to backend:", error);
		}
	}

	/**
	 * Clear all notifications.
	 */
	clear(): void {
		this.notifications = [];
		this.saveToStorage();

		// Sync to backend
		this.syncClearToBackend();
	}

	/**
	 * Sync clear to backend
	 */
	private async syncClearToBackend(): Promise<void> {
		try {
			await trpc().notificationRoutes.clear.mutate();
		} catch (error) {
			console.debug("Failed to sync clear to backend:", error);
		}
	}

	/**
	 * Update an existing notification (e.g., to resolve a loading state).
	 */
	update(id: string, updates: Partial<Omit<Notification, "id">>): void {
		const notification = this.notifications.find((n) => n.id === id);
		if (notification) {
			Object.assign(notification, updates);
			this.saveToStorage();

			// For updates, we sync the full notification state
			// This handles cases like converting a "loading" notification to "success"
			this.syncAddToBackend({ ...notification, ...updates } as Notification);
		}
	}

	/**
	 * Force refresh from backend
	 */
	async refresh(): Promise<void> {
		if (!browser) return;

		try {
			const backendNotifications = await trpc().notificationRoutes.all.query();
			if (backendNotifications) {
				this.notifications = backendNotifications
					.map((n): Notification => ({
						id: n.id,
						type: n.type,
						title: n.title,
						description: n.description ?? undefined,
						timestamp: new Date(n.createdAt),
						read: n.read,
						persistent: n.persistent ?? undefined,
					}))
					.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
				this.saveToStorage();
			}
		} catch (error) {
			console.debug("Failed to refresh notifications from backend:", error);
		}
	}
}

// Singleton instance
let instance: NotificationStore | null = null;

/**
 * Get the notification store singleton.
 * Creates the instance if it doesn't exist.
 */
export function getNotificationStore(): NotificationStore {
	if (!instance) {
		instance = new NotificationStore();
	}
	return instance;
}

/**
 * Set the notification store in Svelte context.
 * Call this at the root layout level.
 */
export function setNotificationContext(): void {
	setContext(NOTIFICATIONS_KEY, getNotificationStore());
}

/**
 * Get the notification store from Svelte context.
 * Falls back to singleton if context not set.
 */
export function getNotificationContext(): NotificationStore {
	return getContext<NotificationStore>(NOTIFICATIONS_KEY) ?? getNotificationStore();
}
