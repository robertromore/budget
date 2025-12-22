<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { usePayeeInsights, type QuickInsight } from '$lib/hooks/use-payee-insights.svelte';
	import type { FieldEnhancementSummary } from '$lib/query/payee-enhancements';
	import { applyIntelligentDefaults, explainInsights } from '$lib/query/payees';
// Sub-components
	import BudgetSuggestionCard from './budget-suggestion-card.svelte';
	import IntelligenceControlsMenu from './intelligence-controls-menu.svelte';
	import NextTransactionCard from './next-transaction-card.svelte';
	import PayeeConfidenceRing from './payee-confidence-ring.svelte';
	import PayeeQuickInsightCard from './payee-quick-insight-card.svelte';
	import SpendingPatternCard from './spending-pattern-card.svelte';
// Icons
	import Brain from '@lucide/svelte/icons/brain';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import Sparkles from '@lucide/svelte/icons/sparkles';

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

	// Collapsible state
	let patternsOpen = $state(true);
	let predictionsOpen = $state(true);

	// AI explanation state
	let aiExplanation = $state<string | null>(null);

	// Mutations
	const explainMutation = explainInsights().options();
	const applyDefaultsMutation = applyIntelligentDefaults().options();

	// Handle AI explanation
	async function handleExplainInsights() {
		if (!payeeId) return;

		explainMutation.mutate(
			{ id: payeeId },
			{
				onSuccess: (result) => {
					if (result.success && result.explanation) {
						aiExplanation = result.explanation;
					}
				},
			}
		);
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
</script>

{#if payeeId}
	<div class="space-y-6">
		<!-- Header Section -->
		<Card.Root>
			<Card.Header>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<Brain class="text-primary h-5 w-5" />
						<Card.Title>Payee Intelligence Dashboard</Card.Title>
					</div>
					<div class="flex items-center gap-2">
						<span class="text-muted-foreground text-xs">
							Updated: {formatLastUpdated()}
						</span>
						<IntelligenceControlsMenu
							{payeeId}
							isLoading={data.isLoading}
							onRefresh={() => insights.refresh()}
							{onDetectSubscription}
							onApplyAll={handleApplyDefaults}
							onExplain={handleExplainInsights}
						/>
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
				<Card.Description>
					AI-powered insights and predictions based on transaction history.
				</Card.Description>
			</Card.Header>
		</Card.Root>

		<!-- Quick Insights Section -->
		<div class="grid gap-4 md:grid-cols-2">
			<!-- Confidence Ring -->
			<Card.Root>
				<Card.Content class="pt-6">
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
				</Card.Content>
			</Card.Root>

			<!-- Quick Alerts -->
			<div class="space-y-3">
				{#if data.isLoading}
					<Skeleton class="h-20 w-full" />
					<Skeleton class="h-20 w-full" />
				{:else if data.alerts.length > 0}
					{#each data.alerts as alert}
						<PayeeQuickInsightCard
							type={alert.type}
							title={alert.title}
							description={alert.description}
							priority={alert.priority}
							actionLabel={alert.actionLabel}
							onAction={() => handleInsightAction(alert)}
						/>
					{/each}
				{:else if hasData}
					<Card.Root class="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
						<Card.Content class="py-4">
							<p class="text-muted-foreground text-center text-sm">
								No alerts - this payee is well configured!
							</p>
						</Card.Content>
					</Card.Root>
				{/if}
			</div>
		</div>

		<!-- Spending Patterns Section -->
		<Collapsible.Root bind:open={patternsOpen}>
			<Card.Root>
				<Collapsible.Trigger class="w-full">
					<Card.Header class="cursor-pointer transition-colors hover:bg-muted/50">
						<div class="flex w-full items-center justify-between">
							<div class="flex items-center gap-2">
								<Card.Title class="text-base">Spending Patterns</Card.Title>
							</div>
							<ChevronDown
								class="h-4 w-4 transition-transform duration-200 {patternsOpen
									? 'rotate-180'
									: ''}"
							/>
						</div>
					</Card.Header>
				</Collapsible.Trigger>
				<Collapsible.Content>
					<Card.Content>
						{#if data.isLoading}
							<Skeleton class="h-40 w-full" />
						{:else}
							<SpendingPatternCard
								stats={data.stats}
								trend={data.trend}
								patterns={data.intelligence?.patterns}
							/>
						{/if}
					</Card.Content>
				</Collapsible.Content>
			</Card.Root>
		</Collapsible.Root>

		<!-- AI Predictions Section -->
		<Collapsible.Root bind:open={predictionsOpen}>
			<Card.Root>
				<Collapsible.Trigger class="w-full">
					<Card.Header class="cursor-pointer transition-colors hover:bg-muted/50">
						<div class="flex w-full items-center justify-between">
							<div class="flex items-center gap-2">
								<Sparkles class="h-4 w-4 text-purple-500" />
								<Card.Title class="text-base">AI Predictions</Card.Title>
							</div>
							<ChevronDown
								class="h-4 w-4 transition-transform duration-200 {predictionsOpen
									? 'rotate-180'
									: ''}"
							/>
						</div>
					</Card.Header>
				</Collapsible.Trigger>
				<Collapsible.Content>
					<Card.Content class="space-y-4">
						{#if data.isLoading}
							<Skeleton class="h-24 w-full" />
							<Skeleton class="h-24 w-full" />
						{:else}
							<div class="grid gap-4 md:grid-cols-2">
								<NextTransactionCard prediction={data.nextTransaction} />
								<BudgetSuggestionCard
									suggestion={data.budgetSuggestion}
									onApply={onApplyBudget}
								/>
							</div>

							<!-- Category Suggestion -->
							{#if data.suggestions?.suggestedCategoryId}
								<div class="flex items-center justify-between rounded-lg bg-blue-50 p-4 dark:bg-blue-950/20">
									<div>
										<p class="font-medium text-blue-900 dark:text-blue-100">
											Category Recommendation
										</p>
										<p class="text-sm text-blue-700 dark:text-blue-300">
											{data.suggestions.suggestedCategoryName}
											<span class="text-muted-foreground ml-2">
												({Math.round((data.suggestions.confidence ?? 0) * 100)}% confidence)
											</span>
										</p>
									</div>
									<Button
										variant="outline"
										size="sm"
										onclick={() =>
											onApplyCategory?.(data.suggestions!.suggestedCategoryId!)}
									>
										Apply
									</Button>
								</div>
							{/if}
						{/if}
					</Card.Content>
				</Collapsible.Content>
			</Card.Root>
		</Collapsible.Root>

		<!-- AI Explanation Section -->
		<Card.Root>
			<Card.Header>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<Sparkles class="h-4 w-4 text-purple-500" />
						<Card.Title class="text-base">AI Explanation</Card.Title>
					</div>
					<Button
						variant="outline"
						size="sm"
						onclick={handleExplainInsights}
						disabled={explainMutation.isPending || !hasData}
					>
						{#if explainMutation.isPending}
							<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
							Analyzing...
						{:else}
							<Sparkles class="mr-2 h-4 w-4" />
							Explain Insights
						{/if}
					</Button>
				</div>
			</Card.Header>
			<Card.Content>
				{#if aiExplanation}
					<div class="rounded-lg bg-purple-50 p-4 dark:bg-purple-950/20">
						<p class="text-sm leading-relaxed text-purple-900 dark:text-purple-100">
							{aiExplanation}
						</p>
					</div>
				{:else}
					<p class="text-muted-foreground py-4 text-center text-sm">
						Click "Explain Insights" to get an AI-powered analysis of this payee's patterns and
						recommendations.
					</p>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
{:else}
	<!-- Empty state for new payees -->
	<Card.Root>
		<Card.Content class="py-12 text-center">
			<Brain class="text-muted-foreground mx-auto mb-4 h-12 w-12" />
			<h3 class="mb-2 font-medium">Intelligence Dashboard</h3>
			<p class="text-muted-foreground text-sm">
				ML insights will be available after saving this payee and processing transaction history.
			</p>
		</Card.Content>
	</Card.Root>
{/if}
