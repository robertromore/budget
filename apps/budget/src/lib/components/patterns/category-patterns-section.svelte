<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { trpc } from '$lib/trpc/client';
	import { formatCurrency } from '$lib/utils/formatters';
	import { formatConfidence, getConfidenceColor } from '$lib/utils/confidence-colors';
	import { toast } from '$lib/utils/toast-interceptor';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Tags from '@lucide/svelte/icons/tags';

	interface SuggestionResult {
		transaction: {
			description: string;
			amount: number;
			date: string;
		};
		topSuggestion: {
			categoryId: number;
			categoryName: string;
			confidence: number;
			reason: string;
		} | null;
	}

	let isAnalyzing = $state(false);
	let results = $state<SuggestionResult[]>([]);
	let hasRun = $state(false);
	let uncategorizedCount = $state(0);

	async function runAnalysis() {
		isAnalyzing = true;
		hasRun = true;
		results = [];

		try {
			// Fetch recent transactions (limit 100, filter client-side for uncategorized)
			const txnResponse = await trpc().transactionRoutes.list.query({
				pagination: { page: 0, pageSize: 100 }
			});

			const txnList = txnResponse.data ?? [];

			const uncategorized = txnList
				.filter((t) => !t.categoryId)
				.slice(0, 20);

			uncategorizedCount = uncategorized.length;

			if (uncategorized.length === 0) {
				return;
			}

			// Build transaction contexts for batchSuggest
			const contexts = uncategorized.map((t) => ({
				description: t.payee?.name || t.originalPayeeName || t.notes || 'Unknown',
				amount: t.amount,
				date: t.date,
				payeeId: t.payeeId ?? undefined,
				payeeName: t.payee?.name ?? undefined,
				memo: t.notes ?? undefined
			}));

			const suggestions = await trpc().smartCategoryRoutes.batchSuggest.query({
				transactions: contexts,
				limit: 1
			});

			results = suggestions.results.map((r) => ({
				transaction: r.transaction,
				topSuggestion: r.topSuggestion
			}));
		} catch (error) {
			toast.error('Failed to analyze categories', {
				description: error instanceof Error ? error.message : 'Unknown error'
			});
		} finally {
			isAnalyzing = false;
		}
	}

	const suggestionsWithMatch = $derived(results.filter((r) => r.topSuggestion));
</script>

<Card.Root>
	<Card.Header>
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<div class="rounded-lg bg-blue-500/10 p-2">
					<Tags class="h-5 w-5 text-blue-600 dark:text-blue-400" />
				</div>
				<div>
					<Card.Title class="text-lg">Category Patterns</Card.Title>
					<Card.Description class="text-sm">
						Smart category suggestions for uncategorized transactions
					</Card.Description>
				</div>
			</div>
			<Button
				variant="outline"
				size="sm"
				onclick={runAnalysis}
				disabled={isAnalyzing}
			>
				<Sparkles class="mr-2 h-4 w-4" />
				{isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
			</Button>
		</div>
	</Card.Header>
	<Card.Content>
		{#if isAnalyzing}
			<div class="flex flex-col items-center gap-3 p-8">
				<div
					class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
				></div>
				<p class="text-sm text-muted-foreground">Analyzing uncategorized transactions...</p>
			</div>
		{:else if !hasRun}
			<div class="p-6 text-center">
				<Tags class="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
				<p class="text-sm text-muted-foreground">
					Run analysis to get smart category suggestions for uncategorized transactions
				</p>
			</div>
		{:else if uncategorizedCount === 0}
			<div class="p-6 text-center">
				<div class="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
					<Tags class="h-5 w-5 text-green-600 dark:text-green-400" />
				</div>
				<p class="font-medium">All transactions are categorized</p>
				<p class="mt-1 text-sm text-muted-foreground">
					No uncategorized transactions found in recent history
				</p>
			</div>
		{:else if suggestionsWithMatch.length === 0}
			<div class="p-6 text-center">
				<AlertTriangle class="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
				<p class="text-sm text-muted-foreground">
					Found {uncategorizedCount} uncategorized transaction{uncategorizedCount !== 1 ? 's' : ''} but no suggestions could be generated
				</p>
			</div>
		{:else}
			<div class="space-y-1.5">
				<p class="mb-3 text-sm text-muted-foreground">
					{suggestionsWithMatch.length} of {uncategorizedCount} uncategorized transaction{uncategorizedCount !== 1 ? 's' : ''} have suggestions
				</p>
				{#each suggestionsWithMatch as result, i (i)}
					<div class="flex items-center justify-between gap-3 rounded border px-3 py-2 text-sm">
						<div class="min-w-0 flex-1">
							<p class="truncate font-medium">{result.transaction.description}</p>
							<p class="text-xs text-muted-foreground">
								{formatCurrency(result.transaction.amount)}
							</p>
						</div>
						{#if result.topSuggestion}
							<div class="flex items-center gap-1.5">
								<Badge variant="secondary">
									{result.topSuggestion.categoryName}
								</Badge>
								<span class="text-xs {getConfidenceColor(result.topSuggestion.confidence)}">
									{formatConfidence(result.topSuggestion.confidence)}
								</span>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</Card.Content>
</Card.Root>
