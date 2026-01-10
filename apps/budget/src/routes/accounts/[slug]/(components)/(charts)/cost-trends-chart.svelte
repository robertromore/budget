<script lang="ts">
import { AxisX, AxisY, Bar, Line, Scatter, Tooltip } from '$lib/components/layercake';
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

// Chart mode toggle
let showMode = $state<'cost-per-unit' | 'total-bill'>('cost-per-unit');

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

		// Calculate cost per unit if not provided
		const costPerUnit =
			record.ratePerUnit ??
			(record.usageCost && record.usageAmount > 0 ? record.usageCost / record.usageAmount : null);

		return {
			...record,
			index: idx,
			x: idx,
			y: showMode === 'cost-per-unit' ? costPerUnit ?? 0 : record.totalAmount ?? 0,
			monthLabel,
			costPerUnit
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

	if (showMode === 'cost-per-unit') {
		const costs = chartData.filter((d) => d.costPerUnit).map((d) => d.costPerUnit!);
		if (!costs.length) return null;

		const avg = costs.reduce((sum, c) => sum + c, 0) / costs.length;
		const max = Math.max(...costs);
		const min = Math.min(...costs);
		const latest = costs[costs.length - 1];
		const trendPercent = avg > 0 ? ((latest - avg) / avg) * 100 : 0;

		return { avg, max, min, latest, trendPercent, label: `/${usageUnit}` };
	} else {
		const totals = chartData.map((d) => d.totalAmount ?? 0);
		const total = totals.reduce((sum, t) => sum + t, 0);
		const avg = total / totals.length;
		const max = Math.max(...totals);
		const min = Math.min(...totals);
		const latest = totals[totals.length - 1];
		const trendPercent = avg > 0 ? ((latest - avg) / avg) * 100 : 0;

		return { avg, max, min, latest, trendPercent, label: '' };
	}
});

// Chart domains
const xDomain = $derived<[number, number]>([-0.5, Math.max(chartData.length - 0.5, 0.5)]);

const yMax = $derived(() => {
	if (!chartData.length) return 1;
	return Math.max(...chartData.map((d) => d.y)) * 1.15;
});

// X-axis tick values
const xTickValues = $derived(chartData.map((d) => d.index));

// Index to label map
const indexToLabel = $derived(() => {
	const map = new Map<number, string>();
	chartData.forEach((d) => map.set(d.index, d.monthLabel));
	return map;
});

// Format value based on mode
function formatValue(value: number): string {
	return formatCurrency(value);
}
</script>

<Card.Root>
	<Card.Header class="pb-2">
		<div class="flex items-center justify-between">
			<div>
				<Card.Title class="text-base">Cost Trends</Card.Title>
				<Card.Description>
					{showMode === 'cost-per-unit' ? `Rate per ${usageUnit}` : 'Total bill amounts'}
				</Card.Description>
			</div>
			<div class="flex gap-1">
				<Button
					variant={showMode === 'cost-per-unit' ? 'default' : 'ghost'}
					size="sm"
					onclick={() => (showMode = 'cost-per-unit')}
				>
					Per Unit
				</Button>
				<Button
					variant={showMode === 'total-bill' ? 'default' : 'ghost'}
					size="sm"
					onclick={() => (showMode = 'total-bill')}
				>
					Total Bill
				</Button>
			</div>
		</div>
	</Card.Header>
	<Card.Content>
		{#if usageQuery.isLoading}
			<div class="flex h-64 items-center justify-center">
				<p class="text-muted-foreground">Loading cost data...</p>
			</div>
		{:else if chartData.length === 0}
			<div class="flex h-64 flex-col items-center justify-center text-center">
				<p class="text-muted-foreground">No cost data yet</p>
				<p class="text-muted-foreground text-sm">Import utility statements to see cost trends</p>
			</div>
		{:else}
			<!-- Stats summary -->
			{#if stats}
				<div class="mb-4 grid grid-cols-4 gap-4 text-center">
					<div>
						<p class="text-muted-foreground text-xs">Average</p>
						<p class="font-semibold">{formatCurrency(stats.avg)}</p>
						<p class="text-muted-foreground text-xs">{stats.label}</p>
					</div>
					<div>
						<p class="text-muted-foreground text-xs">Highest</p>
						<p class="font-semibold">{formatCurrency(stats.max)}</p>
					</div>
					<div>
						<p class="text-muted-foreground text-xs">Lowest</p>
						<p class="font-semibold">{formatCurrency(stats.min)}</p>
					</div>
					<div>
						<p class="text-muted-foreground text-xs">Trend</p>
						<p
							class="flex items-center justify-center font-semibold"
							class:text-destructive={stats.trendPercent > 0}
							class:text-green-600={stats.trendPercent < 0}
						>
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
					y="y"
					xDomain={xDomain}
					yDomain={[0, yMax()]}
					padding={{ top: 10, right: 15, bottom: 30, left: 60 }}
				>
					<Svg>
						<AxisY
							ticks={5}
							gridlines={true}
							format={(d) => formatCurrency(d)}
						/>
						<AxisX
							tickValues={xTickValues}
							format={(d) => {
								const label = indexToLabel();
								return label.get(typeof d === 'number' ? d : 0) ?? '';
							}}
						/>

						{#if showMode === 'cost-per-unit'}
							<Line stroke="var(--chart-2)" strokeWidth={2} />
							<Scatter
								fill="var(--chart-2)"
								radius={4}
								hoverRadius={6}
								stroke="var(--background)"
								strokeWidth={2}
							/>
						{:else}
							<Bar fill="var(--chart-2)" opacity={0.85} hoverOpacity={1} />
						{/if}

						<Tooltip barMode={showMode === 'total-bill'} dot={showMode === 'cost-per-unit'}>
							{#snippet children({ point, x, y })}
								<foreignObject
									x={Math.min(x + 15, 160)}
									y={Math.max(y - 100, 10)}
									width="160"
									height="140"
									style="overflow: visible; pointer-events: none;"
								>
									<div
										class="rounded-md border bg-popover px-3 py-2 text-sm shadow-md"
										style="pointer-events: none;"
									>
										<p class="font-medium">{point.monthLabel}</p>

										{#if showMode === 'cost-per-unit'}
											<p class="font-semibold" style="color: var(--chart-2);">
												{formatCurrency(point.costPerUnit ?? 0)}/{usageUnit}
											</p>
										{:else}
											<p class="font-semibold" style="color: var(--chart-2);">
												{formatCurrency(point.totalAmount ?? 0)}
											</p>
										{/if}

										<div class="text-muted-foreground mt-1 space-y-0.5 text-xs">
											<p>Usage: {point.usageAmount?.toLocaleString()} {usageUnit}</p>
											{#if point.baseCharge}
												<p>Base charge: {formatCurrency(point.baseCharge)}</p>
											{/if}
											{#if point.usageCost}
												<p>Usage cost: {formatCurrency(point.usageCost)}</p>
											{/if}
											{#if point.taxes || point.fees}
												<p>
													Taxes/Fees: {formatCurrency((point.taxes ?? 0) + (point.fees ?? 0))}
												</p>
											{/if}
										</div>
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
					<div class="h-0.5 w-4" style="background-color: var(--chart-2);"></div>
					<span>{showMode === 'cost-per-unit' ? `Cost per ${usageUnit}` : 'Total bill'}</span>
				</div>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
