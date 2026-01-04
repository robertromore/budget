<script lang="ts">
	import { ResponsiveSheet } from '$lib/components/ui/responsive-sheet';
	import { Button } from '$lib/components/ui/button';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Badge } from '$lib/components/ui/badge';
	import { chartInteractions } from '$lib/states/ui/chart-interactions.svelte';
	import { currencyFormatter } from '$lib/utils/formatters';
	import type { TransactionsFormat } from '$lib/types';
	import { formatDate } from '$lib/utils/date-formatters';
	import { getLocalTimeZone } from '@internationalized/date';
	import X from '@lucide/svelte/icons/x';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import ArrowDownLeft from '@lucide/svelte/icons/arrow-down-left';

	interface Props {
		transactions: TransactionsFormat[];
	}

	let { transactions }: Props = $props();

	// Filter transactions based on drill-down filter
	const filteredTransactions = $derived.by(() => {
		const filter = chartInteractions.drillDownFilter;
		if (!filter) return [];

		return transactions.filter((tx) => {
			switch (filter.type) {
				case 'category':
					return tx.category?.name === filter.value;
				case 'payee':
					return tx.payee?.name === filter.value;
				case 'month': {
					// Filter by month (value is YYYY-MM string)
					const txDate = tx.date instanceof Date ? tx.date : tx.date?.toDate?.(getLocalTimeZone());
					if (!txDate) return false;
					const txMonth = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
					return txMonth === filter.value;
				}
				case 'date': {
					// Filter by date range
					const range = filter.value as { start: Date; end: Date };
					const txDate = tx.date instanceof Date ? tx.date : tx.date?.toDate?.(getLocalTimeZone());
					if (!txDate) return false;
					return txDate >= range.start && txDate <= range.end;
				}
				case 'amount-range': {
					// Filter by amount range (for histogram bins)
					const range = filter.value as { min: number; max: number };
					const absAmount = Math.abs(tx.amount);
					return absAmount >= range.min && absAmount < range.max;
				}
				case 'category-month': {
					// Filter by category and month (for stacked bar segments)
					const { category, month } = filter.value as { category: string; month: string };
					const categoryMatch = tx.category?.name === category || (category === 'Other' && !tx.category);
					if (!categoryMatch) return false;
					const txDate = tx.date instanceof Date ? tx.date : tx.date?.toDate?.(getLocalTimeZone());
					if (!txDate) return false;
					const txMonth = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
					return txMonth === month;
				}
				case 'new-payees-month': {
					// Filter transactions from payees that were first seen in a specific month
					const { payees } = filter.value as { month: string; payees: string[] };
					const payeeName = tx.payee?.name || 'Unknown';
					return payees.includes(payeeName);
				}
				case 'weekday': {
					// Filter by day of week (0=Sunday, 6=Saturday)
					const dayOfWeek = filter.value as number;
					const txDate = tx.date instanceof Date ? tx.date : tx.date?.toDate?.(getLocalTimeZone());
					if (!txDate) return false;
					return txDate.getDay() === dayOfWeek;
				}
				case 'payee-month': {
					// Filter by payee and month
					const { payee, month } = filter.value as { payee: string; month: string };
					if (tx.payee?.name !== payee) return false;
					const txDate = tx.date instanceof Date ? tx.date : tx.date?.toDate?.(getLocalTimeZone());
					if (!txDate) return false;
					const txMonth = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
					return txMonth === month;
				}
				default:
					return false;
			}
		});
	});

	// Calculate summary stats for filtered transactions
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

	// Sort transactions by date (newest first)
	const sortedTransactions = $derived([...filteredTransactions].sort((a, b) => {
		const dateA = a.date instanceof Date ? a.date : a.date?.toDate?.(getLocalTimeZone());
		const dateB = b.date instanceof Date ? b.date : b.date?.toDate?.(getLocalTimeZone());
		if (!dateA || !dateB) return 0;
		return dateB.getTime() - dateA.getTime();
	}));
</script>

<ResponsiveSheet
	bind:open={chartInteractions.drillDownOpen}
	side="right"
	adjacent={true}
	defaultWidth={480}
	minWidth={360}
	maxWidth={600}
>
	{#snippet header()}
		<div class="flex w-full items-center justify-between">
			<div>
				<h2 class="text-lg font-semibold">{chartInteractions.drillDownFilter?.label || 'Transactions'}</h2>
				<p class="text-muted-foreground text-sm">
					{filteredTransactions.length} transaction{filteredTransactions.length === 1 ? '' : 's'}
				</p>
			</div>
			<Button variant="ghost" size="icon" onclick={() => chartInteractions.closeDrillDown()}>
				<X class="h-4 w-4" />
			</Button>
		</div>
	{/snippet}

	{#snippet content()}
		{#if filteredTransactions.length > 0}
			<!-- Summary Stats -->
			<div class="mb-6 grid grid-cols-2 gap-3">
				<div class="bg-muted/50 rounded-lg p-3">
					<p class="text-muted-foreground text-xs">Total Spent</p>
					<p class="text-destructive text-lg font-semibold">{currencyFormatter.format(summaryStats.expenses)}</p>
				</div>
				<div class="bg-muted/50 rounded-lg p-3">
					<p class="text-muted-foreground text-xs">Total Income</p>
					<p class="text-lg font-semibold text-green-600">{currencyFormatter.format(summaryStats.income)}</p>
				</div>
				<div class="bg-muted/50 rounded-lg p-3">
					<p class="text-muted-foreground text-xs">Net Change</p>
					<p class="text-lg font-semibold {summaryStats.total >= 0 ? 'text-green-600' : 'text-destructive'}">
						{currencyFormatter.format(summaryStats.total)}
					</p>
				</div>
				<div class="bg-muted/50 rounded-lg p-3">
					<p class="text-muted-foreground text-xs">Average</p>
					<p class="text-lg font-semibold">{currencyFormatter.format(summaryStats.avgAmount)}</p>
				</div>
			</div>

			<!-- Transaction List -->
			<div class="space-y-2">
				{#each sortedTransactions as tx}
					{@const txDate = tx.date instanceof Date ? tx.date : tx.date?.toDate?.(getLocalTimeZone())}
					{@const isExpense = tx.amount < 0}
					<div class="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-3 transition-colors">
						<div class="flex items-center gap-3">
							<div class="bg-muted flex h-9 w-9 items-center justify-center rounded-full">
								{#if isExpense}
									<ArrowUpRight class="text-destructive h-4 w-4" />
								{:else}
									<ArrowDownLeft class="h-4 w-4 text-green-600" />
								{/if}
							</div>
							<div class="min-w-0">
								<p class="truncate font-medium">{tx.payee?.name || 'Unknown'}</p>
								<div class="text-muted-foreground flex items-center gap-2 text-xs">
									<span>{txDate ? formatDate(txDate) : 'No date'}</span>
									{#if tx.category}
										<Badge variant="secondary" class="text-xs">
											{tx.category.name}
										</Badge>
									{/if}
								</div>
							</div>
						</div>
						<p class="font-semibold {isExpense ? 'text-destructive' : 'text-green-600'}">
							{currencyFormatter.format(tx.amount)}
						</p>
					</div>
				{/each}
			</div>
		{:else}
			<div class="flex h-40 items-center justify-center">
				<p class="text-muted-foreground text-sm">No transactions found</p>
			</div>
		{/if}
	{/snippet}
</ResponsiveSheet>
