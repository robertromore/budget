<script lang="ts">
  import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
  import * as Sheet from '$lib/components/ui/sheet';
  import {Button} from '$lib/components/ui/button';
  import {Input} from '$lib/components/ui/input';
  import {Label} from '$lib/components/ui/label';
  import * as Select from '$lib/components/ui/select';
  import {Checkbox} from '$lib/components/ui/checkbox';
  import {toast} from 'svelte-sonner';
  import {Clock, Calendar, TrendingUp, DollarSign, RefreshCw} from '@lucide/svelte/icons';

  interface Props {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    budgetId: number;
    onSuccess?: () => void;
  }

  let {open = $bindable(false), onOpenChange, budgetId, onSuccess}: Props = $props();

  // Maintenance configuration
  let frequency = $state<'daily' | 'weekly' | 'monthly'>('weekly');
  let dayOfWeek = $state('1'); // Monday
  let dayOfMonth = $state('1');
  let hour = $state('00');
  let minute = $state('00');

  // Maintenance tasks
  let autoGeneratePeriods = $state(true);
  let processRollovers = $state(true);
  let calculateAnalytics = $state(true);
  let recoverDeficits = $state(false);
  let cleanupExpired = $state(true);

  let isSubmitting = $state(false);

  const frequencyOptions = [
    {value: 'daily', label: 'Daily', description: 'Run every day'},
    {value: 'weekly', label: 'Weekly', description: 'Run once per week'},
    {value: 'monthly', label: 'Monthly', description: 'Run once per month'},
  ];

  const dayOfWeekOptions = [
    {value: '0', label: 'Sunday'},
    {value: '1', label: 'Monday'},
    {value: '2', label: 'Tuesday'},
    {value: '3', label: 'Wednesday'},
    {value: '4', label: 'Thursday'},
    {value: '5', label: 'Friday'},
    {value: '6', label: 'Saturday'},
  ];

  async function handleSubmit(e: Event) {
    e.preventDefault();

    isSubmitting = true;
    try {
      // TODO: Implement backend endpoint for scheduling maintenance
      const config = {
        budgetId,
        frequency,
        schedule: {
          dayOfWeek: frequency === 'weekly' ? parseInt(dayOfWeek) : null,
          dayOfMonth: frequency === 'monthly' ? parseInt(dayOfMonth) : null,
          hour: parseInt(hour),
          minute: parseInt(minute),
        },
        tasks: {
          autoGeneratePeriods,
          processRollovers,
          calculateAnalytics,
          recoverDeficits,
          cleanupExpired,
        },
      };

      console.log('Maintenance configuration:', config);

      toast.success('Period maintenance scheduled successfully');
      open = false;
      onSuccess?.();
    } catch (error) {
      console.error('Failed to schedule maintenance:', error);
      toast.error('Failed to schedule maintenance');
    } finally {
      isSubmitting = false;
    }
  }

  function handleClose() {
    open = false;
  }
</script>

<ResponsiveSheet bind:open {onOpenChange}>
  {#snippet header()}
    <div class="flex items-center gap-2">
      <Clock class="h-5 w-5" />
      <div>
        <Sheet.Title>Schedule Period Maintenance</Sheet.Title>
        <Sheet.Description>
          Automate routine period management tasks
        </Sheet.Description>
      </div>
    </div>
  {/snippet}

  {#snippet content()}
    <form onsubmit={handleSubmit} class="space-y-6">
      <!-- Frequency Selection -->
      <div class="space-y-2">
        <Label>Maintenance Frequency</Label>
        <Select.Root
          type="single"
          bind:value={frequency}
        >
          <Select.Trigger>
            <span>
              {frequencyOptions.find(o => o.value === frequency)?.label}
            </span>
          </Select.Trigger>
          <Select.Content>
            {#each frequencyOptions as option (option.value)}
              <Select.Item value={option.value}>
                <div class="flex flex-col">
                  <span>{option.label}</span>
                  <span class="text-xs text-muted-foreground">{option.description}</span>
                </div>
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>

      <!-- Schedule Configuration -->
      <div class="space-y-4 rounded-lg border p-4">
        <div class="flex items-center gap-2 text-sm font-medium">
          <Calendar class="h-4 w-4" />
          <span>Schedule Details</span>
        </div>

        {#if frequency === 'weekly'}
          <div class="space-y-2">
            <Label for="day-of-week">Day of Week</Label>
            <Select.Root
              type="single"
              bind:value={dayOfWeek}
            >
              <Select.Trigger id="day-of-week">
                <span>
                  {dayOfWeekOptions.find(o => o.value === dayOfWeek)?.label}
                </span>
              </Select.Trigger>
              <Select.Content>
                {#each dayOfWeekOptions as option (option.value)}
                  <Select.Item value={option.value}>
                    {option.label}
                  </Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>
          </div>
        {:else if frequency === 'monthly'}
          <div class="space-y-2">
            <Label for="day-of-month">Day of Month</Label>
            <Input
              id="day-of-month"
              type="number"
              min="1"
              max="31"
              bind:value={dayOfMonth}
              required
            />
            <p class="text-xs text-muted-foreground">
              For months with fewer days, runs on the last day
            </p>
          </div>
        {/if}

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="hour">Hour (24h)</Label>
            <Input
              id="hour"
              type="number"
              min="0"
              max="23"
              bind:value={hour}
              required
            />
          </div>
          <div class="space-y-2">
            <Label for="minute">Minute</Label>
            <Input
              id="minute"
              type="number"
              min="0"
              max="59"
              bind:value={minute}
              required
            />
          </div>
        </div>

        <p class="text-sm text-muted-foreground">
          Next run: {frequency === 'weekly'
            ? dayOfWeekOptions.find(o => o.value === dayOfWeek)?.label
            : frequency === 'monthly'
              ? `Day ${dayOfMonth}`
              : 'Every day'} at {hour.padStart(2, '0')}:{minute.padStart(2, '0')}
        </p>
      </div>

      <!-- Maintenance Tasks -->
      <div class="space-y-4">
        <Label class="text-base">Automated Tasks</Label>

        <div class="space-y-3">
          <div class="flex items-start space-x-3 rounded-lg border p-3">
            <Checkbox
              id="auto-generate"
              bind:checked={autoGeneratePeriods}
              class="mt-1"
            />
            <div class="flex-1">
              <Label for="auto-generate" class="font-medium flex items-center gap-2">
                <RefreshCw class="h-4 w-4" />
                Auto-generate Periods
              </Label>
              <p class="text-sm text-muted-foreground mt-1">
                Automatically create upcoming periods based on templates
              </p>
            </div>
          </div>

          <div class="flex items-start space-x-3 rounded-lg border p-3">
            <Checkbox
              id="process-rollovers"
              bind:checked={processRollovers}
              class="mt-1"
            />
            <div class="flex-1">
              <Label for="process-rollovers" class="font-medium flex items-center gap-2">
                <DollarSign class="h-4 w-4" />
                Process Rollovers
              </Label>
              <p class="text-sm text-muted-foreground mt-1">
                Transfer unused funds to next period for eligible envelopes
              </p>
            </div>
          </div>

          <div class="flex items-start space-x-3 rounded-lg border p-3">
            <Checkbox
              id="calculate-analytics"
              bind:checked={calculateAnalytics}
              class="mt-1"
            />
            <div class="flex-1">
              <Label for="calculate-analytics" class="font-medium flex items-center gap-2">
                <TrendingUp class="h-4 w-4" />
                Calculate Analytics
              </Label>
              <p class="text-sm text-muted-foreground mt-1">
                Update period performance metrics and analytics data
              </p>
            </div>
          </div>

          <div class="flex items-start space-x-3 rounded-lg border p-3 bg-muted/30">
            <Checkbox
              id="recover-deficits"
              bind:checked={recoverDeficits}
              class="mt-1"
            />
            <div class="flex-1">
              <Label for="recover-deficits" class="font-medium">
                Auto-recover Deficits
              </Label>
              <p class="text-sm text-muted-foreground mt-1">
                Automatically create recovery plans for deficit envelopes
              </p>
              <p class="text-xs text-orange-600 mt-1">
                ⚠️ This will modify budget allocations
              </p>
            </div>
          </div>

          <div class="flex items-start space-x-3 rounded-lg border p-3">
            <Checkbox
              id="cleanup-expired"
              bind:checked={cleanupExpired}
              class="mt-1"
            />
            <div class="flex-1">
              <Label for="cleanup-expired" class="font-medium">
                Cleanup Expired Periods
              </Label>
              <p class="text-sm text-muted-foreground mt-1">
                Archive old period data beyond retention period
              </p>
            </div>
          </div>
        </div>
      </div>
    </form>
  {/snippet}

  {#snippet footer()}
    <div class="flex gap-2 w-full">
      <Button type="button" variant="outline" onclick={handleClose} class="flex-1">
        Cancel
      </Button>
      <Button
        type="submit"
        onclick={handleSubmit}
        disabled={isSubmitting}
        class="flex-1"
      >
        {isSubmitting ? 'Scheduling...' : 'Schedule Maintenance'}
      </Button>
    </div>
  {/snippet}
</ResponsiveSheet>
