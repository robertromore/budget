<script lang="ts">
  import {ArrowUpDown, Grip, DollarSign} from "@lucide/svelte";
  import * as Card from "$lib/components/ui/card";
  import {Input} from "$lib/components/ui/input";
  import {Badge} from "$lib/components/ui/badge";
  import {cn} from "$lib/utils";
  import {currencyFormatter} from "$lib/utils/formatters";
  import type {EnvelopeAllocation} from "$lib/schema/budgets/envelope-allocations";

  interface Props {
    envelopes: EnvelopeAllocation[];
    getCategoryName: (categoryId: number) => string;
    onFundTransfer?: (fromId: number, toId: number, amount: number) => void;
    class?: string;
  }

  let {
    envelopes,
    getCategoryName,
    onFundTransfer,
    class: className,
  }: Props = $props();

  let draggedEnvelope = $state<EnvelopeAllocation | null>(null);
  let draggedAmount = $state<number>(0);
  let dropTargetId = $state<number | null>(null);
  let transferAmount = $state<string>("");
  let isDragging = $state(false);

  const percentage = $derived.by(() => {
    if (draggedEnvelope && draggedEnvelope.allocatedAmount > 0) {
      return Math.min(100, (draggedEnvelope.spentAmount / draggedEnvelope.allocatedAmount) * 100);
    }
    return 0;
  });

  function handleDragStart(e: DragEvent, envelope: EnvelopeAllocation) {
    if (!e.dataTransfer) return;

    draggedEnvelope = envelope;
    isDragging = true;

    // Store envelope data in dataTransfer
    e.dataTransfer.setData("application/json", JSON.stringify({
      envelopeId: envelope.id,
      availableAmount: envelope.availableAmount,
    }));

    e.dataTransfer.effectAllowed = "move";

    // Create a custom drag image
    if (e.target instanceof HTMLElement) {
      const dragImage = e.target.cloneNode(true) as HTMLElement;
      dragImage.style.opacity = "0.8";
      dragImage.style.transform = "rotate(5deg)";
      e.dataTransfer.setDragImage(dragImage, 0, 0);
    }
  }

  function handleDragEnd(e: DragEvent) {
    draggedEnvelope = null;
    dropTargetId = null;
    isDragging = false;
    transferAmount = "";
  }

  function handleDragOver(e: DragEvent, targetEnvelope: EnvelopeAllocation) {
    e.preventDefault();
    if (!e.dataTransfer) return;

    // Only allow drop if it's a different envelope and source has funds
    if (draggedEnvelope && draggedEnvelope.id !== targetEnvelope.id) {
      e.dataTransfer.dropEffect = "move";
      dropTargetId = targetEnvelope.id;
    } else {
      e.dataTransfer.dropEffect = "none";
      dropTargetId = null;
    }
  }

  function handleDragLeave(e: DragEvent) {
    // Only clear if we're actually leaving the drop zone
    if (e.relatedTarget && e.currentTarget?.contains(e.relatedTarget as Node)) {
      return;
    }
    dropTargetId = null;
  }

  function handleDrop(e: DragEvent, targetEnvelope: EnvelopeAllocation) {
    e.preventDefault();

    if (!draggedEnvelope || draggedEnvelope.id === targetEnvelope.id) {
      return;
    }

    // Parse the amount to transfer
    const amount = parseFloat(transferAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      // If no amount specified, transfer a reasonable default (10% or $10, whichever is smaller)
      const defaultAmount = Math.min(
        Math.max(draggedEnvelope.availableAmount * 0.1, 1),
        10
      );
      draggedAmount = Math.min(defaultAmount, draggedEnvelope.availableAmount);
    } else {
      draggedAmount = Math.min(amount, draggedEnvelope.availableAmount);
    }

    if (draggedAmount > 0) {
      onFundTransfer?.(draggedEnvelope.id, targetEnvelope.id, draggedAmount);
    }

    // Reset state
    draggedEnvelope = null;
    dropTargetId = null;
    isDragging = false;
    transferAmount = "";
  }

  function getEnvelopeStatusStyle(envelope: EnvelopeAllocation, isDropTarget = false): string {
    const baseStyle = "transition-all duration-200";

    if (isDropTarget) {
      return `${baseStyle} ring-2 ring-primary ring-offset-2 bg-primary/5 scale-105`;
    }

    if (isDragging && draggedEnvelope?.id === envelope.id) {
      return `${baseStyle} opacity-50 scale-95`;
    }

    switch (envelope.status) {
      case "overspent":
        return `${baseStyle} bg-destructive/5 border-destructive hover:shadow-md`;
      case "depleted":
        return `${baseStyle} bg-orange-50 border-orange-200 hover:shadow-md dark:bg-orange-900 dark:border-orange-700`;
      case "active":
        return `${baseStyle} bg-emerald-50 border-emerald-200 hover:shadow-md dark:bg-emerald-900 dark:border-emerald-700`;
      case "paused":
        return `${baseStyle} bg-muted border-muted-foreground/20 hover:shadow-sm`;
      default:
        return `${baseStyle} hover:shadow-md`;
    }
  }

  function canBeDragSource(envelope: EnvelopeAllocation): boolean {
    return envelope.availableAmount > 0;
  }

  function canBeDropTarget(envelope: EnvelopeAllocation): boolean {
    return !draggedEnvelope || draggedEnvelope.id !== envelope.id;
  }
</script>

<div class={cn("space-y-4", className)}>
  <!-- Drag Instructions -->
  <Card.Root class="bg-blue-50 border-blue-200 dark:bg-blue-900 dark:border-blue-700">
    <Card.Content class="py-3">
      <div class="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
        <Grip class="h-4 w-4" />
        <span>Drag envelopes with available funds to transfer money between them.</span>
        {#if isDragging}
          <span class="font-medium">Drop on target envelope to transfer funds</span>
        {/if}
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Transfer Amount Input (appears during drag) -->
  {#if isDragging && draggedEnvelope}
    <Card.Root class="bg-primary/5 border-primary">
      <Card.Content class="py-3">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <DollarSign class="h-4 w-4" />
            <span class="text-sm font-medium">Transfer Amount:</span>
          </div>
          <Input
            type="number"
            step="0.01"
            min="0"
            max={draggedEnvelope.availableAmount}
            bind:value={transferAmount}
            placeholder={`Max: ${currencyFormatter.format(draggedEnvelope.availableAmount)}`}
            class="w-32 h-8"
          />
          <span class="text-xs text-muted-foreground">
            Leave empty for smart default
          </span>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Envelope Grid -->
  <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {#each envelopes as envelope (envelope.id)}
      {@const isDropTarget = dropTargetId === envelope.id}
      {@const isDragSource = canBeDragSource(envelope)}
      {@const canDrop = canBeDropTarget(envelope)}

      <div
        class={cn(
          "relative rounded-lg border p-4 cursor-pointer",
          getEnvelopeStatusStyle(envelope, isDropTarget),
          isDragSource && "cursor-grab active:cursor-grabbing",
          !canDrop && isDragging && "opacity-50 cursor-not-allowed"
        )}
        draggable={isDragSource}
        ondragstart={(e) => handleDragStart(e, envelope)}
        ondragend={handleDragEnd}
        ondragover={(e) => canDrop && handleDragOver(e, envelope)}
        ondragleave={handleDragLeave}
        ondrop={(e) => canDrop && handleDrop(e, envelope)}
        role="button"
        tabindex="0"
      >
        <!-- Drag Handle -->
        {#if isDragSource}
          <div class="absolute top-2 right-2 text-muted-foreground">
            <Grip class="h-4 w-4" />
          </div>
        {/if}

        <!-- Drop Target Indicator -->
        {#if isDropTarget}
          <div class="absolute inset-0 flex items-center justify-center rounded-lg bg-primary/10 border-2 border-dashed border-primary">
            <div class="text-center">
              <ArrowUpDown class="h-8 w-8 mx-auto text-primary mb-2" />
              <span class="text-sm font-medium text-primary">Drop to Transfer</span>
              {#if draggedEnvelope && transferAmount}
                <div class="text-xs text-primary/80">
                  {currencyFormatter.format(parseFloat(transferAmount))}
                </div>
              {/if}
            </div>
          </div>
        {/if}

        <!-- Envelope Content -->
        <div class={cn("space-y-3", isDropTarget && "opacity-20")}>
          <div class="flex items-center justify-between">
            <h4 class="font-medium">{getCategoryName(envelope.categoryId)}</h4>
            <Badge variant={envelope.status === "active" ? "secondary" : "outline"}>
              {envelope.status}
            </Badge>
          </div>

          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span>Available</span>
              <span class={cn(
                "font-medium",
                envelope.availableAmount > 0 ? "text-emerald-600" : "text-muted-foreground"
              )}>
                {currencyFormatter.format(envelope.availableAmount)}
              </span>
            </div>

            <div class="flex justify-between text-sm">
              <span>Allocated</span>
              <span class="font-medium">{currencyFormatter.format(envelope.allocatedAmount)}</span>
            </div>

            <div class="flex justify-between text-sm">
              <span>Spent</span>
              <span class="font-medium">{currencyFormatter.format(envelope.spentAmount)}</span>
            </div>

            {#if envelope.deficitAmount > 0}
              <div class="flex justify-between text-sm">
                <span class="text-destructive">Deficit</span>
                <span class="font-medium text-destructive">
                  {currencyFormatter.format(envelope.deficitAmount)}
                </span>
              </div>
            {/if}
          </div>

          <!-- Progress Bar -->
          <div class="w-full bg-muted rounded-full h-2">
            {percentage}
            <div
              class={cn(
                "h-2 rounded-full transition-all",
                envelope.status === "overspent" ? "bg-destructive" :
                percentage >= 90 ? "bg-orange-500" :
                percentage >= 75 ? "bg-yellow-500" : "bg-primary"
              )}
              style={`width: ${percentage}%`}
            ></div>
          </div>

          <!-- Drag Instructions -->
          {#if isDragSource && !isDragging}
            <div class="text-xs text-muted-foreground text-center pt-2 border-t">
              Drag to transfer funds
            </div>
          {:else if !isDragSource && envelope.availableAmount <= 0}
            <div class="text-xs text-muted-foreground text-center pt-2 border-t">
              No funds available
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  <!-- Transfer Summary (appears after successful transfer) -->
  {#if !isDragging && draggedAmount > 0}
    <Card.Root class="bg-emerald-50 border-emerald-200 dark:bg-emerald-900 dark:border-emerald-700">
      <Card.Content class="py-3">
        <div class="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
          <ArrowUpDown class="h-4 w-4" />
          <span>Transfer of {currencyFormatter.format(draggedAmount)} completed successfully!</span>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}
</div>

<style>
  /* Custom drag states */
  [draggable="true"]:hover {
    transform: translateY(-2px);
  }

  [draggable="true"]:active {
    transform: translateY(0);
  }
</style>
