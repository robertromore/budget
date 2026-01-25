<script lang="ts">
	import NumericInput from '$lib/components/input/numeric-input.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import type { BudgetSuggestion } from '$lib/hooks/use-payee-insights.svelte';
	import type { FeedbackRating } from '$lib/schema/prediction-feedback';
	import { formatCurrency } from '$lib/utils/formatters';
	// Icons
	import Brain from '@lucide/svelte/icons/brain';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import DollarSign from '@lucide/svelte/icons/dollar-sign';
	import Lightbulb from '@lucide/svelte/icons/lightbulb';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Pencil from '@lucide/svelte/icons/pencil';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import ThumbsDown from '@lucide/svelte/icons/thumbs-down';
	import ThumbsUp from '@lucide/svelte/icons/thumbs-up';
	import Zap from '@lucide/svelte/icons/zap';

	interface FeedbackData {
		correctedAmount?: number;
		rating?: FeedbackRating;
	}

	interface Props {
		suggestion: BudgetSuggestion | null;
		onApply?: (amount: number) => void;
		isLoading?: boolean;
		onRefresh?: () => void;
		onFeedback?: (feedback: FeedbackData) => void;
		/** Initial rating from persisted feedback */
		initialRating?: FeedbackRating | null;
		/** Initial corrected amount from persisted feedback */
		initialCorrectedAmount?: number | null;
	}

	let {
		suggestion,
		onApply,
		isLoading = false,
		onRefresh,
		onFeedback,
		initialRating = null,
		initialCorrectedAmount = null,
	}: Props = $props();

	// Editing state
	let isEditingAmount = $state(false);
	let editedAmount = $state<number | undefined>(undefined);

	// Corrected value (persist after editing to show user their correction)
	let correctedAmount = $state<number | null>(initialCorrectedAmount);

	// Rating feedback state - initialized from persisted feedback
	let submittedRating = $state<FeedbackRating | null>(initialRating);

	// Sync with initial values when they change (e.g., on data load)
	$effect(() => {
		if (initialRating !== null) {
			submittedRating = initialRating;
		}
	});

	$effect(() => {
		if (initialCorrectedAmount !== null) {
			correctedAmount = initialCorrectedAmount;
		}
	});

	// Displayed amount (corrected or original)
	const displayAmount = $derived(correctedAmount ?? suggestion?.totalSuggested);

	// AI explanation expansion state
	let aiExpanded = $state(false);
	// Reasoning expansion state
	let reasoningExpanded = $state(false);

	// Confidence badge class
	const confidenceBadgeClass = $derived.by(() => {
		if (!suggestion) return '';
		if (suggestion.confidence >= 0.8)
			return 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300';
		if (suggestion.confidence >= 0.6)
			return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300';
		return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300';
	});

	// Tooltip content
	const tooltipContent = $derived.by(() => {
		if (!suggestion) return 'Suggestion confidence';
		if (suggestion.seasonalNote) return suggestion.seasonalNote;
		return 'Suggestion confidence';
	});

	// Start editing amount
	function startEditingAmount() {
		if (!suggestion) return;
		// Use corrected amount if available, otherwise use original suggestion
		editedAmount = correctedAmount ?? suggestion.totalSuggested;
		isEditingAmount = true;
	}

	// Handle amount correction submission
	function handleAmountSubmit() {
		if (!suggestion || !onFeedback || editedAmount === undefined) return;
		if (editedAmount !== suggestion.totalSuggested) {
			correctedAmount = editedAmount;
			onFeedback({ correctedAmount: editedAmount });
		}
		isEditingAmount = false;
	}

	// Submit rating feedback (toggle off if clicking the same rating)
	function submitRating(rating: FeedbackRating) {
		if (!onFeedback) return;
		const newRating = submittedRating === rating ? null : rating;
		submittedRating = newRating;
		// Only send feedback if setting a rating (not clearing)
		if (newRating) {
			onFeedback({ rating: newRating });
		}
	}
</script>

<div class="rounded-lg border p-3">
	{#if isLoading}
		<!-- Thinking/Loading state -->
		<div class="mb-1.5 flex items-center justify-between">
			<div class="flex items-center gap-1.5">
				<DollarSign class="h-3.5 w-3.5 text-green-500" />
				<span class="text-sm font-medium">Budget Suggestion</span>
			</div>
		</div>
		<div class="flex flex-col items-center justify-center py-4 gap-2">
			<div class="relative">
				<LoaderCircle class="h-6 w-6 animate-spin text-primary" />
				<Brain class="absolute inset-0 m-auto h-3 w-3 text-primary/60" />
			</div>
			<p class="text-muted-foreground text-xs animate-pulse">Calculating budget...</p>
		</div>
	{:else if suggestion}
		<!-- Header with tier badge, confidence, and refresh button -->
		<div class="mb-1.5 flex items-center justify-between">
			<div class="flex items-center gap-1.5">
				<DollarSign class="h-3.5 w-3.5 text-green-500" />
				<span class="text-sm font-medium">Budget Suggestion</span>
				{#if suggestion.tier === 'ai'}
					<Tooltip.Root>
						<Tooltip.Trigger>
							<Badge variant="outline" class="h-4 px-1 text-[10px] text-violet-600 border-violet-300">
								<Sparkles class="mr-0.5 h-2.5 w-2.5" />
								AI
							</Badge>
						</Tooltip.Trigger>
						<Tooltip.Content>
							<p>AI-powered suggestion with explanation</p>
						</Tooltip.Content>
					</Tooltip.Root>
				{:else if suggestion.tier === 'ml'}
					<Tooltip.Root>
						<Tooltip.Trigger>
							<Badge variant="outline" class="h-4 px-1 text-[10px] text-primary border-primary/40">
								<Brain class="mr-0.5 h-2.5 w-2.5" />
								ML
							</Badge>
						</Tooltip.Trigger>
						<Tooltip.Content>
							<p>ML-enhanced suggestion</p>
						</Tooltip.Content>
					</Tooltip.Root>
				{:else if suggestion.tier === 'statistical'}
					<Tooltip.Root>
						<Tooltip.Trigger>
							<Badge variant="outline" class="h-4 px-1 text-[10px] text-yellow-600 border-yellow-400/50">
								<Zap class="mr-0.5 h-2.5 w-2.5" />
								Fast
							</Badge>
						</Tooltip.Trigger>
						<Tooltip.Content>
							<p>Statistical pattern matching</p>
						</Tooltip.Content>
					</Tooltip.Root>
				{/if}
			</div>
			<div class="flex items-center gap-1.5">
				{#if onRefresh}
					<Tooltip.Root>
						<Tooltip.Trigger>
							<Button
								variant="ghost"
								size="sm"
								class="h-5 w-5 p-0"
								onclick={onRefresh}
							>
								<RefreshCw class="h-3 w-3" />
								<span class="sr-only">Refresh suggestion</span>
							</Button>
						</Tooltip.Trigger>
						<Tooltip.Content>
							<p>Regenerate suggestion</p>
						</Tooltip.Content>
					</Tooltip.Root>
				{/if}
				<Tooltip.Root>
					<Tooltip.Trigger>
						<span class="rounded-full px-1.5 py-0.5 text-[10px] {confidenceBadgeClass}">
							{Math.round(suggestion.confidence * 100)}%
						</span>
					</Tooltip.Trigger>
					<Tooltip.Content>
						<p>{tooltipContent}</p>
					</Tooltip.Content>
				</Tooltip.Root>
			</div>
		</div>

		<!-- Main content row with inline editing -->
		<div class="flex items-center justify-between gap-2">
			<!-- Amount section -->
			<div class="flex items-center gap-1">
				{#if isEditingAmount}
					<NumericInput
						bind:value={editedAmount}
						onSubmit={handleAmountSubmit}
						buttonClass="h-7 w-28 text-xs"
					/>
					<span class="text-xs text-muted-foreground">/mo</span>
				{:else}
					<Tooltip.Root>
						<Tooltip.Trigger>
							<span class="font-semibold {correctedAmount !== null ? 'text-green-600 dark:text-green-400' : ''}">
								{formatCurrency(displayAmount ?? suggestion.totalSuggested)}/mo
							</span>
						</Tooltip.Trigger>
						<Tooltip.Content>
							{#if correctedAmount !== null}
								<p>Corrected from {formatCurrency(suggestion.totalSuggested)}/mo</p>
							{:else}
								<p>Suggested monthly budget</p>
							{/if}
						</Tooltip.Content>
					</Tooltip.Root>
					{#if correctedAmount !== null}
						<span class="text-green-600 dark:text-green-400 text-xs">✓</span>
					{/if}
					{#if onFeedback}
						<Tooltip.Root>
							<Tooltip.Trigger>
								<Button
									variant="ghost"
									size="sm"
									class="h-4 w-4 p-0 opacity-50 hover:opacity-100"
									onclick={startEditingAmount}
								>
									<Pencil class="h-2.5 w-2.5" />
								</Button>
							</Tooltip.Trigger>
							<Tooltip.Content>
								<p>Correct amount</p>
							</Tooltip.Content>
						</Tooltip.Root>
					{/if}
				{/if}
			</div>
			{#if onApply}
				<Button variant="outline" size="sm" onclick={() => onApply(displayAmount ?? suggestion.totalSuggested)}>
					Set Budget
				</Button>
			{/if}
		</div>

		<!-- Feedback buttons (thumbs up/down) -->
		{#if onFeedback}
			<div class="mt-2 flex items-center gap-2 border-t pt-2">
				<span class="text-xs text-muted-foreground">{submittedRating ? 'Thanks!' : 'Helpful?'}</span>
				<div class="flex items-center gap-0.5">
					<Button
						variant="ghost"
						size="sm"
						class="h-5 w-5 p-0 {submittedRating === 'positive' ? 'bg-green-100 text-green-600 dark:bg-green-950' : 'hover:bg-green-100 hover:text-green-600 dark:hover:bg-red-950'}"
						onclick={() => submitRating('positive')}
					>
						<ThumbsUp class="h-3 w-3" />
					</Button>
					<Button
						variant="ghost"
						size="sm"
						class="h-5 w-5 p-0 {submittedRating === 'negative' ? 'bg-red-100 text-red-600 dark:bg-red-950' : 'hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950'}"
						onclick={() => submitRating('negative')}
					>
						<ThumbsDown class="h-3 w-3" />
					</Button>
				</div>
			</div>
		{/if}

		<!-- Reasoning (collapsible) - shows the thinking process -->
		<Collapsible.Root bind:open={reasoningExpanded} class="mt-2">
			<Collapsible.Trigger
				class="text-muted-foreground hover:text-foreground flex w-full items-center gap-1 text-xs transition-colors"
			>
				<Lightbulb class="h-3 w-3 text-amber-500" />
				<span>How this was calculated</span>
				<ChevronDown
					class="ml-auto h-3 w-3 transition-transform duration-200 {reasoningExpanded
						? 'rotate-180'
						: ''}"
				/>
			</Collapsible.Trigger>
			<Collapsible.Content>
				<div class="text-muted-foreground bg-muted/50 mt-1.5 rounded p-2 text-xs leading-relaxed space-y-1">
					<p><strong>Monthly average:</strong> {formatCurrency(suggestion.monthlyAmount)}</p>
					<p><strong>Buffer:</strong> {formatCurrency(suggestion.buffer)} (for variability)</p>
					{#if suggestion.seasonalNote}
						<p><strong>Note:</strong> {suggestion.seasonalNote}</p>
					{/if}
				</div>
			</Collapsible.Content>
		</Collapsible.Root>

		<!-- AI Explanation (collapsible) -->
		{#if suggestion.aiExplanation}
			<Collapsible.Root bind:open={aiExpanded} class="mt-2">
				<Collapsible.Trigger
					class="text-muted-foreground hover:text-foreground flex w-full items-center gap-1 text-xs transition-colors"
				>
					<Sparkles class="h-3 w-3 text-violet-500" />
					<span>AI Analysis</span>
					<ChevronDown
						class="ml-auto h-3 w-3 transition-transform duration-200 {aiExpanded
							? 'rotate-180'
							: ''}"
					/>
				</Collapsible.Trigger>
				<Collapsible.Content>
					<p class="text-muted-foreground bg-muted/50 mt-1.5 rounded p-2 text-xs leading-relaxed">
						{suggestion.aiExplanation}
					</p>
				</Collapsible.Content>
			</Collapsible.Root>
		{/if}
	{:else}
		<!-- Empty state - compact -->
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-1.5">
				<DollarSign class="h-3.5 w-3.5 text-green-500" />
				<span class="text-sm font-medium">Budget Suggestion</span>
			</div>
			{#if onRefresh}
				<Tooltip.Root>
					<Tooltip.Trigger>
						<Button
							variant="ghost"
							size="sm"
							class="h-5 w-5 p-0"
							onclick={onRefresh}
						>
							<RefreshCw class="h-3 w-3" />
							<span class="sr-only">Try suggestion</span>
						</Button>
					</Tooltip.Trigger>
					<Tooltip.Content>
						<p>Try generating suggestion</p>
					</Tooltip.Content>
				</Tooltip.Root>
			{/if}
		</div>
		<p class="text-muted-foreground mt-1 text-xs">Not enough data to suggest a budget.</p>
	{/if}
</div>
