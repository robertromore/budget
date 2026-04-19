import { createLocalStorageState } from "$lib/utils/local-storage.svelte";
import type { WidgetStyle } from "$lib/types/dashboard-widgets";

const KEY = "budget:preferred-widget-style";

/**
 * User's preferred widget style for the catalog sheet. When set, the
 * catalog opens with this style pill pre-selected, biasing new widget
 * choices toward variants of the preferred aesthetic. The pill row
 * still lets the user override in-session.
 *
 * Stored in localStorage (per-device, per-browser) — no server-side
 * user setting yet. "classic" is the default on unset.
 */
const store = createLocalStorageState<WidgetStyle>(KEY, "classic");

export const widgetStylePreference = {
  get value(): WidgetStyle {
    return store.value;
  },
  set value(next: WidgetStyle) {
    store.value = next;
  },
};
