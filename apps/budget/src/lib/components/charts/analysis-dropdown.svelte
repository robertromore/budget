<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import TrendingUp from '@lucide/svelte/icons/trending-up';

	interface Props {
		showLinearTrend?: boolean;
		showForecast?: boolean;
		showHistoricalAvg?: boolean;
		showPercentileBands?: boolean;
		showMovingAvg?: boolean;
		showYoYComparison?: boolean;
		// Enable/disable options based on chart capabilities
		linearTrendEnabled?: boolean;
		forecastEnabled?: boolean;
		historicalAvgEnabled?: boolean;
		percentileBandsEnabled?: boolean;
		movingAvgEnabled?: boolean;
		yoyComparisonEnabled?: boolean;
		// Forecast horizon display
		forecastHorizon?: number;
		// Moving average window
		movingAvgWindow?: number;
		// Callbacks for toggling overlays
		onLinearTrendChange?: (value: boolean) => void;
		onForecastChange?: (value: boolean) => void;
		onHistoricalAvgChange?: (value: boolean) => void;
		onPercentileBandsChange?: (value: boolean) => void;
		onMovingAvgChange?: (value: boolean) => void;
		onYoYComparisonChange?: (value: boolean) => void;
	}

	let {
		showLinearTrend = $bindable(false),
		showForecast = $bindable(false),
		showHistoricalAvg = $bindable(false),
		showPercentileBands = $bindable(false),
		showMovingAvg = $bindable(false),
		showYoYComparison = $bindable(false),
		linearTrendEnabled = true,
		forecastEnabled = true,
		historicalAvgEnabled = true,
		percentileBandsEnabled = true,
		movingAvgEnabled = false,
		yoyComparisonEnabled = false,
		forecastHorizon = 3,
		movingAvgWindow = 3,
		onLinearTrendChange,
		onForecastChange,
		onHistoricalAvgChange,
		onPercentileBandsChange,
		onMovingAvgChange,
		onYoYComparisonChange
	}: Props = $props();

	// Count of active overlays
	const activeCount = $derived(
		(showLinearTrend ? 1 : 0) +
			(showForecast ? 1 : 0) +
			(showHistoricalAvg ? 1 : 0) +
			(showPercentileBands ? 1 : 0) +
			(showMovingAvg ? 1 : 0) +
			(showYoYComparison ? 1 : 0)
	);

	// Check if any overlays are available
	const hasAnyOverlay = $derived(
		linearTrendEnabled || forecastEnabled || historicalAvgEnabled || percentileBandsEnabled || movingAvgEnabled || yoyComparisonEnabled
	);

	function handleLinearTrendChange(checked: boolean) {
		showLinearTrend = checked;
		onLinearTrendChange?.(checked);
	}

	function handleForecastChange(checked: boolean) {
		showForecast = checked;
		onForecastChange?.(checked);
	}

	function handleHistoricalAvgChange(checked: boolean) {
		showHistoricalAvg = checked;
		onHistoricalAvgChange?.(checked);
	}

	function handlePercentileBandsChange(checked: boolean) {
		showPercentileBands = checked;
		onPercentileBandsChange?.(checked);
	}

	function handleMovingAvgChange(checked: boolean) {
		showMovingAvg = checked;
		onMovingAvgChange?.(checked);
	}

	function handleYoYComparisonChange(checked: boolean) {
		showYoYComparison = checked;
		onYoYComparisonChange?.(checked);
	}
</script>

{#if hasAnyOverlay}
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button {...props} variant={activeCount > 0 ? 'default' : 'ghost'} size="sm" class="gap-1">
					<TrendingUp class="h-4 w-4" />
					Analysis
					{#if activeCount > 0}
						<span class="ml-1 rounded-full bg-primary-foreground/20 px-1.5 text-xs"
							>{activeCount}</span
						>
					{/if}
					<ChevronDown class="h-3 w-3" />
				</Button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end" class="w-56">
			<DropdownMenu.Label>Analysis Overlays</DropdownMenu.Label>
			<DropdownMenu.Separator />

			{#if linearTrendEnabled}
				<DropdownMenu.CheckboxItem
					checked={showLinearTrend}
					onCheckedChange={handleLinearTrendChange}
				>
					<span class="flex items-center gap-2">
						<span class="h-0.5 w-3" style="background-color: var(--primary);"></span>
						Regression Line
					</span>
				</DropdownMenu.CheckboxItem>
			{/if}

			{#if forecastEnabled}
				<DropdownMenu.CheckboxItem checked={showForecast} onCheckedChange={handleForecastChange}>
					<span class="flex items-center gap-2">
						<span
							class="h-0.5 w-3"
							style="background: repeating-linear-gradient(90deg, var(--chart-2) 0px, var(--chart-2) 2px, transparent 2px, transparent 4px);"
						></span>
						Forecast ({forecastHorizon} months)
					</span>
				</DropdownMenu.CheckboxItem>
			{/if}

			{#if historicalAvgEnabled}
				<DropdownMenu.CheckboxItem
					checked={showHistoricalAvg}
					onCheckedChange={handleHistoricalAvgChange}
				>
					<span class="flex items-center gap-2">
						<span
							class="h-0.5 w-3"
							style="background: repeating-linear-gradient(90deg, var(--chart-6) 0px, var(--chart-6) 3px, transparent 3px, transparent 6px);"
						></span>
						Historical Average
					</span>
				</DropdownMenu.CheckboxItem>
			{/if}

			{#if percentileBandsEnabled}
				<DropdownMenu.CheckboxItem
					checked={showPercentileBands}
					onCheckedChange={handlePercentileBandsChange}
				>
					<span class="flex items-center gap-2">
						<span class="h-2 w-3 rounded-sm opacity-30" style="background-color: var(--chart-3);"
						></span>
						Percentile Bands
					</span>
				</DropdownMenu.CheckboxItem>
			{/if}

			{#if movingAvgEnabled}
				<DropdownMenu.CheckboxItem
					checked={showMovingAvg}
					onCheckedChange={handleMovingAvgChange}
				>
					<span class="flex items-center gap-2">
						<span class="h-0.5 w-3" style="background-color: var(--chart-1);"></span>
						Moving Avg ({movingAvgWindow} months)
					</span>
				</DropdownMenu.CheckboxItem>
			{/if}

			{#if yoyComparisonEnabled}
				<DropdownMenu.CheckboxItem
					checked={showYoYComparison}
					onCheckedChange={handleYoYComparisonChange}
				>
					<span class="flex items-center gap-2">
						<span
							class="h-0.5 w-3"
							style="background: repeating-linear-gradient(90deg, var(--muted-foreground) 0px, var(--muted-foreground) 3px, transparent 3px, transparent 6px);"
						></span>
						Year-over-Year
					</span>
				</DropdownMenu.CheckboxItem>
			{/if}
		</DropdownMenu.Content>
	</DropdownMenu.Root>
{/if}
