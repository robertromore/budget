<!--
  Edit Automation Rule Page

  View and edit an existing automation rule.
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { RuleBuilder } from '$lib/components/automation/rule-builder';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Switch } from '$lib/components/ui/switch';
	import { Textarea } from '$lib/components/ui/textarea';
	import { rpc } from '$lib/query';
	import type { EntityType, FlowState } from '$lib/types/automation';
	import type { RuleConfig } from '$lib/components/automation/rule-builder/utils';
	import { entityTypes } from '$lib/types/automation';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import History from '@lucide/svelte/icons/history';
	import Save from '@lucide/svelte/icons/save';
	import { toast } from '$lib/utils/toast-interceptor';

	// Get rule ID from URL
	const ruleId = $derived(parseInt(page.params.id ?? '0', 10));

	// Query for rule data
	const ruleQuery = $derived(rpc.automation.getById(ruleId).options());

	// Form state (synced from query)
	let name = $state('');
	let description = $state('');
	let isEnabled = $state(true);
	let priority = $state(0);
	let stopOnMatch = $state(true);
	let runOnce = $state(false);
	let entityType = $state<EntityType>('transaction');

	// Initial rule config for the builder (derived from query data)
	const initialRuleConfig = $derived.by((): RuleConfig | null => {
		if (ruleQuery.data) {
			return {
				trigger: ruleQuery.data.trigger,
				conditions: ruleQuery.data.conditions,
				actions: ruleQuery.data.actions,
			} as RuleConfig;
		}
		return null;
	});

	// Initial flow state for the builder (derived to stay in sync with query data)
	const initialFlowState = $derived.by((): FlowState | null => {
		if (ruleQuery.data?.flowState) {
			return ruleQuery.data.flowState as FlowState;
		}
		return null;
	});

	// Sync form state when data loads
	$effect(() => {
		if (ruleQuery.data) {
			const rule = ruleQuery.data;
			name = rule.name;
			description = rule.description || '';
			isEnabled = rule.isEnabled;
			priority = rule.priority;
			stopOnMatch = rule.stopOnMatch ?? true;
			runOnce = rule.runOnce ?? false;
			entityType = rule.trigger.entityType as EntityType;
		}
	});

	// Rule builder reference (using $state for bind:this)
	let ruleBuilder = $state<RuleBuilder | null>(null);

	// Mutation
	const updateMutation = rpc.automation.updateRule.options();

	const isSaving = $derived(updateMutation.isPending);

	async function handleSave() {
		// Validate form
		if (!name.trim()) {
			toast.error('Please enter a rule name');
			return;
		}

		// Get flow data and validate
		const result = ruleBuilder?.save();
		if (!result?.success || !result.ruleConfig || !result.flowState) {
			toast.error('Please fix the validation errors before saving');
			return;
		}

		try {
			await updateMutation.mutateAsync({
				id: ruleId,
				name: name.trim(),
				description: description.trim() || null,
				isEnabled,
				priority,
				stopOnMatch,
				runOnce,
				trigger: result.ruleConfig.trigger,
				conditions: result.ruleConfig.conditions,
				actions: result.ruleConfig.actions,
				flowState: result.flowState,
			});

			toast.success('Rule updated successfully');
		} catch (error) {
			console.error('Failed to update rule:', error);
			toast.error('Failed to update rule');
		}
	}

	function handleBack() {
		goto('/automation');
	}

	function handleViewLogs() {
		goto(`/automation/${ruleId}/logs`);
	}
</script>

<svelte:head>
	<title>{ruleQuery.data?.name ?? 'Edit Rule'} - Automation</title>
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
			<Skeleton class="h-48" />
			<Skeleton class="h-[400px]" />
		</div>
	{:else if ruleQuery.error}
		<!-- Error State -->
		<Card.Root>
			<Card.Content class="py-12 text-center">
				<p class="text-destructive">Failed to load rule</p>
				<Button variant="outline" onclick={handleBack} class="mt-4">
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
						<Badge variant={ruleQuery.data.isEnabled ? 'default' : 'secondary'}>
							{ruleQuery.data.isEnabled ? 'Active' : 'Paused'}
						</Badge>
					</div>
					<p class="text-sm text-muted-foreground">
						Triggered {ruleQuery.data.triggerCount} times
						{#if ruleQuery.data.lastTriggeredAt}
							· Last: {new Date(ruleQuery.data.lastTriggeredAt).toLocaleDateString()}
						{/if}
					</p>
				</div>
			</div>
			<div class="flex items-center gap-2">
				<Button variant="outline" onclick={handleViewLogs}>
					<History class="mr-2 h-4 w-4" />
					View Logs
				</Button>
				<Button onclick={handleSave} disabled={isSaving}>
					<Save class="mr-2 h-4 w-4" />
					{isSaving ? 'Saving...' : 'Save Changes'}
				</Button>
			</div>
		</div>

		<!-- Rule Settings -->
		<Card.Root class="mb-6">
			<Card.Header>
				<Card.Title>Rule Settings</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="grid gap-6 md:grid-cols-2">
					<div class="space-y-2">
						<Label for="name">Name</Label>
						<Input
							id="name"
							bind:value={name}
							placeholder="e.g., Auto-categorize Amazon purchases"
						/>
					</div>

					<div class="space-y-2">
						<Label for="entity-type">Entity Type</Label>
						<Select.Root type="single" bind:value={entityType}>
							<Select.Trigger id="entity-type">
								{entityTypes.find((t) => t.value === entityType)?.label || 'Select...'}
							</Select.Trigger>
							<Select.Content>
								{#each entityTypes as type (type.value)}
									<Select.Item value={type.value}>{type.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>

					<div class="space-y-2 md:col-span-2">
						<Label for="description">Description (optional)</Label>
						<Textarea
							id="description"
							bind:value={description}
							placeholder="Describe what this rule does..."
							rows={2}
						/>
					</div>

					<div class="flex items-center justify-between rounded-lg border p-4">
						<div>
							<Label>Enabled</Label>
							<p class="text-sm text-muted-foreground">
								Rule will run when triggered
							</p>
						</div>
						<Switch bind:checked={isEnabled} />
					</div>

					<div class="flex items-center justify-between rounded-lg border p-4">
						<div>
							<Label>Stop on Match</Label>
							<p class="text-sm text-muted-foreground">
								Don't run lower priority rules after this one matches
							</p>
						</div>
						<Switch bind:checked={stopOnMatch} />
					</div>

					<div class="space-y-2">
						<Label for="priority">Priority</Label>
						<Input
							id="priority"
							type="number"
							bind:value={priority}
							min={-1000}
							max={1000}
						/>
						<p class="text-xs text-muted-foreground">
							Higher priority rules run first (-1000 to 1000)
						</p>
					</div>

					<div class="flex items-center justify-between rounded-lg border p-4">
						<div>
							<Label>Run Once</Label>
							<p class="text-sm text-muted-foreground">
								Only trigger once per entity
							</p>
						</div>
						<Switch bind:checked={runOnce} />
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Rule Builder -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Rule Flow</Card.Title>
				<Card.Description>
					Build your rule by connecting triggers, conditions, and actions
				</Card.Description>
			</Card.Header>
			<Card.Content>
				{#key ruleQuery.data?.id}
				<RuleBuilder
					bind:this={ruleBuilder}
					{entityType}
					{initialFlowState}
					{initialRuleConfig}
				/>
			{/key}
			</Card.Content>
		</Card.Root>
	{/if}
</div>
