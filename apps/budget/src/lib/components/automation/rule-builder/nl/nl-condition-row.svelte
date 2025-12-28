<!--
  NL Condition Row

  Displays a single condition in natural language format:
  "[Field ▼] [Operator ▼] [Value] [×]"
-->
<script lang="ts">
	import BudgetSelector from '$lib/components/budgets/budget-selector.svelte';
	import EnhancedCategorySelector from '$lib/components/categories/enhanced-category-selector/enhanced-category-selector.svelte';
	import { DateInput, NumericInput } from '$lib/components/input';
	import EnhancedPayeeSelector from '$lib/components/payees/enhanced-payee-selector/enhanced-payee-selector.svelte';
	import { parseDate, type DateValue } from '@internationalized/date';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import { AccountsState } from '$lib/states/entities/accounts.svelte';
	import { CategoriesState } from '$lib/states/entities/categories.svelte';
	import {
		conditionFields,
		operatorInfo,
		type Condition,
		type ConditionOperator,
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
		/** The condition to display */
		condition: Condition;
		/** Entity type for available fields */
		entityType: EntityType;
		/** Called when condition is updated */
		onUpdate: (condition: Condition) => void;
		/** Called when condition is removed */
		onRemove: () => void;
	}

	let { condition, entityType, onUpdate, onRemove }: Props = $props();

	// Get available fields for the entity type
	const availableFields = $derived(conditionFields[entityType] || []);

	// Get the selected field config
	const selectedField = $derived(availableFields.find((f) => f.field === condition.field));

	// Get valid operators for the selected field
	const validOperators = $derived(
		selectedField
			? Object.entries(operatorInfo)
					.filter(([key]) => selectedField.operators.includes(key as ConditionOperator))
					.map(([key, info]) => ({
						value: key as ConditionOperator,
						label: info.label,
						valueCount: info.valueCount,
					}))
			: []
	);

	// Get current operator info
	const currentOperator = $derived(
		condition.operator ? operatorInfo[condition.operator] : null
	);

	// Display labels
	const fieldLabel = $derived(selectedField?.label || 'Select field...');
	const operatorLabel = $derived(currentOperator?.label || 'Select...');

	function handleFieldChange(value: string | undefined) {
		if (!value) return;
		const field = availableFields.find((f) => f.field === value);
		if (!field) return;

		// Reset operator and value when field changes
		const firstOperator = field.operators[0] || 'equals';
		onUpdate({
			...condition,
			field: value,
			operator: firstOperator,
			value: '',
			value2: undefined,
		});
	}

	function handleOperatorChange(value: string | undefined) {
		if (!value) return;
		const op = value as ConditionOperator;
		const opInfo = operatorInfo[op];

		onUpdate({
			...condition,
			operator: op,
			value: opInfo.valueCount > 0 ? condition.value : null,
			value2: op === 'between' ? condition.value2 : undefined,
		});
	}

	function handleValueChange(e: Event) {
		const target = e.target as HTMLInputElement;
		let value: unknown = target.value;

		// Type coercion based on field type
		if (selectedField?.type === 'number') {
			value = target.value === '' ? '' : parseFloat(target.value) || 0;
		} else if (selectedField?.type === 'boolean') {
			value = target.value === 'true';
		}

		onUpdate({
			...condition,
			value,
		});
	}

	function handleValue2Change(e: Event) {
		const target = e.target as HTMLInputElement;
		let value: unknown = target.value;

		if (selectedField?.type === 'number') {
			value = target.value === '' ? '' : parseFloat(target.value) || 0;
		}

		onUpdate({
			...condition,
			value2: value,
		});
	}

	function handleEnumValueChange(value: string | undefined) {
		if (!value) return;
		onUpdate({
			...condition,
			value,
		});
	}

	function handleBooleanValueChange(value: string | undefined) {
		if (!value) return;
		onUpdate({
			...condition,
			value: value === 'true',
		});
	}

	function handleReferenceValueChange(value: number | null) {
		onUpdate({
			...condition,
			value,
		});
	}

	// Bindable numeric values for NumericInput
	let numericValue = $state<number | undefined>(undefined);
	let numericValue2 = $state<number | undefined>(undefined);

	// Sync condition values to numeric states
	$effect(() => {
		numericValue = typeof condition.value === 'number' ? condition.value : undefined;
		numericValue2 = typeof condition.value2 === 'number' ? condition.value2 : undefined;
	});

	// Handle numeric value updates
	function handleNumericValueUpdate() {
		if (numericValue !== undefined) {
			onUpdate({
				...condition,
				value: numericValue,
			});
		}
	}

	function handleNumericValue2Update() {
		if (numericValue2 !== undefined) {
			onUpdate({
				...condition,
				value2: numericValue2,
			});
		}
	}

	// Bindable date values for DateInput
	let dateValue = $state<DateValue | undefined>(undefined);
	let dateValue2 = $state<DateValue | undefined>(undefined);

	// Sync condition values to date states (only when they differ to avoid loops)
	$effect(() => {
		// Parse string date values to DateValue
		if (typeof condition.value === 'string' && condition.value) {
			// Only update if the value is different to avoid infinite loops
			if (dateValue?.toString() !== condition.value) {
				try {
					dateValue = parseDate(condition.value);
				} catch {
					dateValue = undefined;
				}
			}
		} else if (dateValue !== undefined) {
			dateValue = undefined;
		}

		if (typeof condition.value2 === 'string' && condition.value2) {
			// Only update if the value is different to avoid infinite loops
			if (dateValue2?.toString() !== condition.value2) {
				try {
					dateValue2 = parseDate(condition.value2);
				} catch {
					dateValue2 = undefined;
				}
			}
		} else if (dateValue2 !== undefined) {
			dateValue2 = undefined;
		}
	});

	// Handle date value updates - only update if value changed
	function handleDateValueUpdate(value: DateValue | undefined) {
		const newValue = value?.toString() ?? null;
		if (newValue !== condition.value) {
			onUpdate({
				...condition,
				value: newValue,
			});
		}
	}

	function handleDateValue2Update(value: DateValue | undefined) {
		const newValue = value?.toString();
		if (newValue !== condition.value2) {
			onUpdate({
				...condition,
				value2: newValue,
			});
		}
	}
</script>

<div class="group flex flex-wrap items-center gap-2 rounded-md bg-muted/30 px-3 py-2">
	<!-- Field Select -->
	<Select.Root type="single" value={condition.field} onValueChange={handleFieldChange}>
		<Select.Trigger class="h-7 w-auto min-w-32 gap-1 px-2 text-sm">
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

	<!-- Operator Select -->
	<Select.Root
		type="single"
		value={condition.operator}
		onValueChange={handleOperatorChange}
		disabled={!condition.field}
	>
		<Select.Trigger class="h-7 w-auto min-w-28 gap-1 px-2 text-sm">
			{operatorLabel}
		</Select.Trigger>
		<Select.Content>
			{#each validOperators as op (op.value)}
				<Select.Item value={op.value}>{op.label}</Select.Item>
			{/each}
		</Select.Content>
	</Select.Root>

	<!-- Value Input (conditional based on operator) -->
	{#if currentOperator && currentOperator.valueCount > 0}
		{#if selectedField?.type === 'enum' && selectedField.enumValues}
			<!-- Enum dropdown -->
			<Select.Root
				type="single"
				value={String(condition.value || '')}
				onValueChange={handleEnumValueChange}
			>
				<Select.Trigger class="h-7 w-auto min-w-28 gap-1 px-2 text-sm">
					{String(condition.value) || 'Select...'}
				</Select.Trigger>
				<Select.Content>
					{#each selectedField.enumValues as val (val)}
						<Select.Item value={val}>{val}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		{:else if selectedField?.type === 'boolean'}
			<!-- Boolean dropdown -->
			<Select.Root
				type="single"
				value={String(condition.value)}
				onValueChange={handleBooleanValueChange}
			>
				<Select.Trigger class="h-7 w-20 gap-1 px-2 text-sm">
					{condition.value === true ? 'True' : condition.value === false ? 'False' : 'Select...'}
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="true">True</Select.Item>
					<Select.Item value="false">False</Select.Item>
				</Select.Content>
			</Select.Root>
		{:else if selectedField?.type === 'number'}
			<!-- Number input (e.g., amount, balance) -->
			<NumericInput
				bind:value={numericValue}
				onSubmit={handleNumericValueUpdate}
				buttonClass="h-7 w-auto min-w-24"
			/>
		{:else if selectedField?.type === 'date'}
			<!-- Date input with calendar picker -->
			<DateInput
				value={dateValue}
				handleSubmit={handleDateValueUpdate}
				buttonClass="h-7 w-auto min-w-32"
			/>
		{:else if selectedField?.type === 'reference' && selectedField.referenceType}
			<!-- Reference type - use appropriate entity selector -->
			{#if selectedField.referenceType === 'payee'}
				<span class="inline-flex">
					<EnhancedPayeeSelector
						value={condition.value as number | null}
						onValueChange={handleReferenceValueChange}
						displayMode="compact"
						allowCreate={false}
						allowEdit={false}
						buttonClass="h-7 w-auto min-w-32"
						placeholder="Select payee..."
					/>
				</span>
			{:else if selectedField.referenceType === 'category'}
				<span class="inline-flex">
					<EnhancedCategorySelector
						value={condition.value as number | null}
						onValueChange={handleReferenceValueChange}
						displayMode="compact"
						allowCreate={false}
						allowEdit={false}
						buttonClass="h-7 w-auto min-w-32"
						placeholder="Select category..."
					/>
				</span>
			{:else if selectedField.referenceType === 'budget'}
				<span class="inline-flex">
					<BudgetSelector
						value={condition.value ? String(condition.value) : ''}
						onChange={handleReferenceValueChange}
						placeholder="Select budget..."
						class="h-7 w-auto min-w-32"
					/>
				</span>
			{:else if selectedField.referenceType === 'account'}
				<Select.Root
					type="single"
					value={condition.value ? String(condition.value) : ''}
					onValueChange={(v) => handleReferenceValueChange(v ? parseInt(v) : null)}
				>
					<Select.Trigger class="h-7 w-auto min-w-32 gap-1 px-2 text-sm">
						{#if condition.value}
							{@const account = accountsState?.accounts.get(condition.value as number)}
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
					value={condition.value ? String(condition.value) : ''}
					onValueChange={(v) => handleReferenceValueChange(v ? parseInt(v) : null)}
				>
					<Select.Trigger class="h-7 w-auto min-w-32 gap-1 px-2 text-sm">
						{#if condition.value}
							{@const category = categoriesState?.getById(condition.value as number)}
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
					value={String(condition.value || '')}
					oninput={(e) => handleReferenceValueChange(parseInt((e.target as HTMLInputElement).value) || null)}
					placeholder="ID..."
					class="h-7 w-20 text-sm"
				/>
			{/if}
		{:else}
			<!-- Text input (string, date, or other types) -->
			<Input
				type="text"
				value={String(condition.value || '')}
				oninput={handleValueChange}
				placeholder="Enter value..."
				class="h-7 w-28 text-sm"
			/>
		{/if}

		<!-- Second value for 'between' operator -->
		{#if condition.operator === 'between'}
			<span class="text-sm text-muted-foreground">and</span>
			{#if selectedField?.type === 'number'}
				<NumericInput
					bind:value={numericValue2}
					onSubmit={handleNumericValue2Update}
					buttonClass="h-7 w-auto min-w-24"
				/>
			{:else if selectedField?.type === 'date'}
				<DateInput
					value={dateValue2}
					handleSubmit={handleDateValue2Update}
					buttonClass="h-7 w-auto min-w-32"
				/>
			{:else}
				<Input
					type="text"
					value={String(condition.value2 || '')}
					oninput={handleValue2Change}
					placeholder="Upper bound..."
					class="h-7 w-28 text-sm"
				/>
			{/if}
		{/if}
	{/if}

	<!-- Negate indicator -->
	{#if condition.negate}
		<span class="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
			NOT
		</span>
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
