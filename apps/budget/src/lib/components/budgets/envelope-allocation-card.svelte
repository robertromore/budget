<script lang="ts">
import NumericInput from '$lib/components/input/numeric-input.svelte';
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import { Progress } from '$lib/components/ui/progress';
import type { EnvelopeAllocation } from '$lib/schema/budgets/envelope-allocations';
import { cn } from '$lib/utils';
import { currencyFormatter } from '$lib/utils/formatters';
import { ArrowUpDown, Settings2, Star, TrendingUp, TriangleAlert } from '@lucide/svelte/icons';

interface Props {
  envelope: EnvelopeAllocation;
  categoryName: string;
  editable?: boolean;
  onUpdateAllocation?: (newAmount: number) => void;
  onTransferRequest?: () => void;
  onDeficitRecover?: () => void;
  onSettingsClick?: () => void;
  class?: string;
}

let {
  envelope,
  categoryName,
  editable = false,
  onUpdateAllocation,
  onTransferRequest,
  onDeficitRecover,
  onSettingsClick,
  class: className,
}: Props = $props();

let editValue = $state(envelope.allocatedAmount);

const progressPercentage = $derived.by(() => {
  if (envelope.allocatedAmount <= 0) return 0;
  return Math.min(100, (envelope.spentAmount / envelope.allocatedAmount) * 100);
});

const statusConfig = $derived.by(() => {
  switch (envelope.status) {
    case 'overspent':
      return {
        color: 'bg-destructive/10 border-destructive text-destructive',
        badge: 'destructive' as const,
        icon: TriangleAlert,
        label: 'Overspent',
      };
    case 'depleted':
      return {
        color:
          'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900 dark:border-orange-700 dark:text-orange-300',
        badge: 'secondary' as const,
        icon: TriangleAlert,
        label: 'Depleted',
      };
    case 'active':
      return {
        color:
          'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900 dark:border-emerald-700 dark:text-emerald-300',
        badge: 'secondary' as const,
        icon: TrendingUp,
        label: 'Active',
      };
    case 'paused':
      return {
        color: 'bg-muted border-muted-foreground/20 text-muted-foreground',
        badge: 'outline' as const,
        icon: TrendingUp,
        label: 'Paused',
      };
    default:
      return {
        color: 'bg-background border-border text-foreground',
        badge: 'outline' as const,
        icon: TrendingUp,
        label: envelope.status,
      };
  }
});

function handleAllocationSubmit() {
  if (Number.isFinite(editValue) && editValue >= 0 && editValue !== envelope.allocatedAmount) {
    onUpdateAllocation?.(editValue);
  }
}

$effect(() => {
  editValue = envelope.allocatedAmount;
});

const priority = $derived.by(() => (envelope.metadata as any)?.priority ?? null);
const isEmergencyFund = $derived.by(() => (envelope.metadata as any)?.isEmergencyFund ?? false);
</script>

<Card.Root class={cn('transition-all hover:shadow-md', statusConfig.color, className)}>
  <Card.Header class="pb-3">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <div class="mb-1 flex items-center gap-2">
          <statusConfig.icon class="h-4 w-4 shrink-0" />
          <Card.Title class="truncate text-lg">{categoryName}</Card.Title>
        </div>
        <div class="text-muted-foreground flex items-center gap-2 text-xs">
          {#if isEmergencyFund}
            <Badge variant="destructive" class="text-xs">Emergency</Badge>
          {:else if priority !== null}
            <div class="flex items-center gap-1">
              <Star class="h-3 w-3 fill-current" />
              <span>Priority {priority}</span>
            </div>
          {/if}
        </div>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <Badge variant={statusConfig.badge}>{statusConfig.label}</Badge>
        {#if onSettingsClick}
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            onclick={onSettingsClick}
            title="Envelope Settings">
            <Settings2 class="h-4 w-4" />
          </Button>
        {/if}
      </div>
    </div>
  </Card.Header>

  <Card.Content class="space-y-4">
    <!-- Allocation Amount -->
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium">Allocated</span>
      <div class="flex items-center gap-2">
        {#if editable}
          <NumericInput
            bind:value={editValue}
            onSubmit={handleAllocationSubmit}
            buttonClass="h-8 w-28" />
        {:else}
          <span class="font-mono text-sm">
            {currencyFormatter.format(envelope.allocatedAmount)}
          </span>
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
      <span
        class={cn(
          'font-mono text-sm',
          envelope.availableAmount > 0 ? 'text-emerald-600' : 'text-muted-foreground'
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
        <span class="text-destructive text-sm font-medium">Deficit</span>
        <span class="text-destructive font-mono text-sm">
          {currencyFormatter.format(envelope.deficitAmount)}
        </span>
      </div>
    {/if}

    <!-- Progress Bar -->
    <div class="space-y-2">
      <div class="text-muted-foreground flex items-center justify-between text-xs">
        <span>Progress</span>
        <span>{progressPercentage.toFixed(0)}%</span>
      </div>
      <Progress
        value={progressPercentage}
        class={cn('h-2', envelope.status === 'overspent' && 'text-destructive')} />
    </div>

    <!-- Rollover Mode Info -->
    <div class="text-muted-foreground flex items-center justify-between text-xs">
      <span>Rollover Mode</span>
      <span class="capitalize">{envelope.rolloverMode.replace('_', ' ')}</span>
    </div>
  </Card.Content>

  <Card.Footer class="pt-3">
    <div class="flex w-full gap-2">
      <Button
        size="sm"
        variant="outline"
        onclick={onTransferRequest}
        disabled={envelope.availableAmount <= 0}
        class="flex-1">
        <ArrowUpDown class="mr-1 h-4 w-4" />
        Transfer
      </Button>

      {#if envelope.status === 'overspent' && onDeficitRecover}
        <Button size="sm" onclick={onDeficitRecover} class="flex-1">
          <TriangleAlert class="mr-1 h-4 w-4" />
          Recover
        </Button>
      {/if}
    </div>
  </Card.Footer>
</Card.Root>
