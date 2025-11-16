<script lang="ts">
import * as Select from '$lib/components/ui/select';
import Label from '$lib/components/ui/label/label.svelte';
import { cn } from '$lib/utils';
import { BudgetState } from '$lib/states/budgets.svelte';
import type { BudgetWithRelations } from '$lib/server/domains/budgets';

interface Props {
  value?: string;
  budgets?: BudgetWithRelations[] | null;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  label?: string | null;
  class?: string;
  id?: string;
  onChange?: (value: number | null) => void;
}

let {
  value = $bindable<string>(''),
  budgets = null,
  placeholder = 'Select a budget',
  disabled = false,
  required = false,
  label = null,
  class: className,
  id = `budget-selector-${Math.random().toString(36).slice(2)}`,
  onChange,
}: Props = $props();

const budgetState = BudgetState.safeGet();

const resolvedBudgets = $derived.by(() => {
  if (budgets && budgets.length) {
    return budgets;
  }

  return budgetState?.activeBudgets ?? [];
});

const groupedBudgets = $derived.by(() => {
  const map = new Map<string, BudgetWithRelations[]>();

  for (const budget of resolvedBudgets) {
    const groupLabel = budget.groupMemberships?.length
      ? budget.groupMemberships
          .map((membership) => membership.group?.name)
          .filter(Boolean)
          .join(' / ') || 'Ungrouped'
      : 'Ungrouped';

    if (!map.has(groupLabel)) {
      map.set(groupLabel, []);
    }

    map.get(groupLabel)!.push(budget);
  }

  return Array.from(map.entries());
});

const selectedLabel = $derived.by(() => {
  if (value == null) return placeholder;
  const match = resolvedBudgets.find(
    (budget: BudgetWithRelations) => budget.id === parseInt(value)
  );
  return match?.name ?? placeholder;
});
</script>

<div class={cn('flex flex-col gap-2', className)}>
  {#if label}
    <Label for={id} class="text-foreground text-sm font-medium">{label}</Label>
  {/if}

  <Select.Root type="single" bind:value disabled={disabled || !groupedBudgets.length} {required}>
    <Select.Trigger {id} class="w-full justify-between">
      <span>{selectedLabel}</span>
    </Select.Trigger>
    <Select.Content class="max-h-72">
      {#if groupedBudgets.length === 0}
        <div class="text-muted-foreground px-3 py-2 text-sm">No budgets available</div>
      {:else}
        {#each groupedBudgets as [groupLabel, members] (groupLabel)}
          <Select.Group>
            {#if groupLabel !== 'Ungrouped'}
              <Select.Label>{groupLabel}</Select.Label>
            {/if}
            {#each members as budget (budget.id)}
              <Select.Item value={String(budget.id)} class="flex flex-col gap-0.5">
                <span class="text-foreground text-sm font-medium">{budget.name}</span>
                {#if budget.metadata?.defaultPeriod?.type}
                  <span class="text-muted-foreground text-xs">
                    {budget.metadata.defaultPeriod.type} • {budget.scope}
                  </span>
                {/if}
              </Select.Item>
            {/each}
          </Select.Group>
        {/each}
      {/if}
    </Select.Content>
  </Select.Root>
</div>
