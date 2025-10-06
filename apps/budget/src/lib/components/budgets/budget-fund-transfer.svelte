<script lang="ts">
  import {SvelteMap} from "svelte/reactivity";
  import {ArrowRightLeft, DollarSign, Target, Shuffle, AlertCircle, CheckCircle2} from "@lucide/svelte/icons";
  import * as Card from "$lib/components/ui/card";
  import {Button} from "$lib/components/ui/button";
  import {Input} from "$lib/components/ui/input";
  import {Label} from "$lib/components/ui/label";
  import {Badge} from "$lib/components/ui/badge";
  import * as Dialog from "$lib/components/ui/dialog";
  import {cn} from "$lib/utils";
  import {currencyFormatter} from "$lib/utils/formatters";
  import {calculateActualSpent} from "$lib/utils/budget-calculations";
  import type {BudgetWithRelations} from "$lib/server/domains/budgets";

  interface BudgetEnvelope {
    id: number;
    name: string;
    allocatedAmount: number;
    spentAmount: number;
    availableAmount: number;
    type: string;
    status: 'active' | 'paused' | 'overspent';
  }

  interface Props {
    budgets: BudgetWithRelations[];
    onFundTransfer?: (fromId: number, toId: number, amount: number) => Promise<void>;
    class?: string;
  }

  let {
    budgets = [],
    onFundTransfer,
    class: className,
  }: Props = $props();

  // State for drag and drop
  let draggedBudget = $state<BudgetEnvelope | null>(null);
  let dragOverBudget = $state<number | null>(null);
  let showTransferDialog = $state(false);
  let transferAmount = $state("");
  let isTransferring = $state(false);
  let transferResult = $state<{success: boolean, message: string} | null>(null);

  // Convert budget data to envelope format
  const envelopes = $derived.by(() => {
    return budgets.map(budget => {
      const allocated = Math.abs((budget.metadata as any)?.allocatedAmount ?? 0);
      const spent = calculateActualSpent(budget);
      const available = allocated - spent;

      let status: 'active' | 'paused' | 'overspent' = 'active';
      if (budget.status !== 'active') status = 'paused';
      else if (spent > allocated) status = 'overspent';

      return {
        id: budget.id,
        name: budget.name,
        allocatedAmount: allocated,
        spentAmount: spent,
        availableAmount: Math.max(0, available),
        type: budget.type || 'general',
        status
      };
    });
  });

  // Separate envelopes by status for better organization
  const activeEnvelopes = $derived(() => envelopes.filter(e => e.status === 'active'));
  const overspentEnvelopes = $derived(() => envelopes.filter(e => e.status === 'overspent'));
  const pausedEnvelopes = $derived(() => envelopes.filter(e => e.status === 'paused'));

  // Current transfer context
  let sourceBudget = $state<BudgetEnvelope | null>(null);
  let targetBudget = $state<BudgetEnvelope | null>(null);

  // Drag and drop handlers
  function handleDragStart(envelope: BudgetEnvelope, event: DragEvent) {
    if (envelope.availableAmount <= 0) {
      event.preventDefault();
      return;
    }
    draggedBudget = envelope;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', envelope.id.toString());
    }
  }

  function handleDragOver(envelopeId: number, event: DragEvent) {
    if (!draggedBudget || draggedBudget.id === envelopeId) return;

    event.preventDefault();
    dragOverBudget = envelopeId;
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  function handleDragLeave() {
    dragOverBudget = null;
  }

  function handleDrop(targetEnvelope: BudgetEnvelope, event: DragEvent) {
    event.preventDefault();
    dragOverBudget = null;

    if (!draggedBudget || draggedBudget.id === targetEnvelope.id) {
      draggedBudget = null;
      return;
    }

    sourceBudget = draggedBudget;
    targetBudget = targetEnvelope;
    transferAmount = "";
    showTransferDialog = true;

    draggedBudget = null;
  }

  function handleDragEnd() {
    draggedBudget = null;
    dragOverBudget = null;
  }

  // Transfer execution
  async function executeTransfer() {
    if (!sourceBudget || !targetBudget || !transferAmount) return;

    const amount = parseFloat(transferAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > sourceBudget.availableAmount) {
      transferResult = {
        success: false,
        message: "Invalid transfer amount"
      };
      return;
    }

    try {
      isTransferring = true;
      transferResult = null;

      await onFundTransfer?.(sourceBudget.id, targetBudget.id, amount);

      transferResult = {
        success: true,
        message: `Successfully transferred ${currencyFormatter.format(amount)} from ${sourceBudget.name} to ${targetBudget.name}`
      };

      setTimeout(() => {
        showTransferDialog = false;
        resetTransferState();
      }, 2000);

    } catch (error) {
      transferResult = {
        success: false,
        message: error instanceof Error ? error.message : "Transfer failed"
      };
    } finally {
      isTransferring = false;
    }
  }

  function resetTransferState() {
    sourceBudget = null;
    targetBudget = null;
    transferAmount = "";
    transferResult = null;
  }

  function cancelTransfer() {
    showTransferDialog = false;
    resetTransferState();
  }

  // Quick transfer amounts
  const suggestedAmounts = $derived(() => {
    if (!sourceBudget) return [];
    const available = sourceBudget.availableAmount;
    const suggestions = [];

    if (available >= 100) suggestions.push(100);
    if (available >= 50) suggestions.push(50);
    if (available >= 25) suggestions.push(25);
    if (available >= 10) suggestions.push(10);

    // Add percentage-based suggestions
    if (available >= 4) suggestions.push(Math.floor(available / 4)); // 25%
    if (available >= 2) suggestions.push(Math.floor(available / 2)); // 50%

    return [...new Set(suggestions)].sort((a, b) => a - b);
  });

  function getEnvelopeStyle(envelope: BudgetEnvelope) {
    const isDragging = draggedBudget?.id === envelope.id;
    const isDropTarget = dragOverBudget === envelope.id;
    const canDrag = envelope.availableAmount > 0;

    let baseStyle = "relative transition-all duration-200 cursor-pointer";

    if (envelope.status === 'overspent') {
      baseStyle += " border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/20";
    } else if (envelope.status === 'paused') {
      baseStyle += " border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-950/20";
    } else {
      baseStyle += " border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20";
    }

    if (isDragging) {
      baseStyle += " opacity-50 scale-95 rotate-3 shadow-lg";
    } else if (isDropTarget) {
      baseStyle += " ring-2 ring-primary ring-offset-2 scale-105 shadow-lg";
    } else if (canDrag) {
      baseStyle += " hover:shadow-md hover:scale-102";
    } else {
      baseStyle += " opacity-60 cursor-not-allowed";
    }

    return baseStyle;
  }

  const typeIconMap = new SvelteMap([
    ['account-monthly', DollarSign],
    ['category-envelope', Target],
    ['goal-based', Target],
    ['scheduled-expense', Shuffle],
    ['general', DollarSign],
  ]);

  const getTypeIcon = $derived((type: string) => typeIconMap.get(type) ?? DollarSign);

  const maxTransferAmount = $derived(() => {
    return sourceBudget?.availableAmount ?? 0;
  });

  const isValidTransfer = $derived(() => {
    const amount = parseFloat(transferAmount);
    return Number.isFinite(amount) && amount > 0 && amount <= maxTransferAmount;
  });
</script>

<div class={cn("space-y-6", className)}>
  <!-- Header -->
  <Card.Root>
    <Card.Header>
      <Card.Title class="flex items-center gap-2">
        <ArrowRightLeft class="h-5 w-5" />
        Budget Fund Transfer
      </Card.Title>
      <Card.Description>
        Drag and drop to move funds between budget envelopes. Only envelopes with available funds can be dragged.
      </Card.Description>
    </Card.Header>
  </Card.Root>

  <!-- Overspent Envelopes (Priority) -->
  {#if overspentEnvelopes.length > 0}
    <Card.Root class="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/10">
      <Card.Header>
        <Card.Title class="flex items-center gap-2 text-red-700 dark:text-red-300">
          <AlertCircle class="h-5 w-5" />
          Overspent Envelopes - Need Funding
        </Card.Title>
        <Card.Description class="text-red-600 dark:text-red-400">
          These envelopes are over budget and need funds transferred to them
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {#each overspentEnvelopes as envelope (envelope.id)}
            {@const Icon = getTypeIcon(envelope.type)}
            <div
              class={cn("rounded-lg border-2 border-dashed p-4", getEnvelopeStyle(envelope))}
              ondragover={(e) => handleDragOver(envelope.id, e)}
              ondragleave={handleDragLeave}
              ondrop={(e) => handleDrop(envelope, e)}
              role="button"
              tabindex="0"
            >
              <div class="flex items-center gap-3 mb-3">
                <div class="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 dark:bg-red-900">
                  <Icon class="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div class="flex-1 min-w-0">
                  <h4 class="font-medium truncate">{envelope.name}</h4>
                  <p class="text-xs text-red-600 dark:text-red-400">{envelope.type}</p>
                </div>
                <Badge variant="destructive" class="text-xs">
                  -{currencyFormatter.format(envelope.spentAmount - envelope.allocatedAmount)}
                </Badge>
              </div>

              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-red-600 dark:text-red-400">Deficit:</span>
                  <span class="font-mono font-medium text-red-700 dark:text-red-300">
                    {currencyFormatter.format(envelope.spentAmount - envelope.allocatedAmount)}
                  </span>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Active Envelopes -->
  <Card.Root>
    <Card.Header>
      <Card.Title class="flex items-center justify-between">
        <span>Active Budget Envelopes</span>
        <Badge variant="secondary">{activeEnvelopes.length} active</Badge>
      </Card.Title>
      <Card.Description>
        Drag envelopes with available funds to transfer money between budgets
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {#each activeEnvelopes as envelope (envelope.id)}
          {@const Icon = getTypeIcon(envelope.type)}
          {@const canDrag = envelope.availableAmount > 0}
          <div
            class={cn("rounded-lg border-2 p-4", getEnvelopeStyle(envelope))}
            draggable={canDrag}
            ondragstart={(e) => handleDragStart(envelope, e)}
            ondragend={handleDragEnd}
            ondragover={(e) => handleDragOver(envelope.id, e)}
            ondragleave={handleDragLeave}
            ondrop={(e) => handleDrop(envelope, e)}
            role="button"
            tabindex="0"
          >
            <div class="flex items-center gap-3 mb-3">
              <div class="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900">
                <Icon class="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="font-medium truncate">{envelope.name}</h4>
                <p class="text-xs text-emerald-600 dark:text-emerald-400">{envelope.type}</p>
              </div>
              {#if canDrag}
                <Badge variant="secondary" class="text-xs">
                  Draggable
                </Badge>
              {:else}
                <Badge variant="outline" class="text-xs">
                  Empty
                </Badge>
              {/if}
            </div>

            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-muted-foreground">Allocated:</span>
                <span class="font-mono">{currencyFormatter.format(envelope.allocatedAmount)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted-foreground">Spent:</span>
                <span class="font-mono">{currencyFormatter.format(envelope.spentAmount)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-emerald-600 dark:text-emerald-400 font-medium">Available:</span>
                <span class="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                  {currencyFormatter.format(envelope.availableAmount)}
                </span>
              </div>
            </div>

            {#if canDrag}
              <div class="mt-3 p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded text-center">
                <p class="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                  Drag to transfer funds
                </p>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Paused Envelopes -->
  {#if pausedEnvelopes.length > 0}
    <Card.Root class="bg-muted/30">
      <Card.Header>
        <Card.Title class="text-muted-foreground">
          Paused Envelopes ({pausedEnvelopes.length})
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="grid gap-2">
          {#each pausedEnvelopes as envelope (envelope.id)}
            {@const Icon = getTypeIcon(envelope.type)}
            <div class="flex items-center justify-between rounded-md border bg-background p-3">
              <div class="flex items-center gap-3">
                <Icon class="h-4 w-4 text-muted-foreground" />
                <div>
                  <span class="font-medium">{envelope.name}</span>
                  <p class="text-xs text-muted-foreground">{envelope.type}</p>
                </div>
              </div>
              <span class="text-sm text-muted-foreground">
                {currencyFormatter.format(envelope.availableAmount)} available
              </span>
            </div>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>
  {/if}
</div>

<!-- Transfer Dialog -->
<Dialog.Root bind:open={showTransferDialog} closeOnOutsideClick={false}>
  <Dialog.Content class="max-w-md">
    <Dialog.Header>
      <Dialog.Title>Transfer Funds</Dialog.Title>
      <Dialog.Description>
        Move money between budget envelopes
      </Dialog.Description>
    </Dialog.Header>

    {#if sourceBudget && targetBudget}
      <div class="space-y-4">
        <!-- Transfer Summary -->
        <div class="space-y-3">
          <div class="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <div class="flex-1">
              <p class="text-sm font-medium">From: {sourceBudget.name}</p>
              <p class="text-xs text-muted-foreground">
                Available: {currencyFormatter.format(sourceBudget.availableAmount)}
              </p>
            </div>
            <ArrowRightLeft class="h-4 w-4 text-muted-foreground" />
            <div class="flex-1 text-right">
              <p class="text-sm font-medium">To: {targetBudget.name}</p>
              <p class="text-xs text-muted-foreground">{targetBudget.type}</p>
            </div>
          </div>
        </div>

        <!-- Amount Input -->
        <div class="space-y-2">
          <Label for="transfer-amount">Transfer Amount</Label>
          <Input
            id="transfer-amount"
            type="number"
            step="0.01"
            min="0"
            max={maxTransferAmount}
            bind:value={transferAmount}
            placeholder="0.00"
            disabled={isTransferring}
          />
          <p class="text-xs text-muted-foreground">
            Maximum: {currencyFormatter.format(maxTransferAmount)}
          </p>
        </div>

        <!-- Quick Amounts -->
        {#if suggestedAmounts.length > 0}
          <div class="space-y-2">
            <Label class="text-xs">Quick amounts:</Label>
            <div class="flex gap-2 flex-wrap">
              {#each suggestedAmounts as amount}
                <Button
                  variant="outline"
                  size="sm"
                  onclick={() => transferAmount = amount.toString()}
                  disabled={isTransferring}
                  class="text-xs"
                >
                  {currencyFormatter.format(amount)}
                </Button>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Transfer Result -->
        {#if transferResult}
          <div class={cn(
            "flex items-center gap-2 p-3 rounded-lg",
            transferResult.success ? "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200" : "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200"
          )}>
            {#if transferResult.success}
              <CheckCircle2 class="h-4 w-4" />
            {:else}
              <AlertCircle class="h-4 w-4" />
            {/if}
            <p class="text-sm">{transferResult.message}</p>
          </div>
        {/if}
      </div>

      <Dialog.Footer class="flex gap-2">
        <Button variant="outline" onclick={cancelTransfer} disabled={isTransferring}>
          Cancel
        </Button>
        <Button
          onclick={executeTransfer}
          disabled={!isValidTransfer || isTransferring || transferResult?.success}
        >
          {#if isTransferring}
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Transferring...
            </div>
          {:else}
            Transfer {transferAmount ? currencyFormatter.format(parseFloat(transferAmount)) : 'Funds'}
          {/if}
        </Button>
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>