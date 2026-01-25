<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Input } from '$lib/components/ui/input';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Popover from '$lib/components/ui/popover';
	import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
	import * as Select from '$lib/components/ui/select';
	import * as Sheet from '$lib/components/ui/sheet';
	import { Switch } from '$lib/components/ui/switch';
	import type { IntelligenceProfile, IntelligenceProfileFilters } from '$lib/schema/payees';
	import { resetIntelligenceProfile, suggestIntelligenceProfileDefaults, updateIntelligenceProfile } from '$lib/query/payees';
	// Icons
	import Brain from '@lucide/svelte/icons/brain';
	import Filter from '@lucide/svelte/icons/filter';
	import Lightbulb from '@lucide/svelte/icons/lightbulb';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Save from '@lucide/svelte/icons/save';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Zap from '@lucide/svelte/icons/zap';

	interface Props {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		payeeId: number;
		profile: IntelligenceProfile | null;
		onProfileUpdated?: () => void;
	}

	let {
		open = $bindable(false),
		onOpenChange,
		payeeId,
		profile,
		onProfileUpdated,
	}: Props = $props();

	// Category type options
	const categoryTypeOptions = [
		{ value: 'income', label: 'Income', description: 'Money received (paychecks, deposits)' },
		{ value: 'expense', label: 'Expense', description: 'Money spent (purchases, payments)' },
		{ value: 'transfer', label: 'Transfer', description: 'Money moved between accounts' },
		{ value: 'savings', label: 'Savings', description: 'Money set aside for savings goals' },
	] as const;

	// Amount sign options
	const amountSignOptions = [
		{ value: 'all', label: 'All Transactions' },
		{ value: 'positive', label: 'Positive Only (Income)' },
		{ value: 'negative', label: 'Negative Only (Expenses)' },
	] as const;

	// Date range type options
	const dateRangeOptions = [
		{ value: 'all', label: 'All Time' },
		{ value: 'last_n_months', label: 'Last N Months' },
		{ value: 'last_n_years', label: 'Last N Years' },
	] as const;

	// Prediction method options
	const predictionMethodOptions = [
		{ value: 'default', label: 'Use Global Setting', description: 'Inherit from workspace settings', icon: null },
		{ value: 'statistical', label: 'Statistical Only', description: 'Fast pattern matching (no AI/ML)', icon: Zap },
		{ value: 'ml', label: 'ML Enhanced', description: 'Time-series forecasting + anomaly detection', icon: Brain },
		{ value: 'ai', label: 'AI Powered', description: 'ML predictions + natural language explanations', icon: Sparkles },
	] as const;

	// Mutations
	const updateMutation = updateIntelligenceProfile.options();
	const resetMutation = resetIntelligenceProfile.options();

	// Smart defaults suggestion query
	const suggestionsQuery = $derived(
		payeeId ? suggestIntelligenceProfileDefaults(payeeId).options() : null
	);

	// Apply smart defaults to form
	function applySmartDefaults() {
		const suggestions = suggestionsQuery?.data;
		if (!suggestions?.profile) return;

		const { profile: suggested } = suggestions;

		enabled = suggested.enabled;
		categoryTypes = suggested.filters?.categoryTypes ?? [];
		amountSign = suggested.filters?.amountSign ?? 'all';
		dateRangeType = suggested.filters?.dateRange?.type ?? 'all';
		dateRangeMonths = String(suggested.filters?.dateRange?.months ?? 12);
		excludeTransfers = suggested.filters?.excludeTransfers ?? false;
		minAmount = suggested.filters?.minAmount ? String(suggested.filters.minAmount) : '';
		maxAmount = suggested.filters?.maxAmount ? String(suggested.filters.maxAmount) : '';
		predictionMethod = suggested.filters?.predictionMethod ?? 'default';
	}

	// Form state - initialize from profile
	let enabled = $state(profile?.enabled ?? false);
	let categoryTypes = $state<Array<'income' | 'expense' | 'transfer' | 'savings'>>(
		profile?.filters?.categoryTypes ?? []
	);
	let amountSign = $state<'positive' | 'negative' | 'all'>(
		profile?.filters?.amountSign ?? 'all'
	);
	let dateRangeType = $state<'all' | 'last_n_months' | 'last_n_years'>(
		profile?.filters?.dateRange?.type ?? 'all'
	);
	let dateRangeMonths = $state(String(profile?.filters?.dateRange?.months ?? 12));
	let excludeTransfers = $state(profile?.filters?.excludeTransfers ?? false);
	let minAmount = $state(profile?.filters?.minAmount ? String(profile.filters.minAmount) : '');
	let maxAmount = $state(profile?.filters?.maxAmount ? String(profile.filters.maxAmount) : '');
	let predictionMethod = $state<'default' | 'statistical' | 'ml' | 'ai'>(
		profile?.filters?.predictionMethod ?? 'default'
	);

	// Reset form when profile changes
	$effect(() => {
		enabled = profile?.enabled ?? false;
		categoryTypes = profile?.filters?.categoryTypes ?? [];
		amountSign = profile?.filters?.amountSign ?? 'all';
		dateRangeType = profile?.filters?.dateRange?.type ?? 'all';
		dateRangeMonths = String(profile?.filters?.dateRange?.months ?? 12);
		excludeTransfers = profile?.filters?.excludeTransfers ?? false;
		minAmount = profile?.filters?.minAmount ? String(profile.filters.minAmount) : '';
		maxAmount = profile?.filters?.maxAmount ? String(profile.filters.maxAmount) : '';
		predictionMethod = profile?.filters?.predictionMethod ?? 'default';
	});

	// Check if category type is selected
	function isCategorySelected(type: 'income' | 'expense' | 'transfer' | 'savings'): boolean {
		return categoryTypes.includes(type);
	}

	// Toggle category type
	function toggleCategoryType(type: 'income' | 'expense' | 'transfer' | 'savings') {
		if (categoryTypes.includes(type)) {
			categoryTypes = categoryTypes.filter((t) => t !== type);
		} else {
			categoryTypes = [...categoryTypes, type];
		}
	}

	function handleClose() {
		open = false;
	}

	// Build profile from form state
	function buildProfile(): IntelligenceProfile {
		const filters: IntelligenceProfileFilters = {};

		if (categoryTypes.length > 0) {
			filters.categoryTypes = categoryTypes;
		}

		if (amountSign !== 'all') {
			filters.amountSign = amountSign;
		}

		if (dateRangeType !== 'all') {
			filters.dateRange = {
				type: dateRangeType,
				months: Number(dateRangeMonths),
			};
		}

		if (excludeTransfers) {
			filters.excludeTransfers = true;
		}

		if (minAmount) {
			filters.minAmount = Number(minAmount);
		}

		if (maxAmount) {
			filters.maxAmount = Number(maxAmount);
		}

		if (predictionMethod !== 'default') {
			filters.predictionMethod = predictionMethod;
		}

		return {
			enabled,
			filters,
		};
	}

	function handleSave() {
		const newProfile = buildProfile();

		updateMutation.mutate(
			{ id: payeeId, profile: newProfile },
			{
				onSuccess: () => {
					onProfileUpdated?.();
					handleClose();
				},
			}
		);
	}

	function handleReset() {
		resetMutation.mutate(
			{ id: payeeId },
			{
				onSuccess: () => {
					onProfileUpdated?.();
					handleClose();
				},
			}
		);
	}

	// Derive if form has any filters configured
	const hasFilters = $derived(
		categoryTypes.length > 0 ||
		amountSign !== 'all' ||
		dateRangeType !== 'all' ||
		excludeTransfers ||
		minAmount !== '' ||
		maxAmount !== '' ||
		predictionMethod !== 'default'
	);

	const isLoading = $derived(updateMutation.isPending || resetMutation.isPending);

	// Smart defaults derived values
	const suggestions = $derived(suggestionsQuery?.data ?? null);
	const hasSuggestions = $derived(suggestions !== null && suggestions.reasoning.length > 0);
	const suggestionConfidence = $derived(suggestions?.confidence ?? 0);
</script>

<ResponsiveSheet bind:open {onOpenChange}>
	{#snippet header()}
		<div class="flex items-center gap-2">
			<Filter class="h-5 w-5" />
			<div>
				<Sheet.Title>Intelligence Profile</Sheet.Title>
				<Sheet.Description>
					Configure filters to focus intelligence calculations on specific transaction types.
				</Sheet.Description>
			</div>
		</div>
	{/snippet}

	{#snippet content()}
		<div class="space-y-6">
			<!-- Smart Defaults Suggestion -->
			{#if hasSuggestions}
				<div class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
					<div class="flex items-start justify-between gap-3">
						<div class="flex items-start gap-3">
							<div class="rounded-full bg-blue-100 p-2 dark:bg-blue-900/50">
								<Sparkles class="h-4 w-4 text-blue-600 dark:text-blue-400" />
							</div>
							<div class="space-y-1">
								<p class="font-medium text-blue-900 dark:text-blue-100">
									Smart Defaults Available
								</p>
								<p class="text-sm text-blue-700 dark:text-blue-300">
									Based on payee type and transaction history.
								</p>
								<Badge variant="secondary" class="mt-1">
									{Math.round(suggestionConfidence * 100)}% confidence
								</Badge>
							</div>
						</div>
						<Popover.Root>
							<Popover.Trigger>
								{#snippet child({ props })}
									<Button {...props} variant="outline" size="sm" class="shrink-0">
										<Lightbulb class="mr-1.5 h-3.5 w-3.5" />
										View
									</Button>
								{/snippet}
							</Popover.Trigger>
							<Popover.Content align="end" class="w-80">
								<div class="space-y-3">
									<p class="text-sm font-medium">Why these settings?</p>
									<ul class="space-y-1.5 text-sm text-muted-foreground">
										{#each suggestions?.reasoning ?? [] as reason}
											<li class="flex items-start gap-2">
												<span class="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-blue-500"></span>
												{reason}
											</li>
										{/each}
									</ul>
									<Button
										size="sm"
										class="w-full"
										onclick={applySmartDefaults}
										disabled={isLoading}
									>
										<Sparkles class="mr-2 h-4 w-4" />
										Apply Smart Defaults
									</Button>
								</div>
							</Popover.Content>
						</Popover.Root>
					</div>
				</div>
			{/if}

			<!-- Enable Profile -->
			<div class="flex items-center justify-between rounded-lg border p-4">
				<div class="space-y-0.5">
					<Label class="text-base font-medium">Enable Profile Filters</Label>
					<p class="text-muted-foreground text-sm">
						When enabled, intelligence calculations will only use matching transactions.
					</p>
				</div>
				<Switch bind:checked={enabled} disabled={isLoading} />
			</div>

			<!-- Prediction Method Override -->
			<div class="space-y-3">
				<div>
					<Label class="text-base font-semibold">Prediction Method</Label>
					<p class="text-muted-foreground text-sm">
						Override the global prediction method for this payee only.
					</p>
				</div>
				<div class="grid gap-2">
					{#each predictionMethodOptions as option (option.value)}
						{@const isSelected = predictionMethod === option.value}
						{@const Icon = option.icon}
						<button
							type="button"
							class="flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 {isSelected ? 'border-primary bg-primary/5' : ''}"
							onclick={() => predictionMethod = option.value}
							disabled={isLoading}
						>
							<div class="flex h-5 w-5 items-center justify-center rounded-full border-2 {isSelected ? 'border-primary' : 'border-muted-foreground/30'}">
								{#if isSelected}
									<div class="h-2.5 w-2.5 rounded-full bg-primary"></div>
								{/if}
							</div>
							<div class="flex-1">
								<div class="flex items-center gap-2">
									{#if Icon}
										<Icon class="h-4 w-4 {option.value === 'ai' ? 'text-violet-500' : option.value === 'ml' ? 'text-primary' : 'text-yellow-500'}" />
									{/if}
									<span class="font-medium">{option.label}</span>
									{#if option.value === 'default'}
										<Badge variant="secondary" class="text-[10px]">Recommended</Badge>
									{/if}
								</div>
								<p class="text-muted-foreground text-xs mt-0.5">{option.description}</p>
							</div>
						</button>
					{/each}
				</div>
			</div>

			<!-- Filter options (disabled when profile is not enabled) -->
			<div class="space-y-6" class:opacity-50={!enabled} class:pointer-events-none={!enabled}>
				<!-- Category Types -->
				<div class="space-y-3">
					<Label class="text-base font-semibold">Category Types</Label>
					<p class="text-muted-foreground text-sm">
						Include only transactions from these category types.
						Leave all unchecked to include all types.
					</p>
					<div class="grid grid-cols-2 gap-3">
						{#each categoryTypeOptions as option (option.value)}
							{@const isSelected = isCategorySelected(option.value)}
							<button
								type="button"
								class="flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 {isSelected ? 'border-primary bg-primary/5' : ''}"
								onclick={() => toggleCategoryType(option.value)}
								disabled={isLoading}
							>
								<Checkbox
									checked={isSelected}
									class="mt-0.5"
								/>
								<div>
									<p class="font-medium">{option.label}</p>
									<p class="text-muted-foreground text-xs">{option.description}</p>
								</div>
							</button>
						{/each}
					</div>
				</div>

				<!-- Amount Sign -->
				<div class="space-y-3">
					<Label class="text-base font-semibold">Amount Sign</Label>
					<p class="text-muted-foreground text-sm">
						Filter by transaction direction.
					</p>
					<Select.Root type="single" bind:value={amountSign}>
						<Select.Trigger disabled={isLoading}>
							<span>
								{amountSignOptions.find((o) => o.value === amountSign)?.label}
							</span>
						</Select.Trigger>
						<Select.Content>
							{#each amountSignOptions as option (option.value)}
								<Select.Item value={option.value}>{option.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<!-- Date Range -->
				<div class="space-y-3">
					<Label class="text-base font-semibold">Date Range</Label>
					<p class="text-muted-foreground text-sm">
						Limit analysis to recent transactions.
					</p>
					<div class="flex gap-3">
						<Select.Root type="single" bind:value={dateRangeType}>
							<Select.Trigger class="w-48" disabled={isLoading}>
								<span>
									{dateRangeOptions.find((o) => o.value === dateRangeType)?.label}
								</span>
							</Select.Trigger>
							<Select.Content>
								{#each dateRangeOptions as option (option.value)}
									<Select.Item value={option.value}>{option.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
						{#if dateRangeType !== 'all'}
							<Input
								type="number"
								min="1"
								max={dateRangeType === 'last_n_months' ? 120 : 10}
								bind:value={dateRangeMonths}
								placeholder={dateRangeType === 'last_n_months' ? '12' : '2'}
								class="w-24"
								disabled={isLoading}
							/>
							<span class="text-muted-foreground flex items-center text-sm">
								{dateRangeType === 'last_n_months' ? 'months' : 'years'}
							</span>
						{/if}
					</div>
				</div>

				<!-- Exclude Transfers -->
				<div class="flex items-center justify-between rounded-lg border p-4">
					<div class="space-y-0.5">
						<Label class="font-medium">Exclude Transfers</Label>
						<p class="text-muted-foreground text-sm">
							Exclude internal transfer transactions from analysis.
						</p>
					</div>
					<Switch bind:checked={excludeTransfers} disabled={isLoading} />
				</div>

				<!-- Amount Thresholds -->
				<div class="space-y-3">
					<Label class="text-base font-semibold">Amount Thresholds</Label>
					<p class="text-muted-foreground text-sm">
						Filter transactions by absolute amount value.
					</p>
					<div class="flex items-center gap-3">
						<div class="flex-1 space-y-1">
							<Label for="min-amount" class="text-xs">Minimum</Label>
							<Input
								id="min-amount"
								type="number"
								min="0"
								step="0.01"
								bind:value={minAmount}
								placeholder="No minimum"
								disabled={isLoading}
							/>
						</div>
						<span class="text-muted-foreground pt-6">to</span>
						<div class="flex-1 space-y-1">
							<Label for="max-amount" class="text-xs">Maximum</Label>
							<Input
								id="max-amount"
								type="number"
								min="0"
								step="0.01"
								bind:value={maxAmount}
								placeholder="No maximum"
								disabled={isLoading}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/snippet}

	{#snippet footer()}
		<div class="flex items-center justify-between gap-3">
			<Button
				variant="outline"
				onclick={handleReset}
				disabled={isLoading || !profile?.enabled}
			>
				{#if resetMutation.isPending}
					<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
				{:else}
					<RotateCcw class="mr-2 h-4 w-4" />
				{/if}
				Reset to Defaults
			</Button>
			<div class="flex gap-2">
				<Button variant="outline" onclick={handleClose} disabled={isLoading}>
					Cancel
				</Button>
				<Button onclick={handleSave} disabled={isLoading}>
					{#if updateMutation.isPending}
						<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
					{:else}
						<Save class="mr-2 h-4 w-4" />
					{/if}
					Save Profile
				</Button>
			</div>
		</div>
	{/snippet}
</ResponsiveSheet>
