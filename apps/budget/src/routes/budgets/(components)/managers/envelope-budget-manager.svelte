<script lang="ts">
import {TriangleAlert, Plus, ArrowUpDown, Wallet, Grip} from '@lucide/svelte/icons';
import * as Card from '$lib/components/ui/card';
import {Button} from '$lib/components/ui/button';
import Label from '$lib/components/ui/label/label.svelte';
import {Badge} from '$lib/components/ui/badge';
import {Progress} from '$lib/components/ui/progress';
import * as Dialog from '$lib/components/ui/dialog';
import * as Tabs from '$lib/components/ui/tabs';
import * as Select from '$lib/components/ui/select';
import NumericInput from '$lib/components/input/numeric-input.svelte';
import EnvelopeAllocationCard from '$lib/components/budgets/envelope-allocation-card.svelte';
import FundAllocationPanel from '$lib/components/budgets/fund-allocation-panel.svelte';
import EnvelopeDragDropManager from '$lib/components/budgets/envelope-drag-drop-manager.svelte';
import EnvelopeCreateSheet from '$lib/components/budgets/envelope-create-sheet.svelte';
import {cn} from '$lib/utils';
import {currencyFormatter} from '$lib/utils/formatters';
import type {BudgetWithRelations} from '$lib/server/domains/budgets';
import type {EnvelopeAllocation} from '$lib/schema/budgets/envelope-allocations';
import type {Category} from '$lib/schema/categories';
import type {BudgetPeriodInstance} from '$lib/schema/budgets';
import type {EnvelopeAllocationRequest} from '$lib/server/domains/budgets/envelope-service';

interface Props {
  budget: BudgetWithRelations;
  envelopes: EnvelopeAllocation[];
  categories: Category[];
  periodInstance?: BudgetPeriodInstance;
  onEnvelopeUpdate?: (envelopeId: number, newAmount: number) => void;
  onFundTransfer?: (fromId: number, toId: number, amount: number) => void;
  onDeficitRecover?: (envelopeId: number) => void;
  onActivate?: (envelope: EnvelopeAllocation) => void;
  onAddEnvelope?: (categoryId: number, amount: number) => void;
  onEnvelopeCreated?: (envelope: EnvelopeAllocationRequest) => void;
  class?: string;
}

let {
  budget,
  envelopes = [],
  categories = [],
  periodInstance,
  onEnvelopeUpdate,
  onFundTransfer,
  onDeficitRecover,
  onActivate,
  onAddEnvelope,
  onEnvelopeCreated,
  class: className,
}: Props = $props();

let transferDialogOpen = $state(false);
let selectedSourceEnvelope = $state<EnvelopeAllocation | null>(null);
let selectedTargetEnvelopeId = $state<string>('');
let transferAmount = $state(0);

let addEnvelopeDialogOpen = $state(false);

let isLoading = $state(false);

const categoryMap = $derived(
  new Map(Array.isArray(categories) ? categories.map((cat) => [cat.id, cat]) : [])
);

const envelopesByStatus = $derived.by(() => {
  const groups = {
    overspent: [] as EnvelopeAllocation[],
    depleted: [] as EnvelopeAllocation[],
    active: [] as EnvelopeAllocation[],
    paused: [] as EnvelopeAllocation[],
  };

  if (!Array.isArray(envelopes)) {
    return groups;
  }

  envelopes.forEach((envelope) => {
    groups[envelope.status].push(envelope);
  });

  return groups;
});

// Budget summary metrics as individual derived variables
const totalAllocated = $derived.by(() => {
  if (!Array.isArray(envelopes) || envelopes.length === 0) return 0;
  return envelopes.reduce((sum, env) => sum + env.allocatedAmount, 0);
});

const totalSpent = $derived.by(() => {
  if (!Array.isArray(envelopes) || envelopes.length === 0) return 0;
  return envelopes.reduce((sum, env) => sum + env.spentAmount, 0);
});

const totalAvailable = $derived.by(() => {
  if (!Array.isArray(envelopes) || envelopes.length === 0) return 0;
  return envelopes.reduce((sum, env) => sum + env.availableAmount, 0);
});

const totalDeficit = $derived.by(() => {
  if (!Array.isArray(envelopes) || envelopes.length === 0) return 0;
  return envelopes.reduce((sum, env) => sum + env.deficitAmount, 0);
});

const spentPercentage = $derived.by(() => {
  if (!Array.isArray(envelopes) || envelopes.length === 0) return 0;
  return totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;
});

function getCategoryName(categoryId: number): string {
  return categoryMap.get(categoryId)?.name ?? `Category ${categoryId}`;
}

function initiateFundTransfer(fromEnvelope: EnvelopeAllocation) {
  selectedSourceEnvelope = fromEnvelope;
  selectedTargetEnvelopeId = '';
  transferAmount = 0;
  transferDialogOpen = true;
}

function executeFundTransfer() {
  if (!selectedSourceEnvelope || !selectedTargetEnvelopeId) return;
  if (!Number.isFinite(transferAmount) || transferAmount <= 0) return;

  const targetId = parseInt(selectedTargetEnvelopeId);
  onFundTransfer?.(selectedSourceEnvelope.id, targetId, transferAmount);
  transferDialogOpen = false;
}

function handleDeficitRecover(envelope: EnvelopeAllocation) {
  onDeficitRecover?.(envelope.id);
}

async function handleAutoBalance() {
  if (!Array.isArray(envelopes) || envelopes.length === 0) return;

  // Calculate total available funds
  const totalFunds = envelopes.reduce((sum, env) => sum + env.availableAmount, 0);
  if (totalFunds <= 0) return;

  // Get active envelopes only
  const activeEnvelopes = envelopes.filter((env) => env.status === 'active');
  if (activeEnvelopes.length === 0) return;

  // Calculate equal distribution
  const amountPerEnvelope = totalFunds / activeEnvelopes.length;

  isLoading = true;
  // Update each envelope
  for (const envelope of activeEnvelopes) {
    try {
      await onEnvelopeUpdate?.(envelope.id, amountPerEnvelope);
    } catch (error) {
      console.error(`Failed to balance envelope ${envelope.id}:`, error);
    }
  }
  isLoading = false;
}

async function handleEmergencyFill() {
  if (!Array.isArray(envelopes) || envelopes.length === 0) return;

  // Find emergency fund envelopes (marked in metadata)
  const emergencyEnvelopes = envelopes.filter(
    (env) => (env.metadata as any)?.isEmergencyFund && env.status === 'active'
  );

  if (emergencyEnvelopes.length === 0) return;

  // Calculate total available funds from non-emergency envelopes
  const nonEmergencyEnvelopes = envelopes.filter(
    (env) => !(env.metadata as any)?.isEmergencyFund && env.availableAmount > 0
  );

  const availableFunds = nonEmergencyEnvelopes.reduce((sum, env) => sum + env.availableAmount, 0);
  if (availableFunds <= 0) return;

  // Distribute funds equally among emergency envelopes
  const amountPerEmergency = availableFunds / emergencyEnvelopes.length;

  isLoading = true;
  // Update emergency envelopes
  for (const envelope of emergencyEnvelopes) {
    try {
      const newAmount = envelope.allocatedAmount + amountPerEmergency;
      await onEnvelopeUpdate?.(envelope.id, newAmount);
    } catch (error) {
      console.error(`Failed to fill emergency envelope ${envelope.id}:`, error);
    }
  }
  isLoading = false;
}

const transferFormValid = $derived(() => {
  if (!selectedSourceEnvelope || !selectedTargetEnvelopeId) return false;
  return (
    Number.isFinite(transferAmount) &&
    transferAmount > 0 &&
    transferAmount <= selectedSourceEnvelope.availableAmount
  );
});

function openAddEnvelopeDialog() {
  addEnvelopeDialogOpen = true;
}

function handleEnvelopeCreated(envelopeData: EnvelopeAllocationRequest) {
  // Call the new comprehensive handler if provided
  if (onEnvelopeCreated) {
    onEnvelopeCreated(envelopeData);
  }
  // Fallback to simple handler for backward compatibility
  else if (onAddEnvelope) {
    onAddEnvelope(envelopeData.categoryId, envelopeData.allocatedAmount);
  }
  addEnvelopeDialogOpen = false;
}

// Get categories that don't already have envelopes
const availableCategories = $derived.by(() => {
  if (!Array.isArray(categories) || !Array.isArray(envelopes)) return [];
  const usedCategoryIds = new Set(envelopes.map((env) => env.categoryId));
  return categories.filter((cat) => !usedCategoryIds.has(cat.id));
});

// Selected labels for dropdowns
const selectedTargetLabel = $derived.by(() => {
  if (!selectedTargetEnvelopeId) return 'Select destination envelope';
  const envelope = envelopes.find((e) => e.id === parseInt(selectedTargetEnvelopeId));
  return envelope ? getCategoryName(envelope.categoryId) : 'Select destination envelope';
});
</script>

<div class={cn('space-y-6', className)}>
  <!-- Budget Summary Header -->
  <Card.Root>
    <Card.Header>
      <Card.Title class="flex items-center gap-2">
        <Wallet class="h-5 w-5" />
        {budget.name} - Envelope Budget
      </Card.Title>
    </Card.Header>
    <Card.Content>
      <div class="grid gap-4 md:grid-cols-4">
        <div class="space-y-1">
          <p class="text-muted-foreground text-sm">Total Allocated</p>
          <p class="text-2xl font-bold">{currencyFormatter.format(totalAllocated)}</p>
        </div>
        <div class="space-y-1">
          <p class="text-muted-foreground text-sm">Total Spent</p>
          <p class="text-2xl font-bold">{currencyFormatter.format(totalSpent)}</p>
        </div>
        <div class="space-y-1">
          <p class="text-muted-foreground text-sm">Available</p>
          <p class="text-2xl font-bold text-emerald-600">
            {currencyFormatter.format(totalAvailable)}
          </p>
        </div>
        <div class="space-y-1">
          <p class="text-muted-foreground text-sm">Deficit</p>
          <p class="text-destructive text-2xl font-bold">
            {currencyFormatter.format(totalDeficit)}
          </p>
        </div>
      </div>

      <div class="mt-4">
        <div class="mb-2 flex items-center justify-between text-sm">
          <span>Overall Progress</span>
          <span>{spentPercentage.toFixed(1)}%</span>
        </div>
        <Progress value={spentPercentage} class="h-2" />
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Deficit Envelopes (Priority Alert) -->
  {#if envelopesByStatus.overspent.length > 0}
    <Card.Root class="border-destructive/50 bg-destructive/5">
      <Card.Header>
        <Card.Title class="text-destructive flex items-center gap-2">
          <TriangleAlert class="h-5 w-5" />
          Overspent Envelopes ({envelopesByStatus.overspent.length})
        </Card.Title>
        <Card.Description>
          These envelopes have exceeded their allocated amounts and need immediate attention.
        </Card.Description>
      </Card.Header>
      <Card.Content class="space-y-3">
        {#each envelopesByStatus.overspent as envelope (envelope.id)}
          <div
            class="border-destructive/20 bg-destructive/5 flex items-center justify-between rounded-lg border p-3">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <h4 class="font-medium">{getCategoryName(envelope.categoryId)}</h4>
                <Badge variant="destructive"
                  >Deficit: {currencyFormatter.format(envelope.deficitAmount)}</Badge>
              </div>
              <p class="text-muted-foreground text-sm">
                Spent: {currencyFormatter.format(envelope.spentAmount)} / Allocated: {currencyFormatter.format(
                  envelope.allocatedAmount
                )}
              </p>
            </div>
            <div class="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onclick={() => initiateFundTransfer(envelope)}
                disabled={envelopes.filter((e) => e.id !== envelope.id && e.availableAmount > 0)
                  .length === 0}>
                <ArrowUpDown class="mr-1 h-4 w-4" />
                Transfer Funds
              </Button>
              <Button size="sm" onclick={() => handleDeficitRecover(envelope)}>Auto Recover</Button>
            </div>
          </div>
        {/each}
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Envelope Management Tabs -->
  <Tabs.Root value="envelopes" class="space-y-6">
    <Tabs.List class="grid w-full grid-cols-3">
      <Tabs.Trigger value="envelopes">
        <Wallet class="mr-2 h-4 w-4" />
        Envelopes
      </Tabs.Trigger>
      <Tabs.Trigger value="drag-drop">
        <Grip class="mr-2 h-4 w-4" />
        Drag & Drop
      </Tabs.Trigger>
      <Tabs.Trigger value="allocation">
        <ArrowUpDown class="mr-2 h-4 w-4" />
        Bulk Allocation
      </Tabs.Trigger>
    </Tabs.List>

    <!-- Envelopes Tab -->
    <Tabs.Content value="envelopes" class="space-y-6">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-medium">
          Active Envelopes ({envelopesByStatus.active.length + envelopesByStatus.depleted.length})
        </h3>
        <Button
          size="sm"
          variant="outline"
          onclick={openAddEnvelopeDialog}
          disabled={availableCategories.length === 0}>
          <Plus class="mr-1 h-4 w-4" />
          Add Envelope
        </Button>
      </div>

      {#if isLoading}
        <div class="flex items-center justify-center py-12">
          <div class="space-y-2 text-center">
            <div class="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2"></div>
            <p class="text-muted-foreground text-sm">Updating envelopes...</p>
          </div>
        </div>
      {:else}
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {#each [...envelopesByStatus.active, ...envelopesByStatus.depleted] as envelope (envelope.id)}
            <EnvelopeAllocationCard
              {envelope}
              categoryName={getCategoryName(envelope.categoryId)}
              editable={true}
              onUpdateAllocation={(newAmount) => onEnvelopeUpdate?.(envelope.id, newAmount)}
              onTransferRequest={() => initiateFundTransfer(envelope)}
              onDeficitRecover={() => handleDeficitRecover(envelope)} />
          {/each}
        </div>
      {/if}
    </Tabs.Content>

    <!-- Drag & Drop Tab -->
    <Tabs.Content value="drag-drop">
      {#if onFundTransfer}
        <EnvelopeDragDropManager {envelopes} {getCategoryName} {onFundTransfer} />
      {:else}
        <Card.Root>
          <Card.Content class="text-muted-foreground py-8 text-center">
            Drag & Drop functionality requires fund transfer handler.
          </Card.Content>
        </Card.Root>
      {/if}
    </Tabs.Content>

    <!-- Bulk Allocation Tab -->
    <Tabs.Content value="allocation">
      <FundAllocationPanel
        {envelopes}
        {getCategoryName}
        availableFunds={totalAvailable}
        onBulkAllocate={(allocations) => {
          allocations.forEach((alloc) => {
            onEnvelopeUpdate?.(alloc.envelopeId, alloc.amount);
          });
        }}
        onAutoBalance={handleAutoBalance}
        onEmergencyFill={handleEmergencyFill} />
    </Tabs.Content>
  </Tabs.Root>

  <!-- Paused Envelopes -->
  {#if envelopesByStatus.paused.length > 0}
    <Card.Root class="bg-muted/30">
      <Card.Header>
        <Card.Title class="text-muted-foreground">
          Paused Envelopes ({envelopesByStatus.paused.length})
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="grid gap-2">
          {#each envelopesByStatus.paused as envelope (envelope.id)}
            <div class="bg-background flex items-center justify-between rounded-md border p-2">
              <span class="text-sm">{getCategoryName(envelope.categoryId)}</span>
              <div class="flex items-center gap-2">
                <span class="text-muted-foreground text-sm">
                  {currencyFormatter.format(envelope.availableAmount)}
                </span>
                <Button size="sm" variant="outline" onclick={() => onActivate?.(envelope)}
                  >Activate</Button>
              </div>
            </div>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>
  {/if}
</div>

<!-- Fund Transfer Dialog -->
<Dialog.Root bind:open={transferDialogOpen}>
  <Dialog.Content class="max-w-md">
    <Dialog.Header>
      <Dialog.Title>Transfer Funds</Dialog.Title>
      <Dialog.Description>
        Move money between envelopes to optimize your budget allocation.
      </Dialog.Description>
    </Dialog.Header>

    {#if selectedSourceEnvelope}
      <div class="space-y-4">
        <div class="space-y-2">
          <Label>From Envelope</Label>
          <div class="bg-muted/50 rounded-md border p-3">
            <div class="font-medium">{getCategoryName(selectedSourceEnvelope.categoryId)}</div>
            <div class="text-muted-foreground text-sm">
              Available: {currencyFormatter.format(selectedSourceEnvelope.availableAmount)}
            </div>
          </div>
        </div>

        <div class="space-y-2">
          <Label>To Envelope</Label>
          <Select.Root type="single" bind:value={selectedTargetEnvelopeId}>
            <Select.Trigger class="w-full justify-between">
              <span>{selectedTargetLabel}</span>
            </Select.Trigger>
            <Select.Content>
              {#each envelopes.filter((e) => e.id !== selectedSourceEnvelope?.id) as envelope (envelope.id)}
                <Select.Item value={String(envelope.id)}>
                  {getCategoryName(envelope.categoryId)}
                </Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>

        <div class="space-y-2">
          <Label for="transfer-amount">Amount</Label>
          <NumericInput bind:value={transferAmount} id="transfer-amount" />
          <p class="text-muted-foreground text-xs">
            Available: {currencyFormatter.format(selectedSourceEnvelope.availableAmount)}
          </p>
        </div>
      </div>

      <Dialog.Footer>
        <Button variant="outline" onclick={() => (transferDialogOpen = false)}>Cancel</Button>
        <Button onclick={executeFundTransfer} disabled={!transferFormValid}>Transfer Funds</Button>
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>

<!-- Add Envelope Dialog -->
{#if periodInstance}
  <EnvelopeCreateSheet
    bind:open={addEnvelopeDialogOpen}
    budgetId={budget.id}
    {periodInstance}
    {availableCategories}
    onEnvelopeCreated={handleEnvelopeCreated} />
{:else}
  <!-- Fallback to simple form if no period instance -->
  <Dialog.Root bind:open={addEnvelopeDialogOpen}>
    <Dialog.Content class="max-w-md">
      <Dialog.Header>
        <Dialog.Title>Add New Envelope</Dialog.Title>
        <Dialog.Description>
          Create a new envelope allocation for a category in this budget period.
        </Dialog.Description>
      </Dialog.Header>

      <div class="space-y-4">
        <div class="space-y-2">
          <Label>Category</Label>
          {#if availableCategories.length > 0}
            <p class="text-muted-foreground text-sm">
              Period management required for full envelope features. This is a simplified version.
            </p>
          {:else}
            <p class="text-muted-foreground text-sm">All categories already have envelopes</p>
          {/if}
        </div>
      </div>

      <Dialog.Footer>
        <Button variant="outline" onclick={() => (addEnvelopeDialogOpen = false)}>Close</Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
{/if}
