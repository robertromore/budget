<script lang="ts" generics="TData, TValue">
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Command from '$lib/components/ui/command';
import * as Popover from '$lib/components/ui/popover';
import { cn } from '$lib/utils';
import Check from '@lucide/svelte/icons/check';
import X from '@lucide/svelte/icons/x';
import type { Column } from '@tanstack/table-core';
import type { Component } from 'svelte';

export type FacetedFilterOption = {
	label: string;
	value: string;
	icon?: Component;
};

export type FilterOperator = {
	id: string;
	label: string;
};

interface Props<TData, TValue> {
	column: Column<TData, TValue>;
	title: string;
	options: FacetedFilterOption[];
	/** Available filter operators (e.g., "is one of", "is not one of") */
	operators?: FilterOperator[];
	/** Callback when filter should be removed */
	onRemove?: () => void;
	/** Callback when value changes */
	onValueChange?: (values: unknown) => void;
	/** Callback when operator changes */
	onOperatorChange?: (operatorId: string) => void;
}

// Default operators for faceted filters
const defaultOperators: FilterOperator[] = [
	{ id: 'arrIncludesSome', label: 'is one of' },
	{ id: 'arrNotIncludesSome', label: 'is not one of' },
];

let { column, title, options, operators = defaultOperators, onRemove, onValueChange, onOperatorChange }: Props<TData, TValue> = $props();

// Active operator state
let activeOperatorId = $state((() => operators[0])()?.id ?? 'arrIncludesSome');
let operatorPopoverOpen = $state(false);

const activeOperator = $derived(operators.find((op) => op.id === activeOperatorId) || operators[0]);

function setOperator(operator: FilterOperator) {
	activeOperatorId = operator.id;
	onOperatorChange?.(operator.id);
	// Re-emit current values with new operator
	const filterData = {
		operator: operator.id,
		values: Array.from(selectedValues),
	};
	onValueChange?.(filterData);
	operatorPopoverOpen = false;
}

// Filter value structure type
type FacetedFilterValue = {
	operator: string;
	values: string[];
} | string[] | Set<string>;

// Get current filter value from column - can be structured object, Set, Array, or undefined
const rawFilterValue = $derived(column?.getFilterValue?.() as FacetedFilterValue | undefined);
const selectedValues = $derived.by(() => {
	if (!rawFilterValue) return new Set<string>();
	// Handle structured filter value with operator
	if (rawFilterValue && typeof rawFilterValue === 'object' && 'operator' in rawFilterValue && 'values' in rawFilterValue) {
		return new Set(rawFilterValue.values.map(String));
	}
	if (rawFilterValue instanceof Set) return rawFilterValue as Set<string>;
	if (Array.isArray(rawFilterValue)) return new Set(rawFilterValue.map(String));
	return new Set<string>();
});

// Initialize operator from filter value if available
$effect(() => {
	if (rawFilterValue && typeof rawFilterValue === 'object' && 'operator' in rawFilterValue) {
		activeOperatorId = rawFilterValue.operator;
	}
});

// Get faceted values with counts from TanStack Table
const facets = $derived(column?.getFacetedUniqueValues?.() || new Map());

// Toggle a value in the selection
function toggleValue(value: string) {
	const newValues = new Set(selectedValues);
	if (newValues.has(value)) {
		newValues.delete(value);
	} else {
		newValues.add(value);
	}
	// Pass values along with operator for filter function to use
	const filterData = {
		operator: activeOperatorId,
		values: Array.from(newValues),
	};
	onValueChange?.(filterData);
}

// Clear all selections
function clearAll() {
	const filterData = {
		operator: activeOperatorId,
		values: [] as string[],
	};
	onValueChange?.(filterData);
}
</script>

<div class="flex">
	<Badge variant="outline" class="h-8 rounded-r-none">{title}</Badge>

	<!-- Operator Selection -->
	<Popover.Root bind:open={operatorPopoverOpen}>
		<Popover.Trigger>
			{#snippet child({ props })}
				<Button {...props} variant="outline" size="sm" class="h-8 rounded-none border-l-0">
					{activeOperator?.label}
				</Button>
			{/snippet}
		</Popover.Trigger>
		<Popover.Content class="w-auto min-w-[200px] p-0" align="start">
			<Command.Root>
				<Command.List>
					<Command.Empty>No operators found.</Command.Empty>
					<Command.Group>
						{#each operators as operator}
							{@const isSelected = activeOperatorId === operator.id}
							<Command.Item onSelect={() => setOperator(operator)}>
								<div
									class={cn(
										'border-primary mr-2 flex h-4 w-4 items-center justify-center rounded-sm border',
										isSelected
											? 'bg-primary text-primary-foreground'
											: 'opacity-50 [&_svg]:invisible'
									)}>
									<Check class={cn('h-4 w-4')} />
								</div>
								<span>{operator.label}</span>
							</Command.Item>
						{/each}
					</Command.Group>
				</Command.List>
			</Command.Root>
		</Popover.Content>
	</Popover.Root>

	<!-- Value Selection -->
	<Popover.Root>
		<Popover.Trigger>
			{#snippet child({ props })}
				<Button {...props} variant="outline" size="sm" class="h-8 rounded-none border-l-0">
					{#if selectedValues.size === 0}
						<Badge variant="secondary">none selected</Badge>
					{:else}
						<Badge variant="secondary" class="rounded-sm px-1 font-normal lg:hidden">
							{selectedValues.size}
						</Badge>
						<div class="hidden space-x-1 lg:flex">
							{#if selectedValues.size > 2}
								<Badge variant="secondary" class="rounded-sm px-1 font-normal">
									{selectedValues.size} selected
								</Badge>
							{:else}
								{@const matchingOptions = options.filter((opt) => selectedValues.has(opt.value))}
								{#each matchingOptions as option}
									<Badge variant="secondary" class="rounded-sm px-1 font-normal">
										{option.label}
									</Badge>
								{/each}
							{/if}
						</div>
					{/if}
				</Button>
			{/snippet}
		</Popover.Trigger>
		<Popover.Content class="w-auto min-w-[200px] p-0" align="start">
			<Command.Root>
				<Command.Input placeholder={title} />
				<Command.List>
					<Command.Empty>No results found.</Command.Empty>
					<Command.Group>
						{#each options as option}
							{@const isSelected = selectedValues.has(option.value)}
							<Command.Item onSelect={() => toggleValue(option.value)}>
								<div
									class={cn(
										'border-primary mr-2 flex h-4 w-4 items-center justify-center rounded-sm border',
										isSelected
											? 'bg-primary text-primary-foreground'
											: 'opacity-50 [&_svg]:invisible'
									)}>
									<Check class={cn('h-4 w-4')} />
								</div>
								{#if option.icon}
									{@const Icon = option.icon}
									<Icon class="size-4" />
								{/if}

								<span>{option.label}</span>
								{#if facets?.has(option.value)}
									<span class="ml-auto flex size-4 items-center justify-center font-mono text-xs">
										{facets.get(option.value)}
									</span>
								{/if}
							</Command.Item>
						{/each}
					</Command.Group>

					{#if selectedValues.size > 0}
						<Command.Separator />
						<Command.Group>
							<Command.Item onSelect={clearAll} class="justify-center text-center">
								Clear filters
							</Command.Item>
						</Command.Group>
					{/if}
				</Command.List>
			</Command.Root>
		</Popover.Content>
	</Popover.Root>

	<!-- Remove Filter Button -->
	<Button
		variant="outline"
		class="h-8 rounded-l-none border-l-0 p-2"
		onclick={() => {
			// Two-click behavior: first click clears values, second click removes filter
			if (selectedValues.size > 0) {
				clearAll();
			} else {
				onRemove?.();
			}
		}}><X /></Button>
</div>
