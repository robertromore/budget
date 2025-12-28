<!--
  NL Condition Group

  Recursive component for displaying AND/OR condition groups.
  Renders with visual indentation and nested structure.
-->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { isConditionGroup, type Condition, type ConditionGroup, type EntityType } from '$lib/types/automation';
	import X from '@lucide/svelte/icons/x';
	import NlAddButton from './nl-add-button.svelte';
	import NlConditionRow from './nl-condition-row.svelte';
	// Self-import for recursive rendering
	import Self from './nl-condition-group.svelte';

	interface Props {
		/** The condition group to display */
		group: ConditionGroup;
		/** Entity type for available fields */
		entityType: EntityType;
		/** Whether this is the root group (affects styling) */
		isRoot?: boolean;
		/** Nesting depth (for visual styling) */
		depth?: number;
		/** Called when group is updated */
		onUpdate: (group: ConditionGroup) => void;
		/** Called when group is removed (not shown for root) */
		onRemove?: () => void;
		/** Function to create a new condition */
		createCondition: () => Condition;
		/** Function to create a new group */
		createGroup: (operator: 'AND' | 'OR') => ConditionGroup;
	}

	let {
		group,
		entityType,
		isRoot = false,
		depth = 0,
		onUpdate,
		onRemove,
		createCondition,
		createGroup,
	}: Props = $props();

	// Border colors based on operator and depth
	const borderColors: Record<'AND' | 'OR', string> = {
		AND: 'border-purple-300',
		OR: 'border-indigo-300',
	};

	const bgColors: Record<'AND' | 'OR', string> = {
		AND: 'bg-purple-50/50',
		OR: 'bg-indigo-50/50',
	};

	const operatorBgColors: Record<'AND' | 'OR', string> = {
		AND: 'bg-purple-100 text-purple-700',
		OR: 'bg-indigo-100 text-indigo-700',
	};

	const borderColor = $derived(borderColors[group.operator]);
	const bgColor = $derived(bgColors[group.operator]);
	const operatorBgColor = $derived(operatorBgColors[group.operator]);

	// Toggle operator
	function toggleOperator() {
		onUpdate({
			...group,
			operator: group.operator === 'AND' ? 'OR' : 'AND',
		});
	}

	// Add a new condition to this group
	function addCondition() {
		const newCondition = createCondition();
		onUpdate({
			...group,
			conditions: [...group.conditions, newCondition],
		});
	}

	// Add a nested group
	function addNestedGroup(operator: 'AND' | 'OR') {
		const newGroup = createGroup(operator);
		onUpdate({
			...group,
			conditions: [...group.conditions, newGroup],
		});
	}

	// Update a condition at index
	function handleConditionUpdate(index: number, updated: Condition) {
		const newConditions = [...group.conditions];
		newConditions[index] = updated;
		onUpdate({
			...group,
			conditions: newConditions,
		});
	}

	// Update a nested group at index
	function handleGroupUpdate(index: number, updated: ConditionGroup) {
		const newConditions = [...group.conditions];
		newConditions[index] = updated;
		onUpdate({
			...group,
			conditions: newConditions,
		});
	}

	// Remove item at index
	function removeItem(index: number) {
		const newConditions = group.conditions.filter((_, i) => i !== index);
		onUpdate({
			...group,
			conditions: newConditions,
		});
	}
</script>

<div
	class="relative rounded-lg border-2 {borderColor} {bgColor} p-3"
	style="margin-left: {isRoot ? 0 : depth * 8}px"
>
	<!-- Header with operator toggle -->
	<div class="mb-3 flex items-center gap-2">
		{#if isRoot}
			<span class="text-sm font-medium text-muted-foreground">If</span>
		{/if}

		<!-- Operator Toggle -->
		<div class="flex gap-1">
			<Button
				variant={group.operator === 'AND' ? 'default' : 'outline'}
				size="sm"
				class="h-6 px-2 text-xs {group.operator === 'AND'
					? 'bg-purple-600 hover:bg-purple-700'
					: ''}"
				onclick={group.operator !== 'AND' ? toggleOperator : undefined}
			>
				AND
			</Button>
			<Button
				variant={group.operator === 'OR' ? 'default' : 'outline'}
				size="sm"
				class="h-6 px-2 text-xs {group.operator === 'OR'
					? 'bg-indigo-600 hover:bg-indigo-700'
					: ''}"
				onclick={group.operator !== 'OR' ? toggleOperator : undefined}
			>
				OR
			</Button>
		</div>

		<span class="text-sm text-muted-foreground">
			{group.operator === 'AND' ? 'all of these:' : 'any of these:'}
		</span>

		<!-- Remove button (not for root) -->
		{#if !isRoot && onRemove}
			<Button
				variant="ghost"
				size="icon"
				class="ml-auto h-6 w-6"
				onclick={onRemove}
			>
				<X class="h-3.5 w-3.5 text-muted-foreground" />
			</Button>
		{/if}
	</div>

	<!-- Conditions and nested groups -->
	<div class="space-y-2">
		{#each group.conditions as item, index (item.id)}
			{#if isConditionGroup(item)}
				<!-- Nested group (recursive) -->
				<Self
					group={item}
					{entityType}
					isRoot={false}
					depth={depth + 1}
					onUpdate={(updated) => handleGroupUpdate(index, updated)}
					onRemove={() => removeItem(index)}
					{createCondition}
					{createGroup}
				/>
			{:else}
				<!-- Single condition -->
				<NlConditionRow
					condition={item}
					{entityType}
					onUpdate={(updated) => handleConditionUpdate(index, updated)}
					onRemove={() => removeItem(index)}
				/>
			{/if}
		{/each}

		<!-- Empty state -->
		{#if group.conditions.length === 0}
			<div class="py-4 text-center text-sm text-muted-foreground">
				No conditions yet. Add a condition to get started.
			</div>
		{/if}
	</div>

	<!-- Add buttons -->
	<div class="mt-3 flex gap-2">
		<NlAddButton variant="condition" onAdd={addCondition} />

		<NlAddButton variant="group" showDropdown>
			<DropdownMenu.Item onclick={() => addNestedGroup('AND')}>
				<span class="mr-2 rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-700">AND</span>
				Add AND group
			</DropdownMenu.Item>
			<DropdownMenu.Item onclick={() => addNestedGroup('OR')}>
				<span class="mr-2 rounded bg-indigo-100 px-1.5 py-0.5 text-xs text-indigo-700">OR</span>
				Add OR group
			</DropdownMenu.Item>
		</NlAddButton>
	</div>
</div>
