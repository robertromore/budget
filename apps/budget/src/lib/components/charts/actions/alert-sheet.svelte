<script lang="ts">
	import { browser } from '$app/environment';
	import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import NumericInput from '$lib/components/input/numeric-input.svelte';
	import { chartSelection } from '$lib/states/ui/chart-selection.svelte';
	import { createAlert } from '$lib/query/metric-alerts';
	import { currencyFormatter } from '$lib/utils/formatters';
	import { toast } from '$lib/utils/toast-interceptor';

	// Icons
	import Calculator from '@lucide/svelte/icons/calculator';
	import Bell from '@lucide/svelte/icons/bell';

	interface Props {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	}

	let { open = $bindable(false), onOpenChange }: Props = $props();

	// Form state
	let alertName = $state('');
	let conditionType = $state<'above' | 'below'>('above');
	let calculationMethod = $state<'average' | 'median' | 'highest' | 'lowest' | 'custom'>('average');
	let customAmount = $state(0);
	let isSubmitting = $state(false);

	// Get statistics from chart selection
	const stats = $derived({
		average: chartSelection.averageValue,
		median: chartSelection.medianValue,
		highest: chartSelection.maxValue,
		lowest: chartSelection.minValue,
		count: chartSelection.count
	});

	// Detect scope from selected data points
	const scope = $derived.by(() => {
		const points = chartSelection.selectedPoints;
		if (points.length === 0) return { type: 'monthly_spending' as const };

		const firstPoint = points[0]!;

		if (firstPoint.categoryId) {
			return {
				type: 'category_spending' as const,
				categoryId: Number(firstPoint.categoryId),
				categoryName: firstPoint.categoryName
			};
		}
		if (firstPoint.accountId) {
			return {
				type: 'account_spending' as const,
				accountId: firstPoint.accountId,
				accountSlug: firstPoint.accountSlug
			};
		}
		return { type: 'monthly_spending' as const };
	});

	// Calculate threshold based on selected method
	const threshold = $derived.by(() => {
		switch (calculationMethod) {
			case 'average':
				return stats.average;
			case 'median':
				return stats.median;
			case 'highest':
				return stats.highest;
			case 'lowest':
				return stats.lowest;
			case 'custom':
				return customAmount;
		}
	});

	// Auto-generate default alert name
	const defaultName = $derived.by(() => {
		const scopeLabel =
			scope.type === 'category_spending'
				? scope.categoryName ?? 'Category'
				: scope.type === 'account_spending'
					? scope.accountSlug ?? 'Account'
					: 'Monthly';
		const direction = conditionType === 'above' ? 'above' : 'below';
		return `${scopeLabel} spending ${direction} ${currencyFormatter.format(threshold)}`;
	});

	// Create mutation (lazy - only used in browser)
	const createMutation = $derived(browser ? createAlert.options() : null);

	// Reset form when opened
	$effect(() => {
		if (open) {
			alertName = '';
			conditionType = 'above';
			calculationMethod = 'average';
			customAmount = stats.average;
		}
	});

	// Update custom amount when switching to custom
	$effect(() => {
		if (calculationMethod !== 'custom') {
			customAmount = threshold;
		}
	});

	async function handleSubmit() {
		if (!createMutation) {
			toast.error('Unable to create alert - please try again');
			return;
		}

		isSubmitting = true;

		try {
			const selectedMonths = chartSelection.selectedPoints.map((p) => p.id);

			await createMutation.mutateAsync({
				name: alertName || defaultName,
				metricType: scope.type,
				conditionType,
				threshold,
				accountId: scope.type === 'account_spending' ? scope.accountId : undefined,
				categoryId: scope.type === 'category_spending' ? scope.categoryId : undefined,
				metadata: {
					calculationMethod,
					dataPointCount: stats.count,
					selectedMonths
				}
			});

			handleClose();
		} catch (error) {
			toast.error('Failed to create alert', {
				description: error instanceof Error ? error.message : 'Unknown error'
			});
		} finally {
			isSubmitting = false;
		}
	}

	function handleClose() {
		open = false;
		onOpenChange?.(false);
	}
</script>

<ResponsiveSheet bind:open {onOpenChange} defaultWidth={500}>
	{#snippet header()}
		<Sheet.Title>Create Spending Alert</Sheet.Title>
		<Sheet.Description>
			Get notified when spending crosses your threshold
		</Sheet.Description>
	{/snippet}

	{#snippet content()}
		<div class="space-y-6">
			<!-- Selected Data Summary -->
			<div class="rounded-lg border bg-muted/50 p-4">
				<div class="mb-2 flex items-center gap-2">
					<Calculator class="h-4 w-4 text-muted-foreground" />
					<span class="text-sm font-medium">Based on {stats.count} selected month{stats.count !== 1 ? 's' : ''}</span>
				</div>
				<div class="grid grid-cols-2 gap-3 text-sm">
					<div>
						<span class="text-muted-foreground">Average:</span>
						<span class="ml-1 font-semibold">{currencyFormatter.format(stats.average)}</span>
					</div>
					<div>
						<span class="text-muted-foreground">Median:</span>
						<span class="ml-1 font-semibold">{currencyFormatter.format(stats.median)}</span>
					</div>
					<div>
						<span class="text-muted-foreground">Highest:</span>
						<span class="ml-1 font-semibold text-destructive">{currencyFormatter.format(stats.highest)}</span>
					</div>
					<div>
						<span class="text-muted-foreground">Lowest:</span>
						<span class="ml-1 font-semibold text-green-600">{currencyFormatter.format(stats.lowest)}</span>
					</div>
				</div>
				{#if scope.type !== 'monthly_spending'}
					<div class="mt-2 border-t pt-2 text-xs text-muted-foreground">
						<Bell class="mr-1 inline h-3 w-3" />
						Scoped to: {scope.type === 'category_spending'
							? scope.categoryName ?? 'Category'
							: scope.accountSlug ?? 'Account'}
					</div>
				{/if}
			</div>

			<!-- Alert Name -->
			<div class="space-y-2">
				<Label for="alert-name">Alert Name</Label>
				<Input
					id="alert-name"
					bind:value={alertName}
					placeholder={defaultName}
				/>
				<p class="text-xs text-muted-foreground">Leave blank to auto-generate</p>
			</div>

			<!-- Condition Type -->
			<div class="space-y-3">
				<Label>Notify me when spending is...</Label>
				<RadioGroup.Root bind:value={conditionType} class="gap-2">
					<div class="flex items-center space-x-2">
						<RadioGroup.Item value="above" id="above" />
						<Label for="above" class="cursor-pointer font-normal">Above threshold</Label>
					</div>
					<div class="flex items-center space-x-2">
						<RadioGroup.Item value="below" id="below" />
						<Label for="below" class="cursor-pointer font-normal">Below threshold</Label>
					</div>
				</RadioGroup.Root>
			</div>

			<!-- Threshold Calculation -->
			<div class="space-y-3">
				<Label>How to calculate the threshold?</Label>
				<RadioGroup.Root bind:value={calculationMethod} class="gap-2">
					<div class="flex items-center space-x-2">
						<RadioGroup.Item value="average" id="calc-average" />
						<Label for="calc-average" class="cursor-pointer font-normal">
							Use Average ({currencyFormatter.format(stats.average)})
						</Label>
					</div>
					<div class="flex items-center space-x-2">
						<RadioGroup.Item value="median" id="calc-median" />
						<Label for="calc-median" class="cursor-pointer font-normal">
							Use Median ({currencyFormatter.format(stats.median)})
						</Label>
					</div>
					<div class="flex items-center space-x-2">
						<RadioGroup.Item value="highest" id="calc-highest" />
						<Label for="calc-highest" class="cursor-pointer font-normal">
							Use Highest ({currencyFormatter.format(stats.highest)})
						</Label>
					</div>
					<div class="flex items-center space-x-2">
						<RadioGroup.Item value="lowest" id="calc-lowest" />
						<Label for="calc-lowest" class="cursor-pointer font-normal">
							Use Lowest ({currencyFormatter.format(stats.lowest)})
						</Label>
					</div>
					<div class="flex items-center space-x-2">
						<RadioGroup.Item value="custom" id="calc-custom" />
						<Label for="calc-custom" class="cursor-pointer font-normal">Custom amount</Label>
					</div>
				</RadioGroup.Root>

				{#if calculationMethod === 'custom'}
					<div class="ml-6">
						<NumericInput
							bind:value={customAmount}
							buttonClass="w-40"
						/>
					</div>
				{/if}
			</div>

			<!-- Threshold Display -->
			<div class="rounded-lg border-2 border-primary/20 bg-primary/5 p-4 text-center">
				<p class="text-sm text-muted-foreground">Alert Threshold</p>
				<p class="text-3xl font-bold text-primary">{currencyFormatter.format(threshold)}</p>
				<p class="text-xs text-muted-foreground">
					Notify when {conditionType === 'above' ? 'above' : 'below'} this amount
				</p>
			</div>
		</div>
	{/snippet}

	{#snippet footer()}
		<div class="flex justify-between gap-2">
			<Button variant="outline" onclick={handleClose}>Cancel</Button>
			<Button
				onclick={handleSubmit}
				disabled={isSubmitting}
			>
				{isSubmitting ? 'Creating...' : 'Create Alert'}
			</Button>
		</div>
	{/snippet}
</ResponsiveSheet>
