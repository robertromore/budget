<script lang="ts">
import { Zap, Target, Shuffle, TrendingUp, TriangleAlert } from '@lucide/svelte/icons';
import * as Card from '$lib/components/ui/card';
import { Button } from '$lib/components/ui/button';
import * as Select from '$lib/components/ui/select';
import NumericInput from '$lib/components/input/numeric-input.svelte';
import Label from '$lib/components/ui/label/label.svelte';
import { Badge } from '$lib/components/ui/badge';
import { cn } from '$lib/utils';
import { currencyFormatter } from '$lib/utils/formatters';
import { createNumericRecordAccessors } from '$lib/utils/bind-helpers';
import type { EnvelopeAllocation } from '$lib/schema/budgets/envelope-allocations';

interface Props {
  envelopes: EnvelopeAllocation[];
  getCategoryName: (categoryId: number) => string;
  availableFunds?: number;
  onBulkAllocate?: (allocations: { envelopeId: number; amount: number }[]) => void;
  onAutoBalance?: () => void;
  onEmergencyFill?: () => void;
  class?: string;
}

let {
  envelopes,
  getCategoryName,
  availableFunds = 0,
  onBulkAllocate,
  onAutoBalance,
  onEmergencyFill,
  class: className,
}: Props = $props();

let allocationMode = $state<'equal' | 'priority' | 'percentage' | 'manual'>('priority');
let totalToAllocate = $state(0);
let manualAllocations = $state<Record<number, number>>({});

const allocationModeLabel = $derived.by(() => {
  switch (allocationMode) {
    case 'priority':
      return 'By Priority';
    case 'equal':
      return 'Equal Distribution';
    case 'percentage':
      return 'By Current Allocation %';
    case 'manual':
      return 'Manual Amounts';
    default:
      return 'Select Strategy';
  }
});

const sortedEnvelopes = $derived.by(() => {
  return [...envelopes].sort((a, b) => {
    const aPriority = (a.metadata as any)?.priority ?? 5;
    const bPriority = (b.metadata as any)?.priority ?? 5;
    return aPriority - bPriority; // Lower number = higher priority
  });
});

const deficitEnvelopes = $derived.by(() => {
  return envelopes.filter((env) => env.deficitAmount > 0);
});

const emergencyFunds = $derived.by(() => {
  return envelopes.filter((env) => (env.metadata as any)?.isEmergencyFund);
});

const allocationPreview = $derived.by(() => {
  if (!Number.isFinite(totalToAllocate) || totalToAllocate <= 0) return [];

  switch (allocationMode) {
    case 'equal':
      return calculateEqualAllocation(totalToAllocate);
    case 'priority':
      return calculatePriorityAllocation(totalToAllocate);
    case 'percentage':
      return calculatePercentageAllocation(totalToAllocate);
    case 'manual':
      return calculateManualAllocation();
    default:
      return [];
  }
});

const totalAllocated = $derived.by(() => {
  return allocationPreview.reduce((sum, alloc) => sum + alloc.amount, 0);
});

const allocationDifference = $derived.by(() => {
  return Number.isFinite(totalToAllocate) ? totalToAllocate - totalAllocated : 0;
});

function calculateEqualAllocation(totalAmount: number) {
  const activeEnvelopes = envelopes.filter((env) => env.status === 'active');
  if (activeEnvelopes.length === 0) return [];

  const amountPerEnvelope = totalAmount / activeEnvelopes.length;
  return activeEnvelopes.map((env) => ({
    envelopeId: env.id,
    categoryName: getCategoryName(env.categoryId),
    amount: amountPerEnvelope,
    reason: 'Equal distribution',
  }));
}

function calculatePriorityAllocation(totalAmount: number) {
  const allocations: Array<{
    envelopeId: number;
    categoryName: string;
    amount: number;
    reason: string;
  }> = [];
  let remainingAmount = totalAmount;

  // First, fill deficit envelopes
  for (const envelope of deficitEnvelopes) {
    if (remainingAmount <= 0) break;
    const fillAmount = Math.min(envelope.deficitAmount, remainingAmount);
    allocations.push({
      envelopeId: envelope.id,
      categoryName: getCategoryName(envelope.categoryId),
      amount: fillAmount,
      reason: 'Deficit recovery',
    });
    remainingAmount -= fillAmount;
  }

  // Then allocate by priority
  const activeEnvelopes = sortedEnvelopes.filter(
    (env) => env.status === 'active' && env.deficitAmount === 0
  );

  if (remainingAmount > 0 && activeEnvelopes.length > 0) {
    // Calculate priority weights (inverse of priority number)
    const totalWeight = activeEnvelopes.reduce((sum, env) => {
      const priority = (env.metadata as any)?.priority ?? 5;
      return sum + (10 - priority); // Higher weight for lower priority numbers
    }, 0);

    for (const envelope of activeEnvelopes) {
      if (remainingAmount <= 0) break;
      const priority = (envelope.metadata as any)?.priority ?? 5;
      const weight = (10 - priority) / totalWeight;
      const allocationAmount = remainingAmount * weight;

      allocations.push({
        envelopeId: envelope.id,
        categoryName: getCategoryName(envelope.categoryId),
        amount: allocationAmount,
        reason: `Priority ${priority}`,
      });
    }
  }

  return allocations;
}

function calculatePercentageAllocation(totalAmount: number) {
  // Allocate based on current allocation percentages
  const totalCurrentAllocation = envelopes.reduce((sum, env) => sum + env.allocatedAmount, 0);
  if (totalCurrentAllocation === 0) return calculateEqualAllocation(totalAmount);

  return envelopes
    .filter((env) => env.status === 'active')
    .map((env) => {
      const percentage = env.allocatedAmount / totalCurrentAllocation;
      return {
        envelopeId: env.id,
        categoryName: getCategoryName(env.categoryId),
        amount: totalAmount * percentage,
        reason: `${(percentage * 100).toFixed(1)}% allocation`,
      };
    });
}

function calculateManualAllocation() {
  return Object.entries(manualAllocations)
    .map(([envelopeIdStr, amount]) => {
      const envelopeId = parseInt(envelopeIdStr);
      if (!Number.isFinite(amount) || amount <= 0) return null;

      const envelope = envelopes.find((env) => env.id === envelopeId);
      return envelope
        ? {
            envelopeId,
            categoryName: getCategoryName(envelope.categoryId),
            amount,
            reason: 'Manual allocation',
          }
        : null;
    })
    .filter(Boolean) as Array<{
    envelopeId: number;
    categoryName: string;
    amount: number;
    reason: string;
  }>;
}

function executeBulkAllocation() {
  if (allocationPreview.length === 0) return;

  const allocations = allocationPreview.map((alloc) => ({
    envelopeId: alloc.envelopeId,
    amount: alloc.amount,
  }));

  onBulkAllocate?.(allocations);

  // Reset form
  totalToAllocate = 0;
  manualAllocations = {};
}

function handleQuickAction(action: 'balance' | 'emergency') {
  switch (action) {
    case 'balance':
      onAutoBalance?.();
      break;
    case 'emergency':
      onEmergencyFill?.();
      break;
  }
}
</script>

<div class={cn('space-y-6', className)}>
  <!-- Quick Actions -->
  <Card.Root>
    <Card.Header>
      <Card.Title class="flex items-center gap-2">
        <Zap class="h-5 w-5" />
        Quick Actions
      </Card.Title>
    </Card.Header>
    <Card.Content>
      <div class="grid gap-3 md:grid-cols-3">
        <Button
          variant="outline"
          onclick={() => handleQuickAction('balance')}
          class="flex h-auto flex-col items-center gap-2 p-4">
          <Shuffle class="h-6 w-6" />
          <div class="text-center">
            <div class="font-medium">Auto Balance</div>
            <div class="text-muted-foreground text-xs">Optimize fund distribution</div>
          </div>
        </Button>

        <Button
          variant="outline"
          onclick={() => handleQuickAction('emergency')}
          class="flex h-auto flex-col items-center gap-2 p-4"
          disabled={emergencyFunds.length === 0}>
          <TriangleAlert class="h-6 w-6" />
          <div class="text-center">
            <div class="font-medium">Emergency Fill</div>
            <div class="text-muted-foreground text-xs">Fill emergency funds first</div>
          </div>
        </Button>

        <Button
          variant="outline"
          onclick={() => {
            allocationMode = 'priority';
            totalToAllocate = deficitEnvelopes.reduce((sum, env) => sum + env.deficitAmount, 0);
          }}
          class="flex h-auto flex-col items-center gap-2 p-4"
          disabled={deficitEnvelopes.length === 0}>
          <Target class="h-6 w-6" />
          <div class="text-center">
            <div class="font-medium">Cover Deficits</div>
            <div class="text-muted-foreground text-xs">
              {currencyFormatter.format(
                deficitEnvelopes.reduce((sum, env) => sum + env.deficitAmount, 0)
              )} needed
            </div>
          </div>
        </Button>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Bulk Allocation -->
  <Card.Root>
    <Card.Header>
      <Card.Title class="flex items-center gap-2">
        <TrendingUp class="h-5 w-5" />
        Bulk Fund Allocation
      </Card.Title>
      <Card.Description>
        Distribute funds across multiple envelopes using different allocation strategies.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <!-- Total Amount Input -->
      <div class="grid gap-4 md:grid-cols-2">
        <div class="space-y-2">
          <Label for="total-amount">Total Amount to Allocate</Label>
          <NumericInput id="total-amount" bind:value={totalToAllocate} />
          {#if availableFunds > 0}
            <p class="text-muted-foreground text-xs">
              Available funds: {currencyFormatter.format(availableFunds)}
            </p>
          {/if}
        </div>

        <div class="space-y-2">
          <Label>Allocation Strategy</Label>
          <Select.Root type="single" bind:value={allocationMode}>
            <Select.Trigger class="w-full justify-between">
              <span>{allocationModeLabel}</span>
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="priority">By Priority</Select.Item>
              <Select.Item value="equal">Equal Distribution</Select.Item>
              <Select.Item value="percentage">By Current Allocation %</Select.Item>
              <Select.Item value="manual">Manual Amounts</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>
      </div>

      <!-- Manual Allocation Mode -->
      {#if allocationMode === 'manual'}
        <div class="space-y-3">
          <Label>Manual Allocations</Label>
          <div class="grid gap-3 md:grid-cols-2">
            {#each envelopes.filter((env) => env.status === 'active') as envelope (envelope.id)}
              {@const accessors = createNumericRecordAccessors(manualAllocations, envelope.id, 0)}
              <div class="flex items-center gap-2">
                <span class="min-w-0 flex-1 truncate text-sm font-medium">
                  {getCategoryName(envelope.categoryId)}
                </span>
                <NumericInput
                  bind:value={accessors.get, accessors.set}
                  buttonClass="w-24 h-8 text-sm" />
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Allocation Preview -->
      {#if allocationPreview.length > 0}
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <Label>Allocation Preview</Label>
            <div class="flex items-center gap-2">
              <span class="text-sm">Total: {currencyFormatter.format(totalAllocated)}</span>
              {#if Math.abs(allocationDifference) > 0.01}
                <Badge
                  variant="outline"
                  class={cn(allocationDifference > 0 ? 'text-orange-600' : 'text-emerald-600')}>
                  {allocationDifference > 0 ? '+' : ''}{currencyFormatter.format(
                    allocationDifference
                  )} remaining
                </Badge>
              {/if}
            </div>
          </div>

          <div class="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
            {#each allocationPreview as allocation (allocation.envelopeId)}
              <div class="flex items-center justify-between text-sm">
                <div class="flex items-center gap-2">
                  <span class="font-medium">{allocation.categoryName}</span>
                  <Badge variant="outline" class="text-xs">{allocation.reason}</Badge>
                </div>
                <span class="font-mono">{currencyFormatter.format(allocation.amount)}</span>
              </div>
            {/each}
          </div>

          <Button
            onclick={executeBulkAllocation}
            disabled={allocationPreview.length === 0 ||
              Math.abs(allocationDifference) > totalToAllocate * 0.01}
            class="w-full">
            Execute Allocation ({allocationPreview.length} envelopes)
          </Button>
        </div>
      {/if}
    </Card.Content>
  </Card.Root>

  <!-- Deficit Summary -->
  {#if deficitEnvelopes.length > 0}
    <Card.Root class="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
      <Card.Header>
        <Card.Title class="flex items-center gap-2 text-orange-700 dark:text-orange-300">
          <TriangleAlert class="h-5 w-5" />
          Deficit Summary
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="space-y-3">
          {#each deficitEnvelopes as envelope (envelope.id)}
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium">{getCategoryName(envelope.categoryId)}</span>
              <span class="text-destructive font-mono text-sm">
                -{currencyFormatter.format(envelope.deficitAmount)}
              </span>
            </div>
          {/each}
          <div class="flex items-center justify-between border-t pt-2 font-medium">
            <span>Total Deficit</span>
            <span class="text-destructive">
              -{currencyFormatter.format(
                deficitEnvelopes.reduce((sum, env) => sum + env.deficitAmount, 0)
              )}
            </span>
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}
</div>
