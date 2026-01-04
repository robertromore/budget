<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { timePeriodFilter } from '$lib/states/ui/time-period-filter.svelte';
	import { formatPeriodLabel, isAllTime } from '$lib/utils/time-period';
	import Calendar from '@lucide/svelte/icons/calendar';
	import X from '@lucide/svelte/icons/x';

	interface Props {
		class?: string;
	}

	let { class: className = '' }: Props = $props();

	// Access globalPeriod reactively first
	const globalPeriod = $derived(timePeriodFilter.globalPeriod);

	// Check if we have an active filter (not "all-time")
	const hasActiveFilter = $derived(!isAllTime(globalPeriod));
	const periodLabel = $derived(formatPeriodLabel(globalPeriod));
</script>

{#if hasActiveFilter}
	<div class="bg-muted/80 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm backdrop-blur-sm {className}">
		<Calendar class="text-muted-foreground h-4 w-4" />
		<span class="font-medium">{periodLabel}</span>
		<Button
			variant="ghost"
			size="icon"
			class="h-5 w-5 rounded-full"
			onclick={() => timePeriodFilter.clearGlobalFilter()}
		>
			<X class="h-3 w-3" />
			<span class="sr-only">Clear time period filter</span>
		</Button>
	</div>
{/if}
