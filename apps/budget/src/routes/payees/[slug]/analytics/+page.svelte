<script lang="ts">
	import { page } from '$app/state';
	import { AxisX, AxisY, HorizontalLine, Scatter, Tooltip } from '$lib/components/layercake';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Progress } from '$lib/components/ui/progress';
	import * as Select from '$lib/components/ui/select';
	import { Separator } from '$lib/components/ui/separator';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { rpc } from '$lib/query';
	import { PayeesState } from '$lib/states/entities/payees.svelte';
	import { formatCurrency } from '$lib/utils/formatters';
	import { formatDateDisplay, parseISOString, dateValueToJSDate, toISOString, currentDate } from '$lib/utils/dates';
	import { LayerCake, Svg } from 'layercake';

	import Activity from '@lucide/svelte/icons/activity';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import Brain from '@lucide/svelte/icons/brain';
	import Building2 from '@lucide/svelte/icons/building-2';
	import Calendar from '@lucide/svelte/icons/calendar';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import DollarSign from '@lucide/svelte/icons/dollar-sign';
	import Hash from '@lucide/svelte/icons/hash';
	import Lightbulb from '@lucide/svelte/icons/lightbulb';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Tag from '@lucide/svelte/icons/tag';
	import Target from '@lucide/svelte/icons/target';
	import TrendingDown from '@lucide/svelte/icons/trending-down';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import User from '@lucide/svelte/icons/user';
	import Zap from '@lucide/svelte/icons/zap';

	// Month labels for seasonal trends chart
	const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

	// Get payee from state using slug
	const payeeSlug = $derived(page.params['slug'] || '');
	const payeesState = PayeesState.get();
	const payee = $derived(payeeSlug ? payeesState.getBySlug(payeeSlug) : null);

	// Timeframe state
	let selectedTimeframe = $state('12');
	const timeframeOptions = [
		{ value: '3', label: '3 months' },
		{ value: '6', label: '6 months' },
		{ value: '12', label: '12 months' },
		{ value: '24', label: '24 months' }
	];

	// Calculate date range based on selected timeframe
	const dateRange = $derived.by(() => {
		const months = parseInt(selectedTimeframe, 10);
		const dateFrom = currentDate.subtract({ months });
		return {
			dateFrom: toISOString(dateFrom),
			dateTo: toISOString(currentDate)
		};
	});

	// Queries - .options() already returns createQuery result
	const statsQuery = $derived(payee?.id ? rpc.payees.getPayeeStats(payee.id).options() : null);

	const intelligenceQuery = $derived(
		payee?.id ? rpc.payees.getPayeeIntelligence(payee.id).options() : null
	);

	const suggestionsQuery = $derived(
		payee?.id ? rpc.payees.getPayeeSuggestions(payee.id).options() : null
	);

	const transactionsQuery = $derived(
		payee?.id
			? rpc.transactions.getRelatedTransactions({
					payeeIds: [payee.id],
					dateFrom: dateRange.dateFrom,
					dateTo: dateRange.dateTo,
					limit: 100
				}).options()
			: null
	);

	// Page metadata
	const pageTitle = $derived(payee ? `${payee.name} - Analytics` : 'Payee Analytics');

	// Helper to format payee type
	const formatPayeeType = (type: string | null | undefined) => {
		if (!type) return null;
		return type
			.split('_')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	};
</script>

<svelte:head>
	<title>{pageTitle} - Budget App</title>
	<meta name="description" content="Detailed analytics and insights for this payee" />
</svelte:head>

<div class="container mx-auto py-6">
	<!-- Back Navigation -->
	<div class="mb-6">
		<Button variant="ghost" size="sm" href="/payees/{payeeSlug}" class="gap-2">
			<ArrowLeft class="h-4 w-4" />
			Back to {payee?.name || 'Payee'}
		</Button>
	</div>

	{#if payee}
		<div class="flex gap-8">
			<!-- Left Sidebar -->
			<aside class="w-72 shrink-0">
				<div class="sticky top-6 space-y-6">
					<!-- Identity Card -->
					<div
						class="rounded-xl border bg-linear-to-b from-slate-50 to-white p-6 dark:from-slate-900 dark:to-slate-950">
						<div class="mb-4 flex justify-center">
							<div
								class="bg-primary/10 text-primary flex h-20 w-20 items-center justify-center rounded-full">
								{#if payee.payeeType === 'business' || payee.payeeType === 'vendor'}
									<Building2 class="h-10 w-10" />
								{:else}
									<User class="h-10 w-10" />
								{/if}
							</div>
						</div>
						<h1 class="text-center text-xl font-bold">{payee.name}</h1>
						<p class="text-muted-foreground mt-1 text-center text-sm">Analytics Dashboard</p>
						<div class="mt-3 flex flex-wrap justify-center gap-1.5">
							<Badge variant={payee.isActive ? 'default' : 'secondary'} class="text-xs">
								{payee.isActive ? 'Active' : 'Inactive'}
							</Badge>
							{#if payee.payeeType}
								<Badge variant="outline" class="text-xs">{formatPayeeType(payee.payeeType)}</Badge>
							{/if}
						</div>
					</div>

					<!-- Timeframe Selector -->
					<div class="rounded-lg border p-4">
						<h3 class="text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wide">
							Time Period
						</h3>
						<Select.Root type="single" bind:value={selectedTimeframe}>
							<Select.Trigger class="w-full">
								<span>Last {timeframeOptions.find((o) => o.value === selectedTimeframe)?.label}</span
								>
							</Select.Trigger>
							<Select.Content>
								{#each timeframeOptions as option}
									<Select.Item value={option.value}>Last {option.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>

					<!-- Quick Navigation -->
					<div class="space-y-2">
						<Button variant="outline" href="/payees/{payee.slug}" class="w-full justify-start">
							<User class="mr-2 h-4 w-4" />
							View Details
						</Button>
						<Button
							variant="outline"
							href="/payees/{payee.slug}/intelligence"
							class="w-full justify-start">
							<Brain class="mr-2 h-4 w-4" />
							Intelligence
						</Button>
						<Button variant="outline" href="/payees/{payee.slug}/edit" class="w-full justify-start">
							<Target class="mr-2 h-4 w-4" />
							Edit Payee
						</Button>
					</div>
				</div>
			</aside>

			<!-- Main Content -->
			<main class="min-w-0 flex-1 space-y-8">
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
									<Skeleton class="h-8 w-24" />
								</div>
							{/each}
						</div>
					{:else if statsQuery.data}
						{@const stats = statsQuery.data}
						{@const isIncome = stats.totalAmount > 0}
						<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
							<div class="rounded-lg border p-4">
								<div class="text-muted-foreground mb-1 flex items-center gap-2 text-xs font-medium">
									<Hash class="h-3.5 w-3.5" />
									Transactions
								</div>
								<p class="text-2xl font-bold">{stats.transactionCount}</p>
								<p class="text-muted-foreground mt-1 text-xs">
									{stats.firstTransactionDate
										? `Since ${formatDateDisplay(parseISOString(stats.firstTransactionDate)!)}`
										: 'All time'}
								</p>
							</div>

							<div class="rounded-lg border p-4">
								<div class="text-muted-foreground mb-1 flex items-center gap-2 text-xs font-medium">
									<DollarSign class="h-3.5 w-3.5" />
									{isIncome ? 'Total Income' : 'Total Spent'}
								</div>
								<p class="text-2xl font-bold {isIncome ? 'text-green-600 dark:text-green-400' : ''}">
									{formatCurrency(Math.abs(stats.totalAmount))}
								</p>
								<p class="text-muted-foreground mt-1 text-xs">
									{formatCurrency(Math.abs(stats.avgAmount))} average
								</p>
							</div>

							<div class="rounded-lg border p-4">
								<div class="text-muted-foreground mb-1 flex items-center gap-2 text-xs font-medium">
									{#if isIncome}
										<TrendingUp class="h-3.5 w-3.5" />
									{:else}
										<TrendingDown class="h-3.5 w-3.5" />
									{/if}
									Monthly Average
								</div>
								<p class="text-2xl font-bold {isIncome ? 'text-green-600 dark:text-green-400' : ''}">
									{formatCurrency(Math.abs(stats.monthlyAverage))}
								</p>
								<p class="text-muted-foreground mt-1 text-xs">
									Per month {isIncome ? 'income' : 'spending'}
								</p>
							</div>

							<div class="rounded-lg border p-4">
								<div class="text-muted-foreground mb-1 flex items-center gap-2 text-xs font-medium">
									<Activity class="h-3.5 w-3.5" />
									Amount Range
								</div>
								<p class="text-lg font-bold">
									{formatCurrency(Math.abs(stats.minAmount))} - {formatCurrency(
										Math.abs(stats.maxAmount)
									)}
								</p>
								<p class="text-muted-foreground mt-1 text-xs">Min to max transaction</p>
							</div>
						</div>

						<!-- Category Breakdown -->
						{#if stats.categoryDistribution && stats.categoryDistribution.length > 0}
							<div class="mt-6 rounded-lg border p-6">
								<h3 class="mb-4 font-semibold">Category Distribution</h3>
								<div class="space-y-4">
									{#each stats.categoryDistribution as cat}
										{@const percentage =
											(Math.abs(cat.totalAmount) / Math.abs(stats.totalAmount)) * 100}
										<div>
											<div class="mb-2 flex items-center justify-between text-sm">
												<div class="flex items-center gap-2">
													<Tag class="text-muted-foreground h-4 w-4" />
													<span class="font-medium">{cat.categoryName}</span>
													<span class="text-muted-foreground">({cat.count} transactions)</span>
												</div>
												<div class="flex items-center gap-3">
													<span class="text-muted-foreground">{percentage.toFixed(1)}%</span>
													<span class="font-semibold"
														>{formatCurrency(Math.abs(cat.totalAmount))}</span>
												</div>
											</div>
											<Progress value={percentage} class="h-2" />
										</div>
									{/each}
								</div>
							</div>
						{/if}
					{:else}
						<div class="text-muted-foreground rounded-lg border border-dashed p-8 text-center">
							<BarChart3 class="mx-auto mb-2 h-8 w-8 opacity-50" />
							<p>No analytics data available</p>
						</div>
					{/if}
				</section>

				<Separator />

				<!-- AI Insights -->
				<section>
					<div class="mb-4 flex items-center justify-between">
						<h2 class="flex items-center gap-2 text-lg font-semibold">
							<Sparkles class="h-5 w-5 text-amber-500" />
							AI Insights
						</h2>
					</div>

					{#if !intelligenceQuery || intelligenceQuery.isPending}
						<div class="space-y-3">
							{#each Array(3) as _}
								<div class="rounded-lg border p-4">
									<Skeleton class="mb-2 h-4 w-32" />
									<Skeleton class="h-3 w-48" />
								</div>
							{/each}
						</div>
					{:else if intelligenceQuery.data}
						{@const intel = intelligenceQuery.data}
						<div class="grid gap-4 md:grid-cols-2">
							<!-- Pattern Analysis -->
							{#if intel.patterns}
								<div class="rounded-lg border p-5">
									<div class="mb-3 flex items-center gap-2">
										<Activity class="h-5 w-5 text-blue-500" />
										<h3 class="font-semibold">Pattern Analysis</h3>
									</div>
									<div class="space-y-3">
										<div class="flex items-center justify-between">
											<span class="text-muted-foreground text-sm">Regular Pattern</span>
											<Badge variant={intel.patterns.isRegular ? 'default' : 'secondary'}>
												{intel.patterns.isRegular ? 'Yes' : 'No'}
											</Badge>
										</div>
										{#if intel.patterns.averageDaysBetween}
											<div class="flex items-center justify-between">
												<span class="text-muted-foreground text-sm">Avg Days Between</span>
												<span class="font-medium"
													>{Math.round(intel.patterns.averageDaysBetween)} days</span>
											</div>
										{/if}
										{#if intel.patterns.mostCommonDay !== null}
											<div class="flex items-center justify-between">
												<span class="text-muted-foreground text-sm">Most Common Day</span>
												<span class="font-medium">
													{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][intel.patterns.mostCommonDay]}
												</span>
											</div>
										{/if}
									</div>
								</div>
							{/if}

							<!-- Suggestions -->
							{#if suggestionsQuery?.data}
								{@const suggestions = suggestionsQuery.data}
								<div class="rounded-lg border p-5">
									<div class="mb-3 flex items-center gap-2">
										<Lightbulb class="h-5 w-5 text-amber-500" />
										<h3 class="font-semibold">Suggestions</h3>
									</div>
									<div class="space-y-3">
										{#if suggestions.suggestedCategoryName}
											<div class="flex items-center justify-between">
												<span class="text-muted-foreground text-sm">Suggested Category</span>
												<Badge variant="outline">{suggestions.suggestedCategoryName}</Badge>
											</div>
										{/if}
										{#if suggestions.suggestedFrequency}
											<div class="flex items-center justify-between">
												<span class="text-muted-foreground text-sm">Predicted Frequency</span>
												<span class="font-medium capitalize"
													>{suggestions.suggestedFrequency.replace('_', ' ')}</span>
											</div>
										{/if}
										{#if suggestions.suggestedAmount}
											<div class="flex items-center justify-between">
												<span class="text-muted-foreground text-sm">Expected Amount</span>
												<span class="font-medium"
													>{formatCurrency(Math.abs(suggestions.suggestedAmount))}</span>
											</div>
										{/if}
										{#if suggestions.confidence}
											<div class="flex items-center justify-between">
												<span class="text-muted-foreground text-sm">Confidence</span>
												<div class="flex items-center gap-2">
													<Progress value={suggestions.confidence * 100} class="w-16 h-2" />
													<span class="text-sm font-medium"
														>{Math.round(suggestions.confidence * 100)}%</span>
												</div>
											</div>
										{/if}
									</div>
								</div>
							{/if}
						</div>

						<!-- Spending Timeline -->
						{#if transactionsQuery?.data?.data && transactionsQuery.data.data.length > 0 && statsQuery?.data}
							{@const txnData = transactionsQuery.data.data.map((t) => {
								// Use parseISOString to avoid timezone issues
								const dateValue = parseISOString(t.date);
								const date = dateValue ? dateValueToJSDate(dateValue) : new Date();
								return {
									...t,
									dateValue,
									dateObj: date,
									timestamp: date.getTime(),
									displayAmount: Math.abs(t.amount),
									isIncome: t.amount > 0
								};
							}).sort((a, b) => a.timestamp - b.timestamp)}
							{@const avgAmount = Math.abs(statsQuery.data.avgAmount)}
							{@const maxAmount = Math.max(...txnData.map((t) => t.displayAmount))}
							{@const minDate = txnData[0]?.timestamp || Date.now()}
							{@const maxDate = txnData[txnData.length - 1]?.timestamp || Date.now()}
							{@const dateRange = maxDate - minDate}
							{@const isRegular = intel.patterns?.isRegular}
							{@const avgDays = intel.patterns?.averageDaysBetween}
							<div class="mt-4 rounded-lg border p-5">
								<div class="mb-4 flex items-center justify-between">
									<div class="flex items-center gap-2">
										<Activity class="h-5 w-5 text-blue-500" />
										<h3 class="font-semibold">Spending Timeline</h3>
									</div>
									{#if isRegular && avgDays}
										<Badge variant="outline" class="text-xs">
											~{Math.round(avgDays)} days between payments
										</Badge>
									{/if}
								</div>
								<div class="h-56">
									<LayerCake
										data={txnData}
										x="timestamp"
										y="displayAmount"
										xDomain={[minDate - dateRange * 0.05, maxDate + dateRange * 0.05]}
										yDomain={[0, Math.max(maxAmount, avgAmount) * 1.15]}
										padding={{ top: 15, right: 15, bottom: 35, left: 55 }}
									>
										<Svg>
											<AxisY ticks={4} gridlines={true} format={(d) => formatCurrency(d)} />
											<AxisX
												ticks={5}
												format={(d) => {
													const date = new Date(d);
													return `${MONTH_LABELS[date.getMonth()]} '${String(date.getFullYear()).slice(-2)}`;
												}}
											/>
											<!-- Average amount reference line -->
											<HorizontalLine
												value={avgAmount}
												stroke="var(--chart-2)"
												strokeWidth={1.5}
												strokeDasharray="6 3"
												label="Avg"
											/>
											<!-- Transaction scatter points -->
											<Scatter
												fill={(d) => d.isIncome ? 'var(--chart-3)' : 'var(--chart-1)'}
												stroke="var(--background)"
												strokeWidth={2}
												radius={6}
												hoverRadius={8}
											/>
											<Tooltip>
												{#snippet children({ point, x, y })}
													<foreignObject
														x={Math.min(x + 12, 180)}
														y={Math.max(y - 80, 0)}
														width="160"
														height="100"
														style="overflow: visible; pointer-events: none;"
													>
														<div class="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
															<p class="font-medium">{point.dateValue ? formatDateDisplay(point.dateValue) : ''}</p>
															<p class="font-semibold" style="color: {point.isIncome ? 'var(--chart-3)' : 'var(--chart-1)'};">
																{formatCurrency(point.amount)}
															</p>
															{#if point.category?.name}
																<p class="text-muted-foreground text-xs">{point.category.name}</p>
															{/if}
														</div>
													</foreignObject>
												{/snippet}
											</Tooltip>
										</Svg>
									</LayerCake>
								</div>
								<!-- Legend -->
								<div class="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs">
									<div class="flex items-center gap-1.5">
										<div class="h-3 w-3 rounded-full" style="background-color: var(--chart-1);"></div>
										<span>Expense</span>
									</div>
									<div class="flex items-center gap-1.5">
										<div class="h-3 w-3 rounded-full" style="background-color: var(--chart-3);"></div>
										<span>Income</span>
									</div>
									<div class="flex items-center gap-1.5">
										<div class="h-0.5 w-4" style="background: repeating-linear-gradient(90deg, var(--chart-2) 0px, var(--chart-2) 4px, transparent 4px, transparent 7px);"></div>
										<span>Average ({formatCurrency(avgAmount)})</span>
									</div>
								</div>
							</div>
						{/if}
					{:else}
						<div class="text-muted-foreground rounded-lg border border-dashed p-8 text-center">
							<Brain class="mx-auto mb-2 h-8 w-8 opacity-50" />
							<p>AI insights not available yet</p>
						</div>
					{/if}
				</section>

				<Separator />

				<!-- Transaction History -->
				<section>
					<div class="mb-4 flex items-center justify-between">
						<h2 class="text-lg font-semibold">Transaction History</h2>
						<span class="text-muted-foreground text-sm">
							{transactionsQuery?.data?.data?.length || 0} transactions in last {selectedTimeframe} months
						</span>
					</div>

					{#if !transactionsQuery || transactionsQuery.isPending}
						<div class="space-y-2">
							{#each Array(5) as _}
								<div class="flex items-center justify-between rounded-lg border p-4">
									<div class="space-y-2">
										<Skeleton class="h-4 w-32" />
										<Skeleton class="h-3 w-20" />
									</div>
									<Skeleton class="h-5 w-16" />
								</div>
							{/each}
						</div>
					{:else if transactionsQuery.data?.data && transactionsQuery.data.data.length > 0}
						<div class="divide-y rounded-lg border">
							{#each transactionsQuery.data.data as txn}
								<div class="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
									<div class="flex items-center gap-4">
										<div
											class="flex h-10 w-10 items-center justify-center rounded-full {txn.amount <
											0
												? 'bg-red-100 dark:bg-red-900/30'
												: 'bg-green-100 dark:bg-green-900/30'}">
											{#if txn.amount < 0}
												<TrendingDown class="h-5 w-5 text-red-600 dark:text-red-400" />
											{:else}
												<TrendingUp class="h-5 w-5 text-green-600 dark:text-green-400" />
											{/if}
										</div>
										<div>
											<p class="font-medium">{txn.category?.name || 'Uncategorized'}</p>
											<p class="text-muted-foreground text-sm">
												{formatDateDisplay(parseISOString(txn.date)!)}
											</p>
										</div>
									</div>
									<span
										class="text-lg font-semibold {txn.amount < 0
											? 'text-red-600 dark:text-red-400'
											: 'text-green-600 dark:text-green-400'}">
										{formatCurrency(txn.amount)}
									</span>
								</div>
							{/each}
						</div>
					{:else}
						<div class="text-muted-foreground rounded-lg border border-dashed p-8 text-center">
							<Calendar class="mx-auto mb-2 h-8 w-8 opacity-50" />
							<p>No transactions in the last {selectedTimeframe} months</p>
						</div>
					{/if}
				</section>
			</main>
		</div>
	{:else}
		<!-- Error State -->
		<div class="py-16 text-center">
			<User class="text-muted-foreground mx-auto mb-4 h-16 w-16" />
			<h2 class="mb-2 text-2xl font-semibold">Payee Not Found</h2>
			<p class="text-muted-foreground mb-6">
				The payee you're looking for doesn't exist or may have been deleted.
			</p>
			<Button href="/payees">
				<ArrowLeft class="mr-2 h-4 w-4" />
				Back to Payees
			</Button>
		</div>
	{/if}
</div>
