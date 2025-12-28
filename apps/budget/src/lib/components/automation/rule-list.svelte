<!--
  Rule List

  Displays a list of automation rules with filtering and sorting.
-->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import type { AutomationRule } from '$lib/schema/automation-rules';
	import { entityTypes } from '$lib/types/automation';
	import Plus from '@lucide/svelte/icons/plus';
	import Search from '@lucide/svelte/icons/search';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import Zap from '@lucide/svelte/icons/zap';
	import RuleCard from './rule-card.svelte';

	interface Props {
		rules: AutomationRule[];
		isLoading?: boolean;
		onCreateNew?: () => void;
		onToggleEnabled?: (id: number, enabled: boolean) => void;
		onEdit?: (id: number) => void;
		onDuplicate?: (id: number) => void;
		onDelete?: (id: number) => void;
		onViewLogs?: (id: number) => void;
	}

	let {
		rules,
		isLoading = false,
		onCreateNew,
		onToggleEnabled,
		onEdit,
		onDuplicate,
		onDelete,
		onViewLogs,
	}: Props = $props();

	// Filter state
	let searchQuery = $state('');
	let entityTypeFilter = $state<string>('all');
	let statusFilter = $state<'all' | 'enabled' | 'disabled'>('all');

	// Filtered rules
	const filteredRules = $derived(() => {
		let result = rules;

		// Search filter
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			result = result.filter(
				(r) =>
					r.name.toLowerCase().includes(query) ||
					r.description?.toLowerCase().includes(query)
			);
		}

		// Entity type filter
		if (entityTypeFilter !== 'all') {
			result = result.filter((r) => r.trigger.entityType === entityTypeFilter);
		}

		// Status filter
		if (statusFilter !== 'all') {
			result = result.filter((r) =>
				statusFilter === 'enabled' ? r.isEnabled : !r.isEnabled
			);
		}

		// Sort by priority (descending), then by name
		return result.sort((a, b) => {
			if (b.priority !== a.priority) return b.priority - a.priority;
			return a.name.localeCompare(b.name);
		});
	});

	// Stats
	const stats = $derived(() => ({
		total: rules.length,
		enabled: rules.filter((r) => r.isEnabled).length,
		disabled: rules.filter((r) => !r.isEnabled).length,
	}));
</script>

<div class="space-y-4">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h2 class="text-lg font-semibold">Automation Rules</h2>
			<p class="text-sm text-muted-foreground">
				{stats().enabled} active, {stats().disabled} paused
			</p>
		</div>
		<Button onclick={onCreateNew}>
			<Plus class="mr-2 h-4 w-4" />
			New Rule
		</Button>
	</div>

	<!-- Filters -->
	<div class="flex flex-wrap items-center gap-3">
		<div class="relative flex-1 min-w-[200px]">
			<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				type="search"
				placeholder="Search rules..."
				class="pl-9"
				bind:value={searchQuery}
			/>
		</div>

		<Select.Root type="single" bind:value={entityTypeFilter}>
			<Select.Trigger class="w-[160px]">
				<SlidersHorizontal class="mr-2 h-4 w-4" />
				{entityTypeFilter === 'all'
					? 'All entities'
					: entityTypes.find((t) => t.value === entityTypeFilter)?.label}
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="all">All entities</Select.Item>
				{#each entityTypes as type (type.value)}
					<Select.Item value={type.value}>{type.label}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>

		<Select.Root type="single" bind:value={statusFilter}>
			<Select.Trigger class="w-[130px]">
				{statusFilter === 'all' ? 'All status' : statusFilter === 'enabled' ? 'Active' : 'Paused'}
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="all">All status</Select.Item>
				<Select.Item value="enabled">Active</Select.Item>
				<Select.Item value="disabled">Paused</Select.Item>
			</Select.Content>
		</Select.Root>
	</div>

	<!-- Rules List -->
	{#if isLoading}
		<div class="grid gap-4 md:grid-cols-2">
			{#each { length: 3 } as _, i (i)}
				<div class="h-40 animate-pulse rounded-lg bg-muted" />
			{/each}
		</div>
	{:else if filteredRules().length === 0}
		<div class="rounded-lg border border-dashed py-12 text-center">
			<Zap class="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
			{#if rules.length === 0}
				<h3 class="text-lg font-medium">No automation rules yet</h3>
				<p class="mt-1 text-sm text-muted-foreground">
					Create your first rule to automate actions based on events.
				</p>
				<Button onclick={onCreateNew} class="mt-4">
					<Plus class="mr-2 h-4 w-4" />
					Create Rule
				</Button>
			{:else}
				<h3 class="text-lg font-medium">No matching rules</h3>
				<p class="mt-1 text-sm text-muted-foreground">
					Try adjusting your search or filters.
				</p>
			{/if}
		</div>
	{:else}
		<div class="grid gap-4 md:grid-cols-2">
			{#each filteredRules() as rule (rule.id)}
				<RuleCard
					{rule}
					{onToggleEnabled}
					{onEdit}
					{onDuplicate}
					{onDelete}
					{onViewLogs}
				/>
			{/each}
		</div>
	{/if}
</div>
