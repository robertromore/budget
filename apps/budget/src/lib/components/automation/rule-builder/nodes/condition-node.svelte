<!--
  Condition Node

  Evaluates a single condition against the entity.
  Supports field selection, operator choice, and value input.
-->
<script lang="ts">
	import BudgetSelector from '$lib/components/budgets/budget-selector.svelte';
	import EnhancedCategorySelector from '$lib/components/categories/enhanced-category-selector/enhanced-category-selector.svelte';
	import { DateInput, NumericInput } from '$lib/components/input';
	import EnhancedPayeeSelector from '$lib/components/payees/enhanced-payee-selector/enhanced-payee-selector.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Switch } from '$lib/components/ui/switch';
	import { AccountsState } from '$lib/states/entities/accounts.svelte';
	import { CategoriesState } from '$lib/states/entities/categories.svelte';
	import {
	  conditionFields,
	  operatorInfo,
	  type Condition,
	  type ConditionOperator,
	  type EntityType
	} from '$lib/types/automation';
	import { parseDate, type DateValue } from '@internationalized/date';
	import Filter from '@lucide/svelte/icons/filter';
	import { Handle, Position } from '@xyflow/svelte';
	import { isHorizontalLayout, layoutDirection } from '../stores';

	// Get entity states for reference selectors
	const accountsState = AccountsState.get();
	const categoriesState = CategoriesState.get();

	// Get parent categories (groups) for category group selection
	const parentCategories = $derived(
		categoriesState?.all.filter((cat) => cat.parentId === null) ?? []
	);

	interface ConditionNodeData extends Condition {
		entityType: EntityType;
		onUpdate?: (data: Condition) => void;
	}

	interface Props {
		id: string;
		data: ConditionNodeData;
		selected?: boolean;
	}

	let { id, data, selected }: Props = $props();

	// Dynamic handle positions based on layout direction
	const isHorizontal = $derived(isHorizontalLayout($layoutDirection));
	const targetPosition = $derived(isHorizontal ? Position.Left : Position.Top);
	const sourcePosition = $derived(isHorizontal ? Position.Right : Position.Bottom);

	// Local state to ensure reactivity with SvelteFlow
	let localField = $state(data.field);
	let localOperator = $state(data.operator);
	let localValue = $state(data.value);
	let localValue2 = $state(data.value2);
	let localNegate = $state(data.negate || false);

	// Sync local state with prop changes
	$effect(() => { localField = data.field; });
	$effect(() => { localOperator = data.operator; });
	$effect(() => { localValue = data.value; });
	$effect(() => { localValue2 = data.value2; });
	$effect(() => { localNegate = data.negate || false; });

	// Bindable numeric values for NumericInput
	let numericValue = $state<number | undefined>(undefined);
	let numericValue2 = $state<number | undefined>(undefined);

	// Sync local values to numeric states
	$effect(() => {
		numericValue = typeof localValue === 'number' ? localValue : undefined;
		numericValue2 = typeof localValue2 === 'number' ? localValue2 : undefined;
	});

	// Bindable date values for DateInput
	let dateValue = $state<DateValue | undefined>(undefined);
	let dateValue2 = $state<DateValue | undefined>(undefined);

	// Sync local values to date states (only when they differ to avoid loops)
	$effect(() => {
		if (typeof localValue === 'string' && localValue) {
			if (dateValue?.toString() !== localValue) {
				try {
					dateValue = parseDate(localValue);
				} catch {
					dateValue = undefined;
				}
			}
		} else if (dateValue !== undefined) {
			dateValue = undefined;
		}

		if (typeof localValue2 === 'string' && localValue2) {
			if (dateValue2?.toString() !== localValue2) {
				try {
					dateValue2 = parseDate(localValue2);
				} catch {
					dateValue2 = undefined;
				}
			}
		} else if (dateValue2 !== undefined) {
			dateValue2 = undefined;
		}
	});

	// Get available fields for the entity type
	const availableFields = $derived(conditionFields[data.entityType] || []);

	// Get the selected field config
	const selectedField = $derived(availableFields.find((f) => f.field === localField));

	// Get valid operators for the selected field
	const validOperators = $derived(
		selectedField
			? Object.entries(operatorInfo)
					.filter(([key, info]) => selectedField.operators.includes(key as ConditionOperator))
					.map(([key, info]) => ({ value: key, label: info.label, needsValue: info.valueCount > 0 }))
			: []
	);

	// Get current operator info
	const currentOperator = $derived(localOperator ? operatorInfo[localOperator as ConditionOperator] : null);

	// Display labels for Select triggers
	const fieldLabel = $derived(selectedField?.label || 'Select field...');
	const operatorLabel = $derived(currentOperator?.label || 'Select operator...');

	function handleFieldChange(value: string | undefined) {
		if (!value) return;
		const field = availableFields.find((f) => f.field === value);
		if (!field) return;

		// Reset operator and value when field changes
		const firstOperator = field.operators[0] || 'equals';
		// Update local state immediately
		localField = value;
		localOperator = firstOperator;
		localValue = '';
		data.onUpdate?.({
			id: data.id,
			field: value,
			operator: firstOperator,
			value: '',
			negate: localNegate
		});
	}

	function handleOperatorChange(value: string | undefined) {
		if (!value) return;
		const opInfo = operatorInfo[value as ConditionOperator];
		// Update local state immediately
		localOperator = value as ConditionOperator;
		if (!(opInfo && opInfo.valueCount > 0)) {
			localValue = null;
		}
		data.onUpdate?.({
			id: data.id,
			field: localField,
			operator: value as ConditionOperator,
			value: opInfo && opInfo.valueCount > 0 ? localValue : null,
			negate: localNegate
		});
	}

	function handleValueChange(e: Event) {
		const target = e.target as HTMLInputElement;
		let value: unknown = target.value;

		// Type coercion based on field type
		if (selectedField?.type === 'number') {
			value = parseFloat(target.value) || 0;
		} else if (selectedField?.type === 'boolean') {
			value = target.value === 'true';
		}

		// Update local state immediately
		localValue = value;
		data.onUpdate?.({
			id: data.id,
			field: localField,
			operator: localOperator,
			value,
			negate: localNegate
		});
	}

	function handleNegateChange(checked: boolean) {
		// Update local state immediately
		localNegate = checked;
		data.onUpdate?.({
			id: data.id,
			field: localField,
			operator: localOperator,
			value: localValue,
			negate: checked
		});
	}

	// Handle numeric value updates
	function handleNumericValueUpdate() {
		if (numericValue !== undefined) {
			localValue = numericValue;
			data.onUpdate?.({
				id: data.id,
				field: localField,
				operator: localOperator,
				value: numericValue,
				negate: localNegate
			});
		}
	}

	function handleNumericValue2Update() {
		if (numericValue2 !== undefined) {
			localValue2 = numericValue2;
			data.onUpdate?.({
				id: data.id,
				field: localField,
				operator: localOperator,
				value: localValue,
				value2: numericValue2,
				negate: localNegate
			});
		}
	}

	// Handle date value updates - only update if value changed
	function handleDateValueUpdate(value: DateValue | undefined) {
		const newValue = value?.toString() ?? null;
		if (newValue !== localValue) {
			localValue = newValue;
			data.onUpdate?.({
				id: data.id,
				field: localField,
				operator: localOperator,
				value: newValue,
				negate: localNegate
			});
		}
	}

	function handleDateValue2Update(value: DateValue | undefined) {
		const newValue = value?.toString();
		if (newValue !== localValue2) {
			localValue2 = newValue;
			data.onUpdate?.({
				id: data.id,
				field: localField,
				operator: localOperator,
				value: localValue,
				value2: newValue,
				negate: localNegate
			});
		}
	}

	// Handle reference value updates
	function handleReferenceValueChange(value: number | null) {
		localValue = value;
		data.onUpdate?.({
			id: data.id,
			field: localField,
			operator: localOperator,
			value,
			negate: localNegate
		});
	}
</script>

<div
	class="condition-node w-72 rounded-lg border-2 bg-background shadow-md transition-all {selected
		? 'border-blue-500 ring-2 ring-blue-200'
		: 'border-blue-400'}"
>
	<!-- Input Handle -->
	<Handle type="target" position={targetPosition} class="!h-3 !w-3 !bg-blue-500 !border-2 !border-white" />

	<!-- Header -->
	<div class="flex items-center justify-between rounded-t-md bg-blue-500 px-3 py-2 text-white">
		<div class="flex items-center gap-2">
			<Filter class="h-4 w-4" />
			<span class="font-semibold">Condition</span>
		</div>
		<div class="flex items-center gap-1.5">
			<span class="text-xs opacity-80">NOT</span>
			<Switch
				checked={localNegate}
				onCheckedChange={handleNegateChange}
				class="scale-75"
			/>
		</div>
	</div>

	<!-- Body -->
	<div class="space-y-3 p-3">
		<!-- Field Selection -->
		<div class="space-y-1.5">
			<Label class="text-xs text-muted-foreground">Field</Label>
			<Select.Root type="single" value={localField} onValueChange={handleFieldChange}>
				<Select.Trigger class="h-8 text-sm">
					{fieldLabel}
				</Select.Trigger>
				<Select.Content>
					{#each availableFields as field (field.field)}
						<Select.Item value={field.field}>
							<div class="flex flex-col">
								<span>{field.label}</span>
								<span class="text-xs text-muted-foreground">{field.type}</span>
							</div>
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<!-- Operator Selection -->
		<div class="space-y-1.5">
			<Label class="text-xs text-muted-foreground">Operator</Label>
			<Select.Root
				type="single"
				value={localOperator}
				onValueChange={handleOperatorChange}
				disabled={!localField}
			>
				<Select.Trigger class="h-8 text-sm">
					{operatorLabel}
				</Select.Trigger>
				<Select.Content>
					{#each validOperators as op (op.value)}
						<Select.Item value={op.value}>{op.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<!-- Value Input -->
		{#if currentOperator && currentOperator.valueCount > 0}
			<div class="space-y-1.5">
				<Label class="text-xs text-muted-foreground">Value</Label>
				{#if selectedField?.type === 'enum' && selectedField.enumValues}
					<Select.Root
						type="single"
						value={String(localValue)}
						onValueChange={(v) => {
							localValue = v;
							data.onUpdate?.({ id: data.id, field: localField, operator: localOperator, value: v, negate: localNegate });
						}}
					>
						<Select.Trigger class="h-8 text-sm">
							{String(localValue) || 'Select value...'}
						</Select.Trigger>
						<Select.Content>
							{#each selectedField.enumValues as val (val)}
								<Select.Item value={val}>{val}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				{:else if selectedField?.type === 'boolean'}
					<Select.Root
						type="single"
						value={String(localValue)}
						onValueChange={(v) => {
							const boolValue = v === 'true';
							localValue = boolValue;
							data.onUpdate?.({ id: data.id, field: localField, operator: localOperator, value: boolValue, negate: localNegate });
						}}
					>
						<Select.Trigger class="h-8 text-sm">
							{localValue === true ? 'True' : localValue === false ? 'False' : 'Select...'}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="true">True</Select.Item>
							<Select.Item value="false">False</Select.Item>
						</Select.Content>
					</Select.Root>
				{:else if selectedField?.type === 'number'}
					<NumericInput
						bind:value={numericValue}
						onSubmit={handleNumericValueUpdate}
						buttonClass="h-8 w-full"
					/>
				{:else if selectedField?.type === 'date'}
					<DateInput
						value={dateValue}
						handleSubmit={handleDateValueUpdate}
						buttonClass="h-8 w-full"
					/>
				{:else if selectedField?.type === 'reference' && selectedField.referenceType}
					{#if selectedField.referenceType === 'payee'}
						<EnhancedPayeeSelector
							value={localValue as number | null}
							onValueChange={handleReferenceValueChange}
							displayMode="compact"
							allowCreate={false}
							allowEdit={false}
							buttonClass="h-8 w-full"
							placeholder="Select payee..."
						/>
					{:else if selectedField.referenceType === 'category'}
						<EnhancedCategorySelector
							value={localValue as number | null}
							onValueChange={handleReferenceValueChange}
							displayMode="compact"
							allowCreate={false}
							allowEdit={false}
							buttonClass="h-8 w-full"
							placeholder="Select category..."
						/>
					{:else if selectedField.referenceType === 'budget'}
						<BudgetSelector
							value={localValue ? String(localValue) : ''}
							onChange={handleReferenceValueChange}
							placeholder="Select budget..."
							class="h-8 w-full"
						/>
					{:else if selectedField.referenceType === 'account'}
						<Select.Root
							type="single"
							value={localValue ? String(localValue) : ''}
							onValueChange={(v) => handleReferenceValueChange(v ? parseInt(v) : null)}
						>
							<Select.Trigger class="h-8 text-sm">
								{#if localValue}
									{@const account = accountsState?.accounts.get(localValue as number)}
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
					{:else if selectedField.referenceType === 'categoryGroup'}
						<Select.Root
							type="single"
							value={localValue ? String(localValue) : ''}
							onValueChange={(v) => handleReferenceValueChange(v ? parseInt(v) : null)}
						>
							<Select.Trigger class="h-8 text-sm">
								{#if localValue}
									{@const category = categoriesState?.getById(localValue as number)}
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
							value={String(localValue || '')}
							oninput={(e) => handleReferenceValueChange(parseInt((e.target as HTMLInputElement).value) || null)}
							placeholder="ID..."
							class="h-8 text-sm"
						/>
					{/if}
				{:else}
					<Input
						type="text"
						value={String(localValue || '')}
						oninput={handleValueChange}
						placeholder="Enter value..."
						class="h-8 text-sm"
					/>
				{/if}
			</div>
		{/if}

		<!-- Second Value (for 'between' operator) -->
		{#if localOperator === 'between'}
			<div class="space-y-1.5">
				<Label class="text-xs text-muted-foreground">And</Label>
				{#if selectedField?.type === 'number'}
					<NumericInput
						bind:value={numericValue2}
						onSubmit={handleNumericValue2Update}
						buttonClass="h-8 w-full"
					/>
				{:else if selectedField?.type === 'date'}
					<DateInput
						value={dateValue2}
						handleSubmit={handleDateValue2Update}
						buttonClass="h-8 w-full"
					/>
				{:else}
					<Input
						type="text"
						value={String(localValue2 || '')}
						oninput={(e) => {
							const target = e.target as HTMLInputElement;
							localValue2 = target.value;
							data.onUpdate?.({ id: data.id, field: localField, operator: localOperator, value: localValue, value2: target.value, negate: localNegate });
						}}
						placeholder="Upper bound..."
						class="h-8 text-sm"
					/>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Output Handle -->
	<Handle type="source" position={sourcePosition} class="!h-3 !w-3 !bg-blue-500 !border-2 !border-white" />
</div>
