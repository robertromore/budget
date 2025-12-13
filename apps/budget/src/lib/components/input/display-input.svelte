<script lang="ts">
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as Popover from '$lib/components/ui/popover';
	import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
	import { currentViews } from '$lib/states/views';
	import { displayPreferences } from '$lib/stores/display-preferences.svelte';
	import { cn } from '$lib/utils';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import DisplayInputContent from './display-input-content.svelte';

	// Use runed Context API instead of Svelte's getContext
	const currentViewsState = $derived(currentViews.get());
	const currentView = $derived(currentViewsState?.activeView);
	const table = $derived(currentView?.table);

	// Only render if we have a valid context
	const hasContext = $derived(!!currentView?.view && !!table);

	// Check display mode preference
	const useSheet = $derived(displayPreferences.tableDisplayMode === 'sheet');

	let sheetOpen = $state(false);
</script>

{#if hasContext}
	{#if useSheet}
		<ResponsiveSheet bind:open={sheetOpen} defaultWidth={480} minWidth={360} maxWidth={600}>
			{#snippet trigger()}
				<Button variant="outline" class="h-8">
					<SlidersHorizontal class="mr-2 h-4 w-4" />
					Display
				</Button>
			{/snippet}

			{#snippet header()}
				<div>
					<h2 class="text-lg font-semibold">Table Display Options</h2>
					<p class="text-muted-foreground text-sm">Configure columns, sorting, and layout</p>
				</div>
			{/snippet}

			{#snippet content()}
				<DisplayInputContent />
			{/snippet}
		</ResponsiveSheet>
	{:else}
		<Popover.Root>
			<Popover.Trigger class={cn(buttonVariants({ variant: 'outline' }), 'h-8')}>
				<SlidersHorizontal />
				Display
			</Popover.Trigger>
			<Popover.Content class="w-80">
				<DisplayInputContent />
			</Popover.Content>
		</Popover.Root>
	{/if}
{/if}
