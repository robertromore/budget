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

const NOTIFICATIONS_KEY = Symbol("notifications");
const MAX_NOTIFICATIONS = 50;

/**
 * Notification store using Svelte 5 runes.
 * Stores notifications in memory for the current session.
 * Used by the notification popover to display notification history.
 */
class NotificationStore {
	notifications = $state<Notification[]>([]);
	unreadCount = $derived(this.notifications.filter((n) => !n.read).length);

	/**
	 * Add a notification to the store.
	 * Returns the notification ID for tracking (e.g., to update loading states).
	 */
	add(notification: Omit<Notification, "id" | "timestamp" | "read">): string {
		const id = crypto.randomUUID();
		this.notifications.unshift({
			...notification,
			id,
			timestamp: new Date(),
			read: false,
		});

		// Cap notifications at max limit
		if (this.notifications.length > MAX_NOTIFICATIONS) {
			this.notifications = this.notifications.slice(0, MAX_NOTIFICATIONS);
		}

		return id;
	}

	/**
	 * Mark a specific notification as read.
	 */
	markAsRead(id: string): void {
		const notification = this.notifications.find((n) => n.id === id);
		if (notification) {
			notification.read = true;
		}
	}

	/**
	 * Mark all notifications as read.
	 */
	markAllAsRead(): void {
		for (const notification of this.notifications) {
			notification.read = true;
		}
	}

	/**
	 * Dismiss (remove) a specific notification.
	 */
	dismiss(id: string): void {
		this.notifications = this.notifications.filter((n) => n.id !== id);
	}

	/**
	 * Clear all notifications.
	 */
	clear(): void {
		this.notifications = [];
	}

	/**
	 * Update an existing notification (e.g., to resolve a loading state).
	 */
	update(id: string, updates: Partial<Omit<Notification, "id">>): void {
		const notification = this.notifications.find((n) => n.id === id);
		if (notification) {
			Object.assign(notification, updates);
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
