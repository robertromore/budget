<script lang="ts">
  import {ArrowUpDown, AlertTriangle, TrendingUp, Edit3} from "@lucide/svelte/icons";
  import * as Card from "$lib/components/ui/card";
  import {Button} from "$lib/components/ui/button";
  import {Input} from "$lib/components/ui/input";
  import {Badge} from "$lib/components/ui/badge";
  import {Progress} from "$lib/components/ui/progress";
  import {cn} from "$lib/utils";
  import {currencyFormatter} from "$lib/utils/formatters";
  import type {EnvelopeAllocation} from "$lib/schema/budgets/envelope-allocations";

  interface Props {
    envelope: EnvelopeAllocation;
    categoryName: string;
    editable?: boolean;
    onUpdateAllocation?: (newAmount: number) => void;
    onTransferRequest?: () => void;
    onDeficitRecover?: () => void;
    class?: string;
  }

  let {
    envelope,
    categoryName,
    editable = false,
    onUpdateAllocation,
    onTransferRequest,
    onDeficitRecover,
    class: className,
  }: Props = $props();

  let isEditing = $state(false);
  let editValue = $state(envelope.allocatedAmount.toString());

  const progressPercentage = $derived(() => {
    if (envelope.allocatedAmount <= 0) return 0;
    return Math.min(100, (envelope.spentAmount / envelope.allocatedAmount) * 100);
  });

  const statusConfig = $derived(() => {
    switch (envelope.status) {
      case "overspent":
        return {
          color: "bg-destructive/10 border-destructive text-destructive",
          badge: "destructive" as const,
          icon: AlertTriangle,
          label: "Overspent",
        };
      case "depleted":
        return {
          color: "bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900 dark:border-orange-700 dark:text-orange-300",
          badge: "secondary" as const,
          icon: AlertTriangle,
          label: "Depleted",
        };
      case "active":
        return {
          color: "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900 dark:border-emerald-700 dark:text-emerald-300",
          badge: "secondary" as const,
          icon: TrendingUp,
          label: "Active",
        };
      case "paused":
        return {
          color: "bg-muted border-muted-foreground/20 text-muted-foreground",
          badge: "outline" as const,
          icon: TrendingUp,
          label: "Paused",
        };
      default:
        return {
          color: "bg-background border-border text-foreground",
          badge: "outline" as const,
          icon: TrendingUp,
          label: envelope.status,
        };
    }
  });

  function handleEditToggle() {
    if (isEditing) {
      const newAmount = parseFloat(editValue);
      if (Number.isFinite(newAmount) && newAmount >= 0) {
        onUpdateAllocation?.(newAmount);
      } else {
        editValue = envelope.allocatedAmount.toString();
      }
    } else {
      editValue = envelope.allocatedAmount.toString();
    }
    isEditing = !isEditing;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      handleEditToggle();
    } else if (e.key === "Escape") {
      editValue = envelope.allocatedAmount.toString();
      isEditing = false;
    }
  }
</script>

<Card.Root class={cn("transition-all hover:shadow-md", statusConfig.color, className)}>
  <Card.Header class="pb-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <statusConfig.icon class="h-4 w-4" />
        <Card.Title class="text-lg">{categoryName}</Card.Title>
      </div>
      <Badge variant={statusConfig.badge}>{statusConfig.label}</Badge>
    </div>
  </Card.Header>

  <Card.Content class="space-y-4">
    <!-- Allocation Amount -->
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium">Allocated</span>
      <div class="flex items-center gap-2">
        {#if isEditing}
          <Input
            type="number"
            step="0.01"
            min="0"
            bind:value={editValue}
            onkeydown={handleKeyDown}
            class="h-8 w-24 text-right text-sm"
            onfocusout={handleEditToggle}
          />
        {:else}
          <span class="font-mono text-sm">
            {currencyFormatter.format(envelope.allocatedAmount)}
          </span>
          {#if editable}
            <Button
              size="sm"
              variant="ghost"
              onclick={handleEditToggle}
              class="h-6 w-6 p-0"
            >
              <Edit3 class="h-3 w-3" />
            </Button>
          {/if}
        {/if}
      </div>
    </div>

    <!-- Spent Amount -->
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium">Spent</span>
      <span class="font-mono text-sm">
        {currencyFormatter.format(envelope.spentAmount)}
      </span>
    </div>

    <!-- Available Amount -->
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium">Available</span>
      <span class={cn(
        "font-mono text-sm",
        envelope.availableAmount > 0 ? "text-emerald-600" : "text-muted-foreground"
      )}>
        {currencyFormatter.format(envelope.availableAmount)}
      </span>
    </div>

    <!-- Rollover Amount (if any) -->
    {#if envelope.rolloverAmount > 0}
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium">Rollover</span>
        <span class="font-mono text-sm text-blue-600">
          {currencyFormatter.format(envelope.rolloverAmount)}
        </span>
      </div>
    {/if}

    <!-- Deficit Amount (if any) -->
    {#if envelope.deficitAmount > 0}
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-destructive">Deficit</span>
        <span class="font-mono text-sm text-destructive">
          {currencyFormatter.format(envelope.deficitAmount)}
        </span>
      </div>
    {/if}

    <!-- Progress Bar -->
    <div class="space-y-2">
      <div class="flex items-center justify-between text-xs text-muted-foreground">
        <span>Progress</span>
        <span>{progressPercentage.toFixed(0)}%</span>
      </div>
      <Progress
        value={progressPercentage}
        class={cn(
          "h-2",
          envelope.status === "overspent" && "text-destructive"
        )}
      />
    </div>

    <!-- Rollover Mode Info -->
    <div class="flex items-center justify-between text-xs text-muted-foreground">
      <span>Rollover Mode</span>
      <span class="capitalize">{envelope.rolloverMode.replace("_", " ")}</span>
    </div>
  </Card.Content>

  <Card.Footer class="pt-3">
    <div class="flex w-full gap-2">
      <Button
        size="sm"
        variant="outline"
        onclick={onTransferRequest}
        disabled={envelope.availableAmount <= 0}
        class="flex-1"
      >
        <ArrowUpDown class="h-4 w-4 mr-1" />
        Transfer
      </Button>

      {#if envelope.status === "overspent" && onDeficitRecover}
        <Button
          size="sm"
          onclick={onDeficitRecover}
          class="flex-1"
        >
          <AlertTriangle class="h-4 w-4 mr-1" />
          Recover
        </Button>
      {/if}
    </div>
  </Card.Footer>
</Card.Root>