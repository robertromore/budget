<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import { Progress } from '$lib/components/ui/progress';
	import { Separator } from '$lib/components/ui/separator';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Tabs from '$lib/components/ui/tabs';
	import { rpc } from '$lib/query';
	import { CategoriesState } from '$lib/states/entities/categories.svelte';
	import { formatCurrency } from '$lib/utils/formatters';
	import { formatDateDisplay, parseISOString } from '$lib/utils/dates';
	import { LayerCake, Svg } from 'layercake';
	import { AxisX, AxisY, HorizontalLine, Scatter, Tooltip } from '$lib/components/layercake';
	import type { PageData } from './$types';

	// Icons
	import Activity from '@lucide/svelte/icons/activity';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import Brain from '@lucide/svelte/icons/brain';
	import Calendar from '@lucide/svelte/icons/calendar';
	import DollarSign from '@lucide/svelte/icons/dollar-sign';
	import Hash from '@lucide/svelte/icons/hash';
	import Receipt from '@lucide/svelte/icons/receipt';
	import SquarePen from '@lucide/svelte/icons/square-pen';
	import Tag from '@lucide/svelte/icons/tag';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import TrendingDown from '@lucide/svelte/icons/trending-down';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import User from '@lucide/svelte/icons/user';
	import Wallet from '@lucide/svelte/icons/wallet';
	import Lightbulb from '@lucide/svelte/icons/lightbulb';

	let { data }: { data: PageData } = $props();

	const slug = $derived(page.params['slug']);
	const category = $derived(data.category);
	const categoriesState = CategoriesState.get();

	// Active tab state - read from URL query param or default to 'details'
	const tabFromUrl = $derived(page.url.searchParams.get('tab'));
	let activeTab = $state('details');

	// Sync tab from URL on mount and when URL changes
	$effect(() => {
		if (tabFromUrl && ['details', 'analytics', 'intelligence'].includes(tabFromUrl)) {
			activeTab = tabFromUrl;
		}
	});

	// Update URL when tab changes
	const handleTabChange = (value: string) => {
		activeTab = value;
		const url = new URL(page.url);
		if (value === 'details') {
			url.searchParams.delete('tab');
		} else {
			url.searchParams.set('tab', value);
		}
		goto(url.toString(), { replaceState: true, noScroll: true });
	};

	// Fetch detailed stats (always for sidebar)
	const statsQuery = $derived(
		category?.id ? rpc.categories.getCategoryDetailedStats(category.id).options() : null
	);

	// Fetch recent transactions for this category
	const recentTransactionsQuery = $derived(
		category?.id
			? rpc.transactions.getRelatedTransactions({ categoryId: category.id, limit: 5 }).options()
			: null
	);

	// Analytics queries (only fetch when analytics tab is active)
	const topPayeesQuery = $derived(
		category?.id && activeTab === 'analytics'
			? rpc.categories.getCategoryTopPayees(category.id, 10).options()
			: null
	);

	const monthlySpendingQuery = $derived(
		category?.id && activeTab === 'analytics'
			? rpc.categories.getCategoryMonthlySpending(category.id, 12).options()
			: null
	);

	// Delete dialog state
	let deleteDialogOpen = $state(false);
	let isDeleting = $state(false);

	const handleDelete = async () => {
		if (isDeleting || !category) return;

		isDeleting = true;
		try {
			await categoriesState.deleteCategory(category.id);
			deleteDialogOpen = false;
			goto('/categories');
		} catch (error) {
			console.error('Failed to delete category:', error);
			isDeleting = false;
		}
	};

	// Helper to format category type
	const formatCategoryType = (type: string | null | undefined) => {
		if (!type) return 'Expense';
		return type.charAt(0).toUpperCase() + type.slice(1);
	};

	// Helper to format spending priority
	const formatSpendingPriority = (priority: string | null | undefined) => {
		if (!priority) return null;
		return priority
			.split('_')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	};

	// Chart data transformation - use numeric index for x-axis (even spacing)
	const chartData = $derived.by(() => {
		const spending = monthlySpendingQuery?.data;
		if (!spending || spending.length === 0) return [];

		return spending.map((item, idx) => ({
			index: idx,
			month: item.month,
			displayAmount: Math.abs(item.amount),
			isExpense: item.amount < 0,
			transactionCount: item.transactionCount
		}));
	});

	// X domain for chart (with padding)
	const xDomain = $derived.by((): [number, number] | undefined => {
		if (chartData.length === 0) return undefined;
		return [-0.5, chartData.length - 0.5];
	});

	// Create month label lookup by index
	const indexToLabelMap = $derived.by((): Map<number, string> => {
		const map = new Map<number, string>();
		for (const d of chartData) {
			const [year, month] = d.month.split('-');
			const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
			const label = `${monthNames[parseInt(month, 10) - 1]} '${year.slice(-2)}`;
			map.set(d.index, label);
		}
		return map;
	});

	// Calculate max amount for chart scaling
	const maxAmount = $derived.by(() => {
		if (chartData.length === 0) return 0;
		return Math.max(...chartData.map((d) => d.displayAmount));
	});

	// Average amount for horizontal line
	const avgAmount = $derived.by(() => {
		if (chartData.length === 0) return 0;
		const sum = chartData.reduce((acc, d) => acc + d.displayAmount, 0);
		return sum / chartData.length;
	});
</script>

<svelte:head>
	<title>{category?.name || 'Category'} - Budget App</title>
	<meta name="description" content="View category details and statistics" />
</svelte:head>

<div class="container mx-auto py-6">
	<!-- Back Navigation -->
	<div class="mb-6">
		<Button variant="ghost" size="sm" href="/categories" class="gap-2">
			<ArrowLeft class="h-4 w-4" />
			Back to Categories
		</Button>
	</div>

	{#if category}
		<div class="flex gap-8">
			<!-- Left Sidebar -->
			<aside class="w-72 shrink-0">
				<div class="sticky top-6 space-y-6">
					<!-- Identity Card -->
					<div
						class="rounded-xl border bg-linear-to-b from-slate-50 to-white p-6 dark:from-slate-900 dark:to-slate-950"
					>
						<!-- Category Icon -->
						<div class="mb-4 flex justify-center">
							<div
								class="flex h-24 w-24 items-center justify-center rounded-full"
								style="background-color: {category.categoryColor ?? 'hsl(var(--primary) / 0.1)'}"
							>
								<Tag class="h-12 w-12 {category.categoryColor ? 'text-white' : 'text-primary'}" />
							</div>
						</div>

						<!-- Name -->
						<h1 class="text-center text-xl font-bold">{category.name}</h1>

						<!-- Badges -->
						<div class="mt-3 flex flex-wrap justify-center gap-1.5">
							<Badge variant={category.isActive ? 'default' : 'secondary'} class="text-xs">
								{category.isActive ? 'Active' : 'Inactive'}
							</Badge>
							<Badge variant="outline" class="text-xs">{formatCategoryType(category.categoryType)}</Badge>
							{#if category.isTaxDeductible}
								<Badge variant="outline" class="border-amber-500 text-xs text-amber-600">
									Tax Deductible
								</Badge>
							{/if}
							{#if category.isSeasonal}
								<Badge variant="outline" class="border-blue-500 text-xs text-blue-600">
									Seasonal
								</Badge>
							{/if}
						</div>
					</div>

					<!-- Quick Stats -->
					<div class="space-y-1 rounded-lg border p-4">
						<h3 class="text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wide">
							Quick Stats
						</h3>
						{#if statsQuery?.data}
							{@const stats = statsQuery.data}
							<div class="flex items-center justify-between py-2">
								<div class="text-muted-foreground flex items-center gap-2 text-sm">
									<Hash class="h-4 w-4" />
									<span>Transactions</span>
								</div>
								<span class="font-semibold">{stats.transactionCount}</span>
							</div>
							<div class="flex items-center justify-between py-2">
								<div class="text-muted-foreground flex items-center gap-2 text-sm">
									<DollarSign class="h-4 w-4" />
									<span>Total</span>
								</div>
								<span class="font-semibold">{formatCurrency(Math.abs(stats.totalAmount))}</span>
							</div>
							<div class="flex items-center justify-between py-2">
								<div class="text-muted-foreground flex items-center gap-2 text-sm">
									<Calendar class="h-4 w-4" />
									<span>Monthly Avg</span>
								</div>
								<span class="font-semibold">{formatCurrency(Math.abs(stats.monthlyAverage))}</span>
							</div>
							{#if stats.lastTransactionDate}
								<div class="flex items-center justify-between py-2">
									<div class="text-muted-foreground flex items-center gap-2 text-sm">
										<Receipt class="h-4 w-4" />
										<span>Last Txn</span>
									</div>
									<span class="font-semibold text-sm">
										{formatDateDisplay(parseISOString(stats.lastTransactionDate)!)}
									</span>
								</div>
							{/if}
						{:else if statsQuery?.isPending}
							<Skeleton class="h-16 w-full" />
						{:else}
							<p class="text-muted-foreground py-2 text-center text-sm">No transaction data yet</p>
						{/if}
					</div>

					<!-- Actions -->
					<div class="space-y-2">
						<Button variant="outline" href="/categories/{slug}/edit" class="w-full justify-start">
							<SquarePen class="mr-2 h-4 w-4" />
							Edit Category
						</Button>
						<Separator class="my-3" />
						<Button
							variant="ghost"
							class="text-destructive hover:text-destructive hover:bg-destructive/10 w-full justify-start"
							onclick={() => (deleteDialogOpen = true)}
						>
							<Trash2 class="mr-2 h-4 w-4" />
							Delete Category
						</Button>
					</div>
				</div>
			</aside>

			<!-- Main Content -->
			<main class="min-w-0 flex-1">
				<Tabs.Root value={activeTab} onValueChange={handleTabChange}>
					<!-- Horizontal Tabs at Top -->
					<Tabs.List class="mb-6 grid w-full grid-cols-3">
						<Tabs.Trigger value="details" class="gap-2">
							<Tag class="h-4 w-4" />
							Details
						</Tabs.Trigger>
						<Tabs.Trigger value="analytics" class="gap-2">
							<BarChart3 class="h-4 w-4" />
							Analytics
						</Tabs.Trigger>
						<Tabs.Trigger value="intelligence" class="gap-2">
							<Brain class="h-4 w-4" />
							Intelligence
						</Tabs.Trigger>
					</Tabs.List>

					<!-- Details Tab -->
					<Tabs.Content value="details" class="mt-0 space-y-8">
						<!-- Notes Section -->
						{#if category.notes}
							<section>
								<h2 class="mb-3 text-lg font-semibold">Notes</h2>
								<p class="text-muted-foreground leading-relaxed">{category.notes}</p>
							</section>
						{/if}

						<!-- Category Settings -->
						<section>
							<h2 class="mb-4 text-lg font-semibold">Category Settings</h2>
							<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
								<div class="rounded-lg border p-4">
									<div class="text-muted-foreground mb-1 text-xs font-medium">Type</div>
									<p class="font-medium">{formatCategoryType(category.categoryType)}</p>
								</div>

								{#if category.spendingPriority}
									<div class="rounded-lg border p-4">
										<div class="text-muted-foreground mb-1 text-xs font-medium">Priority</div>
										<p class="font-medium">{formatSpendingPriority(category.spendingPriority)}</p>
									</div>
								{/if}

								{#if category.isTaxDeductible && category.taxCategory}
									<div class="rounded-lg border p-4">
										<div class="text-muted-foreground mb-1 text-xs font-medium">Tax Category</div>
										<p class="font-medium capitalize">{category.taxCategory.replace('_', ' ')}</p>
									</div>
								{/if}

								{#if category.expectedMonthlyMin || category.expectedMonthlyMax}
									<div class="rounded-lg border p-4">
										<div class="text-muted-foreground mb-1 text-xs font-medium">Expected Range</div>
										<p class="font-medium">
											{formatCurrency(category.expectedMonthlyMin ?? 0)} -
											{formatCurrency(category.expectedMonthlyMax ?? 0)}
										</p>
									</div>
								{/if}
							</div>
						</section>

						<!-- Budget Allocations -->
						{#if category.budgets && category.budgets.length > 0}
							<section>
								<h2 class="mb-4 flex items-center gap-2 text-lg font-semibold">
									<Wallet class="h-5 w-5" />
									Budget Allocations
								</h2>
								<div class="space-y-4">
									{#each category.budgets as budget}
										<div class="space-y-3 rounded-lg border p-4">
											<div class="flex items-center justify-between">
												<a href="/budgets/{budget.budgetSlug}" class="font-medium hover:underline">
													{budget.budgetName}
												</a>
												<Badge variant="outline" class="text-xs">{budget.status}</Badge>
											</div>

											<Separator />

											<div class="grid grid-cols-2 gap-4 text-sm">
												<div>
													<div class="text-muted-foreground">Allocated</div>
													<div class="font-medium">{formatCurrency(budget.allocatedAmount)}</div>
												</div>
												<div>
													<div class="text-muted-foreground">Spent</div>
													<div class="font-medium">{formatCurrency(budget.spentAmount)}</div>
												</div>
												<div>
													<div class="text-muted-foreground">Available</div>
													<div
														class="font-medium"
														class:text-green-600={budget.availableAmount > 0}
														class:text-red-600={budget.availableAmount < 0}
													>
														{formatCurrency(budget.availableAmount)}
													</div>
												</div>
												<div>
													<div class="text-muted-foreground">Rollover</div>
													<div class="font-medium">{formatCurrency(budget.rolloverAmount)}</div>
												</div>
											</div>

											{#if budget.deficitAmount !== 0}
												<div class="border-t pt-2">
													<div class="flex items-center justify-between text-sm">
														<span class="text-muted-foreground">Deficit</span>
														<span class="font-medium text-red-600">{formatCurrency(budget.deficitAmount)}</span>
													</div>
												</div>
											{/if}
										</div>
									{/each}
								</div>
							</section>
						{/if}

						<!-- Recent Transactions -->
						<section>
							<h2 class="mb-4 flex items-center gap-2 text-lg font-semibold">
								<Receipt class="h-5 w-5" />
								Recent Transactions
							</h2>

							{#if !recentTransactionsQuery || recentTransactionsQuery.isPending}
								<div class="space-y-2">
									{#each Array(5) as _}
										<div class="flex items-center justify-between rounded-lg border p-4">
											<Skeleton class="h-4 w-32" />
											<Skeleton class="h-5 w-16" />
										</div>
									{/each}
								</div>
							{:else if (recentTransactionsQuery.data?.data?.length ?? 0) > 0}
								<div class="divide-y rounded-lg border">
									{#each recentTransactionsQuery.data?.data ?? [] as txn}
										<div class="flex items-center justify-between p-4">
											<div>
												<p class="font-medium">{txn.payee?.name || 'Unknown Payee'}</p>
												<p class="text-muted-foreground text-sm">
													{formatDateDisplay(parseISOString(txn.date)!)}
												</p>
											</div>
											<span
												class="font-semibold"
												class:text-red-600={txn.amount < 0}
												class:text-green-600={txn.amount > 0}
											>
												{formatCurrency(txn.amount)}
											</span>
										</div>
									{/each}
								</div>
								<div class="mt-4 text-center">
									<Button variant="outline" size="sm" onclick={() => handleTabChange('analytics')}>
										View All Transactions
									</Button>
								</div>
							{:else}
								<div class="text-muted-foreground rounded-lg border border-dashed p-8 text-center">
									<Receipt class="mx-auto mb-2 h-8 w-8 opacity-50" />
									<p>No transactions in this category</p>
								</div>
							{/if}
						</section>
					</Tabs.Content>

					<!-- Analytics Tab -->
					<Tabs.Content value="analytics" class="mt-0 space-y-8">
						<!-- Key Metrics -->
						<section>
							<div class="mb-4 flex items-center justify-between">
								<h2 class="text-lg font-semibold">Key Metrics</h2>
								<span class="text-muted-foreground text-xs">All time</span>
							</div>

							{#if !statsQuery || statsQuery.isPending}
								<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
									{#each Array(4) as _}
										<div class="rounded-lg border p-4">
											<Skeleton class="mb-2 h-4 w-20" />
											<Skeleton class="h-7 w-24" />
										</div>
									{/each}
								</div>
							{:else if statsQuery.data}
								{@const stats = statsQuery.data}
								{@const isIncome = stats.totalAmount > 0}
								<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
									<!-- Transaction Count -->
									<div class="rounded-lg border p-4">
										<div class="text-muted-foreground mb-1 flex items-center gap-2 text-xs font-medium">
											<Hash class="h-3.5 w-3.5" />
											Transactions
										</div>
										<p class="text-2xl font-bold">{stats.transactionCount}</p>
									</div>

									<!-- Total Amount -->
									<div class="rounded-lg border p-4">
										<div class="text-muted-foreground mb-1 flex items-center gap-2 text-xs font-medium">
											<DollarSign class="h-3.5 w-3.5" />
											{isIncome ? 'Total Income' : 'Total Spent'}
										</div>
										<p class="text-2xl font-bold">{formatCurrency(Math.abs(stats.totalAmount))}</p>
									</div>

									<!-- Monthly Average -->
									<div class="rounded-lg border p-4">
										<div class="text-muted-foreground mb-1 flex items-center gap-2 text-xs font-medium">
											<Calendar class="h-3.5 w-3.5" />
											Monthly Avg
										</div>
										<p class="text-2xl font-bold">{formatCurrency(Math.abs(stats.monthlyAverage))}</p>
									</div>

									<!-- Amount Range -->
									<div class="rounded-lg border p-4">
										<div class="text-muted-foreground mb-1 flex items-center gap-2 text-xs font-medium">
											<Activity class="h-3.5 w-3.5" />
											Amount Range
										</div>
										<p class="text-lg font-bold">
											{formatCurrency(stats.minAmount)} - {formatCurrency(stats.maxAmount)}
										</p>
									</div>
								</div>
							{/if}
						</section>

						<!-- Monthly Spending Chart -->
						<section class="rounded-lg border p-5">
							<div class="mb-4 flex items-center gap-2">
								<Activity class="h-5 w-5 text-blue-500" />
								<h3 class="font-semibold">Monthly Spending</h3>
							</div>

							{#if !monthlySpendingQuery || monthlySpendingQuery.isPending}
								<Skeleton class="h-56 w-full" />
							{:else if chartData.length > 0}
								<div class="h-56">
									<LayerCake
										data={chartData}
										x="index"
										y="displayAmount"
										xDomain={xDomain}
										yDomain={[0, maxAmount * 1.15]}
										padding={{ top: 15, right: 15, bottom: 35, left: 55 }}
									>
										<Svg>
											<AxisY ticks={4} gridlines={true} format={(d) => formatCurrency(d)} />
											<AxisX
												ticks={chartData.length <= 6 ? chartData.length : 6}
												format={(d) => {
													const idx = typeof d === 'number' ? Math.round(d) : 0;
													return indexToLabelMap.get(idx) ?? '';
												}}
											/>
											<HorizontalLine
												value={avgAmount}
												stroke="var(--chart-2)"
												strokeDasharray="6 3"
												label="Avg"
											/>
											<Scatter fill="var(--chart-1)" radius={6} hoverRadius={8} />
											<Tooltip>
												{#snippet children({ point, x, y })}
													{#if !Number.isNaN(x) && !Number.isNaN(y)}
														<foreignObject
															x={x > 100 ? x - 120 : x + 10}
															y={y > 50 ? y - 60 : y + 10}
															width={120}
															height={70}
														>
															<div class="rounded-md bg-slate-900 p-2 text-white shadow-lg">
																<p class="text-sm font-medium">{indexToLabelMap.get(point.index) ?? point.month}</p>
																<p class="text-xs">{formatCurrency(point.displayAmount)}</p>
																<p class="text-xs text-slate-400">{point.transactionCount} transactions</p>
															</div>
														</foreignObject>
													{/if}
												{/snippet}
											</Tooltip>
										</Svg>
									</LayerCake>
								</div>
							{:else}
								<div class="text-muted-foreground flex h-56 items-center justify-center text-sm">
									No spending data available
								</div>
							{/if}
						</section>

						<!-- Top Payees -->
						<section>
							<h2 class="mb-4 flex items-center gap-2 text-lg font-semibold">
								<User class="h-5 w-5" />
								Top Payees
							</h2>

							{#if !topPayeesQuery || topPayeesQuery.isPending}
								<div class="space-y-4 rounded-lg border p-6">
									{#each Array(5) as _}
										<div>
											<Skeleton class="mb-2 h-4 w-full" />
											<Skeleton class="h-2 w-full" />
										</div>
									{/each}
								</div>
							{:else if topPayeesQuery.data && topPayeesQuery.data.length > 0}
								{@const totalAmount = topPayeesQuery.data.reduce((sum, p) => sum + Math.abs(p.totalAmount), 0)}
								<div class="space-y-4 rounded-lg border p-6">
									{#each topPayeesQuery.data as payee}
										{@const percentage = totalAmount > 0 ? (Math.abs(payee.totalAmount) / totalAmount) * 100 : 0}
										<div>
											<div class="mb-2 flex items-center justify-between text-sm">
												<div class="flex items-center gap-2">
													<User class="text-muted-foreground h-4 w-4" />
													<a
														href="/payees/{payee.payeeSlug}"
														class="font-medium hover:underline"
													>
														{payee.payeeName}
													</a>
													<span class="text-muted-foreground">({payee.transactionCount} txns)</span>
												</div>
												<span class="font-semibold">{formatCurrency(Math.abs(payee.totalAmount))}</span>
											</div>
											<Progress value={percentage} class="h-2" />
										</div>
									{/each}
								</div>
							{:else}
								<div class="text-muted-foreground rounded-lg border border-dashed p-8 text-center">
									<User class="mx-auto mb-2 h-8 w-8 opacity-50" />
									<p>No payee data available</p>
								</div>
							{/if}
						</section>
					</Tabs.Content>

					<!-- Intelligence Tab -->
					<Tabs.Content value="intelligence" class="mt-0 space-y-8">
						<section>
							<div class="mb-4 flex items-center gap-2">
								<Brain class="h-5 w-5 text-purple-500" />
								<h2 class="text-lg font-semibold">Category Intelligence</h2>
							</div>

							<!-- Placeholder for future intelligence features -->
							<div class="space-y-6">
								<!-- Spending Forecast Card -->
								<div class="rounded-lg border p-6">
									<div class="mb-4 flex items-center gap-2">
										<TrendingUp class="h-5 w-5 text-blue-500" />
										<h3 class="font-semibold">Spending Forecast</h3>
									</div>

									{#if statsQuery?.data && statsQuery.data.monthlyAverage > 0}
										{@const monthlyAvg = statsQuery.data.monthlyAverage}
										<div class="grid gap-4 md:grid-cols-3">
											<div class="rounded-lg bg-slate-50 p-4 dark:bg-slate-900">
												<p class="text-muted-foreground text-sm">Next Month</p>
												<p class="text-2xl font-bold">{formatCurrency(Math.abs(monthlyAvg))}</p>
												<p class="text-muted-foreground text-xs">Based on historical average</p>
											</div>
											<div class="rounded-lg bg-slate-50 p-4 dark:bg-slate-900">
												<p class="text-muted-foreground text-sm">Next Quarter</p>
												<p class="text-2xl font-bold">{formatCurrency(Math.abs(monthlyAvg * 3))}</p>
												<p class="text-muted-foreground text-xs">Projected total</p>
											</div>
											<div class="rounded-lg bg-slate-50 p-4 dark:bg-slate-900">
												<p class="text-muted-foreground text-sm">Annual Estimate</p>
												<p class="text-2xl font-bold">{formatCurrency(Math.abs(monthlyAvg * 12))}</p>
												<p class="text-muted-foreground text-xs">If current trend continues</p>
											</div>
										</div>
									{:else}
										<div class="text-muted-foreground rounded-lg border border-dashed p-8 text-center">
											<Brain class="mx-auto mb-2 h-8 w-8 opacity-50" />
											<p>Insufficient data for predictions</p>
											<p class="text-xs">Need more transactions to generate forecasts</p>
										</div>
									{/if}
								</div>

								<!-- Budget Recommendations Card -->
								<div class="rounded-lg border p-6">
									<div class="mb-4 flex items-center gap-2">
										<Lightbulb class="h-5 w-5 text-amber-500" />
										<h3 class="font-semibold">Budget Recommendations</h3>
									</div>

									{#if statsQuery?.data && statsQuery.data.transactionCount >= 3}
										{@const stats = statsQuery.data}
										<div class="space-y-4">
											<div class="flex items-start gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-900">
												<div class="rounded-full bg-green-100 p-2 dark:bg-green-950">
													<DollarSign class="h-4 w-4 text-green-600" />
												</div>
												<div>
													<p class="font-medium">Suggested Monthly Budget</p>
													<p class="text-2xl font-bold text-green-600">
														{formatCurrency(Math.abs(stats.monthlyAverage * 1.1))}
													</p>
													<p class="text-muted-foreground text-sm">
														Based on your average of {formatCurrency(Math.abs(stats.monthlyAverage))} with 10%
														buffer
													</p>
												</div>
											</div>

											{#if stats.maxAmount > stats.monthlyAverage * 1.5}
												<div class="flex items-start gap-3 rounded-lg bg-amber-50 p-4 dark:bg-amber-950/30">
													<div class="rounded-full bg-amber-100 p-2 dark:bg-amber-950">
														<Activity class="h-4 w-4 text-amber-600" />
													</div>
													<div>
														<p class="font-medium text-amber-800 dark:text-amber-200">High Variance Detected</p>
														<p class="text-muted-foreground text-sm">
															Your spending in this category varies significantly. Consider reviewing
															individual transactions.
														</p>
													</div>
												</div>
											{/if}
										</div>
									{:else}
										<div class="text-muted-foreground rounded-lg border border-dashed p-8 text-center">
											<Lightbulb class="mx-auto mb-2 h-8 w-8 opacity-50" />
											<p>Need more data for recommendations</p>
											<p class="text-xs">At least 3 transactions required</p>
										</div>
									{/if}
								</div>
							</div>
						</section>
					</Tabs.Content>
				</Tabs.Root>
			</main>
		</div>
	{:else}
		<div class="text-muted-foreground rounded-lg border border-dashed p-8 text-center">
			<Tag class="mx-auto mb-2 h-8 w-8 opacity-50" />
			<p>Category not found</p>
		</div>
	{/if}
</div>

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete Category</AlertDialog.Title>
			<AlertDialog.Description>
				Are you sure you want to delete "{category?.name}"? This action cannot be undone.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				onclick={handleDelete}
				disabled={isDeleting}
				class={buttonVariants({ variant: 'destructive' })}
			>
				{isDeleting ? 'Deleting...' : 'Delete'}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
