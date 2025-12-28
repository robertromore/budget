<!--
  NL Action Row

  Displays an action in natural language format:
  "Then [Action Type ▼] with [Parameters...]  [×]"
-->
<script lang="ts">
	import BudgetSelector from '$lib/components/budgets/budget-selector.svelte';
	import EnhancedCategorySelector from '$lib/components/categories/enhanced-category-selector/enhanced-category-selector.svelte';
	import EnhancedPayeeSelector from '$lib/components/payees/enhanced-payee-selector/enhanced-payee-selector.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import { Switch } from '$lib/components/ui/switch';
	import { AccountsState } from '$lib/states/entities/accounts.svelte';
	import { CategoriesState } from '$lib/states/entities/categories.svelte';
	import {
		actionDefinitions,
		getActionsForEntity,
		type ActionConfig,
		type EntityType,
	} from '$lib/types/automation';
	import X from '@lucide/svelte/icons/x';

	// Get entity states for reference selectors
	const accountsState = AccountsState.get();
	const categoriesState = CategoriesState.get();

	// Get parent categories (groups) for category group selection
	const parentCategories = $derived(
		categoriesState?.all.filter((cat) => cat.parentId === null) ?? []
	);

	interface Props {
		/** The action to display */
		action: ActionConfig;
		/** Entity type for available actions */
		entityType: EntityType;
		/** Whether this is the first action (shows "Then") */
		isFirst?: boolean;
		/** Called when action is updated */
		onUpdate: (action: ActionConfig) => void;
		/** Called when action is removed */
		onRemove: () => void;
	}

	let { action, entityType, isFirst = false, onUpdate, onRemove }: Props = $props();

	// Get available actions for the entity type
	const availableActions = $derived(getActionsForEntity(entityType));

	// Get the selected action definition
	const selectedAction = $derived(actionDefinitions.find((a) => a.type === action.type));

	// Display label
	const actionLabel = $derived(selectedAction?.label || 'Select action...');

	function handleActionTypeChange(value: string | undefined) {
		if (!value) return;

		// Reset params when action type changes
		const actionDef = actionDefinitions.find((a) => a.type === value);
		const defaultParams: Record<string, unknown> = {};

		// Initialize params with defaults
		actionDef?.params.forEach((param) => {
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

		onUpdate({
			...action,
			type: value,
			params: defaultParams,
		});
	}

	function handleParamChange(paramName: string, value: unknown) {
		onUpdate({
			...action,
			params: {
				...action.params,
				[paramName]: value,
			},
		});
	}
</script>

<div class="group flex flex-wrap items-center gap-2 rounded-md border border-orange-200 bg-orange-50/50 px-3 py-2 dark:border-orange-800 dark:bg-orange-950/30">
	<!-- "Then" prefix -->
	<span class="font-medium text-orange-700">
		{isFirst ? 'Then' : 'And'}
	</span>

	<!-- Action Type Select -->
	<Select.Root type="single" value={action.type} onValueChange={handleActionTypeChange}>
		<Select.Trigger class="h-7 w-auto min-w-36 gap-1 border-orange-200 px-2 text-sm">
			{actionLabel}
		</Select.Trigger>
		<Select.Content>
			{#each availableActions as actionDef (actionDef.type)}
				<Select.Item value={actionDef.type}>
					<div class="flex flex-col">
						<span>{actionDef.label}</span>
						<span class="text-xs text-muted-foreground">{actionDef.description}</span>
					</div>
				</Select.Item>
			{/each}
		</Select.Content>
	</Select.Root>

	<!-- Action Parameters (inline) -->
	{#if selectedAction?.params && selectedAction.params.length > 0}
		{#each selectedAction.params as param (param.name)}
			{@const paramValue = action.params?.[param.name]}

			{#if param.type === 'boolean'}
				<div class="flex items-center gap-1.5">
					<span class="text-sm text-muted-foreground">{param.label.toLowerCase()}:</span>
					<Switch
						checked={Boolean(paramValue)}
						onCheckedChange={(checked) => handleParamChange(param.name, checked)}
					/>
				</div>
			{:else if param.type === 'enum' && param.enumValues}
				<div class="flex items-center gap-1.5">
					<span class="text-sm text-muted-foreground">{param.label.toLowerCase()}:</span>
					<Select.Root
						type="single"
						value={String(paramValue || '')}
						onValueChange={(v) => handleParamChange(param.name, v)}
					>
						<Select.Trigger class="h-7 w-auto min-w-24 gap-1 px-2 text-sm">
							{String(paramValue) || `Select...`}
						</Select.Trigger>
						<Select.Content>
							{#each param.enumValues as val (val)}
								<Select.Item value={val}>{val}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			{:else if param.type === 'number'}
				<div class="flex items-center gap-1.5">
					<span class="text-sm text-muted-foreground">{param.label.toLowerCase()}:</span>
					<Input
						type="number"
						value={String(paramValue || '')}
						oninput={(e) =>
							handleParamChange(
								param.name,
								parseFloat((e.target as HTMLInputElement).value) || 0
							)}
						placeholder={param.placeholder || '0'}
						class="h-7 w-24 text-sm"
					/>
				</div>
			{:else if param.type === 'reference'}
				<!-- Reference type - use appropriate entity selector -->
				<div class="flex items-center gap-1.5">
					<span class="text-sm text-muted-foreground">{param.label.toLowerCase()}:</span>

					{#if param.referenceType === 'payee'}
						<span class="inline-flex">
							<EnhancedPayeeSelector
								value={paramValue as number | null}
								onValueChange={(payeeId) => handleParamChange(param.name, payeeId)}
								displayMode="compact"
								allowCreate={false}
								allowEdit={false}
								buttonClass="h-7 w-auto min-w-32"
								placeholder="Select payee..."
							/>
						</span>
					{:else if param.referenceType === 'category'}
						<span class="inline-flex">
							<EnhancedCategorySelector
								value={paramValue as number | null}
								onValueChange={(categoryId) => handleParamChange(param.name, categoryId)}
								displayMode="compact"
								allowCreate={false}
								allowEdit={false}
								buttonClass="h-7 w-auto min-w-32"
								placeholder="Select category..."
							/>
						</span>
					{:else if param.referenceType === 'budget'}
						<span class="inline-flex">
							<BudgetSelector
								value={paramValue ? String(paramValue) : ''}
								onChange={(budgetId) => handleParamChange(param.name, budgetId)}
								placeholder="Select budget..."
								class="h-7 w-auto min-w-32"
							/>
						</span>
					{:else if param.referenceType === 'account'}
						<Select.Root
							type="single"
							value={paramValue ? String(paramValue) : ''}
							onValueChange={(v) => handleParamChange(param.name, v ? parseInt(v) : null)}
						>
							<Select.Trigger class="h-7 w-auto min-w-32 gap-1 px-2 text-sm">
								{#if paramValue}
									{@const account = accountsState?.accounts.get(paramValue as number)}
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
							value={paramValue ? String(paramValue) : ''}
							onValueChange={(v) => handleParamChange(param.name, v ? parseInt(v) : null)}
						>
							<Select.Trigger class="h-7 w-auto min-w-32 gap-1 px-2 text-sm">
								{#if paramValue}
									{@const category = categoriesState?.getById(paramValue as number)}
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
						<!-- Fallback for unknown reference types -->
						<Input
							type="number"
							value={String(paramValue || '')}
							oninput={(e) =>
								handleParamChange(
									param.name,
									parseInt((e.target as HTMLInputElement).value) || null
								)}
							placeholder={`${param.label} ID...`}
							class="h-7 w-20 text-sm"
						/>
					{/if}
				</div>
			{:else}
				<!-- String/Text input -->
				<div class="flex items-center gap-1.5">
					<span class="text-sm text-muted-foreground">{param.label.toLowerCase()}:</span>
					<Input
						type="text"
						value={String(paramValue || '')}
						oninput={(e) =>
							handleParamChange(param.name, (e.target as HTMLInputElement).value)}
						placeholder={param.placeholder || `Enter ${param.label.toLowerCase()}...`}
						class="h-7 w-32 text-sm"
					/>
				</div>
			{/if}
		{/each}
	{/if}

	<!-- Remove button -->
	<Button
		variant="ghost"
		size="icon"
		class="ml-auto h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
		onclick={onRemove}
	>
		<X class="h-3.5 w-3.5 text-muted-foreground" />
	</Button>
</div>
