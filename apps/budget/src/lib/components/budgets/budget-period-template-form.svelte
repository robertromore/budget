<script lang="ts">
import * as Form from '$lib/components/ui/form';
import * as Select from '$lib/components/ui/select';
import { Button } from '$lib/components/ui/button';
import { Label } from '$lib/components/ui/label';
import { Input } from '$lib/components/ui/input';
import { Card } from '$lib/components/ui/card';
import { CalendarDays } from '@lucide/svelte/icons';
import { superForm } from 'sveltekit-superforms';
import { zod4Client } from 'sveltekit-superforms/adapters';
import { z } from 'zod/v4';
import { parseISOString, currentDate, toISOString } from '$lib/utils/dates';
import type { CalendarDate } from '@internationalized/date';

interface Props {
  budgetId: number;
  onSuccess?: (template: any) => void;
  onCancel?: () => void;
}

let { budgetId, onSuccess, onCancel }: Props = $props();

// Form schema
const periodTemplateSchema = z.object({
  periodType: z.enum(['weekly', 'monthly', 'quarterly', 'yearly', 'custom']),
  interval: z.number().min(1).max(52),
  startDayOfWeek: z.number().min(1).max(7).optional(),
  startDayOfMonth: z.number().min(1).max(31).optional(),
  startMonth: z.number().min(1).max(12).optional(),
  customDuration: z.number().min(1).max(365).optional(),
});

// Initialize form
const form = superForm(
  { periodType: 'monthly', interval: 1, startDayOfMonth: 1 },
  {
    validators: zod4Client(periodTemplateSchema),
    SPA: true,
  }
);

const { form: formData, enhance } = form;

// Form state
let periodType = $state<string>('monthly');
let interval = $state<number>(1);
let startDayOfWeek = $state<number>(1);
let startDayOfMonth = $state<number>(1);
let startMonth = $state<number>(1);
let customDuration = $state<number>(30);

// Calculate preview periods
const previewPeriods = $derived.by(() => {
  const periods: Array<{ start: string; end: string }> = [];
  let current: CalendarDate = currentDate;

  // Generate 3 preview periods
  for (let i = 0; i < 3; i++) {
    let periodEnd: CalendarDate;

    switch (periodType) {
      case 'weekly':
        // Adjust to start day of week
        const dayOfWeek = current.dayOfWeek;
        const daysToAdd = (startDayOfWeek - dayOfWeek + 7) % 7;
        const periodStart = daysToAdd > 0 ? current.add({ days: daysToAdd }) : current;
        periodEnd = periodStart.add({ weeks: interval }).subtract({ days: 1 });
        periods.push({
          start: toISOString(periodStart),
          end: toISOString(periodEnd),
        });
        current = periodEnd.add({ days: 1 });
        break;

      case 'monthly':
        // Start on specific day of month
        const monthStart = current.set({ day: Math.min(startDayOfMonth, current.daysInMonth) });
        periodEnd = monthStart.add({ months: interval }).subtract({ days: 1 });
        periods.push({
          start: toISOString(monthStart),
          end: toISOString(periodEnd),
        });
        current = periodEnd.add({ days: 1 });
        break;

      case 'quarterly':
        // 3-month periods
        const quarterStart = current.set({ day: 1 });
        periodEnd = quarterStart.add({ months: 3 * interval }).subtract({ days: 1 });
        periods.push({
          start: toISOString(quarterStart),
          end: toISOString(periodEnd),
        });
        current = periodEnd.add({ days: 1 });
        break;

      case 'yearly':
        // Start on specific month and day
        const yearStart = current.set({ month: startMonth, day: startDayOfMonth });
        periodEnd = yearStart.add({ years: interval }).subtract({ days: 1 });
        periods.push({
          start: toISOString(yearStart),
          end: toISOString(periodEnd),
        });
        current = periodEnd.add({ days: 1 });
        break;

      case 'custom':
        periodEnd = current.add({ days: customDuration - 1 });
        periods.push({
          start: toISOString(current),
          end: toISOString(periodEnd),
        });
        current = periodEnd.add({ days: 1 });
        break;
    }
  }

  return periods;
});

// Format period for display
function formatPeriodDate(dateStr: string): string {
  const date = parseISOString(dateStr);
  if (!date) return dateStr;

  return date.toDate('UTC').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Day of week names
const daysOfWeek = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
];

// Month names
const months = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

function handleSubmit() {
  // Build template data
  const templateData = {
    budgetId,
    periodType,
    interval,
    startDayOfWeek: periodType === 'weekly' ? startDayOfWeek : null,
    startDayOfMonth: ['monthly', 'yearly'].includes(periodType) ? startDayOfMonth : null,
    startMonth: periodType === 'yearly' ? startMonth : null,
    customDuration: periodType === 'custom' ? customDuration : null,
  };

  // Call onSuccess with template data
  onSuccess?.(templateData);
}
</script>

<form onsubmit={handleSubmit} use:enhance class="space-y-6">
  <!-- Period Type Selector -->
  <div class="space-y-2">
    <Label>Period Type</Label>
    <Select.Root bind:value={periodType}>
      <Select.Trigger>
        <Select.Value placeholder="Select Period Type">
          {periodType.charAt(0).toUpperCase() + periodType.slice(1)}
        </Select.Value>
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
    <div class="flex items-center gap-2">
      <span class="text-sm text-muted-foreground">Every</span>
      <Input
        type="number"
        bind:value={interval}
        min="1"
        max={periodType === 'weekly' ? 52 : 12}
        class="w-20"
      />
      <span class="text-sm text-muted-foreground">
        {interval === 1 ? periodType.slice(0, -2) : periodType}
      </span>
    </div>
  </div>

  <!-- Period-specific configuration -->
  {#if periodType === 'weekly'}
    <div class="space-y-2">
      <Label>Week Starts On</Label>
      <Select.Root bind:value={startDayOfWeek}>
        <Select.Trigger>
          <Select.Value>
            {daysOfWeek.find(d => d.value === startDayOfWeek)?.label || 'Select Day'}
          </Select.Value>
        </Select.Trigger>
        <Select.Content>
          {#each daysOfWeek as day}
            <Select.Item value={day.value}>{day.label}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>
  {:else if periodType === 'monthly'}
    <div class="space-y-2">
      <Label>Month Starts On</Label>
      <Input
        type="number"
        bind:value={startDayOfMonth}
        min="1"
        max="31"
        class="w-20"
      />
      <p class="text-xs text-muted-foreground">
        Day 1-31 (automatically handles months with fewer days)
      </p>
    </div>
  {:else if periodType === 'yearly'}
    <div class="grid grid-cols-2 gap-4">
      <div class="space-y-2">
        <Label>Start Month</Label>
        <Select.Root bind:value={startMonth}>
          <Select.Trigger>
            <Select.Value>
              {months.find(m => m.value === startMonth)?.label || 'Select Month'}
            </Select.Value>
          </Select.Trigger>
          <Select.Content>
            {#each months as month}
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
  {:else if periodType === 'custom'}
    <div class="space-y-2">
      <Label>Period Duration (Days)</Label>
      <Input
        type="number"
        bind:value={customDuration}
        min="1"
        max="365"
        class="w-32"
      />
    </div>
  {/if}

  <!-- Preview upcoming periods -->
  <Card.Root>
    <Card.Header>
      <div class="flex items-center gap-2">
        <CalendarDays class="h-4 w-4" />
        <Card.Title class="text-base">Preview</Card.Title>
      </div>
    </Card.Header>
    <Card.Content>
      <ul class="space-y-2 text-sm">
        {#each previewPeriods as period, index}
          <li class="flex justify-between p-2 rounded-md bg-muted/30">
            <span class="text-muted-foreground">Period {index + 1}:</span>
            <span class="font-medium">
              {formatPeriodDate(period.start)} → {formatPeriodDate(period.end)}
            </span>
          </li>
        {/each}
      </ul>
    </Card.Content>
  </Card.Root>

  <!-- Actions -->
  <div class="flex gap-2">
    <Button type="submit" class="flex-1">Create Template</Button>
    {#if onCancel}
      <Button type="button" variant="outline" onclick={onCancel}>Cancel</Button>
    {/if}
  </div>
</form>
