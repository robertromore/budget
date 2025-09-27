<script lang="ts">
  import {AlertTriangle, Plus, ArrowUpDown, Wallet} from "@lucide/svelte/icons";
  import * as Card from "$lib/components/ui/card";
  import {Button} from "$lib/components/ui/button";
  import {Input} from "$lib/components/ui/input";
  import Label from "$lib/components/ui/label/label.svelte";
  import {Badge} from "$lib/components/ui/badge";
  import {Progress} from "$lib/components/ui/progress";
  import * as Dialog from "$lib/components/ui/dialog";
  import {cn} from "$lib/utils";
  import {currencyFormatter} from "$lib/utils/formatters";
  import type {BudgetWithRelations} from "$lib/server/domains/budgets";
  import type {EnvelopeAllocation} from "$lib/schema/budgets/envelope-allocations";
  import type {Category} from "$lib/schema/categories";

  interface Props {
    budget: BudgetWithRelations;
    envelopes: EnvelopeAllocation[];
    categories: Category[];
    onEnvelopeUpdate?: (envelopeId: number, newAmount: number) => void;
    onFundTransfer?: (fromId: number, toId: number, amount: number) => void;
    onDeficitRecover?: (envelopeId: number) => void;
    class?: string;
  }

  let {
    budget,
    envelopes = [],
    categories = [],
    onEnvelopeUpdate,
    onFundTransfer,
    onDeficitRecover,
    class: className,
  }: Props = $props();

  let transferDialogOpen = $state(false);
  let selectedSourceEnvelope = $state<EnvelopeAllocation | null>(null);
  let selectedTargetEnvelope = $state<EnvelopeAllocation | null>(null);
  let transferAmount = $state("");

  const categoryMap = $derived(
    new Map(Array.isArray(categories) ? categories.map(cat => [cat.id, cat]) : [])
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

    envelopes.forEach(envelope => {
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

  function getEnvelopeStatusColor(envelope: EnvelopeAllocation): string {
    switch (envelope.status) {
      case "overspent":
        return "bg-destructive/10 border-destructive/50 text-destructive";
      case "depleted":
        return "bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300";
      case "active":
        return "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300";
      case "paused":
        return "bg-muted border-muted-foreground/20 text-muted-foreground";
      default:
        return "bg-background border-border text-foreground";
    }
  }

  function getProgressValue(envelope: EnvelopeAllocation): number {
    if (envelope.allocatedAmount <= 0) return 0;
    return Math.min(100, (envelope.spentAmount / envelope.allocatedAmount) * 100);
  }

  function getProgressColor(envelope: EnvelopeAllocation): string {
    const percentage = getProgressValue(envelope);
    if (envelope.status === "overspent") return "bg-destructive";
    if (percentage >= 90) return "bg-orange-500";
    if (percentage >= 75) return "bg-yellow-500";
    return "bg-primary";
  }

  function handleEnvelopeAllocationUpdate(envelope: EnvelopeAllocation, newValue: string) {
    const amount = parseFloat(newValue);
    if (Number.isFinite(amount) && amount >= 0) {
      onEnvelopeUpdate?.(envelope.id, amount);
    }
  }

  function initiateFundTransfer(fromEnvelope: EnvelopeAllocation) {
    selectedSourceEnvelope = fromEnvelope;
    selectedTargetEnvelope = null;
    transferAmount = "";
    transferDialogOpen = true;
  }

  function executeFundTransfer() {
    if (!selectedSourceEnvelope || !selectedTargetEnvelope) return;

    const amount = parseFloat(transferAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;

    onFundTransfer?.(selectedSourceEnvelope.id, selectedTargetEnvelope.id, amount);
    transferDialogOpen = false;
  }

  function handleDeficitRecover(envelope: EnvelopeAllocation) {
    onDeficitRecover?.(envelope.id);
  }

  const transferFormValid = $derived(() => {
    if (!selectedSourceEnvelope || !selectedTargetEnvelope) return false;
    const amount = parseFloat(transferAmount);
    return Number.isFinite(amount) && amount > 0 && amount <= selectedSourceEnvelope.availableAmount;
  });
</script>

<div class={cn("space-y-6", className)}>
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
          <p class="text-sm text-muted-foreground">Total Allocated</p>
          <p class="text-2xl font-bold">{currencyFormatter.format(totalAllocated)}</p>
        </div>
        <div class="space-y-1">
          <p class="text-sm text-muted-foreground">Total Spent</p>
          <p class="text-2xl font-bold">{currencyFormatter.format(totalSpent)}</p>
        </div>
        <div class="space-y-1">
          <p class="text-sm text-muted-foreground">Available</p>
          <p class="text-2xl font-bold text-emerald-600">{currencyFormatter.format(totalAvailable)}</p>
        </div>
        <div class="space-y-1">
          <p class="text-sm text-muted-foreground">Deficit</p>
          <p class="text-2xl font-bold text-destructive">{currencyFormatter.format(totalDeficit)}</p>
        </div>
      </div>

      <div class="mt-4">
        <div class="flex items-center justify-between text-sm mb-2">
          <span>Overall Progress</span>
          <span>{spentPercentage.toFixed(1)}%</span>
        </div>
        <Progress
          value={spentPercentage}
          class="h-2"
        />
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Deficit Envelopes (Priority Alert) -->
  {#if envelopesByStatus.overspent.length > 0}
    <Card.Root class="border-destructive/50 bg-destructive/5">
      <Card.Header>
        <Card.Title class="flex items-center gap-2 text-destructive">
          <AlertTriangle class="h-5 w-5" />
          Overspent Envelopes ({envelopesByStatus.overspent.length})
        </Card.Title>
        <Card.Description>
          These envelopes have exceeded their allocated amounts and need immediate attention.
        </Card.Description>
      </Card.Header>
      <Card.Content class="space-y-3">
        {#each envelopesByStatus.overspent as envelope (envelope.id)}
          <div class="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <h4 class="font-medium">{getCategoryName(envelope.categoryId)}</h4>
                <Badge variant="destructive">Deficit: {currencyFormatter.format(envelope.deficitAmount)}</Badge>
              </div>
              <p class="text-sm text-muted-foreground">
                Spent: {currencyFormatter.format(envelope.spentAmount)} /
                Allocated: {currencyFormatter.format(envelope.allocatedAmount)}
              </p>
            </div>
            <div class="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onclick={() => initiateFundTransfer(envelope)}
                disabled={envelopes.filter(e => e.id !== envelope.id && e.availableAmount > 0).length === 0}
              >
                <ArrowUpDown class="h-4 w-4 mr-1" />
                Transfer Funds
              </Button>
              <Button
                size="sm"
                onclick={() => handleDeficitRecover(envelope)}
              >
                Auto Recover
              </Button>
            </div>
          </div>
        {/each}
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Active Envelopes -->
  <Card.Root>
    <Card.Header>
      <Card.Title class="flex items-center justify-between">
        <span>Active Envelopes ({envelopesByStatus.active.length + envelopesByStatus.depleted.length})</span>
        <Button size="sm" variant="outline">
          <Plus class="h-4 w-4 mr-1" />
          Add Envelope
        </Button>
      </Card.Title>
    </Card.Header>
    <Card.Content>
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {#each [...envelopesByStatus.active, ...envelopesByStatus.depleted] as envelope (envelope.id)}
          <div class={cn(
            "rounded-lg border p-4 space-y-3",
            getEnvelopeStatusColor(envelope)
          )}>
            <div class="flex items-center justify-between">
              <h4 class="font-medium">{getCategoryName(envelope.categoryId)}</h4>
              <Badge variant={envelope.status === "active" ? "secondary" : "outline"}>
                {envelope.status}
              </Badge>
            </div>

            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span>Allocated</span>
                <span class="font-medium">{currencyFormatter.format(envelope.allocatedAmount)}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span>Spent</span>
                <span class="font-medium">{currencyFormatter.format(envelope.spentAmount)}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span>Available</span>
                <span class={cn(
                  "font-medium",
                  envelope.availableAmount > 0 ? "text-emerald-600" : "text-muted-foreground"
                )}>
                  {currencyFormatter.format(envelope.availableAmount)}
                </span>
              </div>

              {#if envelope.rolloverAmount > 0}
                <div class="flex justify-between text-sm">
                  <span>Rollover</span>
                  <span class="font-medium text-blue-600">{currencyFormatter.format(envelope.rolloverAmount)}</span>
                </div>
              {/if}
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span>Progress</span>
                <span>{getProgressValue(envelope).toFixed(0)}%</span>
              </div>
              <div class="w-full bg-muted rounded-full h-2">
                <div
                  class={cn("h-2 rounded-full transition-all", getProgressColor(envelope))}
                  style={`width: ${Math.min(100, getProgressValue(envelope))}%`}
                ></div>
              </div>
            </div>

            <div class="flex gap-2">
              <Input
                type="number"
                placeholder="Allocation"
                value={envelope.allocatedAmount}
                onchange={(e) => handleEnvelopeAllocationUpdate(envelope, e.currentTarget.value)}
                class="h-8 text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onclick={() => initiateFundTransfer(envelope)}
                disabled={envelope.availableAmount <= 0}
                class="shrink-0"
              >
                <ArrowUpDown class="h-4 w-4" />
              </Button>
            </div>
          </div>
        {/each}
      </div>
    </Card.Content>
  </Card.Root>

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
            <div class="flex items-center justify-between rounded-md border bg-background p-2">
              <span class="text-sm">{getCategoryName(envelope.categoryId)}</span>
              <div class="flex items-center gap-2">
                <span class="text-sm text-muted-foreground">
                  {currencyFormatter.format(envelope.availableAmount)}
                </span>
                <Button size="sm" variant="outline">Activate</Button>
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
          <div class="rounded-md border p-3 bg-muted/50">
            <div class="font-medium">{getCategoryName(selectedSourceEnvelope.categoryId)}</div>
            <div class="text-sm text-muted-foreground">
              Available: {currencyFormatter.format(selectedSourceEnvelope.availableAmount)}
            </div>
          </div>
        </div>

        <div class="space-y-2">
          <Label>To Envelope</Label>
          <select
            bind:value={selectedTargetEnvelope}
            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value={null}>Select destination envelope</option>
            {#each envelopes.filter(e => e.id !== selectedSourceEnvelope?.id) as envelope (envelope.id)}
              <option value={envelope}>{getCategoryName(envelope.categoryId)}</option>
            {/each}
          </select>
        </div>

        <div class="space-y-2">
          <Label for="transfer-amount">Amount</Label>
          <Input
            id="transfer-amount"
            type="number"
            step="0.01"
            max={selectedSourceEnvelope.availableAmount}
            bind:value={transferAmount}
            placeholder="0.00"
          />
        </div>
      </div>

      <Dialog.Footer>
        <Button variant="outline" onclick={() => transferDialogOpen = false}>
          Cancel
        </Button>
        <Button
          onclick={executeFundTransfer}
          disabled={!transferFormValid}
        >
          Transfer Funds
        </Button>
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>