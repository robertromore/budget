<!--
  Rule Execution Logs Page

  View execution history for a specific automation rule.
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { RuleLogsTable } from '$lib/components/automation';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { rpc } from '$lib/query';
	import type { AutomationRuleLog } from '$lib/schema/automation-rules';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Check from '@lucide/svelte/icons/check';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import X from '@lucide/svelte/icons/x';
	import { toast } from 'svelte-sonner';

	// Get rule ID from URL
	const ruleId = $derived(parseInt(page.params.id ?? '0', 10));

	// Pagination state
	let limit = $state(50);
	let offset = $state(0);

	// Query for rule data
	const ruleQuery = $derived(rpc.automation.getById(ruleId).options());

	// Query for logs
	const logsQuery = $derived(rpc.automation.getLogs(ruleId, { limit, offset }).options());

	// Query for stats
	const statsQuery = $derived(rpc.automation.getLogStats(ruleId).options());

	// Cleanup mutation
	const cleanupMutation = rpc.automation.cleanupLogs.options();

	function handleBack() {
		goto(`/automation/${ruleId}`);
	}

	function handleEdit() {
		goto(`/automation/${ruleId}`);
	}

	function handleLoadMore() {
		offset += limit;
	}

	async function handleCleanup() {
		try {
			const result = await cleanupMutation.mutateAsync({ daysToKeep: 30 });
			toast.success(`Deleted ${result.deletedCount} old logs`);
		} catch (error) {
			toast.error('Failed to clean up logs');
		}
	}

	// Check if there are more logs
	const hasMore = $derived((logsQuery.data?.length ?? 0) >= limit);
</script>

<svelte:head>
	<title>{ruleQuery.data?.name ?? 'Rule'} Logs - Automation</title>
</svelte:head>

<div class="container mx-auto py-6">
	{#if ruleQuery.isLoading}
		<!-- Loading State -->
		<div class="space-y-6">
			<div class="flex items-center gap-4">
				<Skeleton class="h-10 w-10" />
				<div class="space-y-2">
					<Skeleton class="h-6 w-48" />
					<Skeleton class="h-4 w-32" />
				</div>
			</div>
			<Skeleton class="h-32" />
			<Skeleton class="h-[400px]" />
		</div>
	{:else if ruleQuery.error}
		<!-- Error State -->
		<Card.Root>
			<Card.Content class="py-12 text-center">
				<p class="text-destructive">Failed to load rule</p>
				<Button variant="outline" onclick={() => goto('/automation')} class="mt-4">
					<ArrowLeft class="mr-2 h-4 w-4" />
					Back to Rules
				</Button>
			</Card.Content>
		</Card.Root>
	{:else if ruleQuery.data}
		<!-- Header -->
		<div class="mb-6 flex items-center justify-between">
			<div class="flex items-center gap-4">
				<Button variant="ghost" size="icon" onclick={handleBack}>
					<ArrowLeft class="h-5 w-5" />
				</Button>
				<div>
					<div class="flex items-center gap-2">
						<h1 class="text-2xl font-bold">{ruleQuery.data.name}</h1>
						<Badge variant="outline">Logs</Badge>
					</div>
					<p class="text-sm text-muted-foreground">
						Execution history for this rule
					</p>
				</div>
			</div>
			<div class="flex items-center gap-2">
				<Button variant="outline" onclick={handleCleanup} disabled={cleanupMutation.isPending}>
					<Trash2 class="mr-2 h-4 w-4" />
					Clean Up Old Logs
				</Button>
				<Button onclick={handleEdit}>
					<Pencil class="mr-2 h-4 w-4" />
					Edit Rule
				</Button>
			</div>
		</div>

		<!-- Stats Cards -->
		{#if statsQuery.data}
			{@const total = statsQuery.data.success + statsQuery.data.failed + statsQuery.data.skipped}
			<div class="mb-6 grid gap-4 md:grid-cols-4">
				<Card.Root>
					<Card.Content class="pt-6">
						<div class="text-2xl font-bold">{total}</div>
						<p class="text-xs text-muted-foreground">Total Executions</p>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Content class="flex items-center gap-3 pt-6">
						<div class="rounded-full bg-green-100 p-2 dark:bg-green-900/30">
							<Check class="h-4 w-4 text-green-600 dark:text-green-400" />
						</div>
						<div>
							<div class="text-2xl font-bold">{statsQuery.data.success}</div>
							<p class="text-xs text-muted-foreground">Successful</p>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Content class="flex items-center gap-3 pt-6">
						<div class="rounded-full bg-red-100 p-2 dark:bg-red-900/30">
							<X class="h-4 w-4 text-red-600 dark:text-red-400" />
						</div>
						<div>
							<div class="text-2xl font-bold">{statsQuery.data.failed}</div>
							<p class="text-xs text-muted-foreground">Failed</p>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Content class="flex items-center gap-3 pt-6">
						<div class="rounded-full bg-yellow-100 p-2 dark:bg-yellow-900/30">
							<AlertTriangle class="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
						</div>
						<div>
							<div class="text-2xl font-bold">{statsQuery.data.skipped}</div>
							<p class="text-xs text-muted-foreground">Skipped</p>
						</div>
					</Card.Content>
				</Card.Root>
			</div>
		{/if}

		<!-- Logs Table -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Execution History</Card.Title>
				<Card.Description>
					All executions of this rule, sorted by most recent first
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<RuleLogsTable
					logs={(logsQuery.data ?? []) as AutomationRuleLog[]}
					isLoading={logsQuery.isLoading}
					onLoadMore={handleLoadMore}
					{hasMore}
				/>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
