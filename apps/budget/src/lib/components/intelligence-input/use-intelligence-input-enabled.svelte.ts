/**
 * Hook to check if intelligence input mode is enabled
 *
 * When enabled, forms should hide the old IntelligenceModeToggle buttons
 * and use data-intelligence-* attributes instead.
 *
 * Usage:
 * ```svelte
 * <script>
 *   import { useIntelligenceInputEnabled } from '$lib/components/intelligence-input';
 *
 *   const intelligenceInputEnabled = useIntelligenceInputEnabled();
 * </script>
 *
 * {#if !intelligenceInputEnabled.current}
 *   <IntelligenceModeToggle ... />
 * {/if}
 * ```
 */

import { IntelligenceInputSettings } from "$lib/query/intelligence-input-settings";

/**
 * Returns a reactive object with `current` property indicating if
 * intelligence input mode is enabled in settings.
 *
 * When true, forms should hide old IntelligenceModeToggle components
 * and use the new overlay-based intelligence triggering.
 */
export function useIntelligenceInputEnabled() {
  const preferencesQuery = IntelligenceInputSettings.getPreferences().options();

  // Return an object with getters to maintain reactivity
  return {
    get current() {
      return preferencesQuery.data?.enabled ?? false;
    },
    get isLoading() {
      return preferencesQuery.isLoading;
    },
    get showInHeader() {
      return preferencesQuery.data?.showInHeader ?? true;
    },
    get defaultMode() {
      return preferencesQuery.data?.defaultMode ?? "auto";
    },
  };
}

/**
 * Simple getter for checking if old toggles should be hidden.
 * Returns true when intelligence input mode is enabled.
 */
export function shouldHideOldToggles(): boolean {
  const preferencesQuery = IntelligenceInputSettings.getPreferences().options();
  return preferencesQuery.data?.enabled ?? false;
}
