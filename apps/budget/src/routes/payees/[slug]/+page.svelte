<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { rpc } from '$lib/query';
	import { PayeesState } from '$lib/states/entities/payees.svelte';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import Brain from '@lucide/svelte/icons/brain';
	import Building2 from '@lucide/svelte/icons/building-2';
	import Calendar from '@lucide/svelte/icons/calendar';
	import DollarSign from '@lucide/svelte/icons/dollar-sign';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Hash from '@lucide/svelte/icons/hash';
	import Mail from '@lucide/svelte/icons/mail';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Phone from '@lucide/svelte/icons/phone';
	import Repeat from '@lucide/svelte/icons/repeat';
	import SquarePen from '@lucide/svelte/icons/square-pen';
	import Tag from '@lucide/svelte/icons/tag';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import TrendingDown from '@lucide/svelte/icons/trending-down';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import User from '@lucide/svelte/icons/user';
	import { formatCurrency } from '$lib/utils/formatters';
	import { formatDateDisplay, parseISOString } from '$lib/utils/dates';
	import PayeeAliasesCard from '../(components)/payee-aliases-card.svelte';

	// Get payee slug from URL parameter
	const payeeSlug = $derived(page.params['slug'] || '');

	// Get payee data
	const payeesState = PayeesState.get();
	const payee = $derived(payeeSlug ? payeesState.getBySlug(payeeSlug) : null);

	const pageTitle = $derived(payee ? payee.name : 'Payee Not Found');
	const pageDescription = $derived(
		payee ? 'View and manage payee information' : 'The requested payee could not be found'
	);

	// Fetch payee stats - .options() already returns createQuery result
	const statsQuery = $derived(
		payee?.id ? rpc.payees.getPayeeStats(payee.id).options() : null
	);

	// Fetch recent transactions for this payee
	const recentTransactionsQuery = $derived(
		payee?.id
			? rpc.transactions.getRelatedTransactions({ payeeIds: [payee.id], limit: 5 }).options()
			: null
	);

	// Delete dialog state
	let deleteDialogOpen = $state(false);
	let isDeleting = $state(false);

	const handleDelete = async () => {
		if (isDeleting || !payee) return;

		isDeleting = true;
		try {
			await payeesState.deletePayee(payee.id);
			deleteDialogOpen = false;
			goto('/payees');
		} catch (error) {
			console.error('Failed to delete payee:', error);
			isDeleting = false;
		}
	};

	// Redirect to payees list if no valid slug provided
	$effect(() => {
		if (!payeeSlug) {
			goto('/payees');
		}
	});

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
	<meta name="description" content={pageDescription} />
</svelte:head>

<div class="container mx-auto py-6">
	<!-- Back Navigation -->
	<div class="mb-6">
		<Button variant="ghost" size="sm" href="/payees" class="gap-2">
			<ArrowLeft class="h-4 w-4" />
			Back to Payees
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
						<!-- Avatar -->
						<div class="mb-4 flex justify-center">
							<div
								class="bg-primary/10 text-primary flex h-24 w-24 items-center justify-center rounded-full">
								{#if payee.payeeType === 'business' || payee.payeeType === 'vendor'}
									<Building2 class="h-12 w-12" />
								{:else}
									<User class="h-12 w-12" />
								{/if}
							</div>
						</div>

						<!-- Name -->
						<h1 class="text-center text-xl font-bold">{payee.name}</h1>

						<!-- Badges -->
						<div class="mt-3 flex flex-wrap justify-center gap-1.5">
							<Badge variant={payee.isActive ? 'default' : 'secondary'} class="text-xs">
								{payee.isActive ? 'Active' : 'Inactive'}
							</Badge>
							{#if payee.payeeType}
								<Badge variant="outline" class="text-xs">{formatPayeeType(payee.payeeType)}</Badge>
							{/if}
							{#if payee.taxRelevant}
								<Badge variant="outline" class="border-amber-500 text-xs text-amber-600">
									Tax Relevant
								</Badge>
							{/if}
							{#if payee.isSeasonal}
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
						{#if payee.avgAmount}
							<div class="flex items-center justify-between py-2">
								<div class="text-muted-foreground flex items-center gap-2 text-sm">
									<DollarSign class="h-4 w-4" />
									<span>Avg Amount</span>
								</div>
								<span class="font-semibold">{formatCurrency(payee.avgAmount)}</span>
							</div>
						{/if}
						{#if payee.paymentFrequency}
							<div class="flex items-center justify-between py-2">
								<div class="text-muted-foreground flex items-center gap-2 text-sm">
									<Repeat class="h-4 w-4" />
									<span>Frequency</span>
								</div>
								<span class="font-semibold capitalize">
									{payee.paymentFrequency.replace('_', ' ')}
								</span>
							</div>
						{/if}
						{#if payee.lastTransactionDate}
							<div class="flex items-center justify-between py-2">
								<div class="text-muted-foreground flex items-center gap-2 text-sm">
									<Calendar class="h-4 w-4" />
									<span>Last Txn</span>
								</div>
								<span class="font-semibold">{formatDateDisplay(parseISOString(payee.lastTransactionDate)!)}</span>
							</div>
						{/if}
						{#if !payee.avgAmount && !payee.paymentFrequency && !payee.lastTransactionDate}
							<p class="text-muted-foreground py-2 text-center text-sm">No transaction data yet</p>
						{/if}
					</div>

					<!-- Actions -->
					<div class="space-y-2">
						<Button
							variant="outline"
							href="/payees/{payee.slug}/analytics"
							class="w-full justify-start">
							<BarChart3 class="mr-2 h-4 w-4" />
							View Analytics
						</Button>
						<Button
							variant="outline"
							href="/payees/{payee.slug}/intelligence"
							class="w-full justify-start">
							<Brain class="mr-2 h-4 w-4" />
							Intelligence
						</Button>
						<Button variant="outline" href="/payees/{payee.slug}/edit" class="w-full justify-start">
							<SquarePen class="mr-2 h-4 w-4" />
							Edit Payee
						</Button>
						<Separator class="my-3" />
						<Button
							variant="ghost"
							class="text-destructive hover:text-destructive hover:bg-destructive/10 w-full justify-start"
							onclick={() => (deleteDialogOpen = true)}>
							<Trash2 class="mr-2 h-4 w-4" />
							Delete Payee
						</Button>
					</div>
				</div>
			</aside>

			<!-- Main Content -->
			<main class="min-w-0 flex-1 space-y-8">
				<!-- Notes Section -->
				{#if payee.notes}
					<section>
						<h2 class="mb-3 text-lg font-semibold">Notes</h2>
						<p class="text-muted-foreground leading-relaxed">{payee.notes}</p>
					</section>
				{/if}

				<!-- Transaction Statistics -->
				<section>
					<div class="mb-4 flex items-center justify-between">
						<h2 class="text-lg font-semibold">Transaction Statistics</h2>
						<Button variant="ghost" size="sm" href="/payees/{payee.slug}/analytics" class="gap-1">
							View Details
							<ArrowUpRight class="h-3 w-3" />
						</Button>
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
									Total Transactions
								</div>
								<p class="text-2xl font-bold">{stats.transactionCount}</p>
							</div>

							<!-- Total Amount -->
							<div class="rounded-lg border p-4">
								<div class="text-muted-foreground mb-1 flex items-center gap-2 text-xs font-medium">
									<DollarSign class="h-3.5 w-3.5" />
									{isIncome ? 'Total Income' : 'Total Spent'}
								</div>
								<p class="text-2xl font-bold {isIncome ? 'text-green-600 dark:text-green-400' : ''}">
									{formatCurrency(Math.abs(stats.totalAmount))}
								</p>
							</div>

							<!-- Min/Max Range -->
							<div class="rounded-lg border p-4">
								<div class="text-muted-foreground mb-1 flex items-center gap-2 text-xs font-medium">
									{#if isIncome}
										<TrendingUp class="h-3.5 w-3.5" />
									{:else}
										<TrendingDown class="h-3.5 w-3.5" />
									{/if}
									Amount Range
								</div>
								<p class="text-lg font-bold">
									{formatCurrency(Math.abs(stats.minAmount))} - {formatCurrency(
										Math.abs(stats.maxAmount)
									)}
								</p>
							</div>

							<!-- Monthly Average -->
							<div class="rounded-lg border p-4">
								<div class="text-muted-foreground mb-1 flex items-center gap-2 text-xs font-medium">
									{#if isIncome}
										<TrendingUp class="h-3.5 w-3.5" />
									{:else}
										<TrendingDown class="h-3.5 w-3.5" />
									{/if}
									Monthly Avg
								</div>
								<p class="text-2xl font-bold {isIncome ? 'text-green-600 dark:text-green-400' : ''}">
									{formatCurrency(Math.abs(stats.monthlyAverage))}
								</p>
							</div>
						</div>

						<!-- Category Distribution -->
						{#if stats.categoryDistribution && stats.categoryDistribution.length > 0}
							<div class="mt-4 rounded-lg border p-4">
								<h3 class="text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wide">
									Category Breakdown
								</h3>
								<div class="space-y-3">
									{#each stats.categoryDistribution.slice(0, 5) as cat}
										{@const percentage = (Math.abs(cat.totalAmount) / Math.abs(stats.totalAmount)) * 100}
										<div>
											<div class="mb-1 flex items-center justify-between text-sm">
												<div class="flex items-center gap-2">
													<Tag class="text-muted-foreground h-3.5 w-3.5" />
													<span>{cat.categoryName}</span>
													<span class="text-muted-foreground">({cat.count})</span>
												</div>
												<span class="font-medium">{formatCurrency(Math.abs(cat.totalAmount))}</span>
											</div>
											<div class="bg-muted h-2 overflow-hidden rounded-full">
												<div
													class="bg-primary h-full rounded-full transition-all"
													style="width: {percentage}%">
												</div>
											</div>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					{:else}
						<div class="text-muted-foreground rounded-lg border border-dashed p-8 text-center">
							<BarChart3 class="mx-auto mb-2 h-8 w-8 opacity-50" />
							<p>No transaction data available</p>
						</div>
					{/if}
				</section>

				<!-- Recent Transactions -->
				<section>
					<div class="mb-4 flex items-center justify-between">
						<h2 class="text-lg font-semibold">Recent Transactions</h2>
						<Button variant="ghost" size="sm" href="/payees/{payee.slug}/analytics" class="gap-1">
							View All
							<ArrowUpRight class="h-3 w-3" />
						</Button>
					</div>

					{#if !recentTransactionsQuery || recentTransactionsQuery.isPending}
						<div class="space-y-2">
							{#each Array(3) as _}
								<div class="flex items-center justify-between rounded-lg border p-4">
									<div class="space-y-2">
										<Skeleton class="h-4 w-32" />
										<Skeleton class="h-3 w-20" />
									</div>
									<Skeleton class="h-5 w-16" />
								</div>
							{/each}
						</div>
					{:else if recentTransactionsQuery.data?.data && recentTransactionsQuery.data.data.length > 0}
						<div class="divide-y rounded-lg border">
							{#each recentTransactionsQuery.data.data as txn}
								<div class="flex items-center justify-between p-4">
									<div>
										<p class="font-medium">
											{txn.category?.name || 'Uncategorized'}
										</p>
										<p class="text-muted-foreground text-sm">
											{formatDateDisplay(parseISOString(txn.date)!)}
										</p>
									</div>
									<span
										class="font-semibold {txn.amount < 0
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
							<p>No transactions yet</p>
						</div>
					{/if}
				</section>

				<!-- Contact Information -->
				{#if payee.email || payee.phone || payee.website || payee.address}
					<section>
						<h2 class="mb-4 text-lg font-semibold">Contact Information</h2>
						<div class="grid gap-4 sm:grid-cols-2">
							{#if payee.email}
								<div class="flex items-start gap-3 rounded-lg border p-4">
									<div class="bg-muted rounded-md p-2">
										<Mail class="text-muted-foreground h-5 w-5" />
									</div>
									<div class="min-w-0 flex-1">
										<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">
											Email
										</p>
										<a
											href="mailto:{payee.email}"
											class="text-primary mt-1 block truncate hover:underline">
											{payee.email}
										</a>
									</div>
								</div>
							{/if}
							{#if payee.phone}
								<div class="flex items-start gap-3 rounded-lg border p-4">
									<div class="bg-muted rounded-md p-2">
										<Phone class="text-muted-foreground h-5 w-5" />
									</div>
									<div class="min-w-0 flex-1">
										<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">
											Phone
										</p>
										<a href="tel:{payee.phone}" class="text-primary mt-1 block hover:underline">
											{payee.phone}
										</a>
									</div>
								</div>
							{/if}
							{#if payee.website}
								<div class="flex items-start gap-3 rounded-lg border p-4">
									<div class="bg-muted rounded-md p-2">
										<ExternalLink class="text-muted-foreground h-5 w-5" />
									</div>
									<div class="min-w-0 flex-1">
										<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">
											Website
										</p>
										<a
											href={payee.website}
											target="_blank"
											rel="noopener noreferrer"
											class="text-primary mt-1 block truncate hover:underline">
											{payee.website}
										</a>
									</div>
								</div>
							{/if}
							{#if payee.address}
								<div class="flex items-start gap-3 rounded-lg border p-4">
									<div class="bg-muted rounded-md p-2">
										<MapPin class="text-muted-foreground h-5 w-5" />
									</div>
									<div class="min-w-0 flex-1">
										<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">
											Address
										</p>
										<p class="mt-1 whitespace-pre-line">{payee.address}</p>
									</div>
								</div>
							{/if}
						</div>
					</section>
				{/if}

				<!-- Import Aliases -->
				<section>
					<h2 class="mb-4 text-lg font-semibold">Import Aliases</h2>
					<PayeeAliasesCard payeeId={payee.id} payeeName={payee.name ?? 'Unknown'} />
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

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete Payee</AlertDialog.Title>
			<AlertDialog.Description>
				Are you sure you want to delete "{payee?.name}"? This action cannot be undone.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				onclick={handleDelete}
				disabled={isDeleting}
				class={buttonVariants({ variant: 'destructive' })}>
				{isDeleting ? 'Deleting...' : 'Delete'}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
