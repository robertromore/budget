<script lang="ts">
import { Area, AxisX, AxisY, Bar, Line, Scatter, Tooltip } from '$lib/components/layercake';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import { rpc } from '$lib/query';
import { USAGE_UNIT_LABELS, type UsageUnit } from '$lib/schema/utility-usage';
import { formatCurrency } from '$lib/utils/formatters';
import { LayerCake, Svg } from 'layercake';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import TrendingDown from '@lucide/svelte/icons/trending-down';

interface Props {
	accountId: number;
}

let { accountId }: Props = $props();

// Chart type toggle
let chartType = $state<'line' | 'bar'>('line');
let showCostOverlay = $state(true);

// Query usage records
const usageQuery = $derived(rpc.utility.getUsageRecords(accountId).options());
const usageRecords = $derived(usageQuery.data ?? []);

// Transform data for chart
const chartData = $derived.by(() => {
	if (!usageRecords.length) return [];

	// Sort by period start date (oldest first)
	const sorted = [...usageRecords].sort(
		(a, b) => new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime()
	);

	return sorted.map((record, idx) => {
		const startDate = new Date(record.periodStart);
		const monthLabel = startDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

		return {
			...record,
			index: idx,
			x: idx,
			y: record.usageAmount,
			monthLabel,
			costPerUnit: record.ratePerUnit ?? (record.usageCost && record.usageAmount > 0 ? record.usageCost / record.usageAmount : null)
		};
	});
});

// Get the unit label
const usageUnit = $derived(
	usageRecords[0]?.usageUnit
		? USAGE_UNIT_LABELS[usageRecords[0].usageUnit as UsageUnit]?.shortLabel
		: 'units'
);

// Calculate stats
const stats = $derived.by(() => {
	if (!chartData.length) return null;

	const usages = chartData.map((d) => d.usageAmount);
	const total = usages.reduce((sum, u) => sum + u, 0);
	const avg = total / usages.length;
	const max = Math.max(...usages);
	const min = Math.min(...usages);

	// Calculate trend (latest vs average)
	const latest = usages[usages.length - 1];
	const trendPercent = avg > 0 ? ((latest - avg) / avg) * 100 : 0;

	return { total, avg, max, min, latest, trendPercent };
});

// Chart domains
const xDomain = $derived<[number, number]>([
	-0.5,
	Math.max(chartData.length - 0.5, 0.5)
]);

const yMax = $derived(() => {
	if (!chartData.length) return 100;
	return Math.max(...chartData.map((d) => d.usageAmount)) * 1.1;
});

// X-axis tick values
const xTickValues = $derived(chartData.map((d) => d.index));

// Index to label map
const indexToLabel = $derived(() => {
	const map = new Map<number, string>();
	chartData.forEach((d) => map.set(d.index, d.monthLabel));
	return map;
});

// Format usage value
function formatUsage(value: number): string {
	return `${value.toLocaleString()} ${usageUnit}`;
}
</script>

<Card.Root>
	<Card.Header class="pb-2">
		<div class="flex items-center justify-between">
			<div>
				<Card.Title class="text-base">Usage Trends</Card.Title>
				<Card.Description>Consumption over time</Card.Description>
			</div>
			<div class="flex gap-1">
				<Button
					variant={chartType === 'line' ? 'default' : 'ghost'}
					size="sm"
					onclick={() => (chartType = 'line')}
				>
					Line
				</Button>
				<Button
					variant={chartType === 'bar' ? 'default' : 'ghost'}
					size="sm"
					onclick={() => (chartType = 'bar')}
				>
					Bar
				</Button>
			</div>
		</div>
	</Card.Header>
	<Card.Content>
		{#if usageQuery.isLoading}
			<div class="flex h-64 items-center justify-center">
				<p class="text-muted-foreground">Loading usage data...</p>
			</div>
		{:else if chartData.length === 0}
			<div class="flex h-64 flex-col items-center justify-center text-center">
				<p class="text-muted-foreground">No usage records yet</p>
				<p class="text-muted-foreground text-sm">Import utility statements to see trends</p>
			</div>
		{:else}
			<!-- Stats summary -->
			{#if stats}
				<div class="mb-4 grid grid-cols-4 gap-4 text-center">
					<div>
						<p class="text-muted-foreground text-xs">Average</p>
						<p class="font-semibold">{stats.avg.toFixed(1)}</p>
						<p class="text-muted-foreground text-xs">{usageUnit}/period</p>
					</div>
					<div>
						<p class="text-muted-foreground text-xs">Highest</p>
						<p class="font-semibold">{stats.max.toFixed(1)}</p>
					</div>
					<div>
						<p class="text-muted-foreground text-xs">Lowest</p>
						<p class="font-semibold">{stats.min.toFixed(1)}</p>
					</div>
					<div>
						<p class="text-muted-foreground text-xs">Trend</p>
						<p class="flex items-center justify-center font-semibold" class:text-green-600={stats.trendPercent < 0} class:text-destructive={stats.trendPercent > 0}>
							{#if stats.trendPercent > 0}
								<TrendingUp class="mr-1 h-3 w-3" />
							{:else if stats.trendPercent < 0}
								<TrendingDown class="mr-1 h-3 w-3" />
							{/if}
							{Math.abs(stats.trendPercent).toFixed(1)}%
						</p>
					</div>
				</div>
			{/if}

			<!-- Chart -->
			<div class="h-64">
				<LayerCake
					data={chartData}
					x="index"
					y="usageAmount"
					xDomain={xDomain}
					yDomain={[0, yMax()]}
					padding={{ top: 10, right: 15, bottom: 30, left: 50 }}
				>
					<Svg>
						<AxisY ticks={5} gridlines={true} format={(d) => d.toLocaleString()} />
						<AxisX
							tickValues={xTickValues}
							format={(d) => {
								const label = indexToLabel();
								return label.get(typeof d === 'number' ? d : 0) ?? '';
							}}
						/>

						{#if chartType === 'line'}
							<Area fill="var(--chart-1)" opacity={0.1} />
							<Line stroke="var(--chart-1)" strokeWidth={2} />
							<Scatter
								fill="var(--chart-1)"
								radius={4}
								hoverRadius={6}
								stroke="var(--background)"
								strokeWidth={2}
							/>
						{:else}
							<Bar fill="var(--chart-1)" opacity={0.85} hoverOpacity={1} />
						{/if}

						<Tooltip barMode={chartType === 'bar'} dot={chartType === 'line'}>
							{#snippet children({ point, x, y })}
								<foreignObject
									x={Math.min(x + 15, 160)}
									y={Math.max(y - 80, 10)}
									width="160"
									height="120"
									style="overflow: visible; pointer-events: none;"
								>
									<div
										class="rounded-md border bg-popover px-3 py-2 text-sm shadow-md"
										style="pointer-events: none;"
									>
										<p class="font-medium">{point.monthLabel}</p>
										<p class="font-semibold" style="color: var(--chart-1);">
											{formatUsage(point.usageAmount)}
										</p>
										{#if point.totalAmount}
											<p class="text-muted-foreground text-xs">
												Bill: {formatCurrency(point.totalAmount)}
											</p>
										{/if}
										{#if point.costPerUnit}
											<p class="text-muted-foreground text-xs">
												{formatCurrency(point.costPerUnit)}/{usageUnit}
											</p>
										{/if}
										{#if point.daysInPeriod}
											<p class="text-muted-foreground text-xs">
												{point.daysInPeriod} days
											</p>
										{/if}
									</div>
								</foreignObject>
							{/snippet}
						</Tooltip>
					</Svg>
				</LayerCake>
			</div>

			<!-- Legend -->
			<div class="mt-2 flex justify-center gap-4 text-xs">
				<div class="flex items-center gap-2">
					<div class="h-0.5 w-4" style="background-color: var(--chart-1);"></div>
					<span>Usage ({usageUnit})</span>
				</div>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
