<script lang="ts">
  import {AlertTriangle, Plus, ArrowUpDown, Wallet, ChevronDown, ChevronUp, GripVertical, Target, RefreshCw, Clock} from "@lucide/svelte/icons";
  import * as Card from "$lib/components/ui/card";
  import * as Collapsible from "$lib/components/ui/collapsible";
  import * as Select from "$lib/components/ui/select";
  import {Button} from "$lib/components/ui/button";
  import {Input} from "$lib/components/ui/input";
  import Label from "$lib/components/ui/label/label.svelte";
  import ResponsiveSheet from "$lib/components/ui/responsive-sheet/responsive-sheet.svelte";
  import NumericInput from "$lib/components/input/numeric-input.svelte";
  import {Badge} from "$lib/components/ui/badge";
  import {Progress} from "$lib/components/ui/progress";
  import {cn} from "$lib/utils";
  import {currencyFormatter} from "$lib/utils/formatters";
  import {
    getEnvelopeAllocations,
    createEnvelopeAllocation,
    transferEnvelopeFunds,
    getDeficitEnvelopes,
    getSurplusEnvelopes,
  } from "$lib/query/budgets";
  import RolloverManager from "./rollover-manager.svelte";
  import PeriodAutomation from "./period-automation.svelte";
  import type {BudgetWithRelations} from "$lib/server/domains/budgets";
  import type {Category} from "$lib/schema/categories";

  interface Props {
    budget: BudgetWithRelations;
    categories: Category[];
    class?: string;
  }

  let {
    budget,
    categories = [],
    class: className,
  }: Props = $props();

  const envelopesQuery = getEnvelopeAllocations(budget.id).options();
  const deficitEnvelopesQuery = getDeficitEnvelopes(budget.id).options();
  const surplusEnvelopesQuery = getSurplusEnvelopes(budget.id).options();

  const createAllocationMutation = createEnvelopeAllocation.options();
  const transferFundsMutation = transferEnvelopeFunds.options();

  const envelopes = $derived.by(() => envelopesQuery.data ?? []);
  const deficitEnvelopes = $derived.by(() => deficitEnvelopesQuery.data ?? []);
  const surplusEnvelopes = $derived.by(() => surplusEnvelopesQuery.data ?? []);

  const categoryMap = $derived(
    new Map(Array.isArray(categories) ? categories.map(cat => [cat.id, cat]) : [])
  );

  const totalAllocated = $derived.by(() =>
    envelopes.reduce((sum: number, env: any) => sum + (env.allocatedAmount || 0), 0)
  );

  const totalSpent = $derived.by(() =>
    envelopes.reduce((sum: number, env: any) => sum + (env.spentAmount || 0), 0)
  );

  const totalAvailable = $derived.by(() =>
    envelopes.reduce((sum: number, env: any) => sum + (env.availableAmount || 0), 0)
  );

  const totalDeficit = $derived.by(() =>
    envelopes.reduce((sum: number, env: any) => sum + (env.deficitAmount || 0), 0)
  );

  const overallProgress = $derived.by(() =>
    totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0
  );

  const envelopesByStatus = $derived.by(() => {
    const groups = {
      overspent: [] as any[],
      depleted: [] as any[],
      active: [] as any[],
      paused: [] as any[],
    };

    envelopes.forEach((env: any) => {
      if (env.status && env.status in groups) {
        groups[env.status as keyof typeof groups].push(env);
      } else {
        groups.active.push(env);
      }
    });

    return groups;
  });

  let newEnvelopeOpen = $state(false);
  let selectedCategoryId = $state("");
  let allocationAmount = $state(0);
  let transferOpen = $state(false);
  let fromEnvelopeId = $state("");
  let toEnvelopeId = $state("");
  let transferAmount = $state(0);

  let showDeficits = $state(true);
  let showSurplus = $state(true);
  let showActive = $state(true);
  let showRolloverManager = $state(false);
  let showPeriodAutomation = $state(false);

  // Drag and drop state
  let draggedEnvelope = $state<any>(null);
  let dragOverEnvelope = $state<number | null>(null);
  let isDragging = $state(false);
  let dragAmount = $state("");

  function getCategoryName(categoryId: number): string {
    return categoryMap.get(categoryId)?.name || `Category ${categoryId}`;
  }

  function getEnvelopeProgress(envelope: any): number {
    if (!envelope.allocatedAmount || envelope.allocatedAmount === 0) return 0;
    return Math.min(100, (envelope.spentAmount / envelope.allocatedAmount) * 100);
  }

  function getEnvelopeStatusColor(envelope: any): string {
    if (envelope.deficitAmount > 0) return "text-red-600 dark:text-red-400";
    if (envelope.availableAmount <= 0) return "text-orange-600 dark:text-orange-400";
    return "text-green-600 dark:text-green-400";
  }

  function getProgressColor(envelope: any): string {
    const progress = getEnvelopeProgress(envelope);
    if (progress > 100) return "bg-red-500";
    if (progress > 80) return "bg-orange-500";
    return "bg-blue-500";
  }

  async function handleCreateEnvelope() {
    if (!selectedCategoryId || !allocationAmount) return;

    // For this demo, we'll use a mock period instance ID
    // In a real implementation, this would come from the current budget period
    const mockPeriodInstanceId = 1;

    try {
      await createAllocationMutation.mutateAsync({
        budgetId: budget.id,
        categoryId: Number(selectedCategoryId),
        periodInstanceId: mockPeriodInstanceId,
        allocatedAmount: allocationAmount,
      });

      selectedCategoryId = "";
      allocationAmount = 0;
      newEnvelopeOpen = false;
    } catch (error) {
      console.error("Failed to create envelope allocation:", error);
    }
  }

  async function handleTransferFunds() {
    if (!fromEnvelopeId || !toEnvelopeId || !transferAmount) return;

    try {
      await transferFundsMutation.mutateAsync({
        fromEnvelopeId: Number(fromEnvelopeId),
        toEnvelopeId: Number(toEnvelopeId),
        amount: transferAmount,
        reason: "Manual transfer",
        transferredBy: "user",
      });

      fromEnvelopeId = "";
      toEnvelopeId = "";
      transferAmount = 0;
      transferOpen = false;
    } catch (error) {
      console.error("Failed to transfer funds:", error);
    }
  }

  const availableCategories = $derived.by(() => {
    const usedCategoryIds = new Set(envelopes.map(env => env.categoryId));
    return categories.filter(cat => !usedCategoryIds.has(cat.id));
  });

  // Drag and drop handlers
  function handleDragStart(envelope: any, e: DragEvent) {
    if (!envelope.availableAmount || envelope.availableAmount <= 0) {
      e.preventDefault();
      return;
    }

    draggedEnvelope = envelope;
    isDragging = true;

    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", envelope.id.toString());
    }
  }

  function handleDragEnd() {
    draggedEnvelope = null;
    dragOverEnvelope = null;
    isDragging = false;
    dragAmount = "";
  }

  function handleDragOver(envelope: any, e: DragEvent) {
    if (!draggedEnvelope || draggedEnvelope.id === envelope.id) return;

    e.preventDefault();
    e.dataTransfer!.dropEffect = "move";
    dragOverEnvelope = envelope.id;
  }

  function handleDragLeave() {
    dragOverEnvelope = null;
  }

  function handleDrop(targetEnvelope: any, e: DragEvent) {
    e.preventDefault();

    if (!draggedEnvelope || draggedEnvelope.id === targetEnvelope.id) {
      handleDragEnd();
      return;
    }

    // Open quick transfer dialog with pre-filled data
    fromEnvelopeId = draggedEnvelope.id.toString();
    toEnvelopeId = targetEnvelope.id.toString();
    transferAmount = Math.min(draggedEnvelope.availableAmount, 50); // Default to $50 or available amount
    transferOpen = true;

    handleDragEnd();
  }
</script>

<div class={cn("space-y-6", className)}>
  <!-- Budget Summary -->
  <Card.Root>
    <Card.Header>
      <div class="flex items-center justify-between">
        <Card.Title>{budget.name} - Envelope Budget</Card.Title>
        <div class="flex gap-2">
          <Button
            size="sm"
            onclick={() => newEnvelopeOpen = true}
            disabled={availableCategories.length === 0}
          >
            <Plus class="h-4 w-4 mr-2" />
            Add Envelope
          </Button>
          <Button
            size="sm"
            variant="outline"
            onclick={() => transferOpen = true}
            disabled={envelopes.length < 2}
          >
            <ArrowUpDown class="h-4 w-4 mr-2" />
            Transfer
          </Button>
          <Button
            size="sm"
            variant="outline"
            onclick={() => showRolloverManager = !showRolloverManager}
          >
            <RefreshCw class="h-4 w-4 mr-2" />
            Rollover
          </Button>
          <Button
            size="sm"
            variant="outline"
            onclick={() => showPeriodAutomation = !showPeriodAutomation}
          >
            <Clock class="h-4 w-4 mr-2" />
            Automation
          </Button>
        </div>
      </div>
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
          <p class="text-sm text-muted-foreground">Total Deficit</p>
          <p class="text-2xl font-bold text-red-600">{currencyFormatter.format(totalDeficit)}</p>
        </div>
      </div>

      <div class="mt-4">
        <div class="flex items-center justify-between text-sm mb-2">
          <span>Overall Progress</span>
          <span>{overallProgress.toFixed(1)}%</span>
        </div>
        <Progress value={Math.min(100, overallProgress)} class="h-2" />
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Envelopes by Status -->
  {#if envelopesByStatus.overspent.length > 0}
    <Collapsible.Root bind:open={showDeficits}>
      <Card.Root>
        <Collapsible.Trigger class="w-full">
          <Card.Header class="cursor-pointer">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <AlertTriangle class="h-5 w-5 text-red-600" />
                <Card.Title class="text-red-600">Overspent Envelopes ({envelopesByStatus.overspent.length})</Card.Title>
              </div>
              {#if showDeficits}
                <ChevronUp class="h-4 w-4" />
              {:else}
                <ChevronDown class="h-4 w-4" />
              {/if}
            </div>
          </Card.Header>
        </Collapsible.Trigger>
        <Collapsible.Content>
          <Card.Content>
            <div class="grid gap-3">
              {#each envelopesByStatus.overspent as envelope (envelope.id)}
                <div class="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
                  <div>
                    <h4 class="font-medium">{getCategoryName(envelope.categoryId)}</h4>
                    <p class="text-sm text-muted-foreground">
                      Spent: {currencyFormatter.format(envelope.spentAmount)} / {currencyFormatter.format(envelope.allocatedAmount)}
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="font-medium text-red-600">-{currencyFormatter.format(envelope.deficitAmount)}</p>
                    <Badge variant="destructive" class="text-xs">Overspent</Badge>
                  </div>
                </div>
              {/each}
            </div>
          </Card.Content>
        </Collapsible.Content>
      </Card.Root>
    </Collapsible.Root>
  {/if}

  <!-- Active Envelopes -->
  <Collapsible.Root bind:open={showActive}>
    <Card.Root>
      <Collapsible.Trigger class="w-full">
        <Card.Header class="cursor-pointer">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Wallet class="h-5 w-5 text-blue-600" />
              <Card.Title>Active Envelopes ({envelopesByStatus.active.length})</Card.Title>
            </div>
            {#if showActive}
              <ChevronUp class="h-4 w-4" />
            {:else}
              <ChevronDown class="h-4 w-4" />
            {/if}
          </div>
          </Card.Header>
        </Collapsible.Trigger>
      <Collapsible.Content>
        <Card.Content>
          <div class="grid gap-3">
            {#each envelopesByStatus.active as envelope (envelope.id)}
              <div
                class={cn(
                  "flex items-center justify-between rounded-lg border p-3 transition-all duration-200",
                  envelope.availableAmount > 0 ? "cursor-grab active:cursor-grabbing" : "cursor-not-allowed opacity-60",
                  dragOverEnvelope === envelope.id && "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950",
                  draggedEnvelope?.id === envelope.id && "opacity-50 scale-95"
                )}
                role="button"
                tabindex="0"
                aria-label={`Drag ${getCategoryName(envelope.categoryId)} envelope to transfer funds`}
                draggable={envelope.availableAmount > 0}
                ondragstart={(e) => handleDragStart(envelope, e)}
                ondragend={handleDragEnd}
                ondragover={(e) => handleDragOver(envelope, e)}
                ondragleave={handleDragLeave}
                ondrop={(e) => handleDrop(envelope, e)}
              >
                <!-- Drag handle -->
                {#if envelope.availableAmount > 0}
                  <div class="flex items-center mr-3 text-muted-foreground hover:text-foreground transition-colors">
                    <GripVertical class="h-4 w-4" />
                  </div>
                {/if}

                <div class="flex-1">
                  <div class="flex items-center justify-between mb-2">
                    <h4 class="font-medium">{getCategoryName(envelope.categoryId)}</h4>
                    <span class={cn("font-medium", getEnvelopeStatusColor(envelope))}>
                      {currencyFormatter.format(envelope.availableAmount)}
                    </span>
                  </div>
                  <div class="space-y-2">
                    <div class="flex justify-between text-sm text-muted-foreground">
                      <span>Spent: {currencyFormatter.format(envelope.spentAmount)}</span>
                      <span>Allocated: {currencyFormatter.format(envelope.allocatedAmount)}</span>
                    </div>
                    <Progress
                      value={getEnvelopeProgress(envelope)}
                      class="h-2"
                    />
                  </div>
                </div>

                <!-- Drop target indicator -->
                {#if dragOverEnvelope === envelope.id && draggedEnvelope}
                  <div class="flex items-center ml-3 text-blue-600">
                    <Target class="h-4 w-4" />
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </Card.Content>
      </Collapsible.Content>
    </Card.Root>
  </Collapsible.Root>

  <!-- Rollover Management -->
  {#if showRolloverManager}
    <RolloverManager {budget} />
  {/if}

  <!-- Period Automation -->
  {#if showPeriodAutomation}
    <PeriodAutomation {budget} />
  {/if}

  <!-- Create New Envelope Dialog -->
  <ResponsiveSheet bind:open={newEnvelopeOpen}>
    {#snippet header()}
      <h2 class="text-lg font-semibold">Create New Envelope</h2>
      <p class="text-sm text-muted-foreground">
        Add a new category envelope to track spending
      </p>
    {/snippet}

    {#snippet content()}
      <div class="space-y-4">
        <div class="space-y-2">
          <Label for="category">Category</Label>
          <Select.Root type="single" bind:value={selectedCategoryId}>
            <Select.Trigger class="w-full">
              {selectedCategoryId ? categories.find(c => c.id === Number(selectedCategoryId))?.name ?? "Select a category" : "Select a category"}
            </Select.Trigger>
            <Select.Content>
              {#each availableCategories as category (category.id)}
                <Select.Item value={String(category.id)}>
                  {category.name}
                </Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>

        <div class="space-y-2">
          <Label for="amount">Allocation Amount</Label>
          <NumericInput bind:value={allocationAmount} buttonClass="w-full" />
        </div>
      </div>
    {/snippet}

    {#snippet footer()}
      <div class="flex gap-2">
        <Button
          variant="outline"
          onclick={() => newEnvelopeOpen = false}
          class="flex-1"
        >
          Cancel
        </Button>
        <Button
          onclick={handleCreateEnvelope}
          disabled={!selectedCategoryId || !allocationAmount || createAllocationMutation.isPending}
          class="flex-1"
        >
          {#if createAllocationMutation.isPending}
            Creating...
          {:else}
            Create Envelope
          {/if}
        </Button>
      </div>
    {/snippet}
  </ResponsiveSheet>

  <!-- Transfer Funds Dialog -->
  <ResponsiveSheet bind:open={transferOpen}>
    {#snippet header()}
      <h2 class="text-lg font-semibold">Transfer Funds</h2>
      <p class="text-sm text-muted-foreground">
        Move funds between envelopes to balance your allocations
      </p>
    {/snippet}

    {#snippet content()}
      <div class="space-y-4">
        <div class="space-y-2">
          <Label for="from-envelope">From Envelope</Label>
          <Select.Root type="single" bind:value={fromEnvelopeId}>
            <Select.Trigger class="w-full">
              {fromEnvelopeId ?
                (() => {
                  const envelope = envelopes.find((env: any) => String(env.id) === fromEnvelopeId);
                  return envelope ? `${getCategoryName(envelope.categoryId)} (${currencyFormatter.format(envelope.availableAmount)})` : "Select source envelope";
                })()
                : "Select source envelope"}
            </Select.Trigger>
            <Select.Content>
              {#each envelopes.filter((env: any) => env.availableAmount > 0) as envelope (envelope.id)}
                <Select.Item value={String(envelope.id)}>
                  {getCategoryName(envelope.categoryId)} ({currencyFormatter.format(envelope.availableAmount)})
                </Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>

        <div class="space-y-2">
          <Label for="to-envelope">To Envelope</Label>
          <Select.Root type="single" bind:value={toEnvelopeId}>
            <Select.Trigger class="w-full">
              {toEnvelopeId ?
                (() => {
                  const envelope = envelopes.find((env: any) => String(env.id) === toEnvelopeId);
                  return envelope ? getCategoryName(envelope.categoryId) : "Select target envelope";
                })()
                : "Select target envelope"}
            </Select.Trigger>
            <Select.Content>
              {#each envelopes.filter((env: any) => String(env.id) !== fromEnvelopeId) as envelope (envelope.id)}
                <Select.Item value={String(envelope.id)}>
                  {getCategoryName(envelope.categoryId)}
                </Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>

        <div class="space-y-2">
          <Label for="transfer-amount">Transfer Amount</Label>
          <NumericInput bind:value={transferAmount} buttonClass="w-full" />
        </div>
      </div>
    {/snippet}

    {#snippet footer()}
      <div class="flex gap-2">
        <Button
          variant="outline"
          onclick={() => transferOpen = false}
          class="flex-1"
        >
          Cancel
        </Button>
        <Button
          onclick={handleTransferFunds}
          disabled={!fromEnvelopeId || !toEnvelopeId || !transferAmount || transferFundsMutation.isPending}
          class="flex-1"
        >
          {#if transferFundsMutation.isPending}
            Transferring...
          {:else}
            Transfer Funds
          {/if}
        </Button>
      </div>
    {/snippet}
  </ResponsiveSheet>
</div>