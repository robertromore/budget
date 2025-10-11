<script lang="ts">
  import * as Card from '$lib/components/ui/card';
  import {Badge} from '$lib/components/ui/badge';
  import {Button} from '$lib/components/ui/button';
  import {Separator} from '$lib/components/ui/separator';
  import {
    CheckCircle2,
    TrendingUp,
    RotateCcw,
    AlertTriangle,
    X,
    ChevronDown,
    ChevronUp,
  } from '@lucide/svelte/icons';
  import {currencyFormatter} from '$lib/utils/formatters';
  import {cn} from '$lib/utils';
  import {slide} from 'svelte/transition';

  interface RolloverHistoryItem {
    id: number;
    envelopeId: number;
    fromPeriodId: number;
    toPeriodId: number;
    rolledAmount: number;
    resetAmount: number;
    processedAt: string;
  }

  interface Props {
    rolloverData: RolloverHistoryItem[];
    fromPeriodName?: string;
    toPeriodName?: string;
    onDismiss?: () => void;
    dismissable?: boolean;
    className?: string;
  }

  let {
    rolloverData,
    fromPeriodName = 'Previous Period',
    toPeriodName = 'Current Period',
    onDismiss,
    dismissable = true,
    className,
  }: Props = $props();

  let expanded = $state(false);

  const summary = $derived.by(() => {
    const totalRolledOver = rolloverData.reduce((sum, item) => sum + item.rolledAmount, 0);
    const totalReset = rolloverData.reduce((sum, item) => sum + item.resetAmount, 0);
    const resetCount = rolloverData.filter((item) => item.resetAmount > 0).length;
    const positiveRollovers = rolloverData.filter((item) => item.rolledAmount > 0).length;
    const negativeRollovers = rolloverData.filter((item) => item.rolledAmount < 0).length;

    return {
      totalRolledOver,
      totalReset,
      resetCount,
      positiveRollovers,
      negativeRollovers,
      totalEnvelopes: rolloverData.length,
    };
  });

  function toggleExpanded() {
    expanded = !expanded;
  }
</script>

<Card.Root class={cn('border-green-200 dark:border-green-900', className)}>
  <Card.Header class="pb-3">
    <div class="flex items-start justify-between">
      <div class="flex items-start gap-3 flex-1">
        <div class="p-2 bg-green-50 dark:bg-green-950/20 rounded-lg mt-0.5">
          <CheckCircle2 class="h-5 w-5 text-green-600" />
        </div>
        <div class="flex-1 min-w-0">
          <Card.Title class="text-lg mb-1">Rollover Completed</Card.Title>
          <Card.Description>
            Processed rollover from <strong>{fromPeriodName}</strong> to
            <strong>{toPeriodName}</strong>
          </Card.Description>
        </div>
      </div>
      {#if dismissable && onDismiss}
        <Button variant="ghost" size="icon" class="h-8 w-8 -mt-1" onclick={onDismiss}>
          <X class="h-4 w-4" />
        </Button>
      {/if}
    </div>
  </Card.Header>

  <Card.Content class="space-y-4">
    <!-- Summary Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div class="p-3 bg-muted/50 rounded-lg">
        <div class="text-xs text-muted-foreground mb-1">Envelopes</div>
        <div class="text-xl font-bold">{summary.totalEnvelopes}</div>
      </div>

      <div class="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
        <div class="text-xs text-muted-foreground mb-1">Rolled Over</div>
        <div class="text-xl font-bold text-green-600">
          {currencyFormatter.format(Math.abs(summary.totalRolledOver))}
        </div>
      </div>

      {#if summary.totalReset > 0}
        <div class="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
          <div class="text-xs text-muted-foreground mb-1">Reset</div>
          <div class="text-xl font-bold text-orange-600">
            {currencyFormatter.format(summary.totalReset)}
          </div>
        </div>
      {/if}

      {#if summary.resetCount > 0}
        <div class="p-3 bg-muted/50 rounded-lg">
          <div class="text-xs text-muted-foreground mb-1">Reset Count</div>
          <div class="text-xl font-bold">{summary.resetCount}</div>
        </div>
      {/if}
    </div>

    <!-- Breakdown Summary -->
    {#if summary.positiveRollovers > 0 || summary.negativeRollovers > 0}
      <div class="flex items-center gap-4 text-sm">
        {#if summary.positiveRollovers > 0}
          <div class="flex items-center gap-1.5">
            <TrendingUp class="h-4 w-4 text-green-600" />
            <span class="text-muted-foreground">
              {summary.positiveRollovers} envelope{summary.positiveRollovers !== 1 ? 's' : ''}
              with surplus
            </span>
          </div>
        {/if}
        {#if summary.negativeRollovers > 0}
          <div class="flex items-center gap-1.5">
            <AlertTriangle class="h-4 w-4 text-red-600" />
            <span class="text-muted-foreground">
              {summary.negativeRollovers} envelope{summary.negativeRollovers !== 1 ? 's' : ''} with
              deficit
            </span>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Expand/Collapse Details -->
    {#if rolloverData.length > 0}
      <Separator />
      <Button variant="ghost" size="sm" class="w-full" onclick={toggleExpanded}>
        {#if expanded}
          <ChevronUp class="mr-2 h-4 w-4" />
          Hide Details
        {:else}
          <ChevronDown class="mr-2 h-4 w-4" />
          View {rolloverData.length} Envelope{rolloverData.length !== 1 ? 's' : ''}
        {/if}
      </Button>

      {#if expanded}
        <div transition:slide class="space-y-2 max-h-64 overflow-y-auto">
          {#each rolloverData as item}
            {@const hasReset = item.resetAmount > 0}
            {@const isPositive = item.rolledAmount > 0}
            {@const isNegative = item.rolledAmount < 0}
            <div
              class={cn(
                'flex items-center justify-between p-3 rounded-lg border',
                isNegative && 'bg-red-50 dark:bg-red-950/10 border-red-200 dark:border-red-900',
                !isNegative && 'bg-muted/30'
              )}
            >
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <div
                  class={cn(
                    'p-1.5 rounded-full',
                    isPositive && 'bg-green-100 dark:bg-green-950',
                    isNegative && 'bg-red-100 dark:bg-red-950'
                  )}
                >
                  {#if isNegative}
                    <AlertTriangle class="h-3 w-3 text-red-600" />
                  {:else}
                    <RotateCcw class="h-3 w-3 text-green-600" />
                  {/if}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-sm">Envelope #{item.envelopeId}</div>
                  {#if hasReset}
                    <div class="text-xs text-orange-600 font-medium">
                      Reset: {currencyFormatter.format(item.resetAmount)}
                    </div>
                  {/if}
                </div>
              </div>
              <div class="text-right flex-shrink-0">
                <div
                  class={cn(
                    'text-sm font-medium',
                    isPositive && 'text-green-600',
                    isNegative && 'text-red-600',
                    !isPositive && !isNegative && 'text-muted-foreground'
                  )}
                >
                  {isPositive ? '+' : ''}{currencyFormatter.format(item.rolledAmount)}
                </div>
                <div class="text-xs text-muted-foreground">Rolled</div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    {/if}
  </Card.Content>
</Card.Root>
