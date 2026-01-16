<!--
  New Automation Rule Page

  Create a new automation rule using the visual flow builder.
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { RuleBuilder } from '$lib/components/automation/rule-builder';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Switch } from '$lib/components/ui/switch';
	import { Textarea } from '$lib/components/ui/textarea';
	import { rpc } from '$lib/query';
	import type { EntityType, FlowState } from '$lib/types/automation';
	import { entityTypes } from '$lib/types/automation';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Save from '@lucide/svelte/icons/save';
	import { toast } from '$lib/utils/toast-interceptor';

	// Form state
	let name = $state('');
	let description = $state('');
	let isEnabled = $state(true);
	let priority = $state(0);
	let stopOnMatch = $state(true);
	let runOnce = $state(false);
	let entityType = $state<EntityType>('transaction');

	// Flow state (managed by RuleBuilder)
	let flowState = $state<FlowState | null>(null);

	// Rule builder reference (using $state for bind:this)
	let ruleBuilder = $state<RuleBuilder | null>(null);

	// Mutation
	const createMutation = rpc.automation.createRule.options();

	const isSaving = $derived(createMutation.isPending);

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
			const newRule = await createMutation.mutateAsync({
				name: name.trim(),
				description: description.trim() || undefined,
				isEnabled,
				priority,
				stopOnMatch,
				runOnce,
				trigger: result.ruleConfig.trigger,
				conditions: result.ruleConfig.conditions,
				actions: result.ruleConfig.actions,
				flowState: result.flowState,
			});

			toast.success('Rule created successfully');
			goto(`/automation/${newRule.id}`);
		} catch (error) {
			console.error('Failed to create rule:', error);
			toast.error('Failed to create rule');
		}
	}

	function handleFlowChange(newFlowState: FlowState) {
		flowState = newFlowState;
	}

	function handleCancel() {
		goto('/automation');
	}
</script>

<svelte:head>
	<title>New Automation Rule</title>
</svelte:head>

<div class="container mx-auto py-6">
	<!-- Header -->
	<div class="mb-6 flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="ghost" size="icon" onclick={handleCancel}>
				<ArrowLeft class="h-5 w-5" />
			</Button>
			<div>
				<h1 class="text-2xl font-bold">New Automation Rule</h1>
				<p class="text-sm text-muted-foreground">
					Create a rule to automate actions based on events
				</p>
			</div>
		</div>
		<div class="flex items-center gap-2">
			<Button variant="outline" onclick={handleCancel}>
				Cancel
			</Button>
			<Button onclick={handleSave} disabled={isSaving}>
				<Save class="mr-2 h-4 w-4" />
				{isSaving ? 'Saving...' : 'Save Rule'}
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
							Rule will start running immediately when saved
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
							Only trigger once per entity (disable after first match)
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
			<RuleBuilder
				bind:this={ruleBuilder}
				{entityType}
				onChange={handleFlowChange}
			/>
		</Card.Content>
	</Card.Root>
</div>
