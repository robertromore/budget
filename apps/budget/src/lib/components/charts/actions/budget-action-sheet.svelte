<script lang="ts">
	import { browser } from '$app/environment';
	import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import NumericInput from '$lib/components/input/numeric-input.svelte';
	import { chartSelection } from '$lib/states/ui/chart-selection.svelte';
	import { listBudgets, updateBudget } from '$lib/query/budgets';
	import { currencyFormatter } from '$lib/utils/formatters';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';

	// Icons
	import Calculator from '@lucide/svelte/icons/calculator';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import Plus from '@lucide/svelte/icons/plus';

	interface Props {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	}

	let { open = $bindable(false), onOpenChange }: Props = $props();

	// Form state
	let calculationMethod = $state<'average' | 'median' | 'highest' | 'lowest' | 'custom'>('average');
	let customAmount = $state(0);
	let selectedBudgetId = $state<number | null>(null);
	let isSubmitting = $state(false);

	// Query active budgets (only in browser)
	const budgetsQuery = $derived(browser ? listBudgets('active').options() : null);

	// Get statistics from chart selection
	const stats = $derived({
		average: chartSelection.averageValue,
		median: chartSelection.medianValue,
		highest: chartSelection.maxValue,
		lowest: chartSelection.minValue,
		count: chartSelection.count
	});

	// Calculate the suggested amount based on selected method
	const suggestedAmount = $derived.by(() => {
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

	// Get the selected budget
	const selectedBudget = $derived(
		budgetsQuery?.data?.find((b) => b.id === selectedBudgetId) ?? null
	);

	// Format budgets for select dropdown
	const budgetOptions = $derived(
		(budgetsQuery?.data ?? []).map((b) => ({
			value: b.id,
			label: b.name,
			type: b.type
		}))
	);

	// Update mutation (lazy - only used in browser)
	const updateMutation = $derived(browser ? updateBudget.options() : null);

	// Reset form when opened
	$effect(() => {
		if (open) {
			calculationMethod = 'average';
			customAmount = stats.average;
			selectedBudgetId = null;
		}
	});

	// Update custom amount when switching to custom
	$effect(() => {
		if (calculationMethod !== 'custom') {
			customAmount = suggestedAmount;
		}
	});

	async function handleSubmit() {
		if (!updateMutation) {
			toast.error('Unable to update - please try again');
			return;
		}

		if (!selectedBudget) {
			toast.error('Please select a budget');
			return;
		}

		isSubmitting = true;

		try {
			// Update the budget's metadata.allocatedAmount
			const newMetadata = {
				...selectedBudget.metadata,
				allocatedAmount: Math.round(suggestedAmount * 100) / 100
			};

			await updateMutation.mutateAsync({
				id: selectedBudget.id,
				data: { metadata: newMetadata }
			});

			toast.success('Budget target updated', {
				description: `Set ${selectedBudget.name} to ${currencyFormatter.format(suggestedAmount)}`
			});

			handleClose();
		} catch (error) {
			toast.error('Failed to update budget', {
				description: error instanceof Error ? error.message : 'Unknown error'
			});
		} finally {
			isSubmitting = false;
		}
	}

	function handleCreateNew() {
		// Navigate to budget creation with pre-filled amount
		goto(`/budgets/new?amount=${Math.round(suggestedAmount)}`);
		handleClose();
	}

	function handleClose() {
		open = false;
		onOpenChange?.(false);
	}
</script>

<ResponsiveSheet bind:open {onOpenChange} defaultWidth={500}>
	{#snippet header()}
		<Sheet.Title>Set Budget Target</Sheet.Title>
		<Sheet.Description>
			Use your selected spending data to set a budget target
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
			</div>

			<!-- Calculation Method -->
			<div class="space-y-3">
				<Label>How to calculate the target?</Label>
				<RadioGroup.Root bind:value={calculationMethod} class="gap-2">
					<div class="flex items-center space-x-2">
						<RadioGroup.Item value="average" id="average" />
						<Label for="average" class="cursor-pointer font-normal">
							Use Average ({currencyFormatter.format(stats.average)})
						</Label>
					</div>
					<div class="flex items-center space-x-2">
						<RadioGroup.Item value="median" id="median" />
						<Label for="median" class="cursor-pointer font-normal">
							Use Median ({currencyFormatter.format(stats.median)})
						</Label>
					</div>
					<div class="flex items-center space-x-2">
						<RadioGroup.Item value="highest" id="highest" />
						<Label for="highest" class="cursor-pointer font-normal">
							Use Highest ({currencyFormatter.format(stats.highest)})
						</Label>
					</div>
					<div class="flex items-center space-x-2">
						<RadioGroup.Item value="lowest" id="lowest" />
						<Label for="lowest" class="cursor-pointer font-normal">
							Use Lowest ({currencyFormatter.format(stats.lowest)})
						</Label>
					</div>
					<div class="flex items-center space-x-2">
						<RadioGroup.Item value="custom" id="custom" />
						<Label for="custom" class="cursor-pointer font-normal">Custom amount</Label>
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

			<!-- Suggested Amount Display -->
			<div class="rounded-lg border-2 border-primary/20 bg-primary/5 p-4 text-center">
				<p class="text-sm text-muted-foreground">Suggested Budget Target</p>
				<p class="text-3xl font-bold text-primary">{currencyFormatter.format(suggestedAmount)}</p>
				<p class="text-xs text-muted-foreground">per month</p>
			</div>

			<!-- Budget Selection -->
			<div class="space-y-3">
				<Label>Apply to which budget?</Label>
				{#if budgetsQuery?.isLoading}
					<p class="text-sm text-muted-foreground">Loading budgets...</p>
				{:else if budgetOptions.length === 0}
					<p class="text-sm text-muted-foreground">No active budgets found</p>
				{:else}
					<Select.Root
						type="single"
						onValueChange={(v) => {
							selectedBudgetId = v ? Number(v) : null;
						}}
					>
						<Select.Trigger class="w-full">
							{selectedBudget?.name ?? 'Select a budget...'}
						</Select.Trigger>
						<Select.Content>
							{#each budgetOptions as budget}
								<Select.Item value={String(budget.value)}>
									{budget.label}
									<span class="ml-2 text-xs text-muted-foreground">({budget.type})</span>
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				{/if}

				{#if selectedBudget}
					<div class="text-sm text-muted-foreground">
						Current target: {selectedBudget.metadata?.allocatedAmount
							? currencyFormatter.format(selectedBudget.metadata.allocatedAmount)
							: 'Not set'}
						{#if selectedBudget.metadata?.allocatedAmount}
							{@const diff = suggestedAmount - selectedBudget.metadata.allocatedAmount}
							<span class:text-destructive={diff > 0} class:text-green-600={diff < 0}>
								({diff > 0 ? '+' : ''}{currencyFormatter.format(diff)})
							</span>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Create New Budget Option -->
			<Button variant="outline" class="w-full gap-2" onclick={handleCreateNew}>
				<Plus class="h-4 w-4" />
				Create New Budget with This Target
			</Button>
		</div>
	{/snippet}

	{#snippet footer()}
		<div class="flex justify-between gap-2">
			<Button variant="outline" onclick={handleClose}>Cancel</Button>
			<Button
				onclick={handleSubmit}
				disabled={!selectedBudget || isSubmitting}
			>
				{isSubmitting ? 'Updating...' : 'Update Budget Target'}
			</Button>
		</div>
	{/snippet}
</ResponsiveSheet>
