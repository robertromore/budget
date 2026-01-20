<script lang="ts">
	import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
	import * as Sheet from '$lib/components/ui/sheet';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { Textarea } from '$lib/components/ui/textarea';
	import { chartSelection } from '$lib/states/ui/chart-selection.svelte';
	import { currencyFormatter } from '$lib/utils/formatters';
	import { getCurrentTimestamp } from '$lib/utils/dates';
	import { toast } from '$lib/utils/toast-interceptor';

	// Icons
	import Download from '@lucide/svelte/icons/download';
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';

	interface Props {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	}

	let { open = $bindable(false), onOpenChange }: Props = $props();

	// Export options
	let includeStatistics = $state(true);
	let includeHeaders = $state(true);
	let copied = $state(false);

	// Generate export content
	const exportContent = $derived.by(() => {
		const lines: string[] = [];
		const sortedPoints = chartSelection.sortedByDate;

		if (includeHeaders) {
			lines.push('Date,Label,Amount');
		}

		sortedPoints.forEach((point) => {
			const date = point.date.toISOString().split('T')[0];
			lines.push(`${date},"${point.label}",${point.value.toFixed(2)}`);
		});

		if (includeStatistics) {
			lines.push('');
			lines.push('Statistics');
			lines.push(`Average,${chartSelection.averageValue.toFixed(2)}`);
			lines.push(`Median,${chartSelection.medianValue.toFixed(2)}`);
			lines.push(`Min,${chartSelection.minValue.toFixed(2)}`);
			lines.push(`Max,${chartSelection.maxValue.toFixed(2)}`);
			lines.push(`Total,${chartSelection.totalValue.toFixed(2)}`);
			lines.push(`Std Dev,${chartSelection.standardDeviation.toFixed(2)}`);
		}

		return lines.join('\n');
	});

	async function handleCopy() {
		await navigator.clipboard.writeText(exportContent);
		copied = true;
		toast.success('Copied to clipboard');
		setTimeout(() => {
			copied = false;
		}, 2000);
	}

	function handleDownload() {
		const blob = new Blob([exportContent], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `spending-comparison-${getCurrentTimestamp()}.csv`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		toast.success('Downloaded CSV file');
	}

	function handleClose() {
		open = false;
		onOpenChange?.(false);
	}
</script>

<ResponsiveSheet bind:open {onOpenChange} defaultWidth={600}>
	{#snippet header()}
		<Sheet.Title>Export Data</Sheet.Title>
		<Sheet.Description>
			Export {chartSelection.count} selected months as CSV
		</Sheet.Description>
	{/snippet}

	{#snippet content()}
		<div class="space-y-6">
			<!-- Export options -->
			<div class="space-y-4">
				<div class="flex items-center justify-between">
					<div>
						<Label for="include-headers">Include Headers</Label>
						<p class="text-xs text-muted-foreground">Add column headers to the CSV</p>
					</div>
					<Switch id="include-headers" bind:checked={includeHeaders} />
				</div>

				<div class="flex items-center justify-between">
					<div>
						<Label for="include-stats">Include Statistics</Label>
						<p class="text-xs text-muted-foreground">Add summary statistics at the end</p>
					</div>
					<Switch id="include-stats" bind:checked={includeStatistics} />
				</div>
			</div>

			<!-- Preview -->
			<div class="space-y-2">
				<Label>Preview</Label>
				<Textarea
					value={exportContent}
					readonly
					class="h-64 font-mono text-xs"
				/>
			</div>

			<!-- Summary -->
			<div class="rounded-lg border p-3">
				<h4 class="text-sm font-medium">Export Summary</h4>
				<div class="mt-2 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
					<div>Data Points: {chartSelection.count}</div>
					<div>Total: {currencyFormatter.format(chartSelection.totalValue)}</div>
					<div>Date Range: {chartSelection.sortedByDate[0]?.label} - {chartSelection.sortedByDate[chartSelection.count - 1]?.label}</div>
				</div>
			</div>
		</div>
	{/snippet}

	{#snippet footer()}
		<div class="flex justify-between gap-2">
			<Button variant="outline" onclick={handleClose}>Cancel</Button>
			<div class="flex gap-2">
				<Button variant="outline" onclick={handleCopy}>
					{#if copied}
						<Check class="mr-2 h-4 w-4" />
						Copied
					{:else}
						<Copy class="mr-2 h-4 w-4" />
						Copy
					{/if}
				</Button>
				<Button onclick={handleDownload}>
					<Download class="mr-2 h-4 w-4" />
					Download CSV
				</Button>
			</div>
		</div>
	{/snippet}
</ResponsiveSheet>
