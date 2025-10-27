<script lang="ts">
import * as Select from '$lib/components/ui/select';
import { Button } from '$lib/components/ui/button';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import * as Card from '$lib/components/ui/card';
import { CalendarDays } from '@lucide/svelte/icons';
import { parseISOString, currentDate, toISOString, getIsoWeekday, getDaysInMonth, formatDateDisplay } from '$lib/utils/dates';
import type { CalendarDate } from '@internationalized/date';
import type { BudgetPeriodTemplate } from '$lib/schema/budgets';
import { createPeriodTemplate } from '$lib/query/budgets';
import { isoWeekdayOptions, monthStringOptions } from '$lib/utils/date-options';

interface Props {
  budgetId: number;
  defaultAllocatedAmount?: number;
  onSuccess?: (template: BudgetPeriodTemplate) => void;
  onCancel?: () => void;
}

let { budgetId, defaultAllocatedAmount = 0, onSuccess, onCancel }: Props = $props();

// Mutations - must be called during component initialization
const createMutation = createPeriodTemplate.options();

// Form state
let type = $state<'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'>('monthly');
let intervalCount = $state(1);
let startDayOfWeek = $state(1);
let startDayOfMonth = $state(1);
let startMonth = $state(1);
let allocatedAmount = $state(defaultAllocatedAmount);

// String bindings for Select components (which require string values)
let startDayOfWeekStr = $state<string>('1');
let startMonthStr = $state<string>('1');

// Sync number values with string bindings
$effect(() => {
  startDayOfWeek = parseInt(startDayOfWeekStr) || 1;
});

$effect(() => {
  startMonth = parseInt(startMonthStr) || 1;
});

// Calculate preview periods using form data
const previewPeriods = $derived.by(() => {
  const periods: Array<{ start: string; end: string }> = [];
  let current: CalendarDate = currentDate;
  const periodType = type;
  const interval = intervalCount || 1;

  // Generate 3 preview periods
  for (let i = 0; i < 3; i++) {
    let periodEnd: CalendarDate;

    switch (periodType) {
      case 'weekly': {
        // Adjust to start day of week
        const dayOfWeek = getIsoWeekday(current);
        const daysToAdd = (startDayOfWeek - dayOfWeek + 7) % 7;
        const periodStart = daysToAdd > 0 ? current.add({ days: daysToAdd }) : current;
        periodEnd = periodStart.add({ weeks: interval }).subtract({ days: 1 });
        periods.push({
          start: toISOString(periodStart),
          end: toISOString(periodEnd),
        });
        current = periodEnd.add({ days: 1 });
        break;
      }

      case 'monthly': {
        // Start on specific day of month
        const monthStart = current.set({ day: Math.min(startDayOfMonth, getDaysInMonth(current)) });
        periodEnd = monthStart.add({ months: interval }).subtract({ days: 1 });
        periods.push({
          start: toISOString(monthStart),
          end: toISOString(periodEnd),
        });
        current = periodEnd.add({ days: 1 });
        break;
      }

      case 'quarterly': {
        // 3-month periods
        const quarterStart = current.set({ day: 1 });
        periodEnd = quarterStart.add({ months: 3 * interval }).subtract({ days: 1 });
        periods.push({
          start: toISOString(quarterStart),
          end: toISOString(periodEnd),
        });
        current = periodEnd.add({ days: 1 });
        break;
      }

      case 'yearly': {
        // Start on specific month and day
        const yearStart = current.set({ month: startMonth, day: startDayOfMonth });
        periodEnd = yearStart.add({ years: interval }).subtract({ days: 1 });
        periods.push({
          start: toISOString(yearStart),
          end: toISOString(periodEnd),
        });
        current = periodEnd.add({ days: 1 });
        break;
      }

      case 'custom': {
        // Custom period - not used in this form but keeping for compatibility
        periodEnd = current.add({ days: 30 - 1 });
        periods.push({
          start: toISOString(current),
          end: toISOString(periodEnd),
        });
        current = periodEnd.add({ days: 1 });
        break;
      }
    }
  }

  return periods;
});

async function handleSubmit(e: SubmitEvent) {
  e.preventDefault();

  // Build template data conditionally
  const data: any = {
    budgetId,
    type,
    intervalCount,
    allocatedAmount,
  };

  // Only include optional fields when they have values
  if (type === 'weekly') {
    data.startDayOfWeek = startDayOfWeek;
  }
  if (type === 'monthly' || type === 'yearly') {
    data.startDayOfMonth = startDayOfMonth;
  }
  if (type === 'yearly') {
    data.startMonth = startMonth;
  }

  // Execute mutation
  const result = await createMutation.mutateAsync(data);
  if (result) {
    onSuccess?.(result);
  }
}
</script>

<form onsubmit={handleSubmit} class="space-y-4">
  <!-- Configuration -->
  <div class="grid sm:grid-cols-2 gap-4">
    <!-- Period Type Selector -->
    <div class="space-y-2">
      <Label>Period Type</Label>
      <Select.Root type="single" bind:value={type}>
        <Select.Trigger>
          <span>{String(type).charAt(0).toUpperCase() + String(type).slice(1)}</span>
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="weekly">Weekly</Select.Item>
          <Select.Item value="monthly">Monthly</Select.Item>
          <Select.Item value="quarterly">Quarterly</Select.Item>
          <Select.Item value="yearly">Yearly</Select.Item>
          <Select.Item value="custom">Custom</Select.Item>
        </Select.Content>
      </Select.Root>
    </div>

    <!-- Interval -->
    <div class="space-y-2">
      <Label>Interval</Label>
      <div class="flex items-center gap-2 w-full">
        <span class="text-sm text-muted-foreground whitespace-nowrap">Every</span>
        <Input
          type="number"
          bind:value={intervalCount}
          min="1"
          max={type === 'weekly' ? 52 : 12}
          class="w-16 flex-shrink-0"
        />
        <span class="text-sm text-muted-foreground truncate">
          {intervalCount === 1 ? String(type).slice(0, -2) : String(type)}
        </span>
      </div>
    </div>
  </div>

  <!-- Allocated Amount -->
  <div class="space-y-2">
    <Label for="allocated-amount">Allocated Amount Per Period</Label>
    <Input
      id="allocated-amount"
      type="number"
      bind:value={allocatedAmount}
      min="0"
      step="0.01"
      placeholder="0.00"
    />
    <p class="text-sm text-muted-foreground">
      The budget amount for each period. Leave as 0 to set later.
    </p>
  </div>

  <!-- Period-specific configuration -->
  {#if type === 'weekly'}
    <div class="space-y-2">
      <Label>Week Starts On</Label>
      <Select.Root type="single" bind:value={startDayOfWeekStr}>
        <Select.Trigger>
          <span>{isoWeekdayOptions.find(d => d.value === startDayOfWeekStr)?.label || 'Select Day'}</span>
        </Select.Trigger>
        <Select.Content>
          {#each isoWeekdayOptions as day}
            <Select.Item value={day.value}>{day.label}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>
  {:else if type === 'monthly'}
    <div class="space-y-2">
      <Label>Month Starts On (Day 1-31)</Label>
      <Input
        type="number"
        bind:value={startDayOfMonth}
        min="1"
        max="31"
        class="w-full"
      />
    </div>
  {:else if type === 'yearly'}
    <div class="grid sm:grid-cols-2 gap-4">
      <div class="space-y-2">
        <Label>Start Month</Label>
        <Select.Root type="single" bind:value={startMonthStr}>
          <Select.Trigger>
            <span>{monthStringOptions.find(m => m.value === startMonthStr)?.label || 'Select Month'}</span>
          </Select.Trigger>
          <Select.Content>
            {#each monthStringOptions as month}
              <Select.Item value={month.value}>{month.label}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
      <div class="space-y-2">
        <Label>Start Day</Label>
        <Input
          type="number"
          bind:value={startDayOfMonth}
          min="1"
          max="31"
        />
      </div>
    </div>
  {/if}

  <!-- Preview upcoming periods -->
  <Card.Root>
    <Card.Header class="pb-3">
      <div class="flex items-center gap-2">
        <CalendarDays class="h-4 w-4" />
        <Card.Title class="text-sm font-medium">Next 3 Periods</Card.Title>
      </div>
    </Card.Header>
    <Card.Content class="pt-0">
      <ul class="space-y-1.5 text-sm">
        {#each previewPeriods as period, index}
          <li class="flex justify-between py-1.5 px-2 rounded-md bg-muted/30">
            <span class="text-muted-foreground">Period {index + 1}</span>
            <span class="font-medium text-xs">
              {formatDateDisplay(parseISOString(period.start)!, 'short')} → {formatDateDisplay(parseISOString(period.end)!, 'short')}
            </span>
          </li>
        {/each}
      </ul>
    </Card.Content>
  </Card.Root>

  <!-- Actions -->
  <div class="flex gap-2 pt-2">
    <Button type="submit" class="flex-1">Create Template</Button>
    {#if onCancel}
      <Button type="button" variant="outline" onclick={onCancel}>Cancel</Button>
    {/if}
  </div>
</form>
