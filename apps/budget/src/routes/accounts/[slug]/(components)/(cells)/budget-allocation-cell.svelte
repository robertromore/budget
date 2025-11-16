<script lang="ts">
import * as Select from '$lib/components/ui/select';
import * as Tooltip from '$lib/components/ui/tooltip';
import {Button} from '$lib/components/ui/button';
import {Badge} from '$lib/components/ui/badge';
import {CircleDollarSign, Plus, TriangleAlert} from '@lucide/svelte/icons';
import {currencyFormatter} from '$lib/utils/formatters';
import {listBudgets} from '$lib/query/budgets';
import type {TransactionsFormat} from '$lib/types';

interface Props {
  transaction: TransactionsFormat;
  onAddAllocation?: (budgetId: number, amount: number) => Promise<void>;
  onDeleteAllocation?: (allocationId: number) => Promise<void>;
}

let {transaction, onAddAllocation, onDeleteAllocation}: Props = $props();

const budgetsQuery = listBudgets().options();
const availableBudgets = $derived.by(() => budgetsQuery.data ?? []);

const budgetAllocations = $derived.by(() => transaction.budgetAllocations ?? []);

const totalAllocated = $derived.by(() =>
  budgetAllocations.reduce((sum, allocation) => sum + allocation.allocatedAmount, 0)
);

const remainingAmount = $derived.by(() => Number(transaction.amount) - totalAllocated);

const isFullyAllocated = $derived.by(() => Math.abs(remainingAmount) < 0.01);

const hasUnallocationAmount = $derived.by(() => Math.abs(remainingAmount) > 0.01);

let addingAllocation = $state(false);
let selectedBudgetId = $state('');
let allocationAmount = $state('');

function startAddingAllocation() {
  addingAllocation = true;
  selectedBudgetId = '';
  allocationAmount = String(Math.abs(remainingAmount));
}

function cancelAddingAllocation() {
  addingAllocation = false;
  selectedBudgetId = '';
  allocationAmount = '';
}

async function handleAddAllocation() {
  if (!selectedBudgetId || !allocationAmount || !onAddAllocation) return;

  try {
    const amount = Number(allocationAmount);
    // Ensure allocation has the same sign as the transaction
    const signedAmount = transaction.amount >= 0 ? Math.abs(amount) : -Math.abs(amount);
    await onAddAllocation(Number(selectedBudgetId), signedAmount);
    cancelAddingAllocation();
  } catch (error) {
    console.error('Failed to add budget allocation:', error);
  }
}

async function handleRemoveAllocation(allocationId: number) {
  if (!onDeleteAllocation) return;

  try {
    await onDeleteAllocation(allocationId);
  } catch (error) {
    console.error('Failed to remove budget allocation:', error);
  }
}

// Get budget name for allocation
function getBudgetName(budgetId: number): string {
  const budget = availableBudgets.find((b) => b.id === budgetId);
  return budget?.name ?? `Budget ${budgetId}`;
}
</script>

<div class="flex min-w-0 flex-col gap-1">
  <!-- Existing allocations -->
  {#if budgetAllocations.length > 0}
    <div class="flex flex-wrap gap-1">
      {#each budgetAllocations as allocation (allocation.id)}
        <Tooltip.Root>
          <Tooltip.Trigger>
            {#snippet child({props})}
              <Badge
                {...props}
                variant="secondary"
                class="flex max-w-[120px] items-center gap-1 text-xs">
                <span class="truncate">{getBudgetName(allocation.budgetId)}</span>
                <span class="text-xs opacity-75">
                  {currencyFormatter.format(Math.abs(allocation.allocatedAmount))}
                </span>
                <button
                  onclick={() => handleRemoveAllocation(allocation.id)}
                  class="hover:bg-secondary-foreground/20 ml-1 rounded-full text-xs">
                  ×
                </button>
              </Badge>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p>
              {getBudgetName(allocation.budgetId)}: {currencyFormatter.format(
                allocation.allocatedAmount
              )}
            </p>
          </Tooltip.Content>
        </Tooltip.Root>
      {/each}
    </div>
  {/if}

  <!-- Unallocated amount warning -->
  {#if hasUnallocationAmount}
    <div class="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
      <TriangleAlert class="h-3 w-3" />
      <span>Unallocated: {currencyFormatter.format(Math.abs(remainingAmount))}</span>
    </div>
  {/if}

  <!-- Add allocation interface -->
  {#if addingAllocation}
    <div class="bg-background flex flex-col gap-2 rounded-md border p-2">
      <Select.Root type="single" bind:value={selectedBudgetId}>
        <Select.Trigger class="h-8 text-xs">
          <span
            >{selectedBudgetId ? getBudgetName(Number(selectedBudgetId)) : 'Select budget'}</span>
        </Select.Trigger>
        <Select.Content>
          {#each availableBudgets as budget (budget.id)}
            <Select.Item value={String(budget.id)}>
              <div class="flex flex-col">
                <span>{budget.name}</span>
                <span class="text-muted-foreground text-xs">{budget.type}</span>
              </div>
            </Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>

      <input
        bind:value={allocationAmount}
        type="number"
        step="0.01"
        placeholder="Amount"
        class="h-8 rounded border px-2 text-xs" />

      <div class="flex gap-1">
        <Button
          size="sm"
          onclick={handleAddAllocation}
          disabled={!selectedBudgetId || !allocationAmount}>
          Add
        </Button>
        <Button size="sm" variant="outline" onclick={cancelAddingAllocation}>Cancel</Button>
      </div>
    </div>
  {:else}
    <!-- Add button or status -->
    {#if isFullyAllocated}
      <div class="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
        <CircleDollarSign class="h-3 w-3" />
        <span>Fully allocated</span>
      </div>
    {:else}
      <Button
        size="sm"
        variant="ghost"
        onclick={startAddingAllocation}
        class="h-6 justify-start px-2 text-xs">
        <Plus class="mr-1 h-3 w-3" />
        Add budget
      </Button>
    {/if}
  {/if}
</div>
