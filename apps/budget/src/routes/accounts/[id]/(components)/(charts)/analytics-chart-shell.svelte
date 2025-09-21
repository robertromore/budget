<script lang="ts" generics="TData">
	import * as Card from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';

	type Props<TData> = {
		loading?: boolean;
		error?: string | null;
		data: TData[];
		emptyMessage?: string;
		summaryStats: Array<{
			label: string;
			value: string;
			description?: string;
		}>;
		title?: any;
		subtitle?: any;
		chart: any;
	};

	let {
		loading = false,
		error = null,
		data,
		emptyMessage = 'No data available for the selected period.',
		summaryStats,
		title,
		subtitle,
		chart
	}: Props<TData> = $props();

	const hasData = $derived(data && data.length > 0);
	const showChart = $derived(!loading && !error && hasData);
	const showEmpty = $derived(!loading && !error && !hasData);
</script>

<div class="space-y-4">
	<!-- Summary Statistics Cards -->
	<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
		{#each summaryStats as stat}
			<Card.Root>
				<Card.Header class="pb-2">
					<Card.Description class="text-sm">{stat.label}</Card.Description>
					<Card.Title class="text-2xl">
						{#if loading}
							<Skeleton class="h-8 w-20" />
						{:else}
							{stat.value}
						{/if}
					</Card.Title>
					{#if stat.description}
						<Card.Description class="text-xs text-muted-foreground">
							{#if loading}
								<Skeleton class="h-3 w-16" />
							{:else}
								{stat.description}
							{/if}
						</Card.Description>
					{/if}
				</Card.Header>
			</Card.Root>
		{/each}
	</div>

	<!-- Chart Container -->
	<Card.Root>
		<Card.Header>
			<Card.Title>
				{@render title?.()}
			</Card.Title>
			{#if subtitle}
				<Card.Description>
					{@render subtitle()}
				</Card.Description>
			{/if}
		</Card.Header>
		<Card.Content>
			{#if loading}
				<div class="flex h-[400px] w-full items-center justify-center">
					<div class="text-center">
						<Skeleton class="mx-auto h-8 w-8 rounded-full" />
						<p class="mt-2 text-sm text-muted-foreground">Loading chart data...</p>
					</div>
				</div>
			{:else if error}
				<div class="flex h-[400px] w-full items-center justify-center">
					<div class="text-center">
						<p class="text-sm text-destructive">Error loading chart data</p>
						<p class="mt-1 text-xs text-muted-foreground">{error}</p>
					</div>
				</div>
			{:else if showEmpty}
				<div class="flex h-[400px] w-full items-center justify-center">
					<div class="text-center">
						<p class="text-sm text-muted-foreground">{emptyMessage}</p>
					</div>
				</div>
			{:else if showChart}
				<div class="h-[400px] w-full">
					{@render chart?.({ data })}
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</div>