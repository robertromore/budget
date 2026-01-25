<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Popover from '$lib/components/ui/popover';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { usePayeeInsights, type QuickInsight } from '$lib/hooks/use-payee-insights.svelte';
	import type { FieldEnhancementSummary } from '$lib/query/payee-enhancements';
	import { applyIntelligentDefaults, getIntelligenceProfile, getPredictionFeedbackHistory, recordPredictionFeedback, suggestIntelligenceProfileDefaults, updateIntelligenceProfile } from '$lib/query/payees';
	import type { FeedbackRating, FeedbackType } from '$lib/schema/prediction-feedback';
	import { aiChat } from '$lib/states/ui/ai-chat.svelte';
	import { formatCurrency, formatCurrencyAbs } from '$lib/utils/formatters';
	// Sub-components
	import BudgetSuggestionCard from './budget-suggestion-card.svelte';
	import IntelligenceControlsMenu from './intelligence-controls-menu.svelte';
	import IntelligenceProfileSettings from './intelligence-profile-settings.svelte';
	import NextTransactionCard from './next-transaction-card.svelte';
	import PayeeAlertBadge from './payee-alert-badge.svelte';
	import PayeeConfidenceRing from './payee-confidence-ring.svelte';
	import SpendingPatternCard from './spending-pattern-card.svelte';
	// Icons
	import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
	import Bell from '@lucide/svelte/icons/bell';
	import Brain from '@lucide/svelte/icons/brain';
	import Calendar from '@lucide/svelte/icons/calendar';
	import DollarSign from '@lucide/svelte/icons/dollar-sign';
	import Filter from '@lucide/svelte/icons/filter';
	import Hash from '@lucide/svelte/icons/hash';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Minus from '@lucide/svelte/icons/minus';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import TrendingDown from '@lucide/svelte/icons/trending-down';
	import TrendingUp from '@lucide/svelte/icons/trending-up';

	interface Props {
		payeeId: number | undefined;
		payeeName: string;
		formData: any;
		enhancementSummary?: FieldEnhancementSummary[];
		onApplyCategory?: (categoryId: number) => void;
		onApplyBudget?: (amount: number) => void;
		onDetectSubscription?: () => void;
	}

	let {
		payeeId,
		onApplyCategory,
		onApplyBudget,
		onDetectSubscription,
	}: Props = $props();

	// Use the insights hook
	// svelte-ignore state_referenced_locally
	const insights = usePayeeInsights(payeeId);

	// Profile query - use $derived to make it reactive to payeeId
	// Note: .options() returns a createQuery result directly
	const profileQuery = $derived(
		payeeId ? getIntelligenceProfile(payeeId).options() : null
	);

	// Profile settings sheet state
	let profileSheetOpen = $state(false);

	// Mutations
	const applyDefaultsMutation = applyIntelligentDefaults().options();
	const updateProfileMutation = updateIntelligenceProfile.options();
	const feedbackMutation = recordPredictionFeedback().options();

	// Profile suggestions query
	const suggestionsQuery = $derived(
		payeeId ? suggestIntelligenceProfileDefaults(payeeId).options() : null
	);

	// Feedback history queries to load previous ratings
	const nextTransactionFeedbackQuery = $derived(
		payeeId ? getPredictionFeedbackHistory(payeeId, 'next_transaction', 1).options() : null
	);
	const budgetSuggestionFeedbackQuery = $derived(
		payeeId ? getPredictionFeedbackHistory(payeeId, 'budget_suggestion', 1).options() : null
	);

	// Extract the most recent feedback for each prediction type
	const nextTransactionFeedback = $derived(nextTransactionFeedbackQuery?.data?.[0] ?? null);
	const budgetSuggestionFeedback = $derived(budgetSuggestionFeedbackQuery?.data?.[0] ?? null);

	// Extract ratings
	const nextTransactionInitialRating = $derived(nextTransactionFeedback?.rating ?? null);
	const budgetSuggestionInitialRating = $derived(budgetSuggestionFeedback?.rating ?? null);

	// Extract corrected values
	const nextTransactionCorrectedDate = $derived(nextTransactionFeedback?.correctedDate ?? null);
	const nextTransactionCorrectedAmount = $derived(nextTransactionFeedback?.correctedAmount ?? null);
	const budgetSuggestionCorrectedAmount = $derived(budgetSuggestionFeedback?.correctedAmount ?? null);

	// Handle prediction feedback for next transaction
	function handleNextTransactionFeedback(feedback: {
		correctedDate?: string;
		correctedAmount?: number;
		rating?: FeedbackRating;
	}) {
		if (!payeeId || !data.nextTransaction) return;

		feedbackMutation.mutate({
			payeeId,
			predictionType: 'next_transaction' as FeedbackType,
			originalDate: data.nextTransaction.date,
			originalAmount: data.nextTransaction.amount,
			originalConfidence: data.nextTransaction.confidence,
			predictionTier: data.nextTransaction.tier,
			predictionMethod: data.nextTransaction.method,
			correctedDate: feedback.correctedDate,
			correctedAmount: feedback.correctedAmount,
			rating: feedback.rating,
		});
	}

	// Handle prediction feedback for budget suggestion
	function handleBudgetSuggestionFeedback(feedback: {
		correctedAmount?: number;
		rating?: FeedbackRating;
	}) {
		if (!payeeId || !data.budgetSuggestion) return;

		feedbackMutation.mutate({
			payeeId,
			predictionType: 'budget_suggestion' as FeedbackType,
			originalAmount: data.budgetSuggestion.totalSuggested,
			originalConfidence: data.budgetSuggestion.confidence,
			predictionTier: data.budgetSuggestion.tier,
			correctedAmount: feedback.correctedAmount,
			rating: feedback.rating,
		});
	}

	// Handle AI explanation - opens chat panel with pre-filled prompt
	function handleExplainInsights() {
		if (!payeeId || !data.stats) return;

		// Build prompt with payee intelligence data
		const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
		const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

		const patterns = data.intelligence?.patterns;
		const seasonalTrends = patterns?.seasonalTrends ?? [];

		// Build seasonal patterns string
		const seasonalStr = seasonalTrends.length > 0
			? "- Seasonal patterns: " + seasonalTrends
				.map((t: { month: number; avgAmount: number }) => monthNames[t.month - 1] + ": " + formatCurrency(t.avgAmount))
				.join(", ")
			: "";

		const lines = [
			"Analyze my spending patterns for this payee:",
			"",
			"**Transaction Statistics:**",
			"- Total transactions: " + data.stats.transactionCount,
			"- Total spent: " + formatCurrency(data.stats.totalAmount),
			"- Average transaction: " + formatCurrency(data.stats.avgAmount),
			"- Range: " + formatCurrency(data.stats.minAmount) + " - " + formatCurrency(data.stats.maxAmount),
			"- Monthly average: " + formatCurrency(data.stats.monthlyAverage),
			"",
			"**Predictions:**",
			data.nextTransaction
				? "- Next transaction: " + data.nextTransaction.date + " for " + formatCurrency(data.nextTransaction.amount) + " (" + Math.round(data.nextTransaction.confidence * 100) + "% confidence)"
				: "- No transaction prediction available",
			data.budgetSuggestion
				? "- Suggested budget: " + formatCurrency(data.budgetSuggestion.totalSuggested) + "/month (" + Math.round(data.budgetSuggestion.confidence * 100) + "% confidence)"
				: "",
			"",
			"**Payment Patterns:**",
			"- Regular/recurring: " + (patterns?.isRegular ? "Yes" : "No"),
			patterns?.averageDaysBetween
				? "- Average days between payments: " + patterns.averageDaysBetween.toFixed(1)
				: "",
			patterns?.mostCommonDay !== null && patterns?.mostCommonDay !== undefined
				? "- Most common payment day: " + dayNames[patterns.mostCommonDay]
				: "",
			seasonalStr,
			"",
			"Please explain what these patterns tell us about this payee and provide any actionable insights."
		];

		const prompt = lines.filter(line => line !== "").join("\n");

		// Open chat with the prompt
		aiChat.openWithPrompt(prompt, {
			page: 'payee-intelligence',
			entityType: 'payee',
			entityId: payeeId,
		});
	}

	// Handle applying defaults
	async function handleApplyDefaults() {
		if (!payeeId) return;

		applyDefaultsMutation.mutate(
			{ id: payeeId, applyCategory: true, applyBudget: true },
			{
				onSuccess: () => {
					insights.refresh();
				},
			}
		);
	}

	// Handle quick insight actions
	function handleInsightAction(insight: QuickInsight) {
		if (insight.type === 'category_mismatch' && insight.actionData?.categoryId) {
			onApplyCategory?.(insight.actionData.categoryId as number);
		} else if (insight.type === 'subscription_detected') {
			onDetectSubscription?.();
		}
	}

	// Format last updated time
	function formatLastUpdated(): string {
		// This would typically come from query metadata
		return 'Just now';
	}

	// Derived data
	const data = $derived(insights.data);
	const hasData = $derived(
		!data.isLoading && (data.intelligence !== null || data.stats !== null)
	);

	// Determine if this is primarily an income payee (positive amounts) or expense payee (negative amounts)
	const isIncomePayee = $derived((data.stats?.totalAmount ?? 0) > 0);

	// Profile state
	const profile = $derived(profileQuery?.data ?? null);
	const hasActiveProfile = $derived(profile?.enabled ?? false);

	// Suggestions state
	const suggestions = $derived(suggestionsQuery?.data ?? null);
	const showSuggestionBanner = $derived(
		!hasActiveProfile &&
		suggestions !== null &&
		suggestions.reasoning.length > 0 &&
		hasData
	);

	// Handle profile updated
	function handleProfileUpdated() {
		profileQuery?.refetch();
		insights.refresh();
	}

	// Apply suggested profile directly
	function handleApplySuggestedProfile() {
		if (!payeeId || !suggestions?.profile) return;

		updateProfileMutation.mutate(
			{ id: payeeId, profile: suggestions.profile },
			{
				onSuccess: () => {
					handleProfileUpdated();
				},
			}
		);
	}

	// Get trend icon and color (inverted for income - up is good, down is bad)
	const trendConfig = $derived.by(() => {
		const trend = data.trend;
		if (!trend) return null;
		switch (trend.direction) {
			case 'up':
				return {
					icon: TrendingUp,
					// For income: up is good (green), for expenses: up is bad (red)
					class: isIncomePayee ? 'text-green-600' : 'text-red-600',
				};
			case 'down':
				return {
					icon: TrendingDown,
					// For income: down is bad (red), for expenses: down is good (green)
					class: isIncomePayee ? 'text-red-600' : 'text-green-600',
				};
			default:
				return {
					icon: Minus,
					class: 'text-muted-foreground',
				};
		}
	});
</script>

{#if payeeId}
	<div class="space-y-8">
		<!-- Header Section -->
		<div class="flex items-center justify-between">
			<div>
				<div class="flex items-center gap-2">
					<Brain class="text-primary h-5 w-5" />
					<h2 class="text-lg font-semibold">Payee Intelligence</h2>
					{#if hasActiveProfile}
						<Badge variant="secondary" class="gap-1 text-xs">
							<Filter class="h-3 w-3" />
							Filtered View
						</Badge>
					{/if}
				</div>
				<p class="text-muted-foreground mt-1 text-sm">
					AI-powered insights and predictions based on transaction history.
				</p>
			</div>
			<div class="flex items-center gap-2">
				<span class="text-muted-foreground text-xs">
					Updated: {formatLastUpdated()}
				</span>
				<IntelligenceControlsMenu
					{payeeId}
					isLoading={data.isLoading}
					{hasActiveProfile}
					onRefresh={() => insights.refresh()}
					{onDetectSubscription}
					onApplyAll={handleApplyDefaults}
					onExplain={handleExplainInsights}
					onOpenProfileSettings={() => profileSheetOpen = true}
				/>
				<!-- Notification Button with Alerts Popover -->
				<Popover.Root>
					<Popover.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="outline"
								size="icon"
								class="relative h-9 w-9"
								disabled={data.alerts.length === 0}
							>
								<Bell class="h-4 w-4" />
								{#if data.alerts.length > 0}
									<span class="bg-destructive text-destructive-foreground absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-medium">
										{data.alerts.length}
									</span>
								{/if}
							</Button>
						{/snippet}
					</Popover.Trigger>
					<Popover.Content align="end" class="w-80 p-3">
						<div class="space-y-3">
							<p class="text-sm font-medium">Alerts</p>
							<div class="flex flex-wrap gap-2">
								{#each data.alerts as alert (alert.type)}
									<PayeeAlertBadge
										type={alert.type}
										title={alert.title}
										description={alert.description}
										onAction={() => handleInsightAction(alert)}
									/>
								{/each}
							</div>
						</div>
					</Popover.Content>
				</Popover.Root>
				<Button
					variant="outline"
					size="sm"
					onclick={() => insights.refresh()}
					disabled={data.isLoading}
				>
					{#if data.isLoading}
						<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
					{:else}
						<RefreshCw class="mr-2 h-4 w-4" />
					{/if}
					Refresh
				</Button>
			</div>
		</div>

		<!-- Suggestion Banner (when no profile is active) -->
		{#if showSuggestionBanner}
			<div class="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
				<div class="flex items-start justify-between gap-4">
					<div class="flex items-start gap-3">
						<div class="rounded-full bg-amber-100 p-2 dark:bg-amber-900/50">
							<Sparkles class="h-4 w-4 text-amber-600 dark:text-amber-400" />
						</div>
						<div class="space-y-1">
							<p class="font-medium text-amber-900 dark:text-amber-100">
								Optimize Intelligence Analysis
							</p>
							<p class="text-sm text-amber-700 dark:text-amber-300">
								We can filter transaction data to improve predictions for this payee.
							</p>
							<Badge variant="secondary" class="mt-1">
								{Math.round((suggestions?.confidence ?? 0) * 100)}% confidence
							</Badge>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<Popover.Root>
							<Popover.Trigger>
								{#snippet child({ props })}
									<Button {...props} variant="ghost" size="sm">
										Why?
									</Button>
								{/snippet}
							</Popover.Trigger>
							<Popover.Content align="end" class="w-72">
								<div class="space-y-2">
									<p class="text-sm font-medium">Why these filters?</p>
									<ul class="space-y-1.5 text-sm text-muted-foreground">
										{#each suggestions?.reasoning ?? [] as reason}
											<li class="flex items-start gap-2">
												<span class="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500"></span>
												{reason}
											</li>
										{/each}
									</ul>
								</div>
							</Popover.Content>
						</Popover.Root>
						<Button
							size="sm"
							onclick={handleApplySuggestedProfile}
							disabled={updateProfileMutation.isPending}
						>
							{#if updateProfileMutation.isPending}
								<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
							{:else}
								<Sparkles class="mr-2 h-4 w-4" />
							{/if}
							Apply Profile
						</Button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Quick Insights Section: Confidence Ring + Stats -->
		<div class="flex flex-col gap-6 md:flex-row md:items-start">
			<!-- Confidence Ring (narrower) -->
			<div class="shrink-0">
				{#if data.isLoading}
					<div class="flex items-center justify-center py-8">
						<Skeleton class="h-32 w-32 rounded-full" />
					</div>
				{:else}
					<PayeeConfidenceRing
						confidence={data.confidence.overall}
						dataQuality={data.confidence.dataQuality}
						transactionCount={data.confidence.transactionCount}
						timeSpanMonths={data.confidence.timeSpanMonths}
						factors={data.confidence.factors}
					/>
				{/if}
			</div>

			<!-- Stats Grid -->
			<div class="flex-1">
				{#if data.isLoading}
					<div class="grid grid-cols-2 gap-4 md:grid-cols-3">
						{#each Array(6) as _}
							<Skeleton class="h-16 w-full" />
						{/each}
					</div>
				{:else if data.stats}
					<div class="grid grid-cols-2 gap-4 md:grid-cols-3">
						<div class="text-center">
							<div class="text-muted-foreground mb-1 flex items-center justify-center gap-1 text-xs">
								<DollarSign class="h-3 w-3" />
								{isIncomePayee ? 'Total Received' : 'Total Spent'}
							</div>
							<div class="text-xl font-bold">{formatCurrencyAbs(data.stats.totalAmount)}</div>
						</div>
						<div class="text-center">
							<div class="text-muted-foreground mb-1 flex items-center justify-center gap-1 text-xs">
								<Hash class="h-3 w-3" />
								Transactions
							</div>
							<div class="text-xl font-bold">{data.stats.transactionCount}</div>
						</div>
						<div class="text-center">
							<div class="text-muted-foreground mb-1 flex items-center justify-center gap-1 text-xs">
								<Calendar class="h-3 w-3" />
								Avg Amount
							</div>
							<div class="text-xl font-bold">{formatCurrency(data.stats.avgAmount)}</div>
						</div>
						<div class="text-center">
							<div class="text-muted-foreground mb-1 flex items-center justify-center gap-1 text-xs">
								<Calendar class="h-3 w-3" />
								Monthly Avg
							</div>
							<div class="text-xl font-bold">{formatCurrency(data.stats.monthlyAverage)}</div>
						</div>
						{#if trendConfig}
							{@const TrendIcon = trendConfig.icon}
							<div class="text-center">
								<div class="text-muted-foreground mb-1 flex items-center justify-center gap-1 text-xs">
									<TrendIcon class="h-3 w-3" />
									Trend
								</div>
								<div class="text-xl font-bold">
									{#if data.trend!.direction === 'up'}
										+{Math.abs(data.trend!.percentChange)}%
									{:else if data.trend!.direction === 'down'}
										-{Math.abs(data.trend!.percentChange)}%
									{:else}
										Stable
									{/if}
								</div>
							</div>
						{/if}
						<div class="text-center">
							<div class="text-muted-foreground mb-1 flex items-center justify-center gap-1 text-xs">
								<ArrowUpDown class="h-3 w-3" />
								Range
							</div>
							<div class="text-lg font-bold">
								{formatCurrency(data.stats.minAmount)} - {formatCurrency(data.stats.maxAmount)}
							</div>
						</div>
					</div>
				{:else}
					<p class="text-muted-foreground py-8 text-center text-sm">
						No spending data available yet.
					</p>
				{/if}
			</div>
		</div>

		<!-- Default Category & AI Analysis Section -->
		{#if !data.isLoading}
			<div class="flex flex-wrap items-start gap-3">
				<!-- Default Transaction Category Suggestion -->
				{#if data.suggestions?.suggestedCategoryId}
					<div class="flex items-center gap-3 rounded-md border bg-muted/30 px-2.5 py-1.5 text-sm">
						<span class="text-muted-foreground">Default category:</span>
						<span class="font-medium">{data.suggestions.suggestedCategoryName}</span>
						<span class="text-muted-foreground text-xs">
							({Math.round((data.suggestions.confidence ?? 0) * 100)}%)
						</span>
						<Button
							variant="outline"
							size="sm"
							class="h-6 px-2 text-xs"
							onclick={() =>
								onApplyCategory?.(data.suggestions!.suggestedCategoryId!)}
						>
							Apply
						</Button>
					</div>
				{/if}

				<!-- AI Analysis -->
				<div class="flex items-center gap-3 rounded-md border bg-muted/30 px-2.5 py-1.5 text-sm">
					<Sparkles class="h-3.5 w-3.5 text-purple-500" />
					<span class="text-muted-foreground">AI Analysis</span>
					<Button
						variant="outline"
						size="sm"
						class="h-6 px-2 text-xs"
						onclick={handleExplainInsights}
						disabled={!hasData}
					>
						Ask AI
					</Button>
				</div>
			</div>
		{/if}

		<!-- Predictions Section -->
		<section class="space-y-4">
			<div class="flex items-center gap-2">
				<Sparkles class="h-4 w-4 text-purple-500" />
				<h3 class="text-muted-foreground text-sm font-medium">Predictions</h3>
			</div>
			{#if data.isLoading}
				<div class="grid gap-4 md:grid-cols-2">
					<NextTransactionCard prediction={null} isLoading={true} />
					<BudgetSuggestionCard suggestion={null} isLoading={true} />
				</div>
			{:else}
				<div class="grid gap-4 md:grid-cols-2">
					<NextTransactionCard
						prediction={data.nextTransaction}
						isLoading={data.isLoading}
						onRefresh={insights.refresh}
						onFeedback={handleNextTransactionFeedback}
						initialRating={nextTransactionInitialRating}
						initialCorrectedDate={nextTransactionCorrectedDate}
						initialCorrectedAmount={nextTransactionCorrectedAmount}
					/>
					<BudgetSuggestionCard
						suggestion={data.budgetSuggestion}
						onApply={onApplyBudget}
						isLoading={data.isLoading}
						onRefresh={insights.refresh}
						onFeedback={handleBudgetSuggestionFeedback}
						initialRating={budgetSuggestionInitialRating}
						initialCorrectedAmount={budgetSuggestionCorrectedAmount}
					/>
				</div>
			{/if}
		</section>

		<!-- Spending Patterns Section -->
		<section class="space-y-4">
			<h3 class="text-muted-foreground text-sm font-medium">Spending Patterns</h3>
			{#if data.isLoading}
				<Skeleton class="h-40 w-full" />
			{:else}
				<SpendingPatternCard
					stats={data.stats}
					trend={data.trend}
					patterns={data.intelligence?.patterns}
					showStats={false}
				/>
			{/if}
		</section>
	</div>
{:else}
	<!-- Empty state for new payees -->
	<div class="py-12 text-center">
		<Brain class="text-muted-foreground mx-auto mb-4 h-12 w-12" />
		<h3 class="mb-2 font-medium">Intelligence Dashboard</h3>
		<p class="text-muted-foreground text-sm">
			ML insights will be available after saving this payee and processing transaction history.
		</p>
	</div>
{/if}

<!-- Intelligence Profile Settings Sheet -->
{#if payeeId}
	<IntelligenceProfileSettings
		bind:open={profileSheetOpen}
		{payeeId}
		{profile}
		onProfileUpdated={handleProfileUpdated}
	/>
{/if}
