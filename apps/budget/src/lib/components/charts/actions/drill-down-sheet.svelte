<script lang="ts">
	import { browser } from '$app/environment';
	import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { chartSelection } from '$lib/states/ui/chart-selection.svelte';
	import { getAllAccountTransactions } from '$lib/query/transactions';
	import { currencyFormatter } from '$lib/utils/formatters';
	import { formatDate } from '$lib/utils/date-formatters';

	// Icons
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import ArrowDownLeft from '@lucide/svelte/icons/arrow-down-left';
	import List from '@lucide/svelte/icons/list';
	import Calendar from '@lucide/svelte/icons/calendar';

	// Simple transaction type for display
	interface DisplayTransaction {
		id: number | string;
		date: string;
		amount: number;
		payee?: { name: string } | null;
		category?: { name: string } | null;
	}

	interface Props {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	}

	let { open = $bindable(false), onOpenChange }: Props = $props();

	// View mode: combined or by-month
	let viewMode = $state<'combined' | 'by-month'>('combined');

	// Get account ID from selected points (should all be same account)
	const accountId = $derived(chartSelection.selectedPoints[0]?.accountId);

	// Query transactions for the account (only in browser)
	const transactionsQuery = $derived.by(() => {
		if (!browser) return null;
		if (!accountId) return null;
		return getAllAccountTransactions(accountId).options();
	});

	// Get selected month IDs as a Set for fast lookup
	const selectedMonthIds = $derived(new Set(chartSelection.selectedPoints.map((p) => p.id)));

	// Filter transactions to only those in selected months
	const filteredTransactions = $derived.by((): DisplayTransaction[] => {
		const data = transactionsQuery?.data;
		if (!data || selectedMonthIds.size === 0) return [];

		return (data as DisplayTransaction[]).filter((tx) => {
			// tx.date is a string like "2024-01-15"
			const txMonth = tx.date.slice(0, 7); // "YYYY-MM"
			return selectedMonthIds.has(txMonth);
		});
	});

	// Sort transactions by date (newest first)
	const sortedTransactions = $derived(
		[...filteredTransactions].sort((a, b) => {
			return new Date(b.date).getTime() - new Date(a.date).getTime();
		})
	);

	// Group transactions by month for "by-month" view
	const transactionsByMonth = $derived.by(() => {
		const groups = new Map<string, DisplayTransaction[]>();

		for (const tx of filteredTransactions) {
			const month = tx.date.slice(0, 7);
			if (!groups.has(month)) {
				groups.set(month, []);
			}
			groups.get(month)!.push(tx);
		}

		// Sort each group by date (newest first)
		for (const [month, txs] of groups) {
			groups.set(
				month,
				txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
			);
		}

		// Return sorted by month (newest first)
		return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
	});

	// Calculate summary stats
	const summaryStats = $derived.by(() => {
		const txs = filteredTransactions;
		if (txs.length === 0) {
			return { count: 0, total: 0, avgAmount: 0, income: 0, expenses: 0 };
		}

		let income = 0;
		let expenses = 0;

		for (const tx of txs) {
			if (tx.amount > 0) {
				income += tx.amount;
			} else {
				expenses += Math.abs(tx.amount);
			}
		}

		return {
			count: txs.length,
			total: income - expenses,
			avgAmount: (income + expenses) / txs.length,
			income,
			expenses
		};
	});

	// Get month label from YYYY-MM format
	function getMonthLabel(monthId: string): string {
		const point = chartSelection.selectedPoints.find((p) => p.id === monthId);
		if (point) return point.label;

		// Fallback: parse the date
		const [year, month] = monthId.split('-');
		const date = new Date(parseInt(year), parseInt(month) - 1);
		return date.toLocaleDateString('default', { month: 'long', year: 'numeric' });
	}

	function handleClose() {
		open = false;
		onOpenChange?.(false);
	}
</script>

<ResponsiveSheet bind:open {onOpenChange} side="right" defaultWidth={600} minWidth={400} maxWidth={800}>
	{#snippet header()}
		<Sheet.Title>Transaction Drill-Down</Sheet.Title>
		<Sheet.Description>
			{filteredTransactions.length} transactions across {chartSelection.count} selected month{chartSelection.count === 1 ? '' : 's'}
		</Sheet.Description>
	{/snippet}

	{#snippet content()}
		{#if transactionsQuery?.isLoading}
			<div class="flex h-40 items-center justify-center">
				<p class="text-sm text-muted-foreground">Loading transactions...</p>
			</div>
		{:else if filteredTransactions.length === 0}
			<div class="flex h-40 items-center justify-center">
				<p class="text-sm text-muted-foreground">No transactions found in selected months</p>
			</div>
		{:else}
			<div class="space-y-6">
				<!-- Summary Stats -->
				<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
					<div class="rounded-lg bg-muted/50 p-3">
						<p class="text-xs text-muted-foreground">Total Spent</p>
						<p class="text-lg font-semibold text-destructive">
							{currencyFormatter.format(summaryStats.expenses)}
						</p>
					</div>
					<div class="rounded-lg bg-muted/50 p-3">
						<p class="text-xs text-muted-foreground">Total Income</p>
						<p class="text-lg font-semibold text-green-600">
							{currencyFormatter.format(summaryStats.income)}
						</p>
					</div>
					<div class="rounded-lg bg-muted/50 p-3">
						<p class="text-xs text-muted-foreground">Net Change</p>
						<p
							class="text-lg font-semibold"
							class:text-green-600={summaryStats.total >= 0}
							class:text-destructive={summaryStats.total < 0}
						>
							{currencyFormatter.format(summaryStats.total)}
						</p>
					</div>
					<div class="rounded-lg bg-muted/50 p-3">
						<p class="text-xs text-muted-foreground">Avg Transaction</p>
						<p class="text-lg font-semibold">{currencyFormatter.format(summaryStats.avgAmount)}</p>
					</div>
				</div>

				<!-- View Toggle -->
				<Tabs.Root bind:value={viewMode}>
					<Tabs.List class="grid w-full grid-cols-2">
						<Tabs.Trigger value="combined" class="gap-2">
							<List class="h-4 w-4" />
							Combined
						</Tabs.Trigger>
						<Tabs.Trigger value="by-month" class="gap-2">
							<Calendar class="h-4 w-4" />
							By Month
						</Tabs.Trigger>
					</Tabs.List>

					<Tabs.Content value="combined" class="mt-4">
						<div class="space-y-2">
							{#each sortedTransactions as tx}
								{@const isExpense = tx.amount < 0}
								<div
									class="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
								>
									<div class="flex items-center gap-3">
										<div
											class="flex h-9 w-9 items-center justify-center rounded-full bg-muted"
										>
											{#if isExpense}
												<ArrowUpRight class="h-4 w-4 text-destructive" />
											{:else}
												<ArrowDownLeft class="h-4 w-4 text-green-600" />
											{/if}
										</div>
										<div class="min-w-0">
											<p class="truncate font-medium">{tx.payee?.name || 'Unknown'}</p>
											<div class="flex items-center gap-2 text-xs text-muted-foreground">
												<span>{formatDate(new Date(tx.date))}</span>
												{#if tx.category}
													<Badge variant="secondary" class="text-xs">
														{tx.category.name}
													</Badge>
												{/if}
											</div>
										</div>
									</div>
									<p
										class="font-semibold"
										class:text-destructive={isExpense}
										class:text-green-600={!isExpense}
									>
										{currencyFormatter.format(tx.amount)}
									</p>
								</div>
							{/each}
						</div>
					</Tabs.Content>

					<Tabs.Content value="by-month" class="mt-4">
						<div class="space-y-6">
							{#each transactionsByMonth as [monthId, transactions]}
								{@const monthIncome = transactions
									.filter((tx) => tx.amount > 0)
									.reduce((sum, tx) => sum + tx.amount, 0)}
								{@const monthExpenses = transactions
									.filter((tx) => tx.amount < 0)
									.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)}
								<div>
									<div class="mb-2 flex items-center justify-between">
										<h4 class="font-semibold">{getMonthLabel(monthId)}</h4>
										<div class="flex items-center gap-3 text-sm">
											<span class="text-green-600">+{currencyFormatter.format(monthIncome)}</span>
											<span class="text-destructive">-{currencyFormatter.format(monthExpenses)}</span>
											<Badge variant="outline">{transactions.length} txns</Badge>
										</div>
									</div>
									<div class="space-y-2">
										{#each transactions as tx}
											{@const isExpense = tx.amount < 0}
											<div
												class="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
											>
												<div class="flex items-center gap-3">
													<div
														class="flex h-8 w-8 items-center justify-center rounded-full bg-muted"
													>
														{#if isExpense}
															<ArrowUpRight class="h-3 w-3 text-destructive" />
														{:else}
															<ArrowDownLeft class="h-3 w-3 text-green-600" />
														{/if}
													</div>
													<div class="min-w-0">
														<p class="truncate text-sm font-medium">
															{tx.payee?.name || 'Unknown'}
														</p>
														<div class="flex items-center gap-2 text-xs text-muted-foreground">
															<span>{formatDate(new Date(tx.date))}</span>
															{#if tx.category}
																<Badge variant="secondary" class="text-xs">
																	{tx.category.name}
																</Badge>
															{/if}
														</div>
													</div>
												</div>
												<p
													class="text-sm font-semibold"
													class:text-destructive={isExpense}
													class:text-green-600={!isExpense}
												>
													{currencyFormatter.format(tx.amount)}
												</p>
											</div>
										{/each}
									</div>
								</div>
							{/each}
						</div>
					</Tabs.Content>
				</Tabs.Root>
			</div>
		{/if}
	{/snippet}

	{#snippet footer()}
		<Button variant="outline" onclick={handleClose}>Close</Button>
	{/snippet}
</ResponsiveSheet>
