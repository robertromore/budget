<script lang="ts">
	import DateInput from '$lib/components/input/date-input.svelte';
	import NumericInput from '$lib/components/input/numeric-input.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import type { NextTransactionPrediction } from '$lib/hooks/use-payee-insights.svelte';
	import type { FeedbackRating } from '$lib/schema/prediction-feedback';
	import { shortDateFmt } from '$lib/utils/date-formatters';
	import { timezone } from '$lib/utils/dates';
	import { formatCurrency } from '$lib/utils/formatters';
	import { parseDate, type DateValue } from '@internationalized/date';
	// Icons
	import Brain from '@lucide/svelte/icons/brain';
	import Calendar from '@lucide/svelte/icons/calendar';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Lightbulb from '@lucide/svelte/icons/lightbulb';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Pencil from '@lucide/svelte/icons/pencil';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import ThumbsDown from '@lucide/svelte/icons/thumbs-down';
	import ThumbsUp from '@lucide/svelte/icons/thumbs-up';
	import Zap from '@lucide/svelte/icons/zap';

	interface FeedbackData {
		correctedDate?: string;
		correctedAmount?: number;
		rating?: FeedbackRating;
	}

	interface Props {
		prediction: NextTransactionPrediction | null;
		isLoading?: boolean;
		onRefresh?: () => void;
		onFeedback?: (feedback: FeedbackData) => void;
		/** Initial rating from persisted feedback */
		initialRating?: FeedbackRating | null;
		/** Initial corrected date from persisted feedback */
		initialCorrectedDate?: string | null;
		/** Initial corrected amount from persisted feedback */
		initialCorrectedAmount?: number | null;
	}

	let {
		prediction,
		isLoading = false,
		onRefresh,
		onFeedback,
		initialRating = null,
		initialCorrectedDate = null,
		initialCorrectedAmount = null,
	}: Props = $props();

	// Editing state
	let isEditingDate = $state(false);
	let isEditingAmount = $state(false);
	let editedDateValue = $state<DateValue | undefined>(undefined);
	let editedAmount = $state<number | undefined>(undefined);

	// Corrected values (persist after editing to show user their correction)
	let correctedDate = $state<string | null>(initialCorrectedDate);
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
		if (initialCorrectedDate !== null) {
			correctedDate = initialCorrectedDate;
		}
	});

	$effect(() => {
		if (initialCorrectedAmount !== null) {
			correctedAmount = initialCorrectedAmount;
		}
	});

	// AI explanation expansion state
	let aiExpanded = $state(false);
	// Reasoning expansion state
	let reasoningExpanded = $state(false);

	// Displayed values (corrected or original)
	const displayDate = $derived(correctedDate ?? prediction?.date);
	const displayAmount = $derived(correctedAmount ?? prediction?.amount);

	// Format date string safely without timezone issues (uses existing codebase pattern)
	function formatDateString(dateStr: string): string {
		try {
			return shortDateFmt.format(parseDate(dateStr).toDate(timezone));
		} catch {
			return dateStr;
		}
	}

	// Days until calculation (uses corrected date if available)
	const daysUntil = $derived.by(() => {
		if (!displayDate) return prediction?.daysUntil ?? 0;
		try {
			const targetDate = parseDate(displayDate).toDate(timezone);
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			targetDate.setHours(0, 0, 0, 0);
			return Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
		} catch {
			return prediction?.daysUntil ?? 0;
		}
	});

	// Days until text
	const daysUntilText = $derived.by(() => {
		if (!prediction && !correctedDate) return '';
		if (daysUntil === 0) return 'Today';
		if (daysUntil === 1) return 'Tomorrow';
		if (daysUntil < 0) return `${Math.abs(daysUntil)} days ago`;
		return `${daysUntil} days`;
	});

	// Confidence badge class
	const confidenceBadgeClass = $derived.by(() => {
		if (!prediction) return '';
		if (prediction.confidence >= 0.8)
			return 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300';
		if (prediction.confidence >= 0.6)
			return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300';
		return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300';
	});

	// Start editing date
	function startEditingDate() {
		if (!prediction) return;
		// Use corrected date if available, otherwise use original prediction date
		const dateToEdit = correctedDate ?? prediction.date;
		try {
			editedDateValue = parseDate(dateToEdit);
		} catch {
			editedDateValue = undefined;
		}
		isEditingDate = true;
	}

	// Start editing amount
	function startEditingAmount() {
		if (!prediction) return;
		// Use corrected amount if available, otherwise use original prediction amount
		editedAmount = correctedAmount ?? prediction.amount;
		isEditingAmount = true;
	}

	// Handle date correction submission
	function handleDateSubmit(newDateValue: DateValue | undefined) {
		if (!prediction || !onFeedback || !newDateValue) return;
		const newDate = newDateValue.toString();
		if (newDate !== prediction.date) {
			correctedDate = newDate;
			onFeedback({ correctedDate: newDate });
		}
		isEditingDate = false;
	}

	// Handle amount correction submission
	function handleAmountSubmit() {
		if (!prediction || !onFeedback || editedAmount === undefined) return;
		if (editedAmount !== prediction.amount) {
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
				<Calendar class="h-3.5 w-3.5 text-blue-500" />
				<span class="text-sm font-medium">Next Transaction</span>
			</div>
		</div>
		<div class="flex flex-col items-center justify-center py-4 gap-2">
			<div class="relative">
				<LoaderCircle class="h-6 w-6 animate-spin text-primary" />
				<Brain class="absolute inset-0 m-auto h-3 w-3 text-primary/60" />
			</div>
			<p class="text-muted-foreground text-xs animate-pulse">Analyzing patterns...</p>
		</div>
	{:else if prediction}
		<!-- Header with tier badge, confidence, and refresh button -->
		<div class="mb-1.5 flex items-center justify-between">
			<div class="flex items-center gap-1.5">
				<Calendar class="h-3.5 w-3.5 text-blue-500" />
				<span class="text-sm font-medium">Next Transaction</span>
				{#if prediction.tier === 'ai'}
					<Tooltip.Root>
						<Tooltip.Trigger>
							<Badge variant="outline" class="h-4 px-1 text-[10px] text-violet-600 border-violet-300">
								<Sparkles class="mr-0.5 h-2.5 w-2.5" />
								AI
							</Badge>
						</Tooltip.Trigger>
						<Tooltip.Content>
							<p>AI-powered prediction with explanation</p>
						</Tooltip.Content>
					</Tooltip.Root>
				{:else if prediction.tier === 'ml'}
					<Tooltip.Root>
						<Tooltip.Trigger>
							<Badge variant="outline" class="h-4 px-1 text-[10px] text-primary border-primary/40">
								<Brain class="mr-0.5 h-2.5 w-2.5" />
								ML
							</Badge>
						</Tooltip.Trigger>
						<Tooltip.Content>
							<p>ML-enhanced prediction</p>
						</Tooltip.Content>
					</Tooltip.Root>
				{:else if prediction.tier === 'statistical'}
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
								<span class="sr-only">Refresh prediction</span>
							</Button>
						</Tooltip.Trigger>
						<Tooltip.Content>
							<p>Regenerate prediction</p>
						</Tooltip.Content>
					</Tooltip.Root>
				{/if}
				<Tooltip.Root>
					<Tooltip.Trigger>
						<span class="rounded-full px-1.5 py-0.5 text-[10px] {confidenceBadgeClass}">
							{Math.round(prediction.confidence * 100)}%
						</span>
					</Tooltip.Trigger>
					<Tooltip.Content>
						<p>Prediction confidence</p>
					</Tooltip.Content>
				</Tooltip.Root>
			</div>
		</div>

		<!-- Main content row with inline editing -->
		<div class="flex items-baseline justify-between gap-2">
			<!-- Date section -->
			<div class="flex items-center gap-1">
				{#if isEditingDate}
					<DateInput
						bind:value={editedDateValue}
						handleSubmit={handleDateSubmit}
						buttonClass="h-7 text-xs"
					/>
				{:else}
					<span class="font-semibold {correctedDate ? 'text-green-600 dark:text-green-400' : ''}">
						{formatDateString(displayDate ?? prediction.date)}
					</span>
					{#if correctedDate}
						<Tooltip.Root>
							<Tooltip.Trigger>
								<span class="text-green-600 dark:text-green-400 text-xs">✓</span>
							</Tooltip.Trigger>
							<Tooltip.Content>
								<p>Corrected from {formatDateString(prediction.date)}</p>
							</Tooltip.Content>
						</Tooltip.Root>
					{/if}
					<span class="text-muted-foreground text-sm">({daysUntilText})</span>
					{#if onFeedback}
						<Tooltip.Root>
							<Tooltip.Trigger>
								<Button
									variant="ghost"
									size="sm"
									class="h-4 w-4 p-0 opacity-50 hover:opacity-100"
									onclick={startEditingDate}
								>
									<Pencil class="h-2.5 w-2.5" />
								</Button>
							</Tooltip.Trigger>
							<Tooltip.Content>
								<p>Correct date</p>
							</Tooltip.Content>
						</Tooltip.Root>
					{/if}
				{/if}
			</div>

			<!-- Amount section -->
			<div class="flex items-center gap-1">
				{#if isEditingAmount}
					<NumericInput
						bind:value={editedAmount}
						onSubmit={handleAmountSubmit}
						buttonClass="h-7 w-24 text-xs"
					/>
				{:else}
					<Tooltip.Root>
						<Tooltip.Trigger>
							<span class="font-semibold {correctedAmount !== null ? 'text-green-600 dark:text-green-400' : ''}">
								~{formatCurrency(displayAmount ?? prediction.amount)}
							</span>
						</Tooltip.Trigger>
						<Tooltip.Content>
							{#if correctedAmount !== null}
								<p>Corrected from ~{formatCurrency(prediction.amount)}</p>
							{:else}
								<p>
									Range: {formatCurrency(prediction.amountRange[0])} - {formatCurrency(
										prediction.amountRange[1]
									)}
								</p>
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
		</div>

		<!-- Feedback buttons (thumbs up/down) -->
		{#if onFeedback}
			<div class="mt-2 flex items-center gap-2 border-t pt-2">
				<span class="text-xs text-muted-foreground">{submittedRating ? 'Thanks!' : 'Helpful?'}</span>
				<div class="flex items-center gap-0.5">
					<Button
						variant="ghost"
						size="sm"
						class="h-5 w-5 p-0 {submittedRating === 'positive' ? 'bg-green-100 text-green-600 dark:bg-green-950' : 'hover:bg-green-100 hover:text-green-600 dark:hover:bg-green-950'}"
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
				<p class="text-muted-foreground bg-muted/50 mt-1.5 rounded p-2 text-xs leading-relaxed">
					{prediction.method}
				</p>
			</Collapsible.Content>
		</Collapsible.Root>

		<!-- AI Explanation (collapsible) -->
		{#if prediction.aiExplanation}
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
						{prediction.aiExplanation}
					</p>
				</Collapsible.Content>
			</Collapsible.Root>
		{/if}
	{:else}
		<!-- Empty state - compact -->
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-1.5">
				<Calendar class="h-3.5 w-3.5 text-blue-500" />
				<span class="text-sm font-medium">Next Transaction</span>
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
							<span class="sr-only">Try prediction</span>
						</Button>
					</Tooltip.Trigger>
					<Tooltip.Content>
						<p>Try generating prediction</p>
					</Tooltip.Content>
				</Tooltip.Root>
			{/if}
		</div>
		<p class="text-muted-foreground mt-1 text-xs">Not enough data to predict.</p>
	{/if}
</div>
