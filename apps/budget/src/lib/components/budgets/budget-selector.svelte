<script lang="ts">
  import { Select } from '$lib/components/ui';
  import { Badge } from '$lib/components/ui';
  import { Plus, ChevronDown } from '@lucide/svelte';
  import type { Budget } from '$lib/schema/budgets';

  interface Props {
    budgets?: Budget[];
    selectedBudgetId?: number | null;
    onSelect?: (budgetId: number | null) => void;
    onCreateNew?: () => void;
    placeholder?: string;
    allowClear?: boolean;
    disabled?: boolean;
    showOnlyActive?: boolean;
    budgetScope?: 'account' | 'category' | 'global' | 'mixed';
    class?: string;
  }

  let {
    budgets = [],
    selectedBudgetId = $bindable(),
    onSelect,
    onCreateNew,
    placeholder = 'Select a budget...',
    allowClear = true,
    disabled = false,
    showOnlyActive = true,
    budgetScope,
    class: className,
  }: Props = $props();

  const filteredBudgets = $derived.by(() => {
    if (!budgets.length) return [];

    let filtered = [...budgets];

    if (showOnlyActive) {
      filtered = filtered.filter(budget => budget.status === 'active');
    }

    if (budgetScope) {
      filtered = filtered.filter(budget => budget.scope === budgetScope);
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  });

  const selectedBudget = $derived.by(() => {
    if (!selectedBudgetId) return null;
    return filteredBudgets.find(budget => budget.id === selectedBudgetId) || null;
  });

  function getBudgetTypeColor(type: Budget['type']): string {
    switch (type) {
      case 'account-monthly':
        return 'hsl(var(--blue))';
      case 'category-envelope':
        return 'hsl(var(--green))';
      case 'goal-based':
        return 'hsl(var(--purple))';
      case 'scheduled-expense':
        return 'hsl(var(--orange))';
      default:
        return 'hsl(var(--muted-foreground))';
    }
  }

  function getBudgetTypeLabel(type: Budget['type']): string {
    switch (type) {
      case 'account-monthly':
        return 'Monthly';
      case 'category-envelope':
        return 'Envelope';
      case 'goal-based':
        return 'Goal';
      case 'scheduled-expense':
        return 'Scheduled';
      default:
        return type;
    }
  }

  function handleSelect(value: string | undefined) {
    if (value === 'clear') {
      selectedBudgetId = null;
      onSelect?.(null);
    } else if (value === 'create-new') {
      onCreateNew?.();
    } else if (value) {
      const budgetId = parseInt(value);
      selectedBudgetId = budgetId;
      onSelect?.(budgetId);
    }
  }
</script>

<Select.Root
  value={selectedBudgetId?.toString()}
  onSelectedChange={handleSelect}
  {disabled}
>
  <Select.Trigger class="w-full {className || ''}">
    <div class="flex items-center justify-between w-full">
      {#if selectedBudget}
        <div class="flex items-center gap-2 min-w-0">
          <Badge
            variant="outline"
            style="border-color: {getBudgetTypeColor(selectedBudget.type)}; color: {getBudgetTypeColor(selectedBudget.type)}"
            class="flex-shrink-0 text-xs"
          >
            {getBudgetTypeLabel(selectedBudget.type)}
          </Badge>
          <span class="truncate">{selectedBudget.name}</span>
        </div>
      {:else}
        <span class="text-muted-foreground">{placeholder}</span>
      {/if}
      <ChevronDown class="h-4 w-4 opacity-50 flex-shrink-0" />
    </div>
  </Select.Trigger>

  <Select.Content>
    <Select.Group>
      {#if allowClear && selectedBudgetId}
        <Select.Item value="clear" class="text-muted-foreground">
          Clear selection
        </Select.Item>
        <Select.Separator />
      {/if}

      {#if filteredBudgets.length === 0}
        <Select.Item value="" disabled class="text-muted-foreground">
          No budgets available
        </Select.Item>
      {:else}
        {#each filteredBudgets as budget (budget.id)}
          <Select.Item value={budget.id.toString()}>
            <div class="flex items-center gap-2 w-full">
              <Badge
                variant="outline"
                style="border-color: {getBudgetTypeColor(budget.type)}; color: {getBudgetTypeColor(budget.type)}"
                class="flex-shrink-0 text-xs"
              >
                {getBudgetTypeLabel(budget.type)}
              </Badge>
              <div class="flex flex-col min-w-0">
                <span class="truncate">{budget.name}</span>
                {#if budget.description}
                  <span class="text-xs text-muted-foreground truncate">
                    {budget.description}
                  </span>
                {/if}
              </div>
            </div>
          </Select.Item>
        {/each}
      {/if}

      {#if onCreateNew}
        <Select.Separator />
        <Select.Item value="create-new" class="text-primary">
          <div class="flex items-center gap-2">
            <Plus class="h-4 w-4" />
            <span>Create new budget</span>
          </div>
        </Select.Item>
      {/if}
    </Select.Group>
  </Select.Content>
</Select.Root>