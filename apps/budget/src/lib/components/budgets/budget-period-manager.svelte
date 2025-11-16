<script lang="ts">
import {SvelteMap} from 'svelte/reactivity';
import {
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  ChartBar,
  Plus,
  Minus,
} from '@lucide/svelte/icons';
import * as Card from '$lib/components/ui/card';
import {Button} from '$lib/components/ui/button';
import {Badge} from '$lib/components/ui/badge';
import {Progress} from '$lib/components/ui/progress';
import * as Dialog from '$lib/components/ui/dialog';
import * as Select from '$lib/components/ui/select';
import {Input} from '$lib/components/ui/input';
import Label from '$lib/components/ui/label/label.svelte';
import {cn} from '$lib/utils';
import {currencyFormatter} from '$lib/utils/formatters';
import {formatDateDisplay, parseISOString, currentDate} from '$lib/utils/dates';
import type {BudgetPeriodInstance} from '$lib/schema/budgets';
import type {PeriodAnalytics, PeriodComparison} from '$lib/server/domains/budgets/period-manager';

interface Props {
  currentPeriod: BudgetPeriodInstance;
  analytics: PeriodAnalytics;
  comparison?: PeriodComparison;
  periodHistory: PeriodAnalytics[];
  onCreatePeriod?: (config: any) => void;
  onScheduleMaintenance?: () => void;
  class?: string;
}

let {
  currentPeriod,
  analytics,
  comparison,
  periodHistory,
  onCreatePeriod,
  onScheduleMaintenance,
  class: className,
}: Props = $props();

let createPeriodDialogOpen = $state(false);
let selectedPeriodType = $state('standard');
let lookAheadMonths = $state('3');
let autoCreateEnvelopes = $state(true);
let enableRollover = $state(true);

const periodTypeOptions = [
  {value: 'standard', label: 'Standard Period', description: 'Use template settings'},
  {value: 'custom', label: 'Custom Dates', description: 'Specify start and end dates'},
  {value: 'fiscal', label: 'Fiscal Year', description: 'Align with fiscal year'},
  {value: 'floating', label: 'Floating Period', description: 'Anchor to specific date'},
];

const performanceColor = $derived(() => {
  if (analytics.performanceScore >= 90) return 'text-emerald-600';
  if (analytics.performanceScore >= 75) return 'text-yellow-600';
  return 'text-destructive';
});

const utilizationColor = $derived(() => {
  if (analytics.utilizationRate > 100) return 'text-destructive';
  if (analytics.utilizationRate > 90) return 'text-orange-600';
  if (analytics.utilizationRate < 50) return 'text-blue-600';
  return 'text-emerald-600';
});

const trendIconMap = new SvelteMap([
  ['increasing', TrendingUp],
  ['improving', TrendingUp],
  ['decreasing', TrendingDown],
  ['declining', TrendingDown],
]);

const getTrendIcon = $derived((trend: string) => trendIconMap.get(trend) ?? Minus);

function handleCreatePeriod() {
  const config = {
    type: selectedPeriodType,
    lookAheadMonths: parseInt(lookAheadMonths),
    autoCreateEnvelopes,
    enableRollover,
  };

  onCreatePeriod?.(config);
  createPeriodDialogOpen = false;
}
</script>

<div class={cn('space-y-6', className)}>
  <!-- Current Period Overview -->
  <Card.Root>
    <Card.Header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Calendar class="h-5 w-5" />
          <Card.Title>Current Period</Card.Title>
        </div>
        <div class="flex gap-2">
          <Button size="sm" variant="outline" onclick={onScheduleMaintenance}>
            <Clock class="mr-1 h-4 w-4" />
            Maintenance
          </Button>
          <Button size="sm" onclick={() => (createPeriodDialogOpen = true)}>
            <Plus class="mr-1 h-4 w-4" />
            Create Period
          </Button>
        </div>
      </div>
    </Card.Header>
    <Card.Content>
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div class="space-y-2">
          <p class="text-muted-foreground text-sm">Period Duration</p>
          <p class="text-lg font-semibold">
            {formatDateDisplay(parseISOString(currentPeriod.startDate) || currentDate, 'medium')} - {formatDateDisplay(
              parseISOString(currentPeriod.endDate) || currentDate,
              'medium'
            )}
          </p>
          <p class="text-muted-foreground text-xs">{analytics.duration} days</p>
        </div>

        <div class="space-y-2">
          <p class="text-muted-foreground text-sm">Performance Score</p>
          <p class={cn('text-2xl font-bold', performanceColor)}>
            {analytics.performanceScore.toFixed(0)}%
          </p>
          <Progress value={analytics.performanceScore} class="h-2" />
        </div>

        <div class="space-y-2">
          <p class="text-muted-foreground text-sm">Utilization Rate</p>
          <p class={cn('text-2xl font-bold', utilizationColor)}>
            {analytics.utilizationRate.toFixed(1)}%
          </p>
          <Progress
            value={Math.min(100, analytics.utilizationRate)}
            class={cn('h-2', analytics.utilizationRate > 100 && 'text-destructive')} />
        </div>

        <div class="space-y-2">
          <p class="text-muted-foreground text-sm">Envelope Status</p>
          <div class="flex gap-2">
            {#if analytics.deficitCount > 0}
              <Badge variant="destructive">{analytics.deficitCount} Deficit</Badge>
            {/if}
            {#if analytics.surplusCount > 0}
              <Badge variant="secondary">{analytics.surplusCount} Surplus</Badge>
            {/if}
          </div>
        </div>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Financial Summary -->
  <div class="grid gap-4 md:grid-cols-3">
    <Card.Root>
      <Card.Header class="pb-3">
        <Card.Title class="text-lg">Total Allocated</Card.Title>
      </Card.Header>
      <Card.Content>
        <p class="text-2xl font-bold">{currencyFormatter.format(analytics.totalAllocated)}</p>
        {#if comparison}
          <p
            class={cn(
              'flex items-center gap-1 text-sm',
              comparison.changes.allocatedChange >= 0 ? 'text-emerald-600' : 'text-destructive'
            )}>
            {comparison.changes.allocatedChange >= 0 ? '↗️' : '↘️'}
            {currencyFormatter.format(Math.abs(comparison.changes.allocatedChange))}
            vs last period
          </p>
        {/if}
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header class="pb-3">
        <Card.Title class="text-lg">Total Spent</Card.Title>
      </Card.Header>
      <Card.Content>
        <p class="text-2xl font-bold">{currencyFormatter.format(analytics.totalSpent)}</p>
        {#if comparison}
          <p
            class={cn(
              'flex items-center gap-1 text-sm',
              comparison.changes.spentChange <= 0 ? 'text-emerald-600' : 'text-orange-600'
            )}>
            {comparison.changes.spentChange >= 0 ? '↗️' : '↘️'}
            {currencyFormatter.format(Math.abs(comparison.changes.spentChange))}
            vs last period
          </p>
        {/if}
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header class="pb-3">
        <Card.Title class="text-lg">Rollover Funds</Card.Title>
      </Card.Header>
      <Card.Content>
        <p class="text-2xl font-bold text-blue-600">
          {currencyFormatter.format(analytics.totalRollover)}
        </p>
        <p class="text-muted-foreground text-sm">From previous periods</p>
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Trends & Insights -->
  <div class="grid gap-4 md:grid-cols-2">
    <Card.Root>
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <TrendingUp class="h-5 w-5" />
          Trends
        </Card.Title>
      </Card.Header>
      <Card.Content class="space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-sm">Spending Trend</span>
          {#if analytics.trends.spendingTrend}
            {@const Icon = getTrendIcon(analytics.trends.spendingTrend)}
            <span class="flex items-center gap-1 text-sm">
              <Icon class="h-3 w-3" />
              <span class="capitalize">{analytics.trends.spendingTrend}</span>
            </span>
          {/if}
        </div>

        <div class="flex items-center justify-between">
          <span class="text-sm">Allocation Trend</span>
          {#if analytics.trends.allocationTrend}
            {@const Icon = getTrendIcon(analytics.trends.allocationTrend)}
            <span class="flex items-center gap-1 text-sm">
              <Icon class="h-3 w-3" />
              <span class="capitalize">{analytics.trends.allocationTrend}</span>
            </span>
          {/if}
        </div>

        <div class="flex items-center justify-between">
          <span class="text-sm">Efficiency Trend</span>
          {#if analytics.trends.efficiencyTrend}
            {@const Icon = getTrendIcon(analytics.trends.efficiencyTrend)}
            <span class="flex items-center gap-1 text-sm">
              <Icon class="h-3 w-3" />
              <span class="capitalize">{analytics.trends.efficiencyTrend}</span>
            </span>
          {/if}
        </div>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <ChartBar class="h-5 w-5" />
          Insights
        </Card.Title>
      </Card.Header>
      <Card.Content>
        {#if comparison?.insights && comparison.insights.length > 0}
          <div class="space-y-2">
            {#each comparison.insights.slice(0, 4) as insight}
              <p class="text-muted-foreground text-sm">• {insight}</p>
            {/each}
          </div>
        {:else}
          <p class="text-muted-foreground text-sm">
            No significant insights available for this period comparison.
          </p>
        {/if}
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Period History -->
  <Card.Root>
    <Card.Header>
      <Card.Title>Period History</Card.Title>
      <Card.Description>Performance comparison across recent budget periods</Card.Description>
    </Card.Header>
    <Card.Content>
      <div class="space-y-3">
        {#each periodHistory.slice(0, 6) as period (period.periodId)}
          <div class="flex items-center justify-between rounded-lg border p-3">
            <div class="flex items-center gap-4">
              <div class="text-sm">
                <div class="font-medium">Period {period.periodId}</div>
                <div class="text-muted-foreground">{period.duration} days</div>
              </div>
              <div class="text-sm">
                <div>Performance: {period.performanceScore.toFixed(0)}%</div>
                <div class="text-muted-foreground">
                  Utilization: {period.utilizationRate.toFixed(1)}%
                </div>
              </div>
            </div>

            <div class="text-right text-sm">
              <div class="font-medium">
                {currencyFormatter.format(period.totalSpent)}
              </div>
              <div class="text-muted-foreground">
                of {currencyFormatter.format(period.totalAllocated)}
              </div>
            </div>

            <div class="flex gap-1">
              {#if period.deficitCount > 0}
                <Badge variant="destructive" class="text-xs">
                  {period.deficitCount}D
                </Badge>
              {/if}
              {#if period.surplusCount > 0}
                <Badge variant="secondary" class="text-xs">
                  {period.surplusCount}S
                </Badge>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </Card.Content>
  </Card.Root>
</div>

<!-- Create Period Dialog -->
<Dialog.Root bind:open={createPeriodDialogOpen}>
  <Dialog.Content class="max-w-md">
    <Dialog.Header>
      <Dialog.Title>Create Budget Period</Dialog.Title>
      <Dialog.Description>
        Set up automated period creation with custom settings.
      </Dialog.Description>
    </Dialog.Header>

    <form
      onsubmit={(e) => {
        e.preventDefault();
        handleCreatePeriod();
      }}
      class="space-y-4">
      <div class="space-y-2">
        <Label>Period Type</Label>
        <Select.Root type="single" bind:value={selectedPeriodType}>
          <Select.Trigger>
            <span>
              {periodTypeOptions.find((option) => option.value === selectedPeriodType)?.label}
            </span>
          </Select.Trigger>
          <Select.Content>
            {#each periodTypeOptions as option (option.value)}
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

      <div class="space-y-2">
        <Label for="look-ahead">Look Ahead (Months)</Label>
        <Input id="look-ahead" type="number" min="1" max="12" bind:value={lookAheadMonths} />
        <p class="text-muted-foreground text-xs">
          Number of future periods to create automatically
        </p>
      </div>

      <div class="space-y-3">
        <div class="flex items-center space-x-2">
          <input
            id="auto-create-envelopes"
            type="checkbox"
            bind:checked={autoCreateEnvelopes}
            class="text-primary focus:ring-primary rounded border-gray-300" />
          <Label for="auto-create-envelopes" class="text-sm">
            Auto-create envelope allocations
          </Label>
        </div>

        <div class="flex items-center space-x-2">
          <input
            id="enable-rollover"
            type="checkbox"
            bind:checked={enableRollover}
            class="text-primary focus:ring-primary rounded border-gray-300" />
          <Label for="enable-rollover" class="text-sm">Enable rollover from previous periods</Label>
        </div>
      </div>

      <Dialog.Footer>
        <Button type="button" variant="outline" onclick={() => (createPeriodDialogOpen = false)}>
          Cancel
        </Button>
        <Button type="submit">Create Periods</Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
