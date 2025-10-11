<script lang="ts">
import * as Select from '$lib/components/ui/select';
import * as Form from '$lib/components/ui/form';
import { Button } from '$lib/components/ui/button';
import { Input } from '$lib/components/ui/input';
import * as Card from '$lib/components/ui/card';
import { CalendarDays } from '@lucide/svelte/icons';
import { parseISOString, currentDate, toISOString, getIsoWeekday, getDaysInMonth, formatDateDisplay } from '$lib/utils/dates';
import type { CalendarDate } from '@internationalized/date';
import type { BudgetPeriodTemplate } from '$lib/schema/budgets';
import { createPeriodTemplate } from '$lib/query/budgets';
import { isoWeekdayOptions, monthStringOptions } from '$lib/utils/date-options';
import { superformCreatePeriodTemplateSchema } from '$lib/schema/superforms';
import { superForm, defaults } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';

interface Props {
  budgetId: number;
  onSuccess?: (template: BudgetPeriodTemplate) => void;
  onCancel?: () => void;
}

let { budgetId, onSuccess, onCancel }: Props = $props();

// Mutations
const createMutation = createPeriodTemplate;

// Superform setup
const superform = superForm(defaults({ budgetId, type: 'monthly' as const }, zod(superformCreatePeriodTemplateSchema)), {
  SPA: true,
  validators: zod(superformCreatePeriodTemplateSchema),
  onSubmit: async ({ formData, cancel }) => {
    cancel(); // Prevent default form submission

    // Build template data conditionally
    const data: any = {
      budgetId: formData.get('budgetId'),
      type: formData.get('type'),
      intervalCount: Number(formData.get('intervalCount')),
    };

    // Only include optional fields when they have values
    const type = formData.get('type') as string;
    const startDayOfWeek = formData.get('startDayOfWeek');
    const startDayOfMonth = formData.get('startDayOfMonth');
    const startMonth = formData.get('startMonth');

    if (type === 'weekly' && startDayOfWeek) {
      data.startDayOfWeek = Number(startDayOfWeek);
    }
    if ((type === 'monthly' || type === 'yearly') && startDayOfMonth) {
      data.startDayOfMonth = Number(startDayOfMonth);
    }
    if (type === 'yearly' && startMonth) {
      data.startMonth = Number(startMonth);
    }

    // Execute mutation
    const result = await createMutation.execute(data);
    if (result) {
      onSuccess?.(result);
    }
  },
});

const { form: formData, enhance } = superform;

// String bindings for Select components (which require string values)
let startDayOfWeekStr = $state<string>('1');
let startMonthStr = $state<string>('1');

// Sync number values with string bindings
$effect(() => {
  $formData['startDayOfWeek'] = parseInt(startDayOfWeekStr) || 1;
});

$effect(() => {
  $formData['startMonth'] = parseInt(startMonthStr) || 1;
});

// Calculate preview periods using form data
const previewPeriods = $derived.by(() => {
  const periods: Array<{ start: string; end: string }> = [];
  let current: CalendarDate = currentDate;
  const periodType = $formData['type'];
  const interval = Number($formData['intervalCount']) || 1;
  const startDayOfWeek = Number($formData['startDayOfWeek']) || 1;
  const startDayOfMonth = Number($formData['startDayOfMonth']) || 1;
  const startMonth = Number($formData['startMonth']) || 1;

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
</script>

<form method="POST" use:enhance class="space-y-6">
  <!-- Period Type Selector -->
  <Form.Field form={superform} name="type">
    <Form.Control>
      <Form.Label>Period Type</Form.Label>
      <Select.Root type="single" bind:value={$formData['type']}>
        <Select.Trigger>
          <span>{String($formData['type']).charAt(0).toUpperCase() + String($formData['type']).slice(1)}</span>
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="weekly">Weekly</Select.Item>
          <Select.Item value="monthly">Monthly</Select.Item>
          <Select.Item value="quarterly">Quarterly</Select.Item>
          <Select.Item value="yearly">Yearly</Select.Item>
          <Select.Item value="custom">Custom</Select.Item>
        </Select.Content>
      </Select.Root>
    </Form.Control>
    <Form.FieldErrors />
  </Form.Field>

  <!-- Interval -->
  <Form.Field form={superform} name="intervalCount">
    <Form.Control let:attrs>
      <Form.Label>Interval</Form.Label>
      <div class="flex items-center gap-2">
        <span class="text-sm text-muted-foreground">Every</span>
        <Input
          {...attrs}
          type="number"
          bind:value={$formData['intervalCount']}
          min="1"
          max={$formData['type'] === 'weekly' ? 52 : 12}
          class="w-20"
        />
        <span class="text-sm text-muted-foreground">
          {$formData['intervalCount'] === 1 ? String($formData['type']).slice(0, -2) : String($formData['type'])}
        </span>
      </div>
    </Form.Control>
    <Form.FieldErrors />
  </Form.Field>

  <!-- Period-specific configuration -->
  {#if $formData['type'] === 'weekly'}
    <Form.Field form={superform} name="startDayOfWeek">
      <Form.Control>
        <Form.Label>Week Starts On</Form.Label>
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
      </Form.Control>
      <Form.FieldErrors />
    </Form.Field>
  {:else if $formData['type'] === 'monthly'}
    <Form.Field form={superform} name="startDayOfMonth">
      <Form.Control let:attrs>
        <Form.Label>Month Starts On</Form.Label>
        <Input
          {...attrs}
          type="number"
          bind:value={$formData['startDayOfMonth']}
          min="1"
          max="31"
          class="w-20"
        />
        <p class="text-xs text-muted-foreground">
          Day 1-31 (automatically handles months with fewer days)
        </p>
      </Form.Control>
      <Form.FieldErrors />
    </Form.Field>
  {:else if $formData['type'] === 'yearly'}
    <div class="grid grid-cols-2 gap-4">
      <Form.Field form={superform} name="startMonth">
        <Form.Control>
          <Form.Label>Start Month</Form.Label>
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
        </Form.Control>
        <Form.FieldErrors />
      </Form.Field>
      <Form.Field form={superform} name="startDayOfMonth">
        <Form.Control let:attrs>
          <Form.Label>Start Day</Form.Label>
          <Input
            {...attrs}
            type="number"
            bind:value={$formData['startDayOfMonth']}
            min="1"
            max="31"
          />
        </Form.Control>
        <Form.FieldErrors />
      </Form.Field>
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
              {formatDateDisplay(parseISOString(period.start)!, 'medium')} → {formatDateDisplay(parseISOString(period.end)!, 'medium')}
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
