<!--
  Action Node

  Terminal node that executes an action when conditions match.
  Supports action type selection and parameter configuration.
-->
<script lang="ts">
	import BudgetSelector from '$lib/components/budgets/budget-selector.svelte';
	import EnhancedCategorySelector from '$lib/components/categories/enhanced-category-selector/enhanced-category-selector.svelte';
	import EnhancedPayeeSelector from '$lib/components/payees/enhanced-payee-selector/enhanced-payee-selector.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Switch } from '$lib/components/ui/switch';
	import { Textarea } from '$lib/components/ui/textarea';
	import { AccountsState } from '$lib/states/entities/accounts.svelte';
	import { CategoriesState } from '$lib/states/entities/categories.svelte';
	import {
	  actionDefinitions,
	  getActionsForEntity,
	  type ActionConfig,
	  type EntityType
	} from '$lib/types/automation';
	import Play from '@lucide/svelte/icons/play';
	import { Handle, Position } from '@xyflow/svelte';
	import { isHorizontalLayout, layoutDirection } from '../stores';

	// Get entity states for reference selectors
	const accountsState = AccountsState.get();
	const categoriesState = CategoriesState.get();

	// Get parent categories (groups) for category group selection
	const parentCategories = $derived(
		categoriesState?.all.filter((cat) => cat.parentId === null) ?? []
	);

	interface ActionNodeData extends ActionConfig {
		entityType: EntityType;
		onUpdate?: (data: ActionConfig) => void;
	}

	interface Props {
		id: string;
		data: ActionNodeData;
		selected?: boolean;
	}

	let { id, data, selected }: Props = $props();

	// Dynamic handle position based on layout direction
	const targetPosition = $derived(isHorizontalLayout($layoutDirection) ? Position.Left : Position.Top);

	// Local state to ensure reactivity with SvelteFlow
	let localType = $state(data.type);
	let localParams = $state<Record<string, unknown>>(data.params || {});
	let localContinueOnError = $state(data.continueOnError || false);

	// Sync local state with prop changes
	$effect(() => { localType = data.type; });
	$effect(() => { localParams = data.params || {}; });
	$effect(() => { localContinueOnError = data.continueOnError || false; });

	// Get available actions for the entity type
	const availableActions = $derived(getActionsForEntity(data.entityType));

	// Get the selected action definition
	const selectedAction = $derived(actionDefinitions.find((a) => a.type === localType));

	// Display label for Select trigger
	const actionLabel = $derived(selectedAction?.label || 'Select action...');

	function handleActionTypeChange(value: string | undefined) {
		if (!value) return;

		// Reset params when action type changes
		const action = actionDefinitions.find((a) => a.type === value);
		const defaultParams: Record<string, unknown> = {};

		// Initialize params with defaults
		action?.params.forEach((param) => {
			if (param.default !== undefined) {
				defaultParams[param.name] = param.default;
			} else if (param.type === 'boolean') {
				defaultParams[param.name] = false;
			} else if (param.type === 'number') {
				defaultParams[param.name] = 0;
			} else {
				defaultParams[param.name] = '';
			}
		});

		// Update local state immediately
		localType = value;
		localParams = defaultParams;
		data.onUpdate?.({
			id: data.id,
			type: value,
			params: defaultParams,
			continueOnError: localContinueOnError
		});
	}

	function handleParamChange(paramName: string, value: unknown) {
		// Update local state immediately
		localParams = { ...localParams, [paramName]: value };
		data.onUpdate?.({
			id: data.id,
			type: localType,
			params: localParams,
			continueOnError: localContinueOnError
		});
	}

	function handleContinueOnErrorChange(checked: boolean) {
		// Update local state immediately
		localContinueOnError = checked;
		data.onUpdate?.({
			id: data.id,
			type: localType,
			params: localParams,
			continueOnError: checked
		});
	}
</script>

<div
	class="action-node w-72 rounded-lg border-2 bg-background shadow-md transition-all {selected
		? 'border-orange-500 ring-2 ring-orange-200'
		: 'border-orange-400'}"
>
	<!-- Input Handle -->
	<Handle type="target" position={targetPosition} class="!h-3 !w-3 !bg-orange-500 !border-2 !border-white" />

	<!-- Header -->
	<div class="flex items-center justify-between rounded-t-md bg-orange-500 px-3 py-2 text-white">
		<div class="flex items-center gap-2">
			<Play class="h-4 w-4" />
			<span class="font-semibold">Action</span>
		</div>
	</div>

	<!-- Body -->
	<div class="space-y-3 p-3">
		<!-- Action Type Selection -->
		<div class="space-y-1.5">
			<Label class="text-xs text-muted-foreground">Action Type</Label>
			<Select.Root type="single" value={localType} onValueChange={handleActionTypeChange}>
				<Select.Trigger class="h-8 text-sm">
					{actionLabel}
				</Select.Trigger>
				<Select.Content>
					{#each availableActions as action (action.type)}
						<Select.Item value={action.type}>
							<div class="flex flex-col">
								<span>{action.label}</span>
								<span class="text-xs text-muted-foreground">{action.description}</span>
							</div>
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<!-- Action Parameters -->
		{#if selectedAction?.params && selectedAction.params.length > 0}
			<div class="space-y-3 border-t pt-3">
				{#each selectedAction.params as param (param.name)}
					<div class="space-y-1.5">
						<Label class="text-xs text-muted-foreground">
							{param.label}
							{#if param.required}<span class="text-destructive">*</span>{/if}
						</Label>

						{#if param.type === 'boolean'}
							<div class="flex items-center gap-2">
								<Switch
									checked={Boolean(localParams?.[param.name])}
									onCheckedChange={(checked) => handleParamChange(param.name, checked)}
								/>
								<span class="text-sm text-muted-foreground">
									{localParams?.[param.name] ? 'Yes' : 'No'}
								</span>
							</div>
						{:else if param.type === 'enum' && param.enumValues}
							<Select.Root
								type="single"
								value={String(localParams?.[param.name] || '')}
								onValueChange={(v) => handleParamChange(param.name, v)}
							>
								<Select.Trigger class="h-8 text-sm">
									{String(localParams?.[param.name]) || `Select ${param.label.toLowerCase()}...`}
								</Select.Trigger>
								<Select.Content>
									{#each param.enumValues as val (val)}
										<Select.Item value={val}>{val}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						{:else if param.type === 'text'}
							<Textarea
								value={String(localParams?.[param.name] || '')}
								oninput={(e) => handleParamChange(param.name, (e.target as HTMLTextAreaElement).value)}
								placeholder={param.placeholder || `Enter ${param.label.toLowerCase()}...`}
								class="min-h-[60px] text-sm"
							/>
						{:else if param.type === 'number'}
							<Input
								type="number"
								value={String(localParams?.[param.name] || '')}
								oninput={(e) => handleParamChange(param.name, parseFloat((e.target as HTMLInputElement).value) || 0)}
								placeholder={param.placeholder || '0'}
								class="h-8 text-sm"
							/>
						{:else if param.type === 'reference'}
							{#if param.referenceType === 'payee'}
								<EnhancedPayeeSelector
									value={localParams?.[param.name] as number | null}
									onValueChange={(payeeId) => handleParamChange(param.name, payeeId)}
									displayMode="compact"
									allowCreate={false}
									allowEdit={false}
									buttonClass="h-8 w-full"
									placeholder="Select payee..."
								/>
							{:else if param.referenceType === 'category'}
								<EnhancedCategorySelector
									value={localParams?.[param.name] as number | null}
									onValueChange={(categoryId) => handleParamChange(param.name, categoryId)}
									displayMode="compact"
									allowCreate={false}
									allowEdit={false}
									buttonClass="h-8 w-full"
									placeholder="Select category..."
								/>
							{:else if param.referenceType === 'budget'}
								<BudgetSelector
									value={localParams?.[param.name] ? String(localParams[param.name]) : ''}
									onChange={(budgetId) => handleParamChange(param.name, budgetId)}
									placeholder="Select budget..."
									class="h-8 w-full"
								/>
							{:else if param.referenceType === 'account'}
								<Select.Root
									type="single"
									value={localParams?.[param.name] ? String(localParams[param.name]) : ''}
									onValueChange={(v) => handleParamChange(param.name, v ? parseInt(v) : null)}
								>
									<Select.Trigger class="h-8 text-sm">
										{#if localParams?.[param.name]}
											{@const account = accountsState?.accounts.get(localParams[param.name] as number)}
											{account?.name || 'Unknown account'}
										{:else}
											Select account...
										{/if}
									</Select.Trigger>
									<Select.Content>
										{#each accountsState?.all ?? [] as account (account.id)}
											<Select.Item value={String(account.id)}>
												{account.name}
											</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							{:else if param.referenceType === 'categoryGroup'}
								<Select.Root
									type="single"
									value={localParams?.[param.name] ? String(localParams[param.name]) : ''}
									onValueChange={(v) => handleParamChange(param.name, v ? parseInt(v) : null)}
								>
									<Select.Trigger class="h-8 text-sm">
										{#if localParams?.[param.name]}
											{@const category = categoriesState?.getById(localParams[param.name] as number)}
											{category?.name || 'Unknown group'}
										{:else}
											Select group...
										{/if}
									</Select.Trigger>
									<Select.Content>
										{#each parentCategories as category (category.id)}
											<Select.Item value={String(category.id)}>
												{category.name}
											</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							{:else}
								<Input
									type="number"
									value={String(localParams?.[param.name] || '')}
									oninput={(e) => handleParamChange(param.name, parseInt((e.target as HTMLInputElement).value) || null)}
									placeholder={`${param.label} ID...`}
									class="h-8 text-sm"
								/>
							{/if}
						{:else}
							<Input
								type="text"
								value={String(localParams?.[param.name] || '')}
								oninput={(e) => handleParamChange(param.name, (e.target as HTMLInputElement).value)}
								placeholder={param.placeholder || `Enter ${param.label.toLowerCase()}...`}
								class="h-8 text-sm"
							/>
						{/if}

						{#if param.description}
							<p class="text-xs text-muted-foreground">{param.description}</p>
						{/if}
					</div>
				{/each}
			</div>
		{/if}

		<!-- Continue on Error Option -->
		<div class="flex items-center justify-between border-t pt-3">
			<Label class="text-xs text-muted-foreground">Continue on error</Label>
			<Switch
				checked={localContinueOnError}
				onCheckedChange={handleContinueOnErrorChange}
			/>
		</div>
	</div>
</div>
