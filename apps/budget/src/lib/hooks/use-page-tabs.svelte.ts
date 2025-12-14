import { onDestroy } from 'svelte';
import { getPageTabsContext, type PageTabsConfig } from '$lib/stores/page-tabs.svelte';

/**
 * Hook for registering page tabs to be displayed in the header
 * Automatically clears tabs when the component is destroyed
 *
 * @param config - Tabs configuration including tabs array, active tab, and change handler
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { usePageTabs } from '$lib/hooks/use-page-tabs.svelte';
 *   import Activity from '@lucide/svelte/icons/activity';
 *   import Settings from '@lucide/svelte/icons/settings';
 *
 *   let activeTab = $state('overview');
 *
 *   usePageTabs({
 *     tabs: [
 *       { id: 'overview', label: 'Overview', icon: Activity },
 *       { id: 'settings', label: 'Settings', icon: Settings },
 *     ],
 *     activeTab,
 *     onTabChange: (value) => (activeTab = value),
 *   });
 * </script>
 * ```
 */
export function usePageTabs(config: PageTabsConfig) {
	const context = getPageTabsContext();

	if (context) {
		context.register(config);

		onDestroy(() => {
			context.clear();
		});
	}
}
