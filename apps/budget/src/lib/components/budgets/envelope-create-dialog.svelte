<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Dialog from '$lib/components/ui/dialog';
import { Input } from '$lib/components/ui/input';
import Label from '$lib/components/ui/label/label.svelte';
import * as Select from '$lib/components/ui/select';
import type { BudgetPeriodInstance } from '$lib/schema/budgets';
import { rolloverModeOptions, type RolloverMode } from '$lib/schema/budgets/envelope-allocations';
import type { Category } from '$lib/schema/categories';
import type { EnvelopeAllocationRequest } from '$lib/server/domains/budgets/envelope-service';

interface Props {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  budgetId: number;
  periodInstance: BudgetPeriodInstance;
  availableCategories: Category[];
  onEnvelopeCreated?: (envelope: EnvelopeAllocationRequest) => void;
}

let {
  open = $bindable(false),
  onOpenChange,
  budgetId,
  periodInstance,
  availableCategories,
  onEnvelopeCreated,
}: Props = $props();

let selectedCategoryId = $state<string>('');
let allocatedAmount = $state('');
let rolloverMode = $state<RolloverMode>('unlimited');
let isEmergencyFund = $state(false);
let priority = $state('5');
let maxRolloverMonths = $state('3');
let autoRefill = $state(false);
let autoRefillAmount = $state('');

const isFormValid = $derived(() => {
  return (
    selectedCategoryId &&
    allocatedAmount &&
    Number(allocatedAmount) >= 0 &&
    (!rolloverMode || rolloverMode === 'limited' ? maxRolloverMonths : true)
  );
});

const selectedCategory = $derived(() => {
  return availableCategories.find((cat) => cat.id === Number(selectedCategoryId));
});

function resetForm() {
  selectedCategoryId = '';
  allocatedAmount = '';
  rolloverMode = 'unlimited';
  isEmergencyFund = false;
  priority = '5';
  maxRolloverMonths = '3';
  autoRefill = false;
  autoRefillAmount = '';
}

function handleOpenChange(newOpen: boolean) {
  open = newOpen;
  onOpenChange?.(newOpen);
  if (!newOpen) {
    resetForm();
  }
}

async function handleSubmit() {
  if (!isFormValid) return;

  const metadata: Record<string, unknown> = {
    priority: Number(priority),
    isEmergencyFund,
  };

  if (rolloverMode === 'limited') {
    metadata['maxRolloverMonths'] = Number(maxRolloverMonths);
  }

  if (autoRefill && autoRefillAmount) {
    metadata['autoRefill'] = Number(autoRefillAmount);
  }

  const envelopeData: EnvelopeAllocationRequest = {
    budgetId,
    categoryId: Number(selectedCategoryId),
    periodInstanceId: periodInstance.id,
    allocatedAmount: Number(allocatedAmount),
    rolloverMode,
    metadata,
  };

  onEnvelopeCreated?.(envelopeData);
  handleOpenChange(false);
}
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
  <Dialog.Content class="max-w-lg">
    <Dialog.Header>
      <Dialog.Title>Create Envelope Allocation</Dialog.Title>
      <Dialog.Description>
        Set up a new envelope for category-based budget tracking with rollover options.
      </Dialog.Description>
    </Dialog.Header>

    <form
      onsubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      class="space-y-4">
      <!-- Category Selection -->
      <div class="space-y-2">
        <Label for="category-select">Category</Label>
        <Select.Root type="single" bind:value={selectedCategoryId}>
          <Select.Trigger id="category-select">Select a Category</Select.Trigger>
          <Select.Content>
            {#each availableCategories as category (category.id)}
              <Select.Item value={String(category.id)}>
                <div class="flex items-center gap-2">
                  <span>{category.name}</span>
                  {#if category.notes}
                    <span class="text-muted-foreground text-xs">- {category.notes}</span>
                  {/if}
                </div>
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>

      <!-- Allocated Amount -->
      <div class="space-y-2">
        <Label for="allocated-amount">Initial Allocation</Label>
        <Input
          id="allocated-amount"
          type="number"
          step="0.01"
          min="0"
          bind:value={allocatedAmount}
          placeholder="0.00"
          required />
      </div>

      <!-- Rollover Mode -->
      <div class="space-y-2">
        <Label>Rollover Mode</Label>
        <Select.Root type="single" bind:value={rolloverMode}>
          <Select.Trigger>
            <span
              >{rolloverModeOptions.find((option) => option.value === rolloverMode)?.label}</span>
          </Select.Trigger>
          <Select.Content>
            {#each rolloverModeOptions as option (option.value)}
              <Select.Item value={option.value}>
                <div class="flex flex-col">
                  <span>{option.label}</span>
                  <span class="text-muted-foreground text-xs">{option.description}</span>
                </div>
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>

      <!-- Limited Rollover Settings -->
      {#if rolloverMode === 'limited'}
        <div class="space-y-2">
          <Label for="max-rollover">Max Rollover Months</Label>
          <Input
            id="max-rollover"
            type="number"
            min="1"
            max="12"
            bind:value={maxRolloverMonths}
            placeholder="3" />
          <p class="text-muted-foreground text-xs">
            Maximum number of months to carry forward unused funds
          </p>
        </div>
      {/if}

      <!-- Priority Setting -->
      <div class="space-y-2">
        <Label for="priority">Priority Level</Label>
        <Select.Root type="single" bind:value={priority}>
          <Select.Trigger>
            <span
              >{priority} - {[
                'Lowest Priority',
                'Low Priority',
                'Medium-Low Priority',
                'Medium Priority',
                'Normal Priority',
                'High Priority',
                'Highest Priority',
              ][Number(priority) - 1]}</span>
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="1">1 - Highest Priority</Select.Item>
            <Select.Item value="2">2 - High Priority</Select.Item>
            <Select.Item value="3">3 - Medium-High Priority</Select.Item>
            <Select.Item value="4">4 - Medium Priority</Select.Item>
            <Select.Item value="5">5 - Normal Priority</Select.Item>
            <Select.Item value="6">6 - Low Priority</Select.Item>
            <Select.Item value="7">7 - Lowest Priority</Select.Item>
          </Select.Content>
        </Select.Root>
        <p class="text-muted-foreground text-xs">
          Used for automatic fund allocation and deficit recovery
        </p>
      </div>

      <!-- Special Options -->
      <div class="space-y-3">
        <div class="flex items-center space-x-2">
          <input
            id="emergency-fund"
            type="checkbox"
            bind:checked={isEmergencyFund}
            class="text-primary focus:ring-primary rounded border-gray-300" />
          <Label for="emergency-fund" class="text-sm">Emergency Fund</Label>
        </div>
        {#if isEmergencyFund}
          <p class="text-muted-foreground ml-6 text-xs">
            This envelope will be used as a source for deficit recovery and have special priority
            handling
          </p>
        {/if}

        <div class="flex items-center space-x-2">
          <input
            id="auto-refill"
            type="checkbox"
            bind:checked={autoRefill}
            class="text-primary focus:ring-primary rounded border-gray-300" />
          <Label for="auto-refill" class="text-sm">Auto-refill on rollover</Label>
        </div>
        {#if autoRefill}
          <div class="ml-6 space-y-2">
            <Label for="auto-refill-amount" class="text-sm">Auto-refill Amount</Label>
            <Input
              id="auto-refill-amount"
              type="number"
              step="0.01"
              min="0"
              bind:value={autoRefillAmount}
              placeholder="0.00"
              class="w-32" />
            <p class="text-muted-foreground text-xs">
              Minimum amount to maintain in this envelope after rollover
            </p>
          </div>
        {/if}
      </div>

      <!-- Preview -->
      {#if selectedCategory}
        <div class="bg-muted/50 rounded-lg border p-3">
          <h4 class="mb-2 font-medium">Envelope Preview</h4>
          <div class="space-y-1 text-sm">
            <div class="flex justify-between">
              <span>Category:</span>
              <span>{selectedCategory.name}</span>
            </div>
            <div class="flex justify-between">
              <span>Initial Allocation:</span>
              <span>${allocatedAmount || '0.00'}</span>
            </div>
            <div class="flex justify-between">
              <span>Rollover Mode:</span>
              <span class="capitalize">{rolloverMode}</span>
            </div>
            <div class="flex justify-between">
              <span>Priority:</span>
              <span>{priority}</span>
            </div>
            {#if isEmergencyFund}
              <div class="flex items-center gap-2">
                <Badge variant="secondary">Emergency Fund</Badge>
              </div>
            {/if}
          </div>
        </div>
      {/if}

      <Dialog.Footer>
        <Button type="button" variant="outline" onclick={() => handleOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={!isFormValid}>Create Envelope</Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
