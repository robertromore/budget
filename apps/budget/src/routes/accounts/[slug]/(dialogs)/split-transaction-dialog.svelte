<script lang="ts">
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { Button } from '$lib/components/ui/button';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import * as Select from '$lib/components/ui/select/index.js';
import { splitTransaction, unsplitTransaction, getSplitChildren } from '$lib/query/transactions';
import { CategoriesState } from '$lib/states/entities/categories.svelte';
import type { TransactionsFormat } from '$lib/types';
import { currencyFormatter } from '$lib/utils/formatters';
import { createQuery } from '@tanstack/svelte-query';
import Plus from '@lucide/svelte/icons/plus';
import Trash2 from '@lucide/svelte/icons/trash-2';

interface Props {
  transaction: TransactionsFormat;
  open: boolean;
}

let { transaction, open = $bindable(false) }: Props = $props();

const categoriesState = CategoriesState.get();
const categories = $derived(Array.from(categoriesState.categories.values()));

interface SplitRow {
  amount: string;
  categoryId: number | null;
}

let splits = $state<SplitRow[]>([
  { amount: '', categoryId: null },
  { amount: '', categoryId: null },
]);

const parentAmount = $derived(transaction.amount);
const allocatedAmount = $derived(
  splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0)
);
const remaining = $derived(parentAmount - allocatedAmount);
const isValid = $derived(Math.abs(remaining) <= 0.01 && splits.length >= 2);

const splitMutation = splitTransaction.options();

function addRow() {
  splits = [...splits, { amount: '', categoryId: null }];
}

function removeRow(index: number) {
  if (splits.length <= 2) return;
  splits = splits.filter((_, i) => i !== index);
}

function setRemainingOnLast() {
  if (splits.length < 2) return;
  const lastIndex = splits.length - 1;
  const otherSum = splits
    .slice(0, lastIndex)
    .reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
  splits[lastIndex].amount = (parentAmount - otherSum).toFixed(2);
}

async function handleSplit() {
  const splitData = splits.map((s) => ({
    amount: parseFloat(s.amount) || 0,
    categoryId: s.categoryId,
  }));

  await splitMutation.mutateAsync({
    parentId: transaction.id as number,
    splits: splitData,
    accountId: transaction.accountId,
  });

  open = false;
  splits = [
    { amount: '', categoryId: null },
    { amount: '', categoryId: null },
  ];
}

// Reset when dialog opens
$effect(() => {
  if (open) {
    splits = [
      { amount: '', categoryId: null },
      { amount: '', categoryId: null },
    ];
  }
});
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Content class="max-w-lg">
    <AlertDialog.Header>
      <AlertDialog.Title>Split Transaction</AlertDialog.Title>
      <AlertDialog.Description>
        Divide this {currencyFormatter.format(Math.abs(parentAmount))} transaction into multiple categories.
      </AlertDialog.Description>
    </AlertDialog.Header>

    <div class="space-y-3">
      {#each splits as split, index}
        <div class="flex items-end gap-2">
          <div class="min-w-0 flex-1">
            {#if index === 0}
              <Label class="mb-1 text-xs">Category</Label>
            {/if}
            <Select.Root
              type="single"
              value={split.categoryId?.toString() ?? ''}
              onValueChange={(value) => {
                splits[index].categoryId = value ? parseInt(value) : null;
              }}>
              <Select.Trigger class="h-9 w-full text-sm">
                {#if split.categoryId}
                  {@const cat = categoriesState.getById(split.categoryId)}
                  {cat?.name ?? 'Select category'}
                {:else}
                  Select category
                {/if}
              </Select.Trigger>
              <Select.Content>
                {#each categories as category (category.id)}
                  <Select.Item value={category.id.toString()}>
                    {category.name}
                  </Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>
          </div>
          <div class="w-28 shrink-0">
            {#if index === 0}
              <Label class="mb-1 text-xs">Amount</Label>
            {/if}
            <Input
              type="number"
              step="0.01"
              class="h-9 text-sm"
              placeholder="0.00"
              bind:value={split.amount} />
          </div>
          <Button
            variant="ghost"
            size="icon"
            class="h-9 w-9 shrink-0"
            disabled={splits.length <= 2}
            onclick={() => removeRow(index)}>
            <Trash2 class="h-4 w-4" />
          </Button>
        </div>
      {/each}

      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" onclick={addRow}>
          <Plus class="mr-1.5 h-3.5 w-3.5" />
          Add Row
        </Button>
        <Button variant="ghost" size="sm" onclick={setRemainingOnLast}>
          Auto-fill last
        </Button>
      </div>

      <!-- Summary -->
      <div class="border-t pt-3">
        <div class="flex justify-between text-sm">
          <span class="text-muted-foreground">Total</span>
          <span class="font-medium">{currencyFormatter.format(Math.abs(parentAmount))}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-muted-foreground">Allocated</span>
          <span class="font-medium">{currencyFormatter.format(Math.abs(allocatedAmount))}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-muted-foreground">Remaining</span>
          <span
            class="font-medium"
            class:text-destructive={Math.abs(remaining) > 0.01}
            class:text-success={Math.abs(remaining) <= 0.01}>
            {currencyFormatter.format(Math.abs(remaining))}
          </span>
        </div>
      </div>
    </div>

    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={handleSplit}
        disabled={!isValid || splitMutation.isPending}>
        {splitMutation.isPending ? 'Splitting...' : 'Split Transaction'}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
