import { onDestroy } from 'svelte';
import { getPageActionsContext, type PageAction } from '$lib/stores/page-actions.svelte';

/**
 * Hook for registering page actions to be displayed in the header
 * Automatically clears actions when the component is destroyed
 *
 * @param actions - Array of page actions to register
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { usePageActions } from '$lib/hooks/use-page-actions.svelte';
 *   import Plus from '@lucide/svelte/icons/plus';
 *
 *   usePageActions([
 *     {
 *       id: 'add-item',
 *       label: 'Add Item',
 *       icon: Plus,
 *       href: '/items/new',
 *       variant: 'default',
 *       isPrimary: true,
 *     },
 *   ]);
 * </script>
 * ```
 */
export function usePageActions(actions: PageAction[]) {
	const context = getPageActionsContext();

	if (context) {
		context.register(actions);

		onDestroy(() => {
			context.clear();
		});
	}
}
