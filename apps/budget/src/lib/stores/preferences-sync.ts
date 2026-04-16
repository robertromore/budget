/**
 * Helper module for syncing user preferences with the backend
 * Provides debounced sync to avoid excessive API calls
 */

import { browser } from "$app/environment";
import type { UserPreferences } from "$core/schema/users";
import { whenTrpcClientReady } from "$core/trpc/client-factory";
import { updatePreferences, getPreferences, authKeys } from "$lib/query/auth";
import { queryClient } from "$lib/query/_client";

// Debounce timer for syncing to backend
let syncTimer: ReturnType<typeof setTimeout> | null = null;
const SYNC_DEBOUNCE_MS = 1000;

// Pending preferences to sync
let pendingSync: Partial<UserPreferences> = {};

/**
 * Queue preferences to be synced to the backend
 * Debounces multiple changes into a single API call
 */
export function queuePreferencesSync(preferences: Partial<UserPreferences>): void {
  if (!browser) return;

  // Merge with pending preferences
  pendingSync = { ...pendingSync, ...preferences };

  // Clear existing timer
  if (syncTimer) {
    clearTimeout(syncTimer);
  }

  // Set new timer to sync after debounce period
  syncTimer = setTimeout(async () => {
    const prefsToSync = { ...pendingSync };
    pendingSync = {};

    // Wait for the tRPC client factory to be wired. This store's sync can
    // race the layout's startup code; without the await the `trpc()` call
    // inside `updatePreferences.execute` would throw.
    await whenTrpcClientReady();

    try {
      await updatePreferences.execute(prefsToSync);
    } catch (error) {
      // Silently fail - localStorage is the fallback
      console.debug("Failed to sync preferences to backend:", error);
    }
  }, SYNC_DEBOUNCE_MS);
}

/**
 * Load preferences from backend.
 * Returns only explicitly saved preferences (not merged with defaults).
 * Returns null if not authenticated or on the server.
 *
 * Awaits tRPC client readiness so a startup-time race (this helper called
 * from a module constructor's `setTimeout` before the layout wires the
 * client factory) doesn't throw "tRPC client not initialized".
 */
export async function loadPreferencesFromBackend(): Promise<Partial<UserPreferences> | null> {
  if (!browser) return null;
  await whenTrpcClientReady();

  try {
    const query = getPreferences();
    return await query.execute();
  } catch (error) {
    console.debug("Failed to load preferences from backend:", error);
    return null;
  }
}

/**
 * Check if preferences are cached in the query client
 */
export function getCachedPreferences(): Partial<UserPreferences> | null {
  if (!browser) return null;

  const cached = queryClient.getQueryData<Partial<UserPreferences> | null>(authKeys.preferences());
  return cached ?? null;
}
