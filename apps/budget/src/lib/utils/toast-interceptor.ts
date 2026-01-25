/**
 * Toast Interceptor
 *
 * Wraps svelte-sonner toast to:
 * 1. Always store notifications in the notification store
 * 2. Optionally suppress toasts when in "popover" mode
 * 3. Filter notifications based on user verbosity settings
 *
 * This allows users to choose between traditional toasts or a notification center,
 * and control how verbose notifications are.
 */

import { browser } from "$app/environment";
import { toast as sonnerToast, type ExternalToast } from "svelte-sonner";
import { getNotificationStore, type NotificationType } from "$lib/stores/notifications.svelte";
import { displayPreferences } from "$lib/stores/display-preferences.svelte";

/**
 * Notification importance level for filtering based on user verbosity settings
 */
export type NotificationImportance = "critical" | "important" | "normal";

/**
 * Extended options for toast methods with importance
 */
export interface ToastOptions extends ExternalToast {
	importance?: NotificationImportance;
}

/**
 * Get the current notification mode from user preferences.
 * Defaults to "toast" if not set or not available.
 */
function getNotificationMode(): "toast" | "popover" {
	if (!browser) return "toast";

	try {
		return displayPreferences.notificationMode;
	} catch {
		return "toast";
	}
}

/**
 * Get the current notification verbosity from user preferences.
 * Defaults to "all" if not set or not available.
 */
function getNotificationVerbosity(): "all" | "important" | "errors-only" {
	if (!browser) return "all";

	try {
		return displayPreferences.notificationVerbosity;
	} catch {
		return "all";
	}
}

/**
 * Check if a notification should be shown based on type, importance, and verbosity settings.
 */
function shouldShowNotification(
	type: NotificationType,
	importance: NotificationImportance = "normal"
): boolean {
	const verbosity = getNotificationVerbosity();

	// Errors always shown
	if (type === "error") return true;

	// In errors-only mode, only show errors
	if (verbosity === "errors-only") return false;

	// In important mode, show warnings and important/critical success
	if (verbosity === "important") {
		if (type === "warning") return true;
		return importance === "critical" || importance === "important";
	}

	// In "all" mode, show everything
	return true;
}

/**
 * Core intercept function that routes notifications.
 */
function intercept(
	type: NotificationType,
	message: string,
	options?: ToastOptions
): string | number | undefined {
	const mode = getNotificationMode();
	const importance = options?.importance ?? "normal";

	// Check if notification should be shown based on verbosity
	if (!shouldShowNotification(type, importance)) {
		return undefined;
	}

	// Always add to notification store (if available) when notification passes filter
	try {
		const store = getNotificationStore();
		store.add({ type, title: message });
	} catch {
		// Store not available - continue with toast
	}

	// Show toast if in toast mode
	if (mode === "toast") {
		// Remove our custom importance field before passing to sonner
		const { importance: _, ...sonnerOptions } = options ?? {};

		switch (type) {
			case "success":
				return sonnerToast.success(message, sonnerOptions);
			case "error":
				return sonnerToast.error(message, sonnerOptions);
			case "info":
				return sonnerToast.info(message, sonnerOptions);
			case "warning":
				return sonnerToast.warning(message, sonnerOptions);
			default:
				return sonnerToast(message, sonnerOptions);
		}
	}

	return undefined;
}

/**
 * Intercepted toast object.
 * Compatible with svelte-sonner's toast API for string messages.
 */
export const toast = {
	/**
	 * Show a success notification.
	 */
	success(message: string, options?: ToastOptions): string | number | undefined {
		return intercept("success", message, options);
	},

	/**
	 * Show an error notification.
	 * Errors are always shown regardless of verbosity settings.
	 */
	error(message: string, options?: ToastOptions): string | number | undefined {
		return intercept("error", message, options);
	},

	/**
	 * Show an info notification.
	 */
	info(message: string, options?: ToastOptions): string | number | undefined {
		return intercept("info", message, options);
	},

	/**
	 * Show a warning notification.
	 */
	warning(message: string, options?: ToastOptions): string | number | undefined {
		return intercept("warning", message, options);
	},

	/**
	 * Show a loading notification.
	 * Loading toasts always show immediately for visual feedback.
	 */
	loading(message: string, options?: ExternalToast): string | number {
		try {
			const store = getNotificationStore();
			store.add({ type: "loading", title: message, persistent: true });
		} catch {
			// Store not available
		}

		// Always show loading toast for immediate feedback
		return sonnerToast.loading(message, options);
	},

	/**
	 * Pass-through for promise-based toasts.
	 */
	promise: sonnerToast.promise,

	/**
	 * Dismiss a specific toast or all toasts.
	 */
	dismiss: sonnerToast.dismiss,

	/**
	 * Show a message toast.
	 */
	message: sonnerToast.message,

	/**
	 * Show a custom component toast.
	 */
	custom: sonnerToast.custom,
};
