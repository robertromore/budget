<script lang="ts">
	import { chartInteractions } from '$lib/states/ui/chart-interactions.svelte';
	import { cn } from '$lib/utils';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';

	export interface LegendItem {
		key: string;
		label: string;
		color: string;
		/** Optional value to display next to the label */
		value?: string | number;
	}

	interface Props {
		items: LegendItem[];
		/** Layout direction */
		direction?: 'horizontal' | 'vertical';
		/** Show visibility toggle icon */
		showToggleIcon?: boolean;
		/** Allow clicking to toggle visibility */
		clickToToggle?: boolean;
		/** Callback when item is clicked */
		onclick?: (item: LegendItem) => void;
		class?: string;
	}

	let {
		items,
		direction = 'horizontal',
		showToggleIcon = false,
		clickToToggle = true,
		onclick,
		class: className = ''
	}: Props = $props();

	function handleClick(item: LegendItem) {
		if (clickToToggle) {
			chartInteractions.toggleSeries(item.key);
		}
		onclick?.(item);
	}

	function handleMouseEnter(item: LegendItem) {
		chartInteractions.setHighlight(item.key);
	}

	function handleMouseLeave() {
		chartInteractions.setHighlight(null);
	}
</script>

<div
	class={cn(
		'flex gap-4',
		direction === 'vertical' ? 'flex-col gap-2' : 'flex-wrap justify-center',
		className
	)}
>
	{#each items as item}
		{@const isHidden = chartInteractions.isSeriesHidden(item.key)}
		{@const isHighlighted = chartInteractions.isHighlighted(item.key)}

		<button
			type="button"
			class={cn(
				'flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-all',
				'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
				isHidden && 'opacity-40',
				isHighlighted && 'bg-muted ring-2 ring-primary/30'
			)}
			onclick={() => handleClick(item)}
			onmouseenter={() => handleMouseEnter(item)}
			onmouseleave={handleMouseLeave}
		>
			{#if showToggleIcon}
				{#if isHidden}
					<EyeOff class="text-muted-foreground h-3.5 w-3.5" />
				{:else}
					<Eye class="text-muted-foreground h-3.5 w-3.5" />
				{/if}
			{/if}

			<div
				class={cn(
					'h-3 w-3 rounded-sm transition-transform',
					isHighlighted && 'scale-125'
				)}
				style="background-color: {item.color};"
			/>

			<span class={cn('select-none', isHidden && 'line-through')}>
				{item.label}
			</span>

			{#if item.value !== undefined}
				<span class="text-muted-foreground font-medium">
					{item.value}
				</span>
			{/if}
		</button>
	{/each}

	{#if items.some((item) => chartInteractions.isSeriesHidden(item.key))}
		<button
			type="button"
			class="text-muted-foreground hover:text-foreground text-xs underline transition-colors"
			onclick={() => chartInteractions.showAllSeries()}
		>
			Show all
		</button>
	{/if}
</div>
